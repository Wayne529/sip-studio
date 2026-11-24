import { useEffect, useRef, type ReactNode } from 'react';
import { bindHold } from '../interaction/hold';

export function HoldButton({className,children,onStart,onStop}:{className?:string;children:ReactNode;onStart:()=>void;onStop:()=>void}){
  const button=useRef<HTMLButtonElement>(null);
  const callbacks=useRef({onStart,onStop});
  callbacks.current={onStart,onStop};
  useEffect(()=>{
    if(!button.current)return;
    return bindHold(button.current,window,()=>callbacks.current.onStart(),()=>callbacks.current.onStop(),document);
  },[]);
  return <button ref={button} type="button" className={className}>{children}</button>;
}
