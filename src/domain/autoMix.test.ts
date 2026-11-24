import { describe,it,expect } from 'vitest';
import { recipes,recipeById,ingredientById } from './catalog';
import { createAutoMix,advanceAutoMix } from './autoMix';
import { assess,currentStep,occupiedVolume } from './session';

describe('automatic mixing',()=>{
  it('plays every recipe to completion with exact ingredients and required techniques',()=>{
    for(const recipe of recipes){
      let p=createAutoMix(recipe);
      for(let n=0;n<2000&&p.phase!=='complete';n++){
        p=advanceAutoMix(recipe,p,.04);
        expect(occupiedVolume(p.session),recipe.id).toBeLessThanOrEqual(recipe.capacity+1e-6);
      }
      expect(p.phase,recipe.id).toBe('complete');
      expect(currentStep(recipe,p.session),recipe.id).toBe(recipe.steps.length);
      expect(assess(recipe,p.session).matched,recipe.id).toBe(true);
      for(const[id,target]of Object.entries(recipe.composition)){
        if(id==='ice'&&recipe.techniques.includes('strain'))expect(p.session.composition.ice).toBeUndefined();
        else expect(p.session.composition[id],recipe.id+':'+id).toBeCloseTo(target,6);
      }
    }
  });
  it('produces the same completed drink across playback frame rates',()=>{
    const recipe=recipeById['margarita'];
    const reference=advanceAutoMix(recipe,createAutoMix(recipe),120);
    for(const fps of [15,30,60,120]){
      let p=createAutoMix(recipe);
      for(let n=0;n<120*fps&&p.phase!=='complete';n++)p=advanceAutoMix(recipe,p,1/fps);
      expect(p.phase).toBe('complete');
      for(const[id,amount]of Object.entries(reference.session.composition))expect(p.session.composition[id]).toBeCloseTo(amount,6);
      expect(p.session.filtered).toBe(true);
    }
  });
  it('adds gradually, keeps solid units whole and waits before finishing',()=>{
    const recipe=recipeById['iced-latte'];let p=createAutoMix(recipe);
    p=advanceAutoMix(recipe,p,.2);expect(p.session.composition.ice??0).toBe(0);
    p=advanceAutoMix(recipe,p,.2);expect(p.session.composition.ice).toBe(1);
    for(let n=0;n<200&&p.phase!=='complete';n++){
      p=advanceAutoMix(recipe,p,.04);
      for(const[id,value]of Object.entries(p.session.composition))if(ingredientById[id].unit!=='ml')expect(Number.isInteger(value)).toBe(true);
    }
    expect(p.phase).toBe('complete');
  });
  it('uses gentle pouring for layered syrup and remains unchanged without advancing time',()=>{
    const recipe=recipeById['tequila-sunrise'];const initial=createAutoMix(recipe);
    expect(advanceAutoMix(recipe,initial,0)).toBe(initial);
    expect(advanceAutoMix(recipe,initial,NaN)).toBe(initial);
    const end=advanceAutoMix(recipe,initial,120);
    expect(end.session.additions.filter(a=>a.id==='grenadine').every(a=>a.gentle)).toBe(true);
    expect(end.session.mixing).toBe(0);
    expect(advanceAutoMix(recipe,end,10)).toBe(end);
  });
});
