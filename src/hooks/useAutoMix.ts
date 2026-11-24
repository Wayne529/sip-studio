import { useEffect, useRef, useState } from 'react';
import { ingredientById, type Recipe } from '../domain/catalog';
import { advanceAutoMix, createAutoMix } from '../domain/autoMix';
import { useAtelier } from '../store';

export function useAutoMix(recipe:Recipe,enabled:boolean){
  const [playback,setPlayback]=useState(()=>createAutoMix(recipe,useAtelier.getState().session));
  const current=useRef(playback);
  const [paused,setPaused]=useState(false);
  useEffect(()=>{
    if(!enabled||paused||current.current.phase==='complete')return;
    let raf=0,last=performance.now(),elapsed=0,disposed=false;
    const tick=(now:number)=>{
      if(disposed)return;
      elapsed+=Math.max(0,Math.min(.1,(now-last)/1000));last=now;
      if(elapsed>=.04){
        const next=advanceAutoMix(recipe,current.current,elapsed);elapsed=0;
        current.current=next;
        const step=recipe.steps[next.stepIndex];
        useAtelier.setState({session:next.session,...(step?.ingredientId?{selectedIngredient:step.ingredientId}:{})});
        setPlayback(next);
      }
      if(current.current.phase!=='complete')raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    const hidden=()=>{if(document.hidden)setPaused(true);};
    document.addEventListener('visibilitychange',hidden);
    return()=>{disposed=true;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',hidden);};
  },[enabled,paused,recipe]);
  const active=enabled&&playback.phase==='step'&&!paused;
  const step=recipe.steps[playback.stepIndex];
  return {
    playback,paused,
    pouring:active&&step?.kind==='add'&&ingredientById[step.ingredientId!].unit==='ml'?step.ingredientId!:null,
    technique:active&&step&&step.kind!=='add'?step.kind:null,
    pause:()=>setPaused(true),resume:()=>setPaused(false),
    takeOver:()=>{setPaused(true);useAtelier.setState({autoRequested:false});},
  };
}
