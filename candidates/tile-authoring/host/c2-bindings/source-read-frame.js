// Private composition only. This frame never registers a Core SourceScope and
// never proves that a meter/continuation/Native factory is paired. A production
// SourceReadOwner must enclose it in the authenticated same-owner constructor.
import {need,own,field} from './data.js';

export function createWorkbenchReadFrame(input){
 const {binding,captureCurrent,isCurrent,connected}=own(input,['binding','captureCurrent','isCurrent','connected']);
 for(const fn of [captureCurrent,isCurrent,connected])need(typeof fn==='function','C2_SOURCE_FRAME_PORT');
 const {codec,domain}=binding,issued=new WeakMap(),handles=new WeakMap();let workbench=null,active=null,checking=null,closed=false,composed=false,lifetime=0;
 function poison(code){if(active)active.failed=true;if(checking)checking.failed=true;need(false,code);}
 function live(fact){
  if(closed||checking){if(checking)checking.failed=true;return false;}
  const check={workbench,lifetime,failed:false},same=()=>!closed&&!check.failed&&workbench===check.workbench&&lifetime===check.lifetime;checking=check;
  try{
   if(connected()!==true||!same())return false;
   if(isCurrent(fact)!==true||!same())return false;
   return connected()===true&&same();
  }finally{checking=null;}
 }
 function valid(handle){const value=handles.get(handle);need(value&&live(value.current),'C2_SOURCE_STALE_READ');return value;}
 const api={
  composeProfile(profile){
   need(!composed&&!active&&!closed,'C2_SOURCE_FRAME_STATE');composed=true;
   const project=field(profile,'authoringSnapshot');need(typeof project==='function','C2_SOURCE_FRAME_PORT');
   return Object.freeze({...profile,authoringSnapshot(packet){
    // Ordinary subscriptions do not acquire source permission. The actual
    // workbench read is the sole issuance entry; callers cannot pass a DTO.
    if(!active)return project(packet);
    const frame=active;if(frame.seen||frame.projecting)poison('C2_SOURCE_READ_REENTRY');frame.projecting=true;
    try{
     const p=own(packet,['checkpoint','token','contextToken','hostContext']);
     const checkpoint=codec.open(p.checkpoint);need(checkpoint===p.checkpoint,'C2_SOURCE_OWNED_CHECKPOINT');
     const document=domain.validateDocument(checkpoint.document);need(document===checkpoint.document&&Object.isFrozen(document),'C2_SOURCE_OWNED_DOCUMENT');
     const result=project(packet);
     const stillCurrent=live(frame.current);need(active===frame&&!frame.failed&&stillCurrent,'C2_SOURCE_STALE_READ');
     frame.seen=true;frame.witness=Object.freeze({checkpoint,document,token:p.token,contextToken:p.contextToken,hostContext:Object.freeze({...p.hostContext}),current:frame.current});
     return result;
    }catch(error){frame.failed=true;throw error;}finally{frame.projecting=false;}
   }});
  },
  bindWorkbench(actualWorkbench){
   // The production enclosing factory must use the existing service factory's
   // private membership check. A shape check here grants no ready capability.
   need(composed&&!workbench&&!active&&!closed,'C2_SOURCE_FRAME_STATE');
   need(Object.isFrozen(actualWorkbench)&&typeof field(actualWorkbench,'getSnapshot')==='function','C2_SOURCE_FRAME_PORT');workbench=actualWorkbench;
  },
  read(){
   if(active||checking)poison('C2_SOURCE_READ_REENTRY');need(workbench&&!closed,'C2_SOURCE_FRAME_STATE');
   const frame={current:null,seen:false,projecting:false,failed:false,witness:null};active=frame;
   try{
    need(connected()===true&&!closed&&!frame.failed&&active===frame,'C2_SOURCE_DISCONNECTED');frame.current=captureCurrent();need(frame.current&&typeof frame.current==='object'&&live(frame.current),'C2_SOURCE_STALE_READ');
    const read=workbench.getSnapshot(),stillCurrent=live(frame.current);
    need(active===frame&&!frame.failed&&frame.seen&&frame.witness&&read&&typeof read==='object'&&stillCurrent,'C2_SOURCE_STALE_READ');
    const handle=Object.freeze({});handles.set(handle,frame.witness);issued.set(read,handle);return read;
   }finally{active=null;}
  },
  capture(exactRead){const handle=issued.get(exactRead);need(handle,'C2_SOURCE_FOREIGN_READ');valid(handle);return handle;},
  witness(handle){return valid(handle);},
  isCurrent(handle){const value=handles.get(handle);try{return !!value&&live(value.current);}catch{return false;}},
  dispose(){if(closed)return;closed=true;lifetime++;if(active)active.failed=true;if(checking)checking.failed=true;workbench=null;}
 };
 return Object.freeze(api);
}
