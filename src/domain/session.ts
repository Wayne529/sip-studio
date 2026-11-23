import { ingredientById, type Recipe, type Technique } from './catalog';

export type Mode='guided'|'challenge'|'free';
export interface Addition { id:string; amount:number; gentle:boolean; at:number; }
export interface Session {
  recipeId:string; mode:Mode; composition:Record<string,number>; additions:Addition[];
  techniques:Partial<Record<Technique,number>>; mixing:number; foam:number; seed:number;
  gentle:boolean; activeVessel:'glass'|'shaker'; filtered:boolean;
}
export function createSession(recipe:Recipe,mode:Mode='guided'):Session {
  return {recipeId:recipe.id,mode,composition:{},additions:[],techniques:{},mixing:0,foam:0,seed:Math.floor(Math.random()*1e6),gentle:false,activeVessel:recipe.techniques.includes('shake')?'shaker':'glass',filtered:false};
}
export function liquidVolume(s:Session):number {
  return Object.entries(s.composition).reduce((n,[id,amount])=>n+(ingredientById[id]?.unit==='ml'?amount:0),0);
}
export function occupiedVolume(s:Session):number { return liquidVolume(s)+(s.composition.ice??0)*16+s.foam*15; }
export function pourAmount(rate:number,seconds:number,remaining:number):number {
  if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(rate)||rate<0)return 0;
  return Math.max(0,Math.min(rate*seconds,remaining));
}
export function addIngredient(s:Session,id:string,requested:number,capacity:number):Session {
  const ingredient=ingredientById[id];
  if(!ingredient||!Number.isFinite(requested)||requested<=0)return s;
  if(s.activeVessel==='shaker'&&['soda','tonic'].includes(id))return s;
  const amount=ingredient.unit==='ml'?Math.min(requested,Math.max(0,capacity-occupiedVolume(s))):Math.min(requested,id==='ice'?Math.max(0,Math.min(6-(s.composition.ice??0),Math.floor((capacity-occupiedVolume(s))/16))):12-(s.composition[id]??0));
  if(amount<=0)return s;
  const next={...s,composition:{...s.composition,[id]:(s.composition[id]??0)+amount},additions:[...s.additions,{id,amount,gentle:s.gentle,at:Date.now()}]};
  if(next.additions.length>180) next.additions=next.additions.slice(-180);
  return next;
}
export function applyTechnique(s:Session,kind:Technique,seconds:number=1):Session {
  if(liquidVolume(s)===0)return s;
  const duration=Math.max(0,Math.min(seconds,10));
  const techniques={...s.techniques,[kind]:(s.techniques[kind]??0)+duration};
  if(kind==='stir'||kind==='shake')return {...s,techniques,mixing:Math.min(1,s.mixing+duration*(kind==='shake'?0.28:0.13)),activeVessel:kind==='shake'?'shaker':s.activeVessel};
  if(kind==='foam') {
    const hasMilk=['milk','oat','coconut'].some(id=>(s.composition[id]??0)>0);
    if(!hasMilk)return s;
    return {...s,techniques,foam:Math.min(1,s.foam+duration*0.18)};
  }
  if(kind==='strain') {
    if(s.activeVessel!=='shaker'||(s.techniques.shake??0)<1)return s;
    const composition={...s.composition};delete composition.ice;
    return {...s,composition,techniques,activeVessel:'glass',filtered:true};
  }
  return {...s,techniques};
}
export function currentStep(recipe:Recipe,s:Session):number {
  const index=recipe.steps.findIndex(step=>step.kind==='add'?(step.ingredientId==='ice'&&s.filtered?s.additions.filter(a=>a.id==='ice').reduce((n,a)=>n+a.amount,0):(s.composition[step.ingredientId!]??0))<(step.amount??0)*0.95:(s.techniques[step.kind]??0)<(step.kind==='foam'?2:step.kind==='stir'?2:step.kind==='shake'?3:1));
  return index<0?recipe.steps.length:index;
}
export function assess(recipe:Recipe,s:Session):{score:number;matched:boolean;feedback:string;missing:string[]} {
  const entries=Object.entries(recipe.composition).filter(([id])=>id!=='ice');
  const missing=entries.filter(([id,amount])=>(s.composition[id]??0)<amount*0.6).map(([id])=>ingredientById[id].name);
  const expectedTotal=entries.reduce((n,[id,amount])=>n+(ingredientById[id].unit==='ml'?amount:0),0);
  const actualTotal=liquidVolume(s);
  let fit=0;
  for(const [id,target] of entries) {
    const actual=s.composition[id]??0;
    const ideal=ingredientById[id].unit==='ml'?target/expectedTotal:target;
    const ratio=ingredientById[id].unit==='ml'?actual/Math.max(1,actualTotal):actual;
    fit+=Math.max(0,1-Math.abs(ratio-ideal)/Math.max(0.01,ideal));
  }
  fit/=Math.max(1,entries.length);
  const techFit=recipe.techniques.length?recipe.techniques.filter(t=>(s.techniques[t]??0)>=(t==='shake'?3:t==='stir'||t==='foam'?2:1)).length/recipe.techniques.length:1;
  const extras=Object.entries(s.composition).filter(([id,n])=>!Object.hasOwn(recipe.composition,id)&&!['ice','citrus','beans','mint'].includes(id)&&n>2);
  const volumeFit=Math.min(actualTotal/Math.max(1,expectedTotal),expectedTotal/Math.max(1,actualTotal));
  const layerRecipe=['tequila-sunrise','sunset-coast'].includes(recipe.id);
  const stateFit=layerRecipe?1-s.mixing:recipe.techniques.includes('foam')?Math.min(1,s.foam*2):1;
  const score=Math.max(0,Math.min(100,Math.round(fit*50+techFit*30+stateFit*15+volumeFit*5-extras.length*10)));
  const matched=missing.length===0&&techFit===1&&extras.length===0&&score>=80;
  let feedback=matched?'原料、比例与手法相得益彰，这杯做得很漂亮。':missing.length?`还缺少${missing.slice(0,2).join('、')}，也可以把这一杯作为原创留下。`:techFit<1?'原料已经到位，再完成配方里的关键手法，会更接近目标。':layerRecipe&&s.mixing>.5?'你把渐变搅成了暖色，也可以把它留作自己的版本。':'这一杯有了自己的比例和性格，试着为它取个名字。';
  if(actualTotal===0)feedback='先为杯子加入一点液体。';
  return {score,matched,feedback,missing};
}
