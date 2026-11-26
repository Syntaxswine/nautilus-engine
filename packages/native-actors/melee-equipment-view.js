// Private presentation owner. The retained host supplies a confirmed frame;
// neither this owner nor an art socket can commit a combat action.
import * as T from '../render-effects/three.js';
import {validateEquipment,meleeEquipment} from '../melee-core/equipment.js';
import {createNativeMeleePose} from './melee-pose.js';

const check=(value,message)=>{if(!value)throw Error('MELEE_VIEW: '+message);};
function frame(value,actorId){
  check(value&&Object.getPrototypeOf(value)===Object.prototype&&value.actorId===actorId,'Supply this actor’s confirmed presentation frame.');
  const equipment=validateEquipment(value.equipment);
  check(value.actionId===null||typeof value.actionId==='string'&&value.actionId.length>0&&value.actionId.length<=160,'Keep the confirmed action identity.');
  check(Number.isFinite(value.headingDeg)&&value.headingDeg>=-180&&value.headingDeg<=180&&['idle','windup','impact','recovery'].includes(value.phase)&&Number.isFinite(value.progress)&&value.progress>=0&&value.progress<=1,'Use finite confirmed heading and phase.');
  check(['slash','thrust','heavy-blunt'].includes(value.pose)&&typeof value.guard==='boolean','Use a declared pose and active guard flag.');
  const a=value.articulation;
  check(a&&Number.isFinite(a.draw)&&a.draw>=0&&a.draw<=1&&typeof a.loaded==='boolean','Use finite draw and boolean loaded.');
  const main=equipment.main&&meleeEquipment(equipment.main.id);
  check((main?.articulation||a.draw===0&&!a.loaded)&&(!value.guard||equipment.off),'Articulation/guard requires compatible equipped items.');
  return {actorId,actionId:value.actionId,headingDeg:value.headingDeg,equipment,phase:value.phase,progress:value.progress,pose:value.pose,guard:value.guard,articulation:{draw:a.draw,loaded:a.loaded}};
}
const key=e=>JSON.stringify(e);
function drain(models,errors){for(const model of models)try{model.dispose();}catch(error){errors.push(error);}}
function fail(errors,message){if(errors.length)throw new AggregateError(errors,message);}

export function createNativeMeleeEquipmentView({native,actorId,readPresentation,createModel}){
  check(typeof readPresentation==='function'&&typeof createModel==='function','Supply the retained presentation query.');
  let retired=false,busy=false,current=null,last=null;const pose=createNativeMeleePose(native.root);
  function dispose(){if(retired)return;retired=true;const old=current;current=null;const errors=[];try{pose.dispose();}catch(error){errors.push(error);}drain(old?.models||[],errors);try{native.dispose();}catch(error){errors.push(error);}fail(errors,'Melee native view retired with cleanup failures.');}
  function updateConfirmed(confirmed,options){
    check(!retired&&!busy,'This view is retired or already updating.');
    const next=frame(readPresentation(),actorId);busy=true;let candidate=null,published=false;
    try{
      if(!current||current.key!==key(next.equipment)){
        candidate={key:key(next.equipment),models:[],main:null,off:null};
        for(const slot of ['main','off'])if(next.equipment[slot]){
          const model=createModel(T,{id:next.equipment[slot].id});
          check(model&&typeof model.dispose==='function','An equipment factory must return an owned disposable model.');candidate.models.push(model);
          check(!retired&&model.root instanceof T.Object3D&&model.root.parent===null&&model.root.scale.distanceTo(new T.Vector3(1,1,1))<1e-9&&model.sockets?.['grip.main'] instanceof T.Object3D&&typeof model.setArticulation==='function','Use a fresh native-metre model from the supplied Three namespace.');
          candidate[slot]=model;
        }
      }
      check(!retired,'The view retired while preparing equipment.');
      const selected=candidate||current,main=next.equipment.main&&meleeEquipment(next.equipment.main.id);
      if(selected.main)selected.main.setArticulation(main.articulation?next.articulation:{});
      if(selected.off)selected.off.setArticulation({});
      pose.reset();const result=native.updateConfirmed(confirmed,options);check(!retired,'The view retired during native update.');
      if(candidate)for(const model of candidate.models){native.root.add(model.root);check(!retired,'The view retired during attachment.');}
      const observation=pose.apply({headingDeg:next.headingDeg,baseHeadingDeg:native.checkpoint().heading,phase:next.phase,progress:next.progress,pose:next.pose,guard:next.guard,draw:next.articulation.draw,ranged:!!main?.articulation,twoHanded:main?.hands===2,mainModel:selected.main,offModel:selected.off});
      if(candidate){const old=current;current=candidate;published=true;const errors=[];drain(old?.models||[],errors);fail(errors,'New equipment is attached; old equipment cleanup reported failures.');}
      check(!retired,'The view retired during equipment retirement.');last={...next,...observation};return {...result,melee:{...observation}};
    }catch(error){const errors=[error];if(candidate&&!published)drain(candidate.models,errors);fail(errors,'Melee presentation update failed; no combat result was issued.');}
    finally{busy=false;}
  }
  return Object.freeze({root:native.root,spec:native.spec,updateConfirmed,checkpoint:()=>native.checkpoint(),setActive:value=>{if(!retired)native.setActive(value);},readPresentation:()=>last?structuredClone(last):null,dispose});
}
