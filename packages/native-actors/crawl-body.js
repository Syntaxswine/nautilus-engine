import * as T from '../render-effects/three.js';
import {createGoatWorker} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/goat-worker.js';
import {createWeaponModel} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/weapon-models.js';
import {nativeActor} from './index.js';
import {createWorkerLocomotion} from './locomotion.js';
import {createCrawlMotion} from './crawl-motion.js';
import {createCrawlCursor} from './crawl.js';
import {createOwnedCleanup} from './owned-cleanup.js';

// Goat profile at the completed AFT motion pin. No model/skin substitution.
const profile=Object.freeze({id:'goat',proneAim:{tuckHem:true}});

// Selected native battle-posture shirt fit. Pose bones themselves are owned by
// crawl-motion. Restore original surfaces before lending the rig to another pose.
function tuckShirt(worker){
  const bones=Object.fromEntries(worker.bones.map(b=>[b.name,b]));
  for(const mesh of worker.parts.filter(p=>p.name.includes('shirt'))){const a=mesh.geometry.attributes;
    for(let i=0;i<a.position.count;i++){
      const y=a.position.getY(i),z=a.position.getZ(i),side=z<0?-1:1,upper=worker.bones.indexOf(bones['upperArm'+side]),lower=worker.bones.indexOf(bones['forearm'+side]),hip=worker.bones.indexOf(bones.hips),spine=worker.bones.indexOf(bones.spine);let u=0,l=0;const other=[];
      for(let j=0;j<4;j++){const index=a.skinIndex.getComponent(i,j),weight=a.skinWeight.getComponent(i,j);if(index===upper)u+=weight;else if(index===lower)l+=weight;else if(weight>0&&index!==hip&&index!==spine)other.push([index,weight]);}
      const keep=1-(1-T.MathUtils.smoothstep(y,1,1.12))*(1-T.MathUtils.smoothstep(Math.abs(z),.20,.26));u*=keep;l*=keep;
      const held=other.reduce((s,[,x])=>s+x,0),waist=T.MathUtils.smoothstep(y,.90,1.04),torso=Math.max(0,1-u-l-held);
      if(!other.length){a.skinIndex.setXYZW(i,hip,spine,upper,lower);a.skinWeight.setXYZW(i,torso*(1-waist),torso*waist,u,l);}
      else{const slots=[[hip,torso*(1-waist)],[spine,torso*waist],[upper,u],[lower,l],...other].filter(([,x])=>x>1e-6).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=slots.reduce((s,[,x])=>s+x,0)||1;while(slots.length<4)slots.push([0,0]);a.skinIndex.setXYZW(i,...slots.map(([b])=>b));a.skinWeight.setXYZW(i,...slots.map(([,x])=>x/sum));}
    }
    a.skinIndex.needsUpdate=a.skinWeight.needsUpdate=true;
  }
}

export function createNativeCrawlBody({model,actorId,data,crawl,checkpoint,footSupport}){
  if(footSupport||!crawl)throw Error('Native crawl requires its explicit flat plane, not a slope/stair foot-support binding.');
  if(data?.species!=='goat')throw Error('Native crawl requires the original source-supported goat data; other rigs are unsupported.');
  const cursor=createCrawlCursor({actorId,model,equipment:crawl.equipment,surface:crawl.surface,checkpoint});
  const worker=createGoatWorker(data),root=new T.Group();root.name='Native crawl actor '+actorId;root.add(worker.root);
  const weapon=createWeaponModel(crawl.equipment),resources=new Set();
  // Both the rig's original detached rifle and this carry are owned resources.
  for(const object of [worker.root,worker.rifle.root,weapon.root])object.traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])if(m)resources.add(m);});
  for(const m of [worker.grey,worker.material])resources.add(m);
  const cleanup=createOwnedCleanup('Native crawl cleanup failed.');for(const r of resources)cleanup.own(r);
  worker.equipWeapon(weapon);
  const surfaces=worker.parts.map(mesh=>({mesh,index:mesh.geometry.index,attributes:Object.fromEntries(['position','normal','skinIndex','skinWeight'].map(k=>[k,{original:mesh.geometry.attributes[k],copy:mesh.geometry.attributes[k].clone()}]))}));
  function restoreSurfaces(){for(const {mesh,index,attributes}of surfaces){mesh.geometry.setIndex(index);for(const [name,{original,copy}]of Object.entries(attributes)){original.array.set(copy.array);original.needsUpdate=true;mesh.geometry.setAttribute(name,original);}}}
  let gait,motion,retired=false,lastResult=null,lastCrawl=false;
  cleanup.defer(()=>root.clear());cleanup.defer(()=>worker.dispose());cleanup.defer(()=>{try{worker.skeleton.dispose();}finally{worker.skeleton.boneTexture=null;}});cleanup.defer(()=>weapon.dispose());cleanup.defer(()=>gait?.dispose());cleanup.defer(restoreSurfaces);cleanup.defer(()=>motion?.dispose());cleanup.defer(()=>root.removeFromParent());
  function dispose(){if(retired)return;retired=true;cleanup.own(worker.skeleton.boneTexture);cleanup.dispose();}
  try{gait=createWorkerLocomotion(worker,profile);tuckShirt(worker);motion=createCrawlMotion(worker,profile,1);motion.suspend();restoreSurfaces();}
  catch(error){try{dispose();}catch(cleanup){throw new AggregateError([error,cleanup],'Native crawl preparation failed.');}throw error;}
  return {root,worker,spec:nativeActor('goat'),checkpoint:()=>cursor.read(),
    update(input){
      if(retired)throw Error('Native crawl actor retired.');
      const staged=cursor.stage(input),next=staged.next,sample=next.last;
      if(staged.repeat&&!staged.restoring&&lastResult)return structuredClone(lastResult);
      const crawling=sample.stance==='prone'&&sample.action==='locomotion';
      root.position.set(0,0,0);root.updateMatrixWorld(true);
      let state;
      if(crawling){
        if(!lastCrawl)tuckShirt(worker);
        const angle=sample.heading*Math.PI/180,distance=next.signedDistanceM;
        // Compensate the study course exactly once; the outer root belongs to
        // the host's collision-resolved position, never to an animation loop.
        state=motion.at(distance,{heading:sample.heading,blend:next.blend,position:new T.Vector3(-distance*Math.cos(angle),0,-distance*Math.sin(angle))});
      }else{
        if(lastCrawl){motion.suspend();restoreSurfaces();}
        if(sample.action==='locomotion'){
          gait.apply({distance:next.walkDistanceM,heading:sample.heading,blend:next.blend});
          if(crawl.equipment==='rifle'){
            const legs=worker.bones.filter(b=>/^(thigh|shin|hoof)/.test(b.name)).map(b=>({b,q:b.quaternion.clone()})),position=worker.root.position.clone(),rotation=worker.root.quaternion.clone();
            worker.pose('carry');for(const {b,q}of legs)b.quaternion.copy(q);worker.root.position.copy(position);worker.root.quaternion.copy(rotation);worker.root.updateMatrixWorld(true);worker.skeleton.update();
          }
        }
        // Other actions own their pose after this suspension boundary.
      }
      root.position.set(sample.position.x,sample.position.h,sample.position.y);root.visible=true;root.updateMatrixWorld(true);worker.skeleton.update();
      staged.commit();lastCrawl=crawling;
      lastResult={actorId,heading:sample.heading,role:sample.action==='other'?'suspended':crawling?'crawl':next.blend?'walk':'idle',poseOwner:sample.action==='other'?'host-action':'native-locomotion',signedDistanceM:next.signedDistanceM,...(state?{phase:state.phase,stride:state.stride,primary:state.primary,carry:state.carry,gripErrorM:state.gripErrorM}:{}),visible:true};
      return structuredClone(lastResult);
    },dispose};
}
