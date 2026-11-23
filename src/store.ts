import { create } from 'zustand';
import { recipeById, type Family, type Technique } from './domain/catalog';
import { createSession, addIngredient, applyTechnique, type Session, type Mode } from './domain/session';
import { db } from './storage/database';

interface AtelierStore {
  family:Family; selectedRecipe:string; session:Session; history:Session[];
  sound:boolean; quality:'high'|'medium'|'low'; reducedMotion:boolean; selectedIngredient:string;
  setFamily:(family:Family)=>void;
  setRecipe:(id:string)=>void;
  start:(id:string,mode:Mode)=>void;
  checkpoint:()=>void;
  add:(id:string,amount:number)=>void;
  technique:(kind:Technique,seconds?:number)=>void;
  undo:()=>void;
  setGentle:(value:boolean)=>void;
  setIngredient:(id:string)=>void;
  toggleSound:()=>void;
  setQuality:(quality:AtelierStore['quality'])=>void;
  setReducedMotion:(value:boolean)=>void;
  restore:(session:Session)=>void;
}
export const useAtelier=create<AtelierStore>((set,get)=>({
  family:'coffee',selectedRecipe:'iced-latte',session:createSession(recipeById['iced-latte']),history:[],
  sound:localStorage.getItem('atelier-sound')==='true',quality:'medium',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,selectedIngredient:'ice',
  setFamily:family=>set({family,selectedRecipe:family==='coffee'?'iced-latte':'tequila-sunrise'}),
  setRecipe:id=>set({selectedRecipe:id,family:recipeById[id].family}),
  start:(id,mode)=>set({session:createSession(recipeById[id],mode),selectedRecipe:id,selectedIngredient:recipeById[id].steps[0]?.ingredientId??'espresso',history:[]}),
  checkpoint:()=>set(s=>({history:[...s.history.slice(-11),structuredClone(s.session)]})),
  add:(id,amount)=>set(s=>({session:addIngredient(s.session,id,amount,recipeById[s.session.recipeId].capacity)})),
  technique:(kind,seconds)=>set(s=>({session:applyTechnique(s.session,kind,seconds)})),
  undo:()=>{const s=get();if(!s.history.length)return;set({session:s.history.at(-1)!,history:s.history.slice(0,-1)});},
  setGentle:gentle=>set(s=>({session:{...s.session,gentle}})),
  setIngredient:selectedIngredient=>set({selectedIngredient}),
  toggleSound:()=>set(s=>{localStorage.setItem('atelier-sound',String(!s.sound));return{sound:!s.sound};}),
  setQuality:quality=>set({quality}),setReducedMotion:reducedMotion=>set({reducedMotion}),
  restore:session=>set({session,selectedRecipe:session.recipeId,family:recipeById[session.recipeId].family,history:[]}),
}));

let persistTimer:ReturnType<typeof setTimeout>;
useAtelier.subscribe((state,previous)=>{
  if(state.session===previous.session)return;
  clearTimeout(persistTimer);
  persistTimer=setTimeout(()=>{db.drafts.put({id:'current',session:structuredClone(state.session),updatedAt:Date.now()}).catch(()=>{});},500);
});
