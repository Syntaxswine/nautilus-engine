import {data,refusal,exact} from './data.js';

export function createActionRouter({providers,readContext}) {
  if(new Set(providers.map(p=>p.id)).size!==providers.length)throw TypeError('Action provider IDs must be unique.');
  const entries=new Map(providers.map(p=>[p.id,p]));let retired=false;
  function read() {
    const context=readContext(),actions=[];
    for(const provider of entries.values()) {
      const view=provider.read();
      for(const action of view.actions)actions.push({version:1,id:provider.id+'/'+action.id,providerId:provider.id,actionId:action.id,target:data(action.target),verb:action.verb,label:action.label,icon:action.icon||null,enabled:!retired&&!context.blocked&&action.enabled,reason:context.blocked?'Close the menu or restore the player context.':action.reason||null,intent:{version:1,type:'action',providerId:provider.id,actionId:action.id,context:context.token,offer:view.context}});
    }
    return {version:1,context:data(context),actions};
  }
  function request(input,event) {
    let intent;try{intent=data(input);}catch{return refusal('INVALID_INTENT','Use a plain versioned action intent.');}
    if(retired)return refusal('DISPOSED','This action presenter has retired.');
    const context=readContext();if(context.blocked)return refusal('INPUT_BLOCKED','Gameplay actions are blocked.');
    if(!exact(intent,['version','type','providerId','actionId','context','offer'])||intent.version!==1||intent.type!=='action'||intent.context!==context.token||typeof intent.actionId!=='string'||typeof intent.offer!=='string')return refusal('STALE_CONTEXT','Read current actions before acting.');
    const provider=entries.get(intent.providerId);if(!provider)return refusal('UNKNOWN_PROVIDER','The action provider is unavailable.');
    return provider.request(intent.actionId,intent.offer,event);
  }
  return Object.freeze({read,request,dispose(){retired=true;entries.clear();}});
}
export function trainActionProvider(readActuator) {
  return Object.freeze({id:'trains',read(){const actuator=readActuator();if(!actuator)return {context:'unavailable',actions:[]};const view=actuator.readActionView();return {context:view.context,actions:view.actions.map(a=>({id:a.id,verb:a.command.type,label:a.label,icon:a.command.type==='enter'?'train-entry':'train-exit',enabled:a.enabled&&!view.blocked,reason:a.reason,target:{trainId:a.command.trainId,carId:a.command.carId,entranceId:a.command.entranceId}}))};},request(actionId,offer,event){const actuator=readActuator();return actuator?actuator.requestAction(actionId,offer,event):refusal('CONTROL_NOT_READY','The mounted train actuator is not ready.');}});
}
