import * as T from '../render-effects/three.js';
import {animalMotionRepairPaint} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/animal-motion-repair-paint.js';
import {createNativeModelPaint} from './model-paint.js';
import {createOwnedCleanup,nativeFailure} from './owned-cleanup.js';
import {withPaintRenderer} from './renderer-state.js';
import {abortable,loadOwnedTexture} from './loading.js';
import {createNativeBody} from './body.js';
import {nativeActor,nativeActorResources} from './index.js';
import {abort} from './data.js';
export {nativeActor,nativeActorResources};

async function resource(record,signal,resolve,fetchResource){const url=new URL(resolve(record.url),import.meta.url);if(url.origin!==new URL(import.meta.url).origin)throw Error('ACTOR_RESOURCE_ORIGIN: keep resources in the installed package origin.');
  const response=await fetchResource(url.href,{signal});if(!response.ok)throw Error('ACTOR_RESOURCE_MISSING: '+record.path);const bytes=await response.arrayBuffer();abort(signal);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');abort(signal);
  if(bytes.byteLength!==record.bytes||hash!==record.sha256)throw Error('ACTOR_RESOURCE_HASH: '+record.path);return bytes;}

export async function prepareNativeActor({renderer,model='goat',actorId,roles=['idle','walk'],motion='native-gait',checkpoint,footSupport,crawl,signal,resourceURL=url=>url,fetchResource=globalThis.fetch}={}){
  const spec=nativeActor(model,roles);if(!(renderer instanceof T.WebGLRenderer)||typeof fetchResource!=='function')throw Error('ACTOR_RENDERER_REQUIRED: supply the existing shared Three renderer.');abort(signal);
  const parentSignal=signal,controller=new AbortController(),cancel=()=>controller.abort();parentSignal?.addEventListener('abort',cancel,{once:true});signal=controller.signal;
  const ownership=createOwnedCleanup('Native actor owned cleanup failed.');
  let body,paint,blob,revoked=false;const [dataRecord,paintRecord]=nativeActorResources(model);
  const revoke=()=>{if(blob&&!revoked){revoked=true;URL.revokeObjectURL(blob);}};
  try{
    const [dataBytes,paintBytes]=await abortable(Promise.all([resource(dataRecord,signal,resourceURL,fetchResource),resource(paintRecord,signal,resourceURL,fetchResource)]),signal);abort(signal);
    body=createNativeBody({model,actorId,data:JSON.parse(new TextDecoder().decode(dataBytes)),motion,footSupport,crawl,...(checkpoint?{checkpoint}:{})});
    ownership.defer(()=>body.dispose());abort(signal);
    blob=URL.createObjectURL(new Blob([paintBytes],{type:'image/png'}));ownership.defer(revoke);
    const texture=await loadOwnedTexture(blob,ownership,signal);abort(signal);
    const paintOwnership=createOwnedCleanup('Native paint owned cleanup failed.');ownership.defer(()=>paintOwnership.dispose());
    paint=withPaintRenderer(renderer,()=>{
      try{
        const paintLayers=animalMotionRepairPaint({id:model,frame:spec.frame});
        if(paintLayers)paintOwnership.defer(()=>paintLayers.dispose());
        return createNativeModelPaint(renderer,body.worker,texture,{species:model,frame:spec.frame,sceneLighting:true,paintLayers,signal},paintOwnership);
      }catch(error){let cleanup;try{ownership.dispose();}catch(cause){cleanup=cause;}throw nativeFailure(error,cleanup,'Native paint preparation/cleanup failed.');}
    });
    abort(signal);body.worker.parts.forEach(part=>{part.material=paint.material;part.castShadow=true;});
    revoke();
    let retired=false,active=false;body.root.visible=false;
    return Object.freeze({root:body.root,spec,updateConfirmed(pose,options){const result=body.update(pose,options);body.root.visible=active&&pose.mode==='on-foot';return {...result,visible:body.root.visible};},checkpoint:()=>body.checkpoint(),
      setActive(value){if(retired)return;active=!!value;body.root.visible=active&&body.checkpoint().last?.mode==='on-foot';},
      dispose(){if(retired)return;retired=true;active=false;const errors=[];try{body.root.visible=false;}catch(error){errors.push(error);}try{ownership.dispose();}catch(error){errors.push(error);}if(errors.length)throw new AggregateError(errors,'Native actor view cleanup failed.');}});
  }catch(error){controller.abort();let cleanup;try{ownership.dispose();}catch(cause){cleanup=cause;}throw nativeFailure(error,cleanup,'Native actor preparation/cleanup failed.');}
  finally{parentSignal?.removeEventListener('abort',cancel);}
}
