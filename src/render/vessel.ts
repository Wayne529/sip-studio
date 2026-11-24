import type { Vessel } from '../domain/catalog';

export interface VesselGeometry {
  x:number;y:number;w:number;h:number;round:number;rimDepth:number;
  coffeeCup:boolean;opaque:boolean;asset:string;
}
export function vesselGeometry(vessel:Vessel):VesselGeometry {
  if(vessel==='mug')return {x:100,y:150,w:220,h:245,round:27,rimDepth:20,coffeeCup:true,opaque:false,asset:'empty-coffee-mug.svg'};
  if(vessel==='ceramic')return {x:85,y:210,w:250,h:175,round:40,rimDepth:25,coffeeCup:true,opaque:true,asset:'empty-coffee-cup.svg'};
  if(vessel==='espresso')return {x:123,y:257,w:174,h:128,round:30,rimDepth:19,coffeeCup:true,opaque:true,asset:'empty-espresso-cup.svg'};
  return ['tall','coupe'].includes(vessel)
    ?{x:137,y:60,w:166,h:380,round:16,rimDepth:12,coffeeCup:false,opaque:false,asset:'empty-highball.webp'}
    :{x:90,y:120,w:260,h:290,round:28,rimDepth:18,coffeeCup:false,opaque:false,asset:'empty-tumbler.webp'};
}
/** Reserve headroom at capacity, including foam, inside the actual vessel. */
export function vesselFill(occupied:number,capacity:number):number {
  return capacity>0?Math.max(0,Math.min(1,occupied/capacity))*.9:0;
}
export function vesselSurfaceY(c:VesselGeometry,occupied:number,capacity:number):number {
  return c.opaque?c.y+3:c.y+c.h*(1-vesselFill(occupied,capacity));
}

export function cupInteriorPath(c:VesselGeometry):string {
  const x=c.x+7,y=c.y+4,w=c.w-14,h=c.h-15,bottom=y+h,center=x+w/2;
  return `M ${x} ${y} C ${x+1} ${y+h*.5} ${x+7} ${bottom-15} ${x+40} ${bottom-6} Q ${center} ${bottom+5} ${x+w-40} ${bottom-6} C ${x+w-7} ${bottom-15} ${x+w-1} ${y+h*.5} ${x+w} ${y} Z`;
}
