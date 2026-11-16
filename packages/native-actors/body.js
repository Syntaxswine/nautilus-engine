import * as T from '../render-effects/three.js';
import {createGoatWorker} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/goat-worker.js';
import {createDonkeyWorker} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/donkey-worker.js';
import {createWorkerLocomotion} from './locomotion.js';
import {nativeActor,confirmedActorPose} from './index.js';
import {plain,fields,number,point,samePoint} from './data.js';
import {createNativeCrawlBody} from './crawl-body.js';
export function createNativeBody({model,actorId,data,motion='native-gait',checkpoint,footSupport,crawl}){
  if(motion==='native-crawl-v1')return createNativeCrawlBody({model,actorId,data,crawl,checkpoint,footSupport});
  const spec=nativeActor(model);if(!['native-gait','neutral-only'].includes(motion))throw Error('Choose an implemented native motion profile.');
  const worker=({goat:createGoatWorker,donkey:createDonkeyWorker})[model](data),root=new T.Group();root.name='Native actor '+actorId;root.add(worker.root);
  const resources=new Set([worker.material,worker.grey]);root.traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])if(m)resources.add(m);});
  const disposedResources=new Set();for(const r of resources){const original=r.dispose;r.dispose=function(){if(disposedResources.has(r))return;disposedResources.add(r);return original.call(r);};}
  let driver,retired=false,last=null,distanceM=0,heading=0,blend=0,restored=null,lastSupportId=null;
  try{driver=createWorkerLocomotion(worker,{id:model,unarmed:false,footSupport});
    if(checkpoint!==undefined){const c=plain(checkpoint);fields(c,['kind','version','model','actorId','motion','distanceM','heading','blend','last',...(footSupport?['footSupportId']:[])]);if(c.kind!=='nautilus-native-pose'||c.version!==(footSupport?2:1)||footSupport&&c.footSupportId!==footSupport.id||c.model!==model||c.actorId!==actorId||c.motion!==motion)throw Error('Incompatible native actor checkpoint.');number(c.distanceM,0,1e9);number(c.heading,-180,180);number(c.blend,0,1);if(c.last!==null)confirmedActorPose(c.last);distanceM=c.distanceM;heading=c.heading;blend=c.blend;restored=c.last;}
  }catch(error){try{worker.skeleton.dispose();worker.dispose();}finally{for(const r of resources)r.dispose();}throw error;}
  function update(input,{settle=false}={}){if(retired)throw Error('Native actor retired.');const p=confirmedActorPose(input);if(p.actorId!==actorId)throw Error('Native actor identity differs from the retained actor.');
    const restoring=!!restored,prior=restored||last,supportId=footSupport?.id??null;
    if(restored&&(p.revision!==restored.revision||p.mode!==restored.mode||!samePoint(p.position,restored.position)))throw Error('Restored native pose does not match the retained actor.');
    if(prior&&p.revision<prior.revision)throw Error('Native presentation requires a confirmed monotonic actor revision.');
    if(!restoring&&!settle&&lastSupportId===supportId&&last&&p.revision===last.revision&&p.mode===last.mode&&samePoint(p.position,last.position))return {actorId,distanceM,heading,role:blend?'walk':'idle',visible:root.visible};
    const step=prior&&prior.mode==='on-foot'&&p.mode==='on-foot'?Math.hypot(p.position.x-prior.position.x,p.position.y-prior.position.y):0;
    if(step>2)throw Error('Confirmed pose is discontinuous; stage a matching restore rather than inventing a walk.');
    const advances=step>1e-7,nextDistance=distanceM+(advances?step:0),nextHeading=advances?Math.atan2(p.position.y-prior.position.y,p.position.x-prior.position.x)*180/Math.PI:heading,nextBlend=restoring?blend:motion==='native-gait'&&advances?1:0;number(nextDistance,0,1e9);
    const sample={distance:nextDistance,blend:nextBlend,heading:nextHeading,pose:{},confirmed:p};
    // Sample both supports and solve reach before touching any retained pose,
    // transform, bone or gait counter. A refused proposal has no partial commit.
    const commit=footSupport?driver.stage(sample):()=>driver.apply(sample);
    root.position.set(0,0,0);root.updateMatrixWorld(true);commit();
    root.position.set(p.position.x,p.position.h,p.position.y);root.visible=p.mode==='on-foot';root.updateMatrixWorld(true);worker.skeleton.update();
    distanceM=nextDistance;heading=nextHeading;blend=nextBlend;last=p;restored=null;lastSupportId=supportId;
    return {actorId,distanceM,heading,role:blend?'walk':'idle',visible:root.visible};
  }
  return {root,worker,spec,update,checkpoint(){return plain({kind:'nautilus-native-pose',version:footSupport?2:1,...(footSupport?{footSupportId:lastSupportId??footSupport.id}:{}),model,actorId,motion,distanceM,heading,blend,last});},
    dispose(){if(retired)return;retired=true;const errors=[];for(const close of [()=>root.removeFromParent(),()=>driver.dispose(),()=>worker.skeleton.dispose(),()=>worker.dispose(),...[...resources].map(r=>()=>r.dispose())])try{close();}catch(e){errors.push(e);}root.clear();if(errors.length)throw new AggregateError(errors,'Native actor cleanup failed.');}};
}
