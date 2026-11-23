import sharp from 'sharp';
import { readdir,stat } from 'node:fs/promises';
import path from 'node:path';
const directory=path.resolve('public/assets');
for(const file of await readdir(directory)){
  if(!file.endsWith('.png'))continue;
  const input=path.join(directory,file),output=input.replace(/\.png$/,'.webp');
  await sharp(input).resize(1000,1000,{fit:'inside',withoutEnlargement:true}).webp({quality:88,alphaQuality:95,effort:5}).toFile(output);
  const before=(await stat(input)).size,after=(await stat(output)).size;
  process.stdout.write(`${file}: ${Math.round(before/1024)} KB → ${Math.round(after/1024)} KB\n`);
}
