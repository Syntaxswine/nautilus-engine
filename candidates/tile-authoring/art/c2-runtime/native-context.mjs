import {fail} from './common.mjs';
const observed=new WeakMap();
/** Real platform context, including only aliases registered over a brand-checked raw context. */
export function actualWebGL2Context(context){
 const raw=observed.get(context)??context,C=globalThis.WebGL2RenderingContext;
 if(typeof C!=='function'||!(raw instanceof C))fail('ACTUAL_WEBGL_CONTEXT_REQUIRED');
 try{C.prototype.isContextLost.call(raw);}catch{fail('ACTUAL_WEBGL_CONTEXT_REQUIRED');}
 return raw;
}
export function registerObservedWebGL2Context(context,raw){
 raw=actualWebGL2Context(raw);if(observed.has(context)&&observed.get(context)!==raw)fail('NATIVE_CONTEXT_ALIAS_CHANGED');observed.set(context,raw);
}
