import { describe,it,expect } from 'vitest';
import { recipeById,recipes } from '../domain/catalog';
import { addIngredient,applyTechnique,createSession,occupiedVolume } from '../domain/session';
import { vesselGeometry,vesselSurfaceY,vesselFill } from './vessel';

describe('coffee vessels and containment',()=>{
  it('uses handled coffee cups for all latte recipes',()=>{
    for(const id of ['latte','iced-latte','coconut-cloud'])expect(vesselGeometry(recipeById[id].vessel).coffeeCup).toBe(true);
    expect(vesselGeometry(recipeById.latte.vessel).opaque).toBe(true);
    expect(vesselGeometry(recipeById['iced-latte'].vessel).opaque).toBe(false);
  });
  it('keeps the liquid surface inside the actual cup at every fill level',()=>{
    for(const r of recipes){
      const c=vesselGeometry(r.vessel);
      for(const fill of [0,.01,.5,1,1.5]){
        const y=vesselSurfaceY(c,r.capacity*fill,r.capacity);
        expect(y,r.id).toBeGreaterThanOrEqual(c.y);
        expect(y,r.id).toBeLessThanOrEqual(c.y+c.h);
        if(c.opaque)expect(y-c.y).toBeLessThan(c.rimDepth-6);
      }
    }
    expect(vesselFill(300,300)).toBe(.9);
    expect(vesselFill(400,300)).toBe(.9);
  });
  it('does not let foam exceed the actual coffee cup capacity',()=>{
    const r=recipeById.latte;
    const full=addIngredient(createSession(r),'milk',r.capacity,r.capacity);
    const foamed=applyTechnique(full,'foam',10);
    expect(occupiedVolume(foamed)).toBeLessThanOrEqual(r.capacity);
    expect(foamed.foam).toBe(0);
    const almost=addIngredient(createSession(r),'milk',r.capacity-3,r.capacity);
    expect(occupiedVolume(applyTechnique(almost,'foam',10))).toBeCloseTo(r.capacity);
  });
});
