import * as T from '../render-effects/three.js';
import {abort} from './data.js';

export function abortable(promise,signal){
  return new Promise((resolve,reject)=>{
    let finished=false;
    const finish=(fn,value)=>{if(finished)return;finished=true;signal?.removeEventListener('abort',cancel);fn(value);},cancel=()=>{try{abort(signal);}catch(error){finish(reject,error);}};
    Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  });
}

// TextureLoader owns one synchronous placeholder and never supports abort.
// Retire that exact owned object on cancellation; a late callback has no right
// to publish it or start projection, even if the callback never arrived before.
export function loadOwnedTexture(url,scope,signal,loader=new T.TextureLoader()){
  return new Promise((resolve,reject)=>{
    let texture,finished=false;
    const finish=(fn,value)=>{if(finished)return;finished=true;signal?.removeEventListener('abort',cancel);fn(value);},cancel=()=>{try{abort(signal);}catch(error){finish(reject,error);}};
    try{
      abort(signal);
      texture=loader.load(url,()=>queueMicrotask(()=>{if(finished)return;try{abort(signal);finish(resolve,texture);}catch(error){finish(reject,error);}}),undefined,error=>finish(reject,error instanceof Error?error:Error('ACTOR_PAINT_LOAD_FAILED: native image could not load.')));
      scope.own(texture);if(!finished){signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();}
    }catch(error){finish(reject,error);}
  });
}
