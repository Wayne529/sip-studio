import { ingredientById, type Recipe } from '../domain/catalog';
import { liquidVolume,occupiedVolume,type Session } from '../domain/session';
import { cupInteriorPath,vesselGeometry,vesselSurfaceY } from './vessel';

export async function captureFallback(recipe:Recipe,session:Session):Promise<Blob>{
  const canvas=document.createElement('canvas');canvas.width=880;canvas.height=1000;
  const ctx=canvas.getContext('2d')!;ctx.scale(2,2);
  const c=vesselGeometry(recipe.vessel),y=vesselSurfaceY(c,occupiedVolume(session),recipe.capacity);
  const entries=Object.entries(session.composition).filter(([id,n])=>ingredientById[id].unit==='ml'&&n>0);
  const image=new Image();image.src='./assets/'+c.asset;
  await image.decode().catch(()=>{});
  const drawFrame=()=>{
    if(image.naturalWidth){
      if(c.coffeeCup)ctx.drawImage(image,0,0,440,500);
      else {const box=recipe.vessel==='tall'||recipe.vessel==='coupe'?{x:.331,y:.117,w:.336,h:.747}:{x:.203,y:.19,w:.6,h:.63};const w=c.w/box.w,h=c.h/box.h;ctx.drawImage(image,c.x-box.x*w,c.y-box.y*h,w,h);}
    }
  };
  if(c.opaque)drawFrame();
  if(liquidVolume(session)>0){
    ctx.save();
    if(c.opaque){ctx.beginPath();ctx.ellipse(c.x+c.w/2,c.y,c.w/2-9,c.rimDepth-6,0,0,Math.PI*2);ctx.clip();}
    else if(c.coffeeCup)ctx.clip(new Path2D(cupInteriorPath(c)));
    else{ctx.beginPath();ctx.roundRect(c.x,c.y,c.w,c.h,c.round);ctx.clip();}
    const gradient=ctx.createLinearGradient(0,c.opaque?c.y-20:y,0,c.y+c.h);
    entries.forEach(([id],n)=>gradient.addColorStop(n/Math.max(1,entries.length-1),ingredientById[id].color));
    ctx.fillStyle=gradient;ctx.fillRect(c.x,c.opaque?c.y-c.rimDepth:y,c.w,c.h+c.rimDepth);
    if(session.foam>0){ctx.fillStyle='#f4e9d7';ctx.beginPath();ctx.ellipse(c.x+c.w/2,c.opaque?c.y+3:y,c.w*.44,c.opaque?c.rimDepth-8:10+session.foam*12,0,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  if(!c.opaque)drawFrame();
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('导出失败')),'image/png'));
}
