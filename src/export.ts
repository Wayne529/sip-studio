import { ingredientById, recipeById } from './domain/catalog';
import type { SavedDrink } from './storage/database';
export async function exportDrink(drink:SavedDrink):Promise<void>{
  await document.fonts.ready;
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1500;const c=canvas.getContext('2d')!;
  const dark=recipeById[drink.recipeId].family==='cocktail';
  c.fillStyle=dark?'#18231f':'#f9f8f5';c.fillRect(0,0,1000,1500);
  c.fillStyle=dark?'#eeeae0':'#292824';c.font='28px sans-serif';c.fillText('杯中漫游  /  我的配方',80,100);
  if(drink.image){const image=await createImageBitmap(drink.image);const scale=Math.min(860/image.width,850/image.height);c.drawImage(image,(1000-image.width*scale)/2,135,image.width*scale,image.height*scale);image.close();}
  c.font='50px "Songti SC", serif';c.fillText(drink.name,80,1030,840);
  c.font='21px sans-serif';c.globalAlpha=.7;c.fillText(recipeById[drink.recipeId].en,80,1080);c.globalAlpha=1;
  c.strokeStyle=dark?'#5f695e':'#d6d1c5';c.beginPath();c.moveTo(80,1120);c.lineTo(920,1120);c.stroke();
  c.font='25px sans-serif';let y=1170;
  const entries=Object.entries(drink.session.composition).filter(([,n])=>n>0).slice(0,5);
  for(const[id,n]of entries){const i=ingredientById[id];c.textAlign='left';c.fillText(i.name,80,y);c.textAlign='right';c.fillText(`${Math.round(n*10)/10} ${i.unit}`,920,y);y+=46;}
  c.textAlign='left';c.globalAlpha=.5;c.font='20px sans-serif';c.fillText('亲手调制，留住这一杯。',80,1440);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('图片生成失败')),'image/png'));
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${drink.name}-饮品卡.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
