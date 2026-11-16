import {frozen} from './data.js';

// One input owner. World/actor state is read-only; blocked states do not resume
// released gestures when their menu closes.
export function createControlContext({release,install}) {
  let state=frozen({version:1,revision:0,mode:'unavailable',actorId:null,contextId:null,token:'0',blocked:true}),key='',retired=false,changing=false,queued=null;
  function update(snapshot,flags={}) {
    if(retired)return state;
    if(changing){queued=[snapshot,flags];return state;}
    changing=true;
    try {
      let turns=0,next=[snapshot,flags];
      do {
        if(++turns>8)throw Error('Control context re-entered too often.');queued=null;
        const [s,f]=next,mode=!s||f.unavailable?'unavailable':f.menu?'menu':f.hidden||f.paused?'paused':s.mode;
        const blocked=['unavailable','menu','paused'].includes(mode),stamp=JSON.stringify([mode,s?.actorId,s?.contextId]);
        if(stamp!==key||f.force){const prior=state;state=frozen({version:1,revision:prior.revision+1,mode,actorId:s?.actorId||null,contextId:s?.contextId||null,token:String(prior.revision+1)+'/'+stamp,blocked});key=stamp;release(prior,state);if(!retired)install(state,s);}
        else install(state,s);
        next=queued;
      }while(next&&!retired);
    }finally{changing=false;}
    return state;
  }
  return Object.freeze({update,get state(){return state;},dispose(){if(retired)return;retired=true;const prior=state;state=frozen({...prior,mode:'unavailable',blocked:true,revision:prior.revision+1});release(prior,state);}});
}
