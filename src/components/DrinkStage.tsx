import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Recipe } from '../domain/catalog';
import { ingredientById } from '../domain/catalog';
import { liquidVolume, type Session } from '../domain/session';
import { DrinkEngine } from '../render/DrinkEngine';

export interface StageHandle { capture:()=>Promise<Blob>; }
interface Props { recipe:Recipe;session:Session;pouring:string|null;stirring:boolean;quality:string;reduced:boolean;onStir?:(seconds:number)=>void;onGestureStart?:()=>void; }
export const DrinkStage=forwardRef<StageHandle,Props>(function DrinkStage({recipe,session,pouring,stirring,quality,reduced,onStir,onGestureStart},ref){
  const host=useRef<HTMLDivElement>(null),engine=useRef<DrinkEngine|null>(null);
  const [ready,setReady]=useState(false),[fallback,setFallback]=useState(false);
  const pointer=useRef<{x:number;y:number;t:number}|null>(null);
  useEffect(()=>{
    setReady(false);setFallback(false);
    const e=new DrinkEngine(host.current!,recipe,session,()=>setReady(true),()=>setFallback(true));engine.current=e;void e.init();
    return()=>{e.destroy();engine.current=null;};
    // The scene lifetime is keyed to its vessel/recipe. Updates use sync below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[recipe.id]);
  useEffect(()=>{engine.current?.sync(session);},[session,ready]);
  useEffect(()=>{engine.current?.setPour(pouring?{id:pouring,gentle:session.gentle}:null);},[pouring,session.gentle,ready]);
  useEffect(()=>{engine.current?.setStir(stirring);},[stirring,ready]);
  useEffect(()=>{engine.current?.setQuality(quality,reduced);},[quality,reduced,ready]);
  useImperativeHandle(ref,()=>({capture:async()=>{
    if(ready&&!fallback)return engine.current!.capture();
    const canvas=document.createElement('canvas');canvas.width=880;canvas.height=1000;const ctx=canvas.getContext('2d')!;
    const gradient=ctx.createLinearGradient(0,300,0,850);const entries=Object.entries(session.composition).filter(([id])=>ingredientById[id].unit==='ml');
    entries.forEach(([id],n)=>gradient.addColorStop(n/Math.max(1,entries.length-1),ingredientById[id].color));
    ctx.fillStyle=entries.length?gradient:'#e6e2d7';ctx.beginPath();ctx.roundRect(260,240,360,580,25);ctx.fill();ctx.strokeStyle='#d6dfda';ctx.lineWidth=4;ctx.stroke();
    return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('导出失败'))));
  }}),[ready,fallback,session]);
  const onDown=(e:React.PointerEvent<HTMLDivElement>)=>{if(liquidVolume(session)===0)return;e.currentTarget.setPointerCapture(e.pointerId);pointer.current={x:e.clientX,y:e.clientY,t:performance.now()};onGestureStart?.();};
  const onMove=(e:React.PointerEvent<HTMLDivElement>)=>{
    const p=pointer.current;if(!p)return;const box=e.currentTarget.getBoundingClientRect(),now=performance.now();const dx=(e.clientX-p.x)/box.width,dy=(e.clientY-p.y)/box.height;
    if(Math.hypot(dx,dy)>.003){engine.current?.impulse((e.clientX-box.x)/box.width,(e.clientY-box.y)/box.height,dx,dy);onStir?.(Math.min(.1,(now-p.t)/1000));}
    pointer.current={x:e.clientX,y:e.clientY,t:now};
  };
  const entries=Object.entries(session.composition).filter(([id])=>ingredientById[id].unit==='ml');
  const fallbackColors=entries.map(([id])=>ingredientById[id].color);if(fallbackColors.length===1)fallbackColors.push(fallbackColors[0]);
  return <div className={'drink-stage '+(recipe.family==='cocktail'?'dark-stage':'')} aria-label="调制画面，在杯中拖动可以搅拌" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={()=>pointer.current=null} onPointerCancel={()=>pointer.current=null}>
    <div ref={host} className="pixi-host"/>
    {!ready&&!fallback&&<div className="stage-loading">正在准备杯具<span/></div>}
    {fallback&&<div className="fallback-glass"><div className="fallback-liquid" style={{height:`${Math.min(90,liquidVolume(session)/recipe.capacity*100)}%`,background:fallbackColors.length?`linear-gradient(${session.mixing>.5?'135deg':'to bottom'}, ${fallbackColors.join(', ')})`:'transparent'}}/><img src={recipe.vessel==='tall'?'/assets/empty-highball.webp':'/assets/empty-tumbler.webp'} alt="透明玻璃杯"/></div>}
    {liquidVolume(session)>0&&<span className="stage-state">{pouring?'正在倒入':stirring?'融合中':session.foam>.1?'细腻奶泡':session.mixing>.65?'风味相融':session.mixing>.1?'层次渐融':session.gentle?'轻倒 · 分层中':'缓缓流动'}</span>}
    {session.activeVessel==='shaker'&&<span className="vessel-note">摇壶内 · 完成后滤入杯中</span>}
  </div>;
});
