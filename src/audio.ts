import { Howl } from 'howler';
let pour:Howl|undefined;
function noiseWav():string {
  const n=22050,buffer=new ArrayBuffer(44+n*2),v=new DataView(buffer);const str=(p:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,22050,true);v.setUint32(28,44100,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);
  let previous=0;for(let i=0;i<n;i++){previous=previous*.86+(Math.random()-.5)*.1;v.setInt16(44+i*2,previous*18000,true);}
  return URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));
}
export function setPourSound(active:boolean,enabled:boolean){
  if(!enabled){pour?.stop();return;}
  if(active){if(!pour)pour=new Howl({src:[noiseWav()],format:['wav'],loop:true,volume:.3});if(!pour.playing())pour.play();}else pour?.stop();
}
