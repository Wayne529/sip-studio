import { describe,it,expect,vi } from 'vitest';
import { bindHold } from './hold';

function send(target:EventTarget,type:string,props:Record<string,unknown>={}){
  const event=Object.assign(new Event(type,{cancelable:true}),props);
  target.dispatchEvent(event);return event;
}
function setup(){
  const target=new EventTarget(),globalTarget=new EventTarget(),start=vi.fn(),stop=vi.fn();
  const cleanup=bindHold(target,globalTarget,start,stop);
  return {target,globalTarget,start,stop,cleanup};
}
const pointer={pointerId:1,isPrimary:true,button:0};
describe('hold input',()=>{
  it('blocks native touch, selection, callout and drag defaults',()=>{
    const {target,cleanup}=setup();
    for(const type of ['touchstart','touchmove','selectstart','contextmenu','dragstart'])expect(send(target,type).defaultPrevented,type).toBe(true);
    cleanup();expect(send(target,'touchstart').defaultPrevented).toBe(false);
  });
  it('starts immediately and stops once on release outside the button',()=>{
    const {target,globalTarget,start,stop,cleanup}=setup();
    expect(send(target,'pointerdown',pointer).defaultPrevented).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);
    send(target,'pointerdown',{...pointer,pointerId:2,isPrimary:false});
    send(globalTarget,'pointerup',{pointerId:2});expect(stop).not.toHaveBeenCalled();
    send(globalTarget,'pointerup',pointer);send(target,'lostpointercapture',pointer);
    expect(stop).toHaveBeenCalledTimes(1);cleanup();
  });
  it.each(['pointercancel','lostpointercapture','blur'])('stops on %s and accepts the next press',type=>{
    const {target,globalTarget,start,stop,cleanup}=setup();
    send(target,'pointerdown',pointer);
    send(type==='lostpointercapture'?target:globalTarget,type,pointer);
    expect(stop).toHaveBeenCalledTimes(1);
    send(target,'pointerdown',pointer);expect(start).toHaveBeenCalledTimes(2);cleanup();
  });
  it('supports keyboard hold without repeating and stops on focus loss',()=>{
    const {target,start,stop,cleanup}=setup();
    send(target,'keydown',{key:' '});send(target,'keydown',{key:' ',repeat:true});
    expect(start).toHaveBeenCalledTimes(1);
    send(target,'keyup',{key:'ArrowRight'});expect(stop).not.toHaveBeenCalled();
    send(target,'blur');expect(stop).toHaveBeenCalledTimes(1);cleanup();
  });
  it('resets after the page is hidden even if no pointerup arrives',()=>{
    const target=new EventTarget(),globalTarget=new EventTarget();
    const visibility=Object.assign(new EventTarget(),{hidden:false});
    const start=vi.fn(),stop=vi.fn();
    const cleanup=bindHold(target,globalTarget,start,stop,visibility);
    send(target,'pointerdown',pointer);visibility.hidden=true;
    send(visibility,'visibilitychange');expect(stop).toHaveBeenCalledTimes(1);
    visibility.hidden=false;send(target,'pointerdown',pointer);
    expect(start).toHaveBeenCalledTimes(2);cleanup();
  });
  it('keeps working when pointer capture fails and cleans up an active hold',()=>{
    const {target,globalTarget,start,stop,cleanup}=setup();
    Object.assign(target,{setPointerCapture:()=>{throw new Error('capture unavailable');}});
    send(target,'pointerdown',pointer);expect(start).toHaveBeenCalledTimes(1);
    send(globalTarget,'pointerup',pointer);expect(stop).toHaveBeenCalledTimes(1);
    send(target,'pointerdown',pointer);cleanup();expect(stop).toHaveBeenCalledTimes(2);
    send(target,'pointerdown',pointer);expect(start).toHaveBeenCalledTimes(2);
  });
});
