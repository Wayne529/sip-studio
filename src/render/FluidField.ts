/** Small, bounded incompressible dye field. Business quantities never depend on it. */
export class FluidField {
  readonly n:number;readonly size:number;
  u:Float32Array;v:Float32Array;private u0:Float32Array;private v0:Float32Array;
  r:Float32Array;g:Float32Array;b:Float32Array;a:Float32Array;
  private scratch:Float32Array;private pressure:Float32Array;private divergence:Float32Array;
  solid:Uint8Array;top=1;
  constructor(readonly width=64,readonly height=96){
    this.n=width+2;this.size=this.n*(height+2);
    const f=()=>new Float32Array(this.size);
    this.u=f();this.v=f();this.u0=f();this.v0=f();this.r=f();this.g=f();this.b=f();this.a=f();this.scratch=f();this.pressure=f();this.divergence=f();this.solid=new Uint8Array(this.size);
  }
  index(x:number,y:number){return x+y*this.n;}
  reset(){for(const a of [this.u,this.v,this.r,this.g,this.b,this.a])a.fill(0);}
  fill(color:number[],alpha:number){for(let y=this.top;y<=this.height;y++)for(let x=1;x<=this.width;x++){const k=this.index(x,y);this.r[k]=color[0];this.g[k]=color[1];this.b[k]=color[2];this.a[k]=alpha;}}
  inject(x:number,y:number,color:number[],alpha:number,strength:number,radius=5){
    for(let j=Math.max(this.top,Math.floor(y-radius*2));j<=Math.min(this.height,Math.ceil(y+radius*2));j++)for(let i=Math.max(1,Math.floor(x-radius*2));i<=Math.min(this.width,Math.ceil(x+radius*2));i++){
      const k=this.index(i,j);if(this.solid[k])continue;
      const t=Math.min(.95,Math.exp(-((i-x)**2+(j-y)**2)/(radius*radius))*strength);
      this.r[k]+=(color[0]-this.r[k])*t;this.g[k]+=(color[1]-this.g[k])*t;this.b[k]+=(color[2]-this.b[k])*t;this.a[k]+=(alpha-this.a[k])*t;
      this.v[k]+=t*.65;this.u[k]+=Math.sin(j*.7)*t*.45;
    }
  }
  swirl(x:number,y:number,strength:number){
    for(let j=this.top;j<=this.height;j++)for(let i=1;i<=this.width;i++){
      const k=this.index(i,j),dx=(i-x)/this.width,dy=(j-y)/this.height;
      const fall=Math.exp(-(dx*dx+dy*dy)*10);
      this.u[k]+=-dy*strength*fall;this.v[k]+=dx*strength*fall;
    }
  }
  private boundaries(type:number,f:Float32Array){
    for(let y=1;y<=this.height;y++){f[this.index(0,y)]=(type===1?-1:1)*f[this.index(1,y)];f[this.index(this.width+1,y)]=(type===1?-1:1)*f[this.index(this.width,y)];}
    for(let x=1;x<=this.width;x++){f[this.index(x,this.top-1)]=(type===2?-1:1)*f[this.index(x,this.top)];f[this.index(x,this.height+1)]=(type===2?-1:1)*f[this.index(x,this.height)];}
    if(type)for(let y=this.top;y<=this.height;y++)for(let x=1;x<=this.width;x++){const k=this.index(x,y);if(this.solid[k])f[k]=0;}
  }
  private project(){
    const {u,v,pressure:p,divergence:d}=this;
    p.fill(0);
    for(let y=this.top;y<=this.height;y++)for(let x=1;x<=this.width;x++){const k=this.index(x,y);d[k]=-.5*(u[k+1]-u[k-1]+v[k+this.n]-v[k-this.n]);}
    this.boundaries(0,d);
    for(let iter=0;iter<7;iter++){
      for(let y=this.top;y<=this.height;y++)for(let x=1;x<=this.width;x++){const k=this.index(x,y);p[k]=(d[k]+p[k-1]+p[k+1]+p[k-this.n]+p[k+this.n])*.25;}
      this.boundaries(0,p);
    }
    for(let y=this.top;y<=this.height;y++)for(let x=1;x<=this.width;x++){const k=this.index(x,y);u[k]-=.5*(p[k+1]-p[k-1]);v[k]-=.5*(p[k+this.n]-p[k-this.n]);}
    this.boundaries(1,u);this.boundaries(2,v);
  }
  private advect(type:number,out:Float32Array,source:Float32Array,u:Float32Array,v:Float32Array,dt:number){
    for(let j=this.top;j<=this.height;j++)for(let i=1;i<=this.width;i++){
      const k=this.index(i,j);
      const x=Math.max(.5,Math.min(this.width+.5,i-dt*u[k]*this.width));
      const y=Math.max(this.top-.5,Math.min(this.height+.5,j-dt*v[k]*this.height));
      const x0=Math.floor(x),y0=Math.floor(y),sx=x-x0,sy=y-y0;
      out[k]=(1-sx)*((1-sy)*source[this.index(x0,y0)]+sy*source[this.index(x0,y0+1)])+sx*((1-sy)*source[this.index(x0+1,y0)]+sy*source[this.index(x0+1,y0+1)]);
    }
    this.boundaries(type,out);
  }
  step(dt:number,mixing:number,target:number[],targetAlpha:number){
    this.project();this.u0.set(this.u);this.v0.set(this.v);
    this.advect(1,this.u,this.u0,this.u0,this.v0,dt);this.advect(2,this.v,this.v0,this.u0,this.v0,dt);this.project();
    for(const channel of [this.r,this.g,this.b,this.a]){this.scratch.set(channel);this.advect(0,channel,this.scratch,this.u,this.v,dt);}
    for(let y=this.top;y<=this.height;y++)for(let x=1;x<=this.width;x++){
      const k=this.index(x,y);this.u[k]*=.967;this.v[k]*=.967;
      if(mixing>0){const t=mixing*.025;this.r[k]+=(target[0]-this.r[k])*t;this.g[k]+=(target[1]-this.g[k])*t;this.b[k]+=(target[2]-this.b[k])*t;this.a[k]+=(targetAlpha-this.a[k])*t;}
    }
  }
}
