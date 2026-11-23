// Pass-through observations and explicit fault injection. This fixture never
// repairs renderer state, releases production orphans or changes runtime owners.
import * as T from '@nautilus-engine/map-core/render-effects/three';
export {T};
export const rows=[],records=new Map();
let serial=0,phase='startup',gate=null,inputHook=null,textureHook=null,fetchHook=null;
const ids=new WeakMap();export const id=o=>o&&typeof o==='object'?(ids.get(o)||((ids.set(o,++serial)),serial)):null;
export const mark=(type,data={})=>{const row={sequence:rows.length,phase,type,...data};rows.push(row);return row;};
export const setPhase=value=>{phase=value;mark('phase');};
export function watch(resource,kind){if(resource&&!records.has(resource))records.set(resource,{id:id(resource),kind,phase,calls:0});return resource;}
for(const [prototype,kind]of [[T.Texture.prototype,'texture'],[T.Material.prototype,'material'],[T.BufferGeometry.prototype,'geometry'],[T.RenderTarget.prototype,'target']]){
  const original=prototype.dispose;prototype.dispose=function(...args){const row=records.get(watch(this,kind));row.calls++;mark('dispose',{id:row.id,kind,call:row.calls});return original.apply(this,args);};
}
const needs=Object.getOwnPropertyDescriptor(T.Texture.prototype,'needsUpdate');Object.defineProperty(T.Texture.prototype,'needsUpdate',{...needs,set(value){watch(this,'texture');textureHook?.(this);return needs.set.call(this,value);}});
const load=T.TextureLoader.prototype.load;
T.TextureLoader.prototype.load=function(url,onLoad,onProgress,onError){
  const texture=load.call(this,url,value=>{mark('image-ready',{id:id(value)});const delivery=()=>{mark('image-delivery',{id:id(value)});onLoad?.(value);};if(gate){const held=gate;gate=null;held.texture=value;held.deliver=delivery;held.fail=()=>onError?.(Error('FIXTURE_IMAGE_FAILURE'));held.resolve();mark('image-held',{id:id(value)});}else delivery();},onProgress,onError);
  watch(texture,'input');inputHook?.(texture);mark('image-placeholder',{id:id(texture)});return texture;
};
const fetch=window.fetch;window.fetch=function(input,options){mark('fetch',{url:String(input?.url||input)});fetchHook?.(input,options);return fetch.call(this,input,options);};
const create=URL.createObjectURL,revoke=URL.revokeObjectURL,blobs=new Set();URL.createObjectURL=function(...args){const value=create.apply(this,args);blobs.add(value);mark('blob-create',{url:value});return value;};URL.revokeObjectURL=function(value){blobs.delete(value);mark('blob-revoke',{url:value});return revoke.call(this,value);};
export function holdImage(){if(gate)throw Error('Only one image gate.');let resolve;const held={ready:new Promise(r=>resolve=r),resolve:()=>resolve()};gate=held;return held;}
export function hooks({input=null,texture=null,fetch=null}={}){inputHook=input;textureHook=texture;fetchHook=fetch;}
export const outstandingBlobs=()=>[...blobs];
export function attachRenderer(renderer){
  const render=renderer.render,setTarget=renderer.setRenderTarget;let drawHook=null,targetHook=null;
  renderer.render=function(scene,camera){scene.traverse(o=>{if(o.geometry)watch(o.geometry,'geometry');for(const material of Array.isArray(o.material)?o.material:[o.material])if(material)watch(material,'material');});drawHook?.(scene,camera);return render.call(this,scene,camera);};
  renderer.setRenderTarget=function(target,...args){if(target){watch(target,'target');watch(target.texture,'texture');watch(target.depthTexture,'texture');}targetHook?.(target,...args);return setTarget.call(this,target,...args);};
  return {inject({draw=null,target=null}={}){drawHook=draw;targetHook=target;}};
}
export function state(renderer){const gl=renderer.getContext();return {target:id(renderer.getRenderTarget()),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new T.Vector4()).toArray(),physicalViewport:renderer.getCurrentViewport(new T.Vector4()).toArray(),glViewport:Array.from(gl.getParameter(gl.VIEWPORT)),scissor:renderer.getScissor(new T.Vector4()).toArray(),glScissor:Array.from(gl.getParameter(gl.SCISSOR_BOX)),test:renderer.getScissorTest(),glTest:gl.getParameter(gl.SCISSOR_TEST),space:renderer.outputColorSpace,tone:renderer.toneMapping,clear:renderer.getClearColor(new T.Color()).toArray(),alpha:renderer.getClearAlpha()};}
export const memory=r=>({textures:r.info.memory.textures,geometries:r.info.memory.geometries,programs:r.info.programs.length});
export function errorTree(e){return e?{name:e.name,message:e.message,...(e.errors?{errors:[...e.errors].map(errorTree)}:{}),...(e.cause?{cause:errorTree(e.cause)}:{})}:null;}
export function snapshot(start=0){return [...records].filter(([,r])=>r.id>start).map(([o,r])=>({...r,width:o.image?.width||o.width,height:o.image?.height||o.height,data:!!o.isDataTexture,depth:!!o.isDepthTexture,renderTexture:!!o.isRenderTargetTexture}));}
export const cursor=()=>serial;
