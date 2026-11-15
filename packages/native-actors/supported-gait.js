// Optional presentation-only IK. The host owns support and confirmed movement;
// this solver cannot move an actor, spend resources or dispatch a command.
import * as T from '../render-effects/three.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function createSupportedGait(worker,legs,rest,support){
 if(!support||typeof support.id!=='string'||!support.id||support.id.length>160||typeof support.sample!=='function')throw Error('NATIVE_FOOT_SUPPORT: bind a named, borrowed support sampler.');
 const soles=new Map();
 worker.root.updateMatrixWorld(true);worker.skeleton.update();
 for(const leg of legs){
  const points=[],bone=worker.bones.indexOf(leg.c);
  for(const mesh of worker.parts){const pos=mesh.geometry.attributes.position,skin=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;if(!mesh.isSkinnedMesh||!skin||!weight)continue;
   for(let i=0;i<pos.count;i++){let belongs=false;for(let j=0;j<4;j++)if(skin.array[i*4+j]===bone&&weight.array[i*4+j]>.8)belongs=true;if(!belongs)continue;const p=V().fromBufferAttribute(pos,i);mesh.applyBoneTransform(i,p);mesh.localToWorld(p);points.push(p);}
  }
  if(!points.length)throw Error('NATIVE_FOOT_SUPPORT: native sole geometry unavailable.');
  const minY=Math.min(...points.map(p=>p.y)),sole=points.filter(p=>p.y<minY+.012),xs=sole.map(p=>p.x),zs=sole.map(p=>p.z);
  soles.set(leg.side,{minY,points:[[Math.min(...xs),Math.min(...zs)],[Math.max(...xs),Math.min(...zs)],[Math.max(...xs),Math.max(...zs)],[Math.min(...xs),Math.max(...zs)]]});
 }
 return function stage(sample,state){
  const {position}=sample.confirmed,angle=sample.heading*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),targets=[];let low=-Infinity,high=Infinity;
  for(const leg of legs){const f=state.feet[leg.side],sole=soles.get(leg.side),points=sole.points.map(([x,z])=>({x:position.x+c*(x+f.x)-s*z,y:position.y+s*(x+f.x)+c*z})),height=support.sample({points,referenceH:position.h});
   if(!Number.isFinite(height)||Math.abs(height-position.h)>.8)throw Error('NATIVE_FOOT_SUPPORT: supply nearby finite walkable heights in metres.');
   const ra=rest.get(leg.a),rb=rest.get(leg.b),rc=rest.get(leg.c),start=ra.clone(),la=ra.distanceTo(rb),lb=rb.distanceTo(rc),target=rc.clone().add(V(f.x,height-position.h-sole.minY+f.lift+.003,0));
   const horizontal=Math.hypot(target.x-start.x,target.z-start.z),reach=la+lb-1e-5;
   if(horizontal>=reach)throw Error('NATIVE_FOOT_SUPPORT: horizontal sole target exceeds native leg reach.');
   const vertical=Math.sqrt(reach*reach-horizontal*horizontal),base=start.y-target.y;low=Math.max(low,-vertical-base);high=Math.min(high,vertical-base);targets.push({...leg,start,target,ra,rb,rc,la,lb});
  }
  if(low>high+1e-6)throw Error('NATIVE_FOOT_SUPPORT: support difference exceeds native leg reach.');
  const drop=Math.min(high,Math.max(low,-.065*sample.blend-state.bob));
  const rotations=[];
  for(const {a,b,c,start,target,ra,rb,rc,la,lb}of targets){target.y-=drop;const axis=target.clone().sub(start),d=axis.length();if(d<Math.abs(la-lb)+1e-8)throw Error('NATIVE_FOOT_SUPPORT: folded target exceeds native leg reach.');axis.normalize();const along=(la*la-lb*lb+d*d)/(2*d),pole=V(1,0,0).addScaledVector(axis,-axis.x).normalize(),mid=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,la*la-along*along)));
   rotations.push([a,new T.Quaternion().setFromUnitVectors(rb.clone().sub(ra).normalize(),mid.clone().sub(start).normalize())],[b,new T.Quaternion().setFromUnitVectors(rc.clone().sub(rb).normalize(),target.clone().sub(mid).normalize())],[c,new T.Quaternion()]);
  }
  // The complete query/reach solve above is pure. A refusal cannot disturb the
  // previously accepted rig. The caller commits only this validated proposal.
  return rotation=>{for(const [bone,q]of rotations)rotation(bone,q);worker.root.position.y=drop;worker.root.rotation.y=-angle;worker.root.updateMatrixWorld(true);worker.skeleton.update();return state;};
 };
}
