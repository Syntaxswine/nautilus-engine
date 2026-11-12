import * as T from '../render-effects/three.js';
import {createGoatWorker} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/goat-worker.js';
import {createDonkeyWorker} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/donkey-worker.js';
import {createWorkerLocomotion} from './locomotion.js';
import {nativeActor,confirmedActorPose} from './index.js';
import {plain,fields,number,point,samePoint} from './data.js';
export function createNativeBody({model,actorId,data,motion='native-gait',checkpoint}){
  const spec=nativeActor(model);if(!['native-gait','neutral-only'].includes(motion))throw Error('Choose an implemented native motion profile.');
  const worker=({goat:createGoatWorker,donkey:createDonkeyWorker})[model](data),root=new T.Group();root.name='Native actor '+actorId;root.add(worker.root);
  const resources=new Set([worker.material,worker.grey]);root.traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])if(m)resources.add(m);});
  const disposedResources=new Set();for(const r of resources){const original=r.dispose;r.dispose=function(){if(disposedResources.has(r))return;disposedResources.add(r);return original.call(r);};}
  let driver,retired=false,last=null,distanceM=0,heading=0,blend=0,restored=null;
  try{driver=createWorkerLocomotion(worker,{id:model,unarmed:false});
    if(checkpoint!==undefined){const c=plain(checkpoint);fields(c,['kind','version','model','actorId','motion','distanceM','heading','blend','last']);if(c.kind!=='nautilus-native-pose'||c.version!==1||c.model!==model||c.actorId!==actorId||c.motion!==motion)throw Error('Incompatible native actor checkpoint.');number(c.distanceM,0,1e9);number(c.heading,-180,180);number(c.blend,0,1);if(c.last!==null)confirmedActorPose(c.last);distanceM=c.distanceM;heading=c.heading;blend=c.blend;restored=c.last;}
  }catch(error){try{worker.skeleton.dispose();worker.dispose();}finally{for(const r of resources)r.dispose();}throw error;}
  function update(input,{settle=false}={}){if(retired)throw Error('Native actor retired.');const p=confirmedActorPose(input);if(p.actorId!==actorId)throw Error('Native actor identity differs from the retained actor.');
    const restoring=!!restored;
    if(restored){if(p.revision!==restored.revision||p.mode!==restored.mode||!samePoint(p.position,restored.position))throw Error('Restored native pose does not match the retained actor.');last=restored;restored=null;}
    if(last&&p.revision<last.revision)throw Error('Native presentation requires a confirmed monotonic actor revision.');
    if(!restoring&&!settle&&last&&p.revision===last.revision&&p.mode===last.mode&&samePoint(p.position,last.position))return {actorId,distanceM,heading,role:blend?'walk':'idle',visible:root.visible};
    const step=last&&last.mode==='on-foot'&&p.mode==='on-foot'?Math.hypot(p.position.x-last.position.x,p.position.y-last.position.y):0;
    if(step>2)throw Error('Confirmed pose is discontinuous; stage a matching restore rather than inventing a walk.');
    if(step>1e-7){number(distanceM+step,0,1e9);heading=Math.atan2(p.position.y-last.position.y,p.position.x-last.position.x)*180/Math.PI;distanceM+=step;}
    if(!restoring)blend=motion==='native-gait'&&step>1e-7?1:0;const moving=blend>0;
    // Native IK rest points are in the model's canonical frame. Solve there,
    // then apply the retained host placement once, without resizing either.
    root.position.set(0,0,0);root.updateMatrixWorld(true);
    driver.apply({distance:distanceM,blend,heading,pose:{}});
    root.position.set(p.position.x,p.position.h,p.position.y);root.visible=p.mode==='on-foot';root.updateMatrixWorld(true);worker.skeleton.update();last=p;
    return {actorId,distanceM,heading,role:moving?'walk':'idle',visible:root.visible};
  }
  return {root,worker,spec,update,checkpoint(){return plain({kind:'nautilus-native-pose',version:1,model,actorId,motion,distanceM,heading,blend,last});},
    dispose(){if(retired)return;retired=true;const errors=[];for(const close of [()=>root.removeFromParent(),()=>driver.dispose(),()=>worker.skeleton.dispose(),()=>worker.dispose(),...[...resources].map(r=>()=>r.dispose())])try{close();}catch(e){errors.push(e);}root.clear();if(errors.length)throw new AggregateError(errors,'Native actor cleanup failed.');}};
}
