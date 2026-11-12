import * as T from '../render-effects/three.js';
import {createAnimalPaint} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/animal-motion-paint.js';
import {createNativeBody} from './body.js';
import {nativeActor,nativeActorResources} from './index.js';
import {abort} from './data.js';
export {nativeActor,nativeActorResources};

async function resource(record,signal,resolve,fetchResource){const url=new URL(resolve(record.url),import.meta.url);if(url.origin!==new URL(import.meta.url).origin)throw Error('ACTOR_RESOURCE_ORIGIN: keep resources in the installed package origin.');
  const response=await fetchResource(url.href,{signal});if(!response.ok)throw Error('ACTOR_RESOURCE_MISSING: '+record.path);const bytes=await response.arrayBuffer();abort(signal);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(bytes.byteLength!==record.bytes||hash!==record.sha256)throw Error('ACTOR_RESOURCE_HASH: '+record.path);return bytes;}

export async function prepareNativeActor({renderer,model='goat',actorId,roles=['idle','walk'],motion='native-gait',checkpoint,signal,resourceURL=url=>url,fetchResource=globalThis.fetch}={}){
  const spec=nativeActor(model,roles);if(!(renderer instanceof T.WebGLRenderer)||typeof fetchResource!=='function')throw Error('ACTOR_RENDERER_REQUIRED: supply the existing shared Three renderer.');abort(signal);
  const parentSignal=signal,controller=new AbortController(),cancel=()=>controller.abort();parentSignal?.addEventListener('abort',cancel,{once:true});signal=controller.signal;
  let body,paint,texture,blob;const [dataRecord,paintRecord]=nativeActorResources(model);
  try{
    const [dataBytes,paintBytes]=await Promise.all([resource(dataRecord,signal,resourceURL,fetchResource),resource(paintRecord,signal,resourceURL,fetchResource)]);abort(signal);
    body=createNativeBody({model,actorId,data:JSON.parse(new TextDecoder().decode(dataBytes)),motion,...(checkpoint?{checkpoint}:{})});
    blob=URL.createObjectURL(new Blob([paintBytes],{type:'image/png'}));texture=await new T.TextureLoader().loadAsync(blob);abort(signal);
    const target=renderer.getRenderTarget(),viewport=renderer.getViewport(new T.Vector4()),scissor=renderer.getScissor(new T.Vector4()),scissorTest=renderer.getScissorTest();
    try{paint=await createAnimalPaint(renderer,body.worker,{id:model,paint:blob,frame:spec.frame},{loadAsync:async url=>{if(url!==blob)throw Error('ACTOR_ROLE_RESOURCE_UNAVAILABLE: undeclared outfit/animation resource.');return texture;}},'normal',true);}
    finally{renderer.setRenderTarget(target);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);}
    abort(signal);body.worker.parts.forEach(part=>{part.material=paint.material;part.castShadow=true;});
    let retired=false,active=false;body.root.visible=false;
    return Object.freeze({root:body.root,spec,updateConfirmed(pose,options){const result=body.update(pose,options);body.root.visible=active&&pose.mode==='on-foot';return {...result,visible:body.root.visible};},checkpoint:()=>body.checkpoint(),
      setActive(value){if(retired)return;active=!!value;body.root.visible=active&&body.checkpoint().last?.mode==='on-foot';},
      dispose(){if(retired)return;retired=true;active=false;body.root.visible=false;const errors=[];for(const close of [()=>body.root.removeFromParent(),()=>paint.dispose(),()=>body.dispose()])try{close();}catch(e){errors.push(e);}if(errors.length)throw new AggregateError(errors,'Native actor view cleanup failed.');}});
  }catch(error){controller.abort();const errors=[error];for(const close of [()=>paint?.dispose(),()=>{if(!paint)texture?.dispose();},()=>body?.dispose()])try{close();}catch(e){errors.push(e);}if(errors.length>1)throw new AggregateError(errors,'Native actor preparation/cleanup failed.');throw error;}
  finally{parentSignal?.removeEventListener('abort',cancel);if(blob)URL.revokeObjectURL(blob);}
}
