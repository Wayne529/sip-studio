import { useId } from 'react';
import { ingredientById, type Recipe } from '../domain/catalog';
import { occupiedVolume, type Session } from '../domain/session';
import { cupInteriorPath,vesselGeometry,vesselSurfaceY } from '../render/vessel';

export function CoffeeCupArt({recipe,session}:{recipe:Recipe;session?:Session}){
  const id=useId().replace(/:/g,''),c=vesselGeometry(recipe.vessel),composition=session?.composition??recipe.composition;
  const entries=Object.entries(composition).filter(([key,amount])=>ingredientById[key].unit==='ml'&&amount>0);
  const occupied=session?occupiedVolume(session):entries.reduce((sum,[,n])=>sum+n,0)+(composition.ice??0)*16;
  const y=vesselSurfaceY(c,occupied,recipe.capacity),foam=session?.foam??(recipe.techniques.includes('foam')?.7:0);
  let weight=0;const rgb=[0,0,0];
  for(const[key,amount]of entries){const ing=ingredientById[key],w=amount*ing.opacity;weight+=w;for(let n=0;n<3;n++)rgb[n]+=parseInt(ing.color.slice(1+n*2,3+n*2),16)*w;}
  const color=`rgb(${rgb.map(n=>Math.round(n/Math.max(weight,.001))).join(',')})`;
  const frame=<image href={'./assets/'+c.asset} width="440" height="500"/>;
  return <svg className="coffee-cup-art" viewBox="0 0 440 500" role="img" aria-label={`${recipe.name}咖啡杯`}>
    <defs><clipPath id={id+'-cup'}>{c.opaque?<ellipse cx={c.x+c.w/2} cy={c.y} rx={c.w/2-9} ry={c.rimDepth-6}/>:<path d={cupInteriorPath(c)}/>}</clipPath>
      <linearGradient id={id+'-liquid'} x1="0" y1="0" x2="0" y2="1">{(entries.length>1?entries:[...entries,...entries]).map(([key],n,all)=><stop key={n} offset={`${n/Math.max(1,all.length-1)*100}%`} stopColor={ingredientById[key].color}/>)}</linearGradient></defs>
    {c.opaque&&frame}
    {entries.length>0&&<g clipPath={`url(#${id}-cup)`}>{c.opaque?<ellipse cx={c.x+c.w/2} cy={c.y+4} rx={c.w/2-11} ry={c.rimDepth-6} fill={color}/>:<rect x={c.x} y={y} width={c.w} height={c.y+c.h-y} fill={`url(#${id}-liquid)`} opacity=".94"/>}
      {foam>0&&<ellipse cx={c.x+c.w/2} cy={c.opaque?c.y+3:y} rx={c.w*.44} ry={c.opaque?c.rimDepth-8:10+foam*12} fill="#f4e9d7" opacity={Math.min(.97,foam+.3)}/>}
    </g>}
    {!c.opaque&&frame}
  </svg>;
}
