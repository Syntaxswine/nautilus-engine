// Original engine-owned, presentation-only native grip/arm adapter. No action,
// collision, costs, random values or damage are resolved from this pose.
import * as T from '../render-effects/three.js';
const insist=(v,m)=>{if(!v)throw Error('MELEE_NATIVE_POSE: '+m);};
const mix=(a,b,t)=>a.map((v,i)=>T.MathUtils.lerp(v,b[i],t));
const unit=new T.Vector3(1,1,1),up=new T.Vector3(0,1,0),zAxis=new T.Vector3(0,0,1),palmOffset=new T.Vector3(.008,-.025,0);
function worldQuaternion(bone,value){const parent=bone.parent?.getWorldQuaternion(new T.Quaternion())??new T.Quaternion();bone.quaternion.copy(parent.invert().multiply(value));bone.updateWorldMatrix(true,true);}
function point(bone){return bone.getWorldPosition(new T.Vector3());}
function localSocket(model,name){const anchor=model.sockets[name];insist(anchor?.isObject3D,'Missing declared '+name+' socket.');model.root.updateWorldMatrix(true,true);const m=new T.Matrix4().copy(model.root.matrixWorld).invert().multiply(anchor.matrixWorld),position=new T.Vector3(),quaternion=new T.Quaternion();m.decompose(position,quaternion,new T.Vector3());return {position,quaternion};}
function reach(chain){return point(chain.upper).distanceTo(point(chain.fore))+point(chain.fore).distanceTo(point(chain.hand));}
function fitSphere(p,centre,radius){const delta=p.clone().sub(centre),distance=delta.length();if(distance>radius)p.copy(centre).addScaledVector(delta,radius/distance);}
function solveArm(chain,target,handQ){
  const shoulder=point(chain.upper),elbow=point(chain.fore),wrist=point(chain.hand),a=shoulder.distanceTo(elbow),b=elbow.distanceTo(wrist),goal=target.clone().sub(palmOffset.clone().applyQuaternion(handQ)),delta=goal.clone().sub(shoulder),d=Math.max(.00001,Math.min(delta.length(),a+b-.00001)),direction=delta.normalize();
  let bend=elbow.clone().sub(shoulder).addScaledVector(direction,-elbow.clone().sub(shoulder).dot(direction));if(bend.lengthSq()<1e-8)bend=up.clone().addScaledVector(direction,-up.dot(direction));if(bend.lengthSq()<1e-8)bend=zAxis.clone().addScaledVector(direction,-zAxis.dot(direction));bend.normalize();
  const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along)),desiredElbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,height),actualGoal=shoulder.clone().addScaledVector(direction,d);
  const turn=(bone,from,to)=>worldQuaternion(bone,new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(bone.getWorldQuaternion(new T.Quaternion())));
  turn(chain.upper,elbow.clone().sub(shoulder),desiredElbow.clone().sub(shoulder));const nextElbow=point(chain.fore);turn(chain.fore,point(chain.hand).sub(nextElbow),actualGoal.clone().sub(nextElbow));worldQuaternion(chain.hand,handQ);return point(chain.hand).add(palmOffset.clone().applyQuaternion(handQ)).distanceTo(target);
}
function place(root,model,mainGrip,quaternion,grip){const origin=mainGrip.clone().sub(grip.position.clone().applyQuaternion(quaternion)),local=root.worldToLocal(origin);model.root.position.copy(local);const parentQ=root.getWorldQuaternion(new T.Quaternion());model.root.quaternion.copy(parentQ.invert().multiply(quaternion));model.root.updateWorldMatrix(true,true);}

export function createNativeMeleePose(root){
  const bones=new Map();let skeleton;root.traverse(node=>{if(node.isSkinnedMesh&&!skeleton)skeleton=node.skeleton;});insist(skeleton,'Supply the original native skinned actor.');for(const bone of skeleton.bones)bones.set(bone.name,bone);
  const main={upper:bones.get('upperArm1'),fore:bones.get('forearm1'),hand:bones.get('hand1')},off={upper:bones.get('upperArm-1'),fore:bones.get('forearm-1'),hand:bones.get('hand-1')},spine=bones.get('spine');insist([...Object.values(main),...Object.values(off),spine].every(Boolean),'This native rig has no supported goat hand chains.');
  const controlled=[...Object.values(main),...Object.values(off),spine],rifles=[];root.traverse(node=>{if(node.name==='worker rifle')rifles.push({node,visible:node.visible});});let baseline=null,retired=false,last={gripErrorM:0,phase:'idle',articulated:false};
  function reset(){if(!baseline)return;root.quaternion.copy(baseline.root);for(const [bone,q]of baseline.bones)bone.quaternion.copy(q);baseline=null;root.updateWorldMatrix(true,true);}
  function apply({headingDeg,baseHeadingDeg=0,phase='idle',progress=0,pose='slash',guard=false,draw=0,ranged=false,mainModel=null,offModel=null,twoHanded=false}={}){
    insist(!retired,'The pose adapter is retired.');insist([headingDeg,baseHeadingDeg,progress,draw].every(Number.isFinite)&&progress>=0&&progress<=1&&draw>=0&&draw<=1&&['idle','windup','impact','recovery'].includes(phase)&&typeof guard==='boolean'&&typeof twoHanded==='boolean'&&typeof ranged==='boolean','Use a confirmed finite action frame.');insist(!twoHanded||!offModel,'A two-handed item cannot gain a third shield hand.');insist(root.getWorldScale(new T.Vector3()).distanceTo(unit)<1e-6,'Use native actor metres without inherited scaling.');reset();
    baseline={root:root.quaternion.clone(),bones:controlled.map(b=>[b,b.quaternion.clone()])};
    try{
      root.quaternion.multiply(new T.Quaternion().setFromAxisAngle(up,-(headingDeg-baseHeadingDeg)*Math.PI/180));for(const rifle of rifles)rifle.node.visible=false;
      const facing=new T.Quaternion().setFromAxisAngle(up,-headingDeg*Math.PI/180),origin=point(root),active=phase!=='idle',wind=phase==='windup'?progress:0,impact=phase==='impact'?progress:0,recovery=phase==='recovery'?progress:0,heavy=pose==='heavy-blunt',thrust=pose==='thrust';
      spine.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(0,active&&!thrust?(phase==='windup'?.18*wind:phase==='impact'?-.16:-.16*(1-recovery)):0,active?(phase==='windup'?-.04:phase==='impact'?-.12:-.12*(1-recovery)):0)));root.updateWorldMatrix(true,true);
      let gripErrorM=0;
      if(mainModel){
        const grip=localSocket(mainModel,'grip.main'),idle=[.18,1.03,.12],raised=heavy?[.02,1.42,.04]:thrust?[.03,1.08,.15]:[-.03,1.30,.20],struck=heavy?[.05,1.03,.02]:thrust?[.42,1.12,.08]:[.28,1.06,-.04];
        let local=phase==='windup'?mix(idle,raised,wind):phase==='impact'?mix(struck,thrust?[.47,1.1,.08]:struck,impact):phase==='recovery'?mix(struck,idle,recovery):idle;
        if(ranged)local=mainModel.root.userData.id==='crossbow'?[-.02,1.05,.12]:[.35,1.2,.01];const target=new T.Vector3(...local).applyQuaternion(facing).add(origin),shaft=phase==='windup'?(heavy?.2:-.35)*wind:phase==='impact'?-Math.PI/2:phase==='recovery'?-Math.PI/2*(1-recovery):0;
        let orientation=ranged?facing.clone().multiply(new T.Quaternion().setFromAxisAngle(up,Math.PI/2+(mainModel.root.userData.id==='bow'?.45:0))):facing.clone().multiply(new T.Quaternion().setFromAxisAngle(up,!heavy&&!thrust&&active?(phase==='windup'?-.75*wind:phase==='impact'?.55:.55*(1-recovery)):0)).multiply(new T.Quaternion().setFromAxisAngle(zAxis,shaft));
        let support,offGrip;if(twoHanded){offGrip=localSocket(mainModel,'grip.off');support=offGrip.position.clone().sub(grip.position).applyQuaternion(orientation);const a=point(main.upper),b=point(off.upper).sub(support),ra=reach(main)-.035,rb=reach(off)-.035;insist(a.distanceTo(b)<=ra+rb,'Native grip span is unreachable at this scale.');for(let i=0;i<48;i++){fitSphere(target,a,ra);fitSphere(target,b,rb);}}
        const handQ=orientation.clone().multiply(grip.quaternion);gripErrorM=Math.max(gripErrorM,solveArm(main,target,handQ));place(root,mainModel,target,orientation,grip);
        if(twoHanded){const offTarget=target.clone().add(support),offQ=orientation.clone().multiply(offGrip.quaternion);gripErrorM=Math.max(gripErrorM,solveArm(off,offTarget,offQ));}
      }
      if(offModel){const grip=localSocket(offModel,'grip.main'),orientation=facing.clone().multiply(new T.Quaternion().setFromAxisAngle(up,Math.PI/2)),local=guard?[.25,1.1,-.05]:[.10,.82,-.26],target=new T.Vector3(...local).applyQuaternion(facing).add(origin);gripErrorM=Math.max(gripErrorM,solveArm(off,target,orientation.clone().multiply(grip.quaternion)));place(root,offModel,target,orientation,grip);}
      root.updateWorldMatrix(true,true);skeleton.update();last={gripErrorM,phase,articulated:draw>0,scaled:false};insist(gripErrorM<.012,'A semantic grip escaped the native hand reach.');return {...last};
    }catch(error){reset();throw error;}
  }
  return Object.freeze({apply,reset,read:()=>({...last}),dispose(){if(retired)return;reset();retired=true;for(const {node,visible}of rifles)node.visible=visible;}});
}
