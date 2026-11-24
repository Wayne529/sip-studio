import { ingredientById, type Recipe, type RecipeStep } from './catalog';
import { addIngredient, applyTechnique, createSession, type Session } from './session';

export interface AutoMixPlayback {
  session:Session;
  stepIndex:number;
  elapsed:number;
  phase:'step'|'rest'|'complete';
}
export function createAutoMix(recipe:Recipe,session=createSession(recipe)):AutoMixPlayback {
  return {session,stepIndex:0,elapsed:0,phase:'step'};
}
export function autoStepDuration(step:RecipeStep):number {
  if(step.kind==='add')return ingredientById[step.ingredientId!].unit==='ml'?Math.max(1.2,Math.min(3.5,(step.amount??0)/45)):Math.max(.8,(step.amount??1)*.4);
  return step.kind==='shake'?3.2:step.kind==='foam'?3:step.kind==='stir'?2.4:.8;
}
function applyProgress(recipe:Recipe,step:RecipeStep,session:Session,from:number,to:number,duration:number):Session {
  if(step.kind==='add'){
    const id=step.ingredientId!,amount=step.amount??0,liquid=ingredientById[id].unit==='ml';
    const before=liquid?amount*from/duration:Math.floor(amount*from/duration+1e-8);
    const after=liquid?amount*to/duration:Math.floor(amount*to/duration+1e-8);
    const gentle=id==='grenadine';
    const s=session.gentle===gentle?session:{...session,gentle};
    return after>before?addIngredient(s,id,after-before,recipe.capacity):s;
  }
  if(step.kind==='strain'||step.kind==='garnish')return to>=duration?applyTechnique(session,step.kind,1):session;
  return applyTechnique(session,step.kind,to-from);
}
/** Advance by visible playback time; pausing simply stops advancing this state. */
export function advanceAutoMix(recipe:Recipe,playback:AutoMixPlayback,seconds:number):AutoMixPlayback {
  if(!Number.isFinite(seconds)||seconds<=0||playback.phase==='complete')return playback;
  let next=playback,remaining=seconds;
  while(remaining>1e-8&&next.phase!=='complete'){
    const step=recipe.steps[next.stepIndex];
    if(!step)return {...next,phase:'complete'};
    const duration=next.phase==='step'?autoStepDuration(step):next.stepIndex===recipe.steps.length-1?1.4:.45;
    const delta=Math.min(remaining,duration-next.elapsed),rawElapsed=Math.min(duration,next.elapsed+delta);
    const elapsed=rawElapsed>=duration-1e-8?duration:rawElapsed;
    const session=next.phase==='step'?applyProgress(recipe,step,next.session,next.elapsed,elapsed,duration):next.session;
    next={...next,session,elapsed};remaining-=delta;
    if(elapsed>=duration-1e-8){
      if(next.phase==='step')next={...next,phase:'rest',elapsed:0};
      else if(next.stepIndex===recipe.steps.length-1)next={...next,phase:'complete',elapsed:0};
      else next={...next,phase:'step',stepIndex:next.stepIndex+1,elapsed:0};
    }
  }
  return next;
}
