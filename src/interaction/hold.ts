interface HoldTarget extends EventTarget {
  setPointerCapture?(pointerId:number):void;
  focus?(options:FocusOptions):void;
}

/** Bind directly so touch cancellation is non-passive on mobile browsers. */
export function bindHold(target:HoldTarget,globalTarget:EventTarget,start:()=>void,stop:()=>void,visibilityTarget?:EventTarget&{hidden:boolean}){
  let active:{pointer:number}|{key:string}|null=null;
  const cleanups:Array<()=>void>=[];
  const listen=(node:EventTarget,type:string,handler:(event:Event)=>void,options?:AddEventListenerOptions)=>{
    node.addEventListener(type,handler,options);
    cleanups.push(()=>node.removeEventListener(type,handler,options));
  };
  const prevent=(event:Event)=>{if(event.cancelable)event.preventDefault();};
  const finish=()=>{if(!active)return;active=null;stop();};
  listen(target,'pointerdown',event=>{
    const e=event as PointerEvent;
    prevent(e);
    if(e.isPrimary===false||e.button!==0)return;
    if(active&&'key'in active)return;
    if(active)finish();
    active={pointer:e.pointerId};
    target.focus?.({preventScroll:true});
    // Global release/cancel listeners remain the fallback if capture is unavailable.
    try{target.setPointerCapture?.(e.pointerId);}catch{/* Pointer was cancelled before capture. */}
    start();
  });
  const release=(event:Event)=>{
    if(active&&'pointer'in active&&active.pointer===(event as PointerEvent).pointerId)finish();
  };
  listen(globalTarget,'pointerup',release);
  listen(globalTarget,'pointercancel',release);
  listen(target,'lostpointercapture',release);
  listen(globalTarget,'blur',finish);
  listen(target,'blur',finish);
  if(visibilityTarget)listen(visibilityTarget,'visibilitychange',()=>{if(visibilityTarget.hidden)finish();});
  listen(target,'keydown',event=>{
    const e=event as KeyboardEvent;
    if(e.key!==' '&&e.key!=='Enter')return;
    prevent(e);
    if(active||e.repeat)return;
    active={key:e.key};start();
  });
  listen(target,'keyup',event=>{
    const e=event as KeyboardEvent;
    if(active&&'key'in active&&active.key===e.key){prevent(e);finish();}
  });
  for(const type of ['touchstart','touchmove','contextmenu','selectstart','dragstart']){
    listen(target,type,prevent,{passive:false});
  }
  return()=>{cleanups.forEach(cleanup=>cleanup());finish();};
}
