import { describe,it,expect } from 'vitest';
import { ingredientById,recipes,recipeById } from './catalog';
import { addIngredient,applyTechnique,assess,createSession,liquidVolume,occupiedVolume,pourAmount,currentStep } from './session';
import { FluidField } from '../render/FluidField';

describe('drink rules',()=>{
  it('defines all 22 recipes with valid ingredients and enough capacity',()=>{
    expect(recipes).toHaveLength(22);
    for(const r of recipes){let s=createSession(r);for(const[id,n]of Object.entries(r.composition)){expect(ingredientById[id]).toBeDefined();s=addIngredient(s,id,n,r.capacity);}expect(occupiedVolume(s)).toBeLessThanOrEqual(r.capacity);for(const[id,n]of Object.entries(r.composition))expect(s.composition[id]).toBeCloseTo(n);}
  });
  it('adds the same volume at different frame rates',()=>{
    const elapsed=2.4,rate=35;
    for(const fps of [15,30,60,120]){let volume=0;for(let t=0;t<Math.round(elapsed*fps);t++)volume+=pourAmount(rate,1/fps,500-volume);expect(volume).toBeCloseTo(84);}
  });
  it('does not exceed available capacity, including ice displacement',()=>{
    let s=createSession(recipeById['iced-latte']);s=addIngredient(s,'ice',2,300);s=addIngredient(s,'milk',400,300);expect(liquidVolume(s)).toBe(268);expect(occupiedVolume(s)).toBe(300);expect(addIngredient(s,'espresso',30,300)).toBe(s);
  });
  it('rejects negative, nonfinite and unknown additions without mutation',()=>{
    const s=createSession(recipeById['iced-latte']);for(const n of [-1,NaN,Infinity])expect(addIngredient(s,'milk',n,300)).toBe(s);expect(addIngredient(s,'unknown',30,300)).toBe(s);expect(pourAmount(35,NaN,200)).toBe(0);
  });
  it('filters ice but conserves liquid composition',()=>{
    let s=createSession(recipeById['margarita']);s=addIngredient(s,'tequila',50,250);s=addIngredient(s,'ice',2,250);s=applyTechnique(s,'shake',3);const volume=liquidVolume(s);s=applyTechnique(s,'strain');expect(s.composition.ice).toBeUndefined();expect(liquidVolume(s)).toBe(volume);expect(s.activeVessel).toBe('glass');expect(s.filtered).toBe(true);
  });
  it('keeps carbonation out of the shaker and requires shaking before straining',()=>{
    const s=createSession(recipeById['margarita']);expect(addIngredient(s,'soda',50,250)).toBe(s);expect(applyTechnique(s,'strain')).toBe(s);
  });
  it('a missing core ingredient cannot pass by matching color or technique',()=>{
    let s=createSession(recipeById['iced-latte']);s=addIngredient(s,'milk',180,300);const result=assess(recipeById['iced-latte'],s);expect(result.matched).toBe(false);expect(result.missing).toContain('浓缩');
  });
  it('recognizes a complete classic and advances its guide steps',()=>{
    const r=recipeById['iced-latte'];let s=createSession(r);for(const[id,n]of Object.entries(r.composition))s=addIngredient(s,id,n,r.capacity);expect(assess(r,s).matched).toBe(true);expect(assess(r,s).score).toBe(100);expect(currentStep(r,s)).toBe(r.steps.length);
  });
  it('mixing cannot spontaneously restore a layered drink',()=>{
    let s=createSession(recipeById['tequila-sunrise']);s=addIngredient(s,'orange',90,250);s=applyTechnique(s,'stir',4);const mixing=s.mixing;const next=addIngredient(s,'tequila',45,250);expect(next.mixing).toBe(mixing);
  });
  it('can restore an earlier immutable snapshot without leftover additions',()=>{
    const before=addIngredient(createSession(recipeById['iced-latte']),'milk',150,300);const saved=structuredClone(before);const after=addIngredient(before,'espresso',30,300);expect(after.composition.espresso).toBe(30);expect(saved.composition.espresso).toBeUndefined();expect(liquidVolume(saved)).toBe(150);
  });
  it('requires actual milk before allowing foam',()=>{
    let s=addIngredient(createSession(recipeById['flat-white']),'espresso',40,250);expect(applyTechnique(s,'foam',3)).toBe(s);s=addIngredient(s,'milk',100,250);expect(applyTechnique(s,'foam',3).foam).toBeGreaterThan(0);
  });
  it('completes every configured guide including shaker ice after filtering',()=>{
    for(const r of recipes){let s=createSession(r);for(const[id,n]of Object.entries(r.composition))s=addIngredient(s,id,n,r.capacity);for(const kind of r.techniques)s=applyTechnique(s,kind,kind==='shake'?3:kind==='foam'||kind==='stir'?2:1);expect(currentStep(r,s),r.id).toBe(r.steps.length);expect(assess(r,s).matched,r.id).toBe(true);}
  });
});

describe('bounded fluid field',()=>{
  it('stays finite after injection, obstacles and repeated stirring',()=>{
    const f=new FluidField(24,36);f.top=8;f.fill([.96,.93,.86],.97);f.inject(13,10,[.25,.12,.06],.98,1.2);f.solid[f.index(12,20)]=1;
    for(let n=0;n<80;n++){f.swirl(12,22,.1);f.step(1/60,.1,[.7,.5,.3],.98);}
    for(const field of [f.u,f.v,f.r,f.g,f.b,f.a])expect(Array.from(field).every(Number.isFinite)).toBe(true);
  });
});
