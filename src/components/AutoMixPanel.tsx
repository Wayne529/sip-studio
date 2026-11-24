import { Check, Pause, Play } from 'lucide-react';
import { ingredientById, type Recipe } from '../domain/catalog';
import { type AutoMixPlayback } from '../domain/autoMix';

export function AutoMixPanel({recipe,preparing,playback,paused,onPause,onResume,onTakeOver}:{recipe:Recipe;preparing:boolean;playback:AutoMixPlayback;paused:boolean;onPause:()=>void;onResume:()=>void;onTakeOver:()=>void}){
  const complete=playback.phase==='complete';
  const step=recipe.steps[playback.stepIndex];
  const label=preparing?'正在准备杯具与原料':complete?'制作完成，正在出杯':paused?'已暂停，等你继续':playback.phase==='rest'?'静置片刻，让风味舒展':step?.label;
  return <div className="auto-panel">
    <span className="eyebrow">THE MAKING OF A DRINK</span>
    <h2>让这一杯，慢慢成形</h2>
    <p className="auto-status" role="status" aria-live="polite">{label}</p>
    <ol className="auto-steps" aria-label="自动调制步骤">{recipe.steps.map((s,index)=>{
      const done=index<playback.stepIndex||(index===playback.stepIndex&&playback.phase!=='step');
      const current=index===playback.stepIndex&&!complete;
      return <li key={index} className={(done?'done ':'')+(current?'current':'')} aria-current={current?'step':undefined}>
        <span className="auto-step-number">{done?<Check size={13}/>:String(index+1).padStart(2,'0')}</span>
        <span>{s.label}</span>
        {s.kind==='add'&&<small>{s.amount} {ingredientById[s.ingredientId!].unit}</small>}
      </li>;
    })}</ol>
    <div className="auto-actions"><button className="button primary" disabled={complete||preparing} onClick={paused?onResume:onPause}>{paused?<Play size={16}/>:<Pause size={16}/>} {paused?'继续调制':'暂停一下'}</button><button className="button secondary" onClick={onTakeOver}>接下来我来</button></div>
    <p className="workbench-hint">按经典配方缓缓制作。接手后，可以继续调出自己的味道。</p>
  </div>;
}
