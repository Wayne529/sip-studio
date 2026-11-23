import { useId } from 'react';
import type { Ingredient } from '../domain/catalog';

export function IngredientArt({ingredient:i}:{ingredient:Ingredient}){
  const uid=useId().replaceAll(':','');
  return <svg className="ingredient-art" viewBox="0 0 70 76" aria-hidden="true">
    <defs><linearGradient id={uid} x1="0" y1="0" x2="1" y2=".2"><stop stopColor="#fff" stopOpacity=".75"/><stop offset=".35" stopColor={i.color} stopOpacity=".4"/><stop offset="1" stopColor={i.color} stopOpacity=".9"/></linearGradient><linearGradient id={uid+'g'} x1="0" x2="1"><stop stopColor="#e5eeeb" stopOpacity=".25"/><stop offset=".3" stopColor="#fff" stopOpacity=".7"/><stop offset=".8" stopColor="#d5e1dc" stopOpacity=".15"/><stop offset="1" stopColor="#fff" stopOpacity=".8"/></linearGradient></defs>
    {i.icon==='ice'?<g stroke="#aebebd" strokeWidth="1.1" fill={'url(#'+uid+'g)'}><path d="m10 35 19-6 13 10-3 23-21 3-10-11z"/><path d="m33 18 17-6 12 11-2 21-20 3-10-10z"/><path d="m33 46 19-4 10 9-2 17-20 2-9-9z"/><path d="m10 35 12 10 20-6M22 45l-4 20m15-47 11 9 18-4M44 27l-4 20m-7-1 10 9 19-4m-19 4-3 15" fill="none" strokeOpacity=".7"/></g>:
      i.icon==='coffee'?<g><ellipse cx="34" cy="65" rx="22" ry="4" fill="#806e54" opacity=".12"/><path d="M13 28h40l-4 34q-15 7-31 0Z" fill={'url(#'+uid+'g)'} stroke="#bdc5bd"/><path d="M17 35h32l-3 25q-13 5-26 0Z" fill={i.color}/><ellipse cx="33" cy="35" rx="16" ry="4" fill="#bc8b43"/><ellipse cx="33" cy="27" rx="20" ry="4" fill="none" stroke="#d6d9cf"/><path d="m21 40 2 17" stroke="white" strokeOpacity=".55" strokeWidth="2"/></g>:
      i.icon==='milk'?<g><path d="M19 19h25l4 7v36q-15 8-31 0V27Z" fill="#f2eddf" stroke="#c9c5b9"/><path d="M47 29c25-1 22 26 0 26" stroke="#c8c7bd" strokeWidth="4" fill="none"/><path d="m20 17 29-3-6 11H18Z" fill="#f7f5ee" stroke="#c9c5b9"/><path d="M23 30v26" stroke="white" strokeWidth="4" opacity=".8"/></g>:
      i.icon==='mint'?<g fill="#77896b" stroke="#596f54"><path d="m34 65 1-45"/><ellipse cx="25" cy="33" rx="11" ry="18" transform="rotate(-35 25 33)"/><ellipse cx="44" cy="42" rx="11" ry="18" transform="rotate(35 44 42)"/><path d="m17 22 18 25 15-18" fill="none" stroke="#b8c3a3"/></g>:
      i.icon==='sugar'?<g fill="#f5efe0" stroke="#cfc8b7"><path d="m17 37 19-7 16 9v21l-21 7-14-9Z"/><path d="m17 37 14 10 21-8m-21 8v20" fill="none"/></g>:
      i.icon==='bean'?<g fill="#77503a" stroke="#3e3026"><ellipse cx="27" cy="43" rx="12" ry="18" transform="rotate(30 27 43)"/><ellipse cx="46" cy="51" rx="10" ry="15" transform="rotate(-20 46 51)"/><path d="m28 28-2 28m19-17 2 23" stroke="#d2ad81" fill="none"/></g>:
      <g><ellipse cx="35" cy="67" rx="20" ry="4" fill="#544e40" opacity=".1"/><path d="M27 14h16v15l9 9v25q-17 7-34 0V38l9-9Z" fill={'url(#'+uid+'g)'} stroke="#bfc8be" strokeWidth="1.1"/><path d="M20 43h30v19q-14 5-30 0Z" fill={'url(#'+uid+')'}/><rect x="26" y="9" width="18" height="8" rx="2" fill={i.category==='spirit'?'#7e7056':'#c9b390'}/><path d="M25 39v20" stroke="#fff" opacity=".7" strokeWidth="3"/><path d="m28 20 2 10" stroke="#fff" opacity=".7" strokeWidth="2"/></g>}
  </svg>;
}
