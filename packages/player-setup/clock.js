import {number} from '../native-actors/data.js';

// The new-game clock is an owned provider. Retained hosts instead publish the
// same before/after phases from their existing clock; they are never started.
export function createFrameClock({world,window,auto=true,elapsedSeconds=0}){
  number(elapsedSeconds,0,1e12);const listeners=new Set(),owners=new Set();let frame=0,last=0,active=false,retired=false,epoch=0;
  const notify=event=>{for(const fn of [...listeners])try{fn(event);}catch{}};
  function tick(seconds){number(seconds,0,.1);if(retired)throw Error('Clock retired.');const blocked=owners.size>0;
    notify({phase:'before',seconds,blocked});if(!owners.size){world.advance(seconds);elapsedSeconds+=seconds;}notify({phase:'after',seconds,blocked:owners.size>0});}
  function loop(now,stamp){if(!active||retired||stamp!==epoch)return;const seconds=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;tick(seconds);if(active&&stamp===epoch)frame=window.requestAnimationFrame(t=>loop(t,stamp));}
  const pause={acquire(owner){let disposed=false;return {setBlocked(value){if(disposed)return;if(value)owners.add(owner);else owners.delete(owner);},dispose(){if(disposed)return;disposed=true;owners.delete(owner);}};}};
  return Object.freeze({kind:'owned-player-clock',subscribe(fn){if(retired)throw Error('Clock retired.');listeners.add(fn);return ()=>listeners.delete(fn);},tick,pause,
    read:()=>({elapsedSeconds,blocked:owners.size>0}),activate(){if(retired||active)return;active=true;last=0;const stamp=++epoch;if(auto)frame=window.requestAnimationFrame(t=>loop(t,stamp));},
    suspend(){active=false;++epoch;window.cancelAnimationFrame(frame);frame=0;last=0;},
    dispose(){if(retired)return;retired=true;active=false;++epoch;window.cancelAnimationFrame(frame);listeners.clear();owners.clear();}});
}

export function createRetainedFrameSource(){const listeners=new Set();return Object.freeze({
  subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  beforeStep(seconds,blocked=false){number(seconds,0,.1);for(const fn of [...listeners])fn({phase:'before',seconds,blocked});},
  afterStep(seconds,blocked=false){number(seconds,0,.1);for(const fn of [...listeners])fn({phase:'after',seconds,blocked});}
});}
