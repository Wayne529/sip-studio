import { Application, Assets, Container, Graphics, Sprite, Texture, CanvasSource } from 'pixi.js';
import Matter from 'matter-js';
import { ingredientById, type Recipe } from '../domain/catalog';
import { liquidVolume, occupiedVolume, type Session } from '../domain/session';
import { FluidField } from './FluidField';

const W=440,H=500;
const hexRgb=(hex:string)=>[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255];
interface PourState{id:string;gentle:boolean;}
export class DrinkEngine {
  private app=new Application();private field=new FluidField(96,144);
  private pixels=document.createElement('canvas');private context:CanvasRenderingContext2D;private image:ImageData;
  private texture:Texture;private liquid=new Sprite();private coffeeCloud=new Sprite();private surface=new Graphics();private stream=new Graphics();private mask=new Graphics();
  private root=new Container();private iceLayer=new Container();private foam=new Graphics();private ceramicSurface=new Graphics();private garnish=new Graphics();private glass?:Sprite;private pouringTool?:Sprite;private orangePhoto?:Sprite;private toolTextures:Record<string,Texture>={};
  private physics=Matter.Engine.create({gravity:{x:0,y:1,scale:.0007}});private iceBodies:Matter.Body[]=[];private iceDrawings:Container[]=[];private iceTexture?:Texture;
  private state:Session;private previous:Record<string,number>={};private previousTotal=0;
  private cup={x:105,y:140,w:230,h:270,round:25};private pourState:PourState|null=null;private stirred=0;private stirring=false;
  private time=0;private lastTick=0;private accumulator=0;private physicsTime=0;private disposed=false;private ready=false;private initialized=false;private quality='medium';private reduced=false;
  private target=[1,1,1];private targetAlpha=.5;private wave=0;private viewport:HTMLElement;private family:'coffee'|'cocktail';
  constructor(host:HTMLElement,private recipe:Recipe,state:Session,private onReady:()=>void,private onFailure:()=>void){
    this.viewport=host;this.state=state;this.family=recipe.family;
    this.pixels.width=this.field.width;this.pixels.height=this.field.height;
    this.context=this.pixels.getContext('2d',{alpha:true})!;this.image=this.context.createImageData(this.pixels.width,this.pixels.height);
    this.texture=new Texture({source:new CanvasSource({resource:this.pixels,scaleMode:'linear'})});
  }
  async init(){
    try{
      await this.app.init({width:W,height:H,resolution:Math.min(devicePixelRatio,1.5),autoDensity:true,backgroundAlpha:0,antialias:true,preference:'webgl',powerPreference:'low-power'});
      this.initialized=true;
      if(this.disposed){this.app.destroy(true);return;}
      this.viewport.append(this.app.canvas);this.app.stage.addChild(this.root);
      const tall=['tall','coupe'].includes(this.recipe.vessel);
      this.cup=tall?{x:137,y:60,w:166,h:380,round:16}:{x:90,y:120,w:260,h:290,round:28};
      const c=this.cup;
      const shadow=new Graphics().ellipse(W/2,c.y+c.h+11,c.w*.61,13).fill({color:this.family==='coffee'?0x77644c:0x080f0b,alpha:.12});
      const coaster=new Graphics().ellipse(W/2,c.y+c.h+10,c.w*.64,16).fill({color:this.family==='coffee'?0xdcd4c4:0x485044,alpha:.45}).ellipse(W/2,c.y+c.h+5,c.w*.64,13).fill({color:this.family==='coffee'?0xebe4d6:0x3a443a,alpha:.8});
      this.root.addChild(shadow,coaster);
      this.mask.roundRect(c.x,c.y,c.w,c.h,c.round).fill(0xffffff);
      this.liquid.texture=this.texture;this.liquid.position.set(c.x,c.y);this.liquid.width=c.w;this.liquid.height=c.h;this.liquid.mask=this.mask;
      this.coffeeCloud.visible=false;this.coffeeCloud.mask=this.mask;this.root.addChild(this.liquid,this.mask,this.coffeeCloud,this.iceLayer,this.surface,this.foam);
      this.makeWalls();
      try{
        const path=tall?'/assets/empty-highball.webp':'/assets/empty-tumbler.webp';
        const [tex,iceTexture]=await Promise.all([Assets.load<Texture>(path),Assets.load<Texture>('/assets/ice-cube.webp')]);this.iceTexture=iceTexture;
        if(this.disposed)return;
        this.glass=new Sprite(tex);
        const box=tall?{x:.331,y:.117,w:.336,h:.747}:{x:.203,y:.19,w:.6,h:.63};
        this.glass.width=c.w/box.w;this.glass.height=c.h/box.h;this.glass.x=c.x-box.x*this.glass.width;this.glass.y=c.y-box.y*this.glass.height;this.glass.alpha=this.family==='coffee'?.64:.69;
        this.root.addChild(this.glass);
      }catch{
        this.root.addChild(new Graphics().roundRect(c.x-4,c.y-5,c.w+8,c.h+12,c.round).stroke({width:2,color:0xe9eee9,alpha:.65}));
      }
      if(['ceramic','espresso'].includes(this.recipe.vessel)){
        if(this.glass)this.glass.visible=false;
        const body=new Graphics().roundRect(c.x-5,c.y+c.h*.34,c.w+10,c.h*.68,30).fill({color:0xe8e0d2,alpha:.99}).ellipse(c.x+c.w+10,c.y+c.h*.6,32,45).stroke({width:15,color:0xe8e0d2});
        this.root.addChild(body,this.ceramicSurface);
      }
      this.root.addChild(this.garnish,this.stream);
      const art=await Promise.all(['/assets/pour-pitcher.webp','/assets/pour-bottle.webp','/assets/orange-wheel.webp','/assets/coffee-cloud-overlay.webp'].map(path=>Assets.load<Texture>(path).catch(()=>null)));
      if(this.disposed)return;
      if(art[3])this.coffeeCloud.texture=art[3];
      if(art[0])this.toolTextures.pitcher=art[0];if(art[1])this.toolTextures.bottle=art[1];
      this.pouringTool=new Sprite(art[0]??Texture.EMPTY);this.pouringTool.visible=false;this.root.addChild(this.pouringTool);
      if(art[2]){this.orangePhoto=new Sprite(art[2]);this.orangePhoto.anchor.set(.499,.731);this.orangePhoto.width=92;this.orangePhoto.height=92;this.orangePhoto.position.set(c.x+18,c.y+9);this.root.addChild(this.orangePhoto);}

      this.ready=true;this.sync(this.state,true);this.lastTick=performance.now();
      this.app.ticker.add(this.tick);this.onReady();
    }catch(e){console.warn('Drink stage unavailable, using visual fallback.',e);if(!this.disposed)this.onFailure();}
  }
  private makeWalls(){const c=this.cup;Matter.Composite.add(this.physics.world,[Matter.Bodies.rectangle(c.x-10,c.y+c.h/2,20,c.h+100,{isStatic:true}),Matter.Bodies.rectangle(c.x+c.w+10,c.y+c.h/2,20,c.h+100,{isStatic:true}),Matter.Bodies.rectangle(W/2,c.y+c.h+14,c.w,25,{isStatic:true})]);}
  sync(state:Session,force=false){
    const old=this.state;this.state=state;if(!this.ready)return;
    const total=liquidVolume(state),c=this.cup;
    const reset=force||state.seed!==old.seed||total<this.previousTotal-.1||state.additions.length<old.additions.length||state.mixing<old.mixing-.1;
    this.updateTarget();
    const apparent=total>0?occupiedVolume(state):0;
    const intended=Object.entries(this.recipe.composition).reduce((sum,[id,n])=>sum+(ingredientById[id].unit==='ml'?n:id==='ice'?n*16:0),0);
    const visualCapacity=Math.min(this.recipe.capacity,Math.max(60,intended/.86));
    const top=this.field.height-Math.round(Math.min(.89,apparent/visualCapacity*.96)*this.field.height)+1;
    this.field.top=Math.max(2,Math.min(this.field.height,top));
    if(reset){
      this.field.reset();if(total>0)this.field.fill(this.target,this.targetAlpha);
      const entries=Object.entries(state.composition).filter(([id])=>ingredientById[id].unit==='ml');
      let bottom=this.field.height;
      const sorted=[...entries].sort(([a],[b])=>ingredientById[b].density-ingredientById[a].density);
      for(const [id,amount]of sorted){const color=hexRgb(ingredientById[id].color),height=Math.max(1,Math.round(amount/this.recipe.capacity*.93*this.field.height));for(let y=Math.max(this.field.top,bottom-height);y<=bottom;y++)for(let x=1;x<=this.field.width;x++){const k=this.field.index(x,y);this.field.r[k]=color[0];this.field.g[k]=color[1];this.field.b[k]=color[2];this.field.a[k]=Math.max(.25,ingredientById[id].opacity);}bottom-=height;}
      if(['tequila-sunrise','sunset-coast'].includes(this.recipe.id)&&state.mixing<.15&&total>0){
        let weight=0,opacity=0,baseVolume=0;const base=[0,0,0];
        for(const[id,amount]of entries){if(id==='grenadine')continue;const ing=ingredientById[id],rgb=hexRgb(ing.color),w=amount*ing.opacity;weight+=w;baseVolume+=amount;opacity+=w;for(let n=0;n<3;n++)base[n]+=rgb[n]*w;}
        if(weight>0)this.field.fill(base.map(v=>v/weight),Math.min(.98,opacity/baseVolume+.15));
        const grenadine=state.composition.grenadine??0;
        if(grenadine>0){const depth=Math.max(4,Math.round(grenadine/this.recipe.capacity*this.field.height*3.2)),color=hexRgb(ingredientById.grenadine.color);for(let y=this.field.height-depth;y<=this.field.height;y++)for(let x=1;x<=this.field.width;x++){const k=this.field.index(x,y),blend=Math.min(.97,(y-this.field.height+depth)/depth);this.field.r[k]+=(color[0]-this.field.r[k])*blend;this.field.g[k]+=(color[1]-this.field.g[k])*blend;this.field.b[k]+=(color[2]-this.field.b[k])*blend;this.field.a[k]=.95;}}
      }
      if(state.mixing>.7||((state.composition.espresso??0)>0&&['milk','oat','coconut'].some(id=>(state.composition[id]??0)>0)))this.field.fill(this.target,this.targetAlpha);
    }else{
      if(this.previousTotal===0&&total>0)this.field.fill(this.target,this.targetAlpha);
      for(const [id,amount]of Object.entries(state.composition)){
        const delta=amount-(this.previous[id]??0),i=ingredientById[id];if(delta<=0||i.unit!=='ml')continue;
        for(let y=this.field.top;y<=this.field.height;y++)for(let x=1;x<=this.field.width;x++){const k=this.field.index(x,y);if(this.field.a[k]===0){this.field.r[k]=this.target[0];this.field.g[k]=this.target[1];this.field.b[k]=this.target[2];this.field.a[k]=this.targetAlpha;}}
        const x=state.gentle?this.field.width*.85:this.field.width*.55;
        const y=id==='grenadine'&&state.gentle?this.field.height-4:this.field.top+4;
        this.field.inject(x+Math.sin(this.time*3)*2,y,hexRgb(i.color),Math.max(.25,i.opacity),Math.min(1.4,delta*(i.id==='espresso'?.05:.18)),state.gentle?3.5:5);
        if(i.id==='espresso'||i.id==='coffeeLiqueur'){
          this.field.swirl(x-5,y+9,.16);
          this.field.swirl(x+7,y+20,-.12);
        }
        if(id==='grenadine'){
          this.field.inject(x,this.field.height-3,hexRgb(i.color),.95,Math.min(.8,delta*.07),10);
          if(state.mixing<.15){
            const depth=Math.max(4,Math.round((state.composition.grenadine??0)/this.recipe.capacity*this.field.height*3.2));
            const color=hexRgb(i.color);
            for(let row=this.field.height-depth;row<=this.field.height;row++)for(let col=1;col<=this.field.width;col++){
              const k=this.field.index(col,row),blend=Math.min(.94,((row-(this.field.height-depth))/depth)*.9)*(state.gentle?1:.65);
              this.field.r[k]+=(color[0]-this.field.r[k])*blend;this.field.g[k]+=(color[1]-this.field.g[k])*blend;this.field.b[k]+=(color[2]-this.field.b[k])*blend;this.field.a[k]=Math.max(.8,this.field.a[k]);
            }
          }
        }
        if(['tequila-sunrise','sunset-coast'].includes(this.recipe.id)&&['orange','pineapple'].includes(id)&&!state.composition.grenadine)this.field.fill(this.target,this.targetAlpha);
        this.wave=state.gentle?1.2:4;
      }
    }
    this.previous={...state.composition};this.previousTotal=total;
    const ice=Math.min(6,Math.round((state.composition.ice??0)*1.5));
    while(this.iceBodies.length>ice){Matter.Composite.remove(this.physics.world,this.iceBodies.pop()!);this.iceDrawings.pop()!.destroy();}
    while(this.iceBodies.length<ice){
      const n=this.iceBodies.length,size=48+((state.seed+n*7)%12);
      const b=Matter.Bodies.rectangle(c.x+c.w*.25+(n%2)*c.w*.4,c.y-20-n*42,size,size,{chamfer:{radius:7},restitution:.18,friction:.08,frictionAir:.025,density:.0007});
      Matter.Body.setAngle(b,.2+n*.58);Matter.Composite.add(this.physics.world,b);this.iceBodies.push(b);
      let iceGraphic:Container;
      if(this.iceTexture){const sprite=new Sprite(this.iceTexture);sprite.anchor.set(.5,.506);sprite.width=size/.7;sprite.height=size/.7;sprite.alpha=.72;iceGraphic=sprite;}
      else iceGraphic=new Graphics().roundRect(-size/2,-size/2,size,size,7).fill({color:0xe8f1ef,alpha:.18}).stroke({width:1.3,color:0xf8fffa,alpha:.72}).moveTo(-size/2+6,-size/2+9).lineTo(size/2-10,-size/2+6).lineTo(size/2-5,size/2-12).stroke({width:2,color:0xffffff,alpha:.55});
      this.iceLayer.addChild(iceGraphic);this.iceDrawings.push(iceGraphic);
    }
    this.drawGarnish();this.drawPixels();this.drawSurface(c.y+c.h*(this.field.top/this.field.height));
  }
  private updateTarget(){
    let weight=0;const rgb=[0,0,0];let opacity=0;
    for(const[id,amount]of Object.entries(this.state.composition)){const i=ingredientById[id];if(i.unit!=='ml')continue;const w=amount*Math.max(.12,i.opacity),c=hexRgb(i.color);weight+=w;opacity+=amount*i.opacity;for(let j=0;j<3;j++)rgb[j]+=c[j]*w;}
    this.target=rgb.map(n=>weight?n/weight:1);this.targetAlpha=Math.min(.98,Math.max(.23,opacity/Math.max(1,liquidVolume(this.state))+.15));
  }
  setPour(state:PourState|null){this.pourState=state;}
  setStir(value:boolean){this.stirring=value;}
  setQuality(q:string,reduced=false){this.quality=q;this.reduced=reduced;}
  impulse(nx:number,ny:number,dx:number,dy:number){if(this.reduced)return;const c=this.cup;const x=(nx*W-c.x)/c.w*this.field.width,y=(ny*H-c.y)/c.h*this.field.height;this.field.swirl(x,y,Math.min(1.5,Math.hypot(dx,dy)*12)*Math.sign(dx||1));this.wave=3;}
  private tick=()=>{
    if(this.disposed||document.hidden)return;
    const now=performance.now(),elapsed=Math.min((now-this.lastTick)/1000,.05);this.lastTick=now;this.time+=elapsed;this.accumulator+=elapsed;
    const interval=this.quality==='high'?1/45:this.quality==='low'?1/20:1/30;if(this.accumulator<interval)return;
    const dt=Math.min(.05,this.accumulator);this.accumulator=0;
    const c=this.cup,surface=['ceramic','espresso'].includes(this.recipe.vessel)?c.y+c.h*.34:c.y+c.h*(this.field.top/this.field.height);
    if(this.stirring&&!this.reduced){this.field.swirl(this.field.width/2,(this.field.top+this.field.height)/2,dt*8);this.stirred+=dt;this.wave=3;}
    this.field.solid.fill(0);
    for(let n=0;n<this.iceBodies.length;n++){
      const body=this.iceBodies[n];
      const gx=(body.position.x-c.x)/c.w*this.field.width,gy=(body.position.y-c.y)/c.h*this.field.height;
      const radius=13/c.w*this.field.width;
      for(let y=Math.max(this.field.top,Math.floor(gy-radius));y<=Math.min(this.field.height,Math.ceil(gy+radius));y++)for(let x=Math.max(1,Math.floor(gx-radius));x<=Math.min(this.field.width,Math.ceil(gx+radius));x++)this.field.solid[this.field.index(x,y)]=1;
    }
    this.physicsTime+=dt;
    while(this.physicsTime>=1/60){
      this.iceBodies.forEach((body,n)=>{const depth=Math.max(0,Math.min(1,(body.position.y+20-surface)/40));if(depth>0)Matter.Body.applyForce(body,body.position,{x:(this.stirring?Math.sin(this.time*2+n)*.0002:0)-body.velocity.x*.000015,y:-body.mass*.0007*1.17*depth-body.velocity.y*.00002});});
      Matter.Engine.update(this.physics,1000/60);this.physicsTime-=1/60;
    }
    this.iceBodies.forEach((body,i)=>{this.iceDrawings[i].position.set(body.position.x,body.position.y);this.iceDrawings[i].rotation=body.angle;});
    if(liquidVolume(this.state)>0){this.field.step(this.reduced?.005:dt*.45,this.state.mixing,this.target,this.targetAlpha);this.drawPixels();}
    const milk=['milk','oat','coconut'].reduce((n,id)=>n+(this.state.composition[id]??0),0),espresso=this.state.composition.espresso??0;
    this.coffeeCloud.visible=milk>0&&espresso>0&&this.coffeeCloud.texture!==Texture.EMPTY;
    if(this.coffeeCloud.visible){this.coffeeCloud.position.set(c.x-c.w*.2+Math.sin(this.time*.4)*2,surface+2);this.coffeeCloud.width=c.w*1.4;this.coffeeCloud.height=Math.max(10,c.y+c.h-surface-5);this.coffeeCloud.alpha=Math.min(.92,espresso/25)*(1-this.state.mixing);}
    this.wave*=.88;this.drawSurface(surface);this.drawStream(surface);
  };
  private drawPixels(){
    const f=this.field,p=this.image.data;
    for(let y=1;y<=f.height;y++)for(let x=1;x<=f.width;x++){
      const k=f.index(x,y),j=((y-1)*f.width+x-1)*4;
      if(y<f.top){p[j+3]=0;continue;}
      const shade=.78+.25*Math.sin(x/f.width*Math.PI),ripple=Math.sin(y*.32+x*.12+this.time*.3)*.006+Math.pow(Math.max(0,Math.sin(x*.13+y*.07+Math.sin(y*.12)*2)),16)*.024;
      p[j]=Math.max(0,Math.min(255,(f.r[k]*shade+ripple)*255));p[j+1]=Math.max(0,Math.min(255,(f.g[k]*shade+ripple)*255));p[j+2]=Math.max(0,Math.min(255,(f.b[k]*shade+ripple)*255));p[j+3]=Math.min(255,Math.max(.2,f.a[k])*255);
    }
    this.context.putImageData(this.image,0,0);this.texture.source.update();
  }
  private drawSurface(y:number){
    const g=this.surface.clear(),c=this.cup;this.foam.clear();if(liquidVolume(this.state)===0)return;
    const width=c.w*.98,center=c.x+c.w/2;
    if(['ceramic','espresso'].includes(this.recipe.vessel)){
      const top=c.y+c.h*.34;
      const r=Math.round(this.target[0]*255),green=Math.round(this.target[1]*255),b=Math.round(this.target[2]*255);
      this.ceramicSurface.clear().ellipse(center,top+4,c.w/2,22).fill(0xe4d7c1).ellipse(center,top+4,c.w/2-7,17).fill({color:(r<<16)+(green<<8)+b,alpha:1});
      if(this.state.foam>.1){this.ceramicSurface.ellipse(center,top+3,c.w*.43,13).fill({color:0xf5ecd9,alpha:Math.min(.97,this.state.foam+.3)}).ellipse(center,top+3,22,8).stroke({width:3,color:0xe3c8a0,alpha:.8});}
      return;
    }
    g.ellipse(center,y,width/2,Math.max(4,c.round*.32)).fill({color:0xffffff,alpha:.08}).stroke({width:1,color:0xffffff,alpha:.3});
    if(!this.reduced&&this.wave>.1){for(let n=0;n<2;n++)g.ellipse(center,y+Math.sin(this.time*5)*this.wave,width*(.24+n*.15),3+n*2).stroke({width:1,color:0xffffff,alpha:.08*this.wave});}
    if(this.state.foam>0)this.foam.ellipse(center,y-4,width/2,9+this.state.foam*13).fill({color:0xf3e9d7,alpha:.97});
  }
  private drawStream(surface:number){
    const g=this.stream.clear();if(this.pouringTool)this.pouringTool.visible=false;if(!this.pourState)return;
    const i=ingredientById[this.pourState.id],c=this.cup;if(i.unit!=='ml')return;
    const x=c.x+c.w*(this.pourState.gentle?.87:.57),sourceX=x+66,sourceY=Math.max(35,c.y-30);
    g.moveTo(sourceX,sourceY).bezierCurveTo(x+10,sourceY+15,x+Math.sin(this.time*14)*2,surface-35,x,surface+7).stroke({width:this.pourState.gentle?3:5,color:i.color,alpha:.92});
    const tool=this.toolTextures[['espresso','milk','oat','coconut'].includes(i.id)?'pitcher':'bottle'];
    if(tool&&this.pouringTool){this.pouringTool.texture=tool;this.pouringTool.anchor.set(...(['espresso','milk','oat','coconut'].includes(i.id)?[.064,.676] as const:[.135,.765] as const));this.pouringTool.width=220;this.pouringTool.height=220;this.pouringTool.position.set(sourceX,sourceY);this.pouringTool.visible=true;return;}
    g.ellipse(sourceX+6,sourceY-8,23,14).fill({color:i.color,alpha:.9}).stroke({width:1,color:0xf4f3e9,alpha:.65});
    g.moveTo(sourceX-20,sourceY-15).lineTo(sourceX+25,sourceY-21).lineTo(sourceX+26,sourceY+2).lineTo(sourceX-4,sourceY+12).stroke({width:1.4,color:0xf4f3e9,alpha:.65});
  }
  private drawGarnish(){
    const g=this.garnish.clear(),c=this.cup;
    if(this.orangePhoto)this.orangePhoto.visible=(this.state.composition.citrus??0)>0||this.recipe.hero==='sunset';
    if((this.state.composition.citrus??0)>0&&!this.orangePhoto){const x=c.x+c.w*.18,y=c.y+5;g.circle(x,y,28).fill(0xee9b2d).circle(x,y,23).fill(0xffce64).circle(x,y,20).fill(0xf0a62c);for(let j=0;j<8;j++){const a=j*Math.PI/4;g.moveTo(x,y).lineTo(x+Math.cos(a)*20,y+Math.sin(a)*20).stroke({color:0xffe0a4,width:1});}}
    if((this.state.composition.mint??0)>0){for(let j=0;j<3;j++)g.ellipse(c.x+c.w*.78+j*8,c.y+17-j*7,9,17).fill({color:0x658162,alpha:.9});}
    if((this.state.composition.beans??0)>0){for(let j=0;j<3;j++)g.ellipse(c.x+c.w*.4+j*13,c.y+40,5,8).fill(0x5d3824);}
  }
  async capture():Promise<Blob>{
    if(!this.ready)throw new Error('画面正在准备');
    const canvas=this.app.renderer.extract.canvas({target:this.app.stage,resolution:2});
    return new Promise((resolve,reject)=>(canvas as HTMLCanvasElement).toBlob(blob=>blob?resolve(blob):reject(new Error('无法生成图片')),'image/png'));
  }
  destroy(){this.disposed=true;if(this.initialized){this.app.ticker.remove(this.tick);this.app.destroy(true,{children:true});}Matter.Engine.clear(this.physics);this.texture.destroy(true);}
}
