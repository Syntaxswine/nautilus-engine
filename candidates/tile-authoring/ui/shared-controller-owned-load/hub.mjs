// One exact reviewed Root coordinator. This owns UI attachment lifetimes only;
// source, draft, pending operations, history, resources and execution stay borrowed.
// A resource invocation adds only a temporary UI gate; it cannot clear Host debt.
import {createTileAuthoringUIController} from './root-resource-guard.mjs';
const own=(o,k)=>Object.getOwnPropertyDescriptor(o??{},k)?.value;
const error=(code,message)=>Object.assign(new TypeError(message),{code});
const names=['describe','snapshot','query','prepare','apply','cancel','recover'];
const no=code=>({ok:false,code});

export function createSharedTileAuthoringController(binding,{isAdditionalConnectionCurrent}={}){
 if(typeof isAdditionalConnectionCurrent!=='function')throw error('UI_HUB_CONNECTION_REQUIRED','Supply the actual additional connection predicate.');
 const service=own(binding,'service'),captured=['getSnapshot','subscribe','collectCommand','discardDraft'].map(k=>[k,own(binding,k)]),serviceMethods=names.map(k=>own(service,k));
 if(captured.some(([,f])=>typeof f!=='function')||serviceMethods.some(f=>typeof f!=='function'))throw error('UI_HUB_BINDING_REQUIRED','Borrow one complete workbench/service connection.');
 let controller=null,lifetime=null,lastView=null,lastPending=false,resourceInvocation=null,closed=false,broken=false,creating=false,validating=false,dispatchDepth=0,invokingDepth=0,revision=0,sequence=0,creations=0,needsRefresh=false,flushing=false;
 const records=new Set();
 const baseCurrent=()=>!closed&&!broken&&own(binding,'service')===service&&captured.every(([k,f])=>own(binding,k)===f)&&names.every((k,i)=>own(service,k)===serviceMethods[i]);
 function checkBase(){if(!baseCurrent()){broken=true;return false;}return true;}
 function callbacks(record){return record.captured.every(([k,value])=>own(record.options,k)===value);}
 function external(fn){dispatchDepth++;try{return fn();}finally{dispatchDepth--;}}
 function current(){
  if(!checkBase()||!lifetime||!records.size)return false;
  if(validating){if([...records].some(r=>r.active&&!callbacks(r)))broken=true;return checkBase();}
  validating=true;
  try{
   if(external(()=>isAdditionalConnectionCurrent())!==true){broken=true;return false;}
   for(const r of [...records])if(r.active){if(!callbacks(r)){broken=true;return false;}if(r.predicate){const value=external(()=>r.predicate());if(r.active&&value!==true){broken=true;return false;}}}
   return checkBase();
  }catch{broken=true;return false;}finally{validating=false;}
 }
 function flush(){
  if(flushing||creating||dispatchDepth||invokingDepth||!controller||!needsRefresh)return;
  flushing=true;try{let visits=0;while(needsRefresh&&controller&&!closed&&!broken){if(++visits>8){broken=true;throw error('UI_HUB_OBSERVER_BOUND','Attachment refresh exceeded eight visits.');}needsRefresh=false;controller.refresh();}}finally{flushing=false;}
 }
 function clearBroken(){
  if(!broken||closed)return;
  if(lastView!==null)try{fanout('onView',null);}catch{}
  if(lastPending!==false)try{fanout('onPending',false);}catch{}
 }
 function fanout(kind,value){
  const session=lifetime,snapshot=[...records],invalidation=kind==='onError'||kind==='onView'&&value===null||kind==='onPending'&&value===false;let first=null;
  if(kind==='onView')lastView=value;if(kind==='onPending')lastPending=value;
  dispatchDepth++;
  try{for(const r of snapshot){if(lifetime!==session||!r.active||r.lifetime!==session)continue;if(!invalidation&&(!checkBase()||!callbacks(r)||!current())){broken=true;break;}try{r[kind]?.(kind==='onPending'?value||resourceInvocation!==null:value);}catch(e){first??=e;}if(!invalidation&&!current())break;}}
  finally{dispatchDepth--;clearBroken();flush();}
  if(first&&kind!=='onError')throw first;
 }
 function additional(view){
  const before=revision,extra=[];
  for(const r of [...records])if(r.active&&r.additional){const value=external(()=>r.additional(view));if(r.active)extra.push({attachment:r.id,value});if(!checkBase())throw error('UI_REBIND_REQUIRED','Connection changed during a source callback.');}
  return{overlay:view.overlay,attachmentRevisionBefore:before,attachmentRevision:revision,consumers:extra};
 }
 function retire(){const prior=controller;controller=null;lifetime=null;lastView=null;lastPending=false;needsRefresh=false;prior?.dispose();}
 function detach(r){if(!r.active)return;r.active=false;records.delete(r);revision++;if(!records.size)retire();else{needsRefresh=true;flush();}}
 function assertLive(r){if(!r.active||r.lifetime!==lifetime||!controller)throw error('UI_ATTACHMENT_RETIRED','This UI attachment is closed.');if(!checkBase()||!callbacks(r)){broken=true;clearBroken();throw error('UI_REBIND_REQUIRED','The borrowed connection or attachment callbacks were retired.');}}
 function invoke(r,name,args){
  try{assertLive(r);if(dispatchDepth||invokingDepth||creating)return no('UI_ATTACHMENT_REENTRY');if(!current()){clearBroken();return no('UI_REBIND_REQUIRED');}if(resourceInvocation)return no('UI_RESOURCE_PENDING');}
  catch(e){return no(e.code??'UI_ATTACHMENT_RETIRED');}
  const active=controller,session=lifetime,version=revision;
  if(name==='stage'){
   const [kind,build]=args;if(typeof build!=='function')return no('UI_STAGE_BUILDER_REQUIRED');
   args=[kind,(...values)=>{assertLive(r);if(controller!==active||lifetime!==session||revision!==version)throw error('UI_ATTACHMENT_CHANGED','Attachments changed before construction.');const command=build(...values);assertLive(r);if(controller!==active||lifetime!==session||revision!==version||!current())throw error('UI_ATTACHMENT_CHANGED','Attachments/connection changed during construction.');return command;}];
  }
  invokingDepth++;
  try{return active[name](...args);}finally{invokingDepth--;flush();}
 }
 function attach(candidate,options={}){
  if(!checkBase()){clearBroken();throw error('UI_REBIND_REQUIRED','Create a new explicit hub for the retired connection.');}
  if(candidate!==binding)throw error('UI_HUB_FOREIGN_BINDING','Both surfaces must borrow the same actual binding.');
  if(dispatchDepth||invokingDepth||creating)throw error('UI_ATTACHMENT_REENTRY','Attach outside callbacks and active synchronous actions.');
  const keys=['onView','onPending','onError','readAdditionalData','isAdditionalConnectionCurrent','strictCallbackReads'];
  const capturedOptions=keys.map(k=>[k,own(options,k)]);
  const extra=own(options,'readAdditionalData')!==undefined||own(options,'isAdditionalConnectionCurrent')!==undefined||own(options,'strictCallbackReads')!==undefined;
  if(extra&&(own(options,'strictCallbackReads')!==true||typeof own(options,'readAdditionalData')!=='function'||typeof own(options,'isAdditionalConnectionCurrent')!=='function'))throw error('UI_ADDITIONAL_BINDING_REQUIRED','Attach all overlay comparison/callback ports together.');
  for(const key of ['onView','onPending','onError'])if(own(options,key)!==undefined&&typeof own(options,key)!=='function')throw error('UI_ATTACHMENT_CALLBACK_REQUIRED','Callbacks must be own functions.');
  if(!lifetime)lifetime=Object.freeze({});
  const r={active:true,lifetime,id:++sequence,options,captured:capturedOptions,onView:own(options,'onView'),onPending:own(options,'onPending'),onError:own(options,'onError'),additional:own(options,'readAdditionalData'),predicate:own(options,'isAdditionalConnectionCurrent')};
  const api={get view(){return!broken&&!closed&&r.active&&r.lifetime===lifetime?(controller?.view??lastView):null;},get pending(){return!broken&&!closed&&r.active&&r.lifetime===lifetime?!!resourceInvocation||(controller?.pending??lastPending):false;},refresh(){assertLive(r);if(dispatchDepth||invokingDepth)throw error('UI_ATTACHMENT_REENTRY','Refresh outside callbacks.');return controller.refresh();},dispose(){detach(r);}};
  for(const name of ['stage','review','apply','cancel','recover','history'])api[name]=(...args)=>invoke(r,name,args);
  records.add(r);revision++;
  try{
   if(!controller){
    creating=true;creations++;let made;
    try{made=createTileAuthoringUIController(binding,{onView:view=>fanout('onView',view),onPending:value=>fanout('onPending',value),onError:e=>fanout('onError',e),readAdditionalData:additional,isAdditionalConnectionCurrent:current,strictCallbackReads:true});}
    finally{creating=false;}
    if(closed||!records.size||!r.active||r.lifetime!==lifetime){made.dispose();throw error('UI_ATTACHMENT_RETIRED','Attachment closed during initialization.');}
    controller=made;flush();
   }else controller.refresh();
   return Object.freeze(api);
  }catch(e){detach(r);throw e;}
 }
 return Object.freeze({attach,
  get pending(){return resourceInvocation!==null||!!controller?.pending;},
  isConnectionCurrent(){const valid=current();if(!valid)clearBroken();return valid;},
  refresh(){if(dispatchDepth||invokingDepth||creating)throw error('UI_ATTACHMENT_REENTRY','Refresh outside callbacks.');if(!controller||!current()){clearBroken();return null;}return controller.refresh();},
  captureResourceDisplay(displayed){
   if(dispatchDepth||invokingDepth||creating)throw error('UI_ATTACHMENT_REENTRY','Capture a resource action outside callbacks.');
   if(!controller||!current()){clearBroken();throw error('UI_REBIND_REQUIRED','The actual UI connection is unavailable.');}
   const active=controller,session=lifetime,version=revision;let guard;
   invokingDepth++;try{guard=active.captureResourceDisplay(displayed);}catch(e){invokingDepth--;flush();throw e;}invokingDepth--;
   const sameLifetime=()=>controller===active&&lifetime===session&&revision===version&&checkBase()&&[...records].every(r=>!r.active||callbacks(r));
   return Object.freeze({read(){
    if(dispatchDepth||invokingDepth||creating)throw error('UI_ATTACHMENT_REENTRY','Read the resource action outside callbacks.');
    if(!sameLifetime())throw error('UI_DISPLAY_CHANGED','The displayed UI attachment lifetime changed.');
    let raw;invokingDepth++;try{raw=guard.read();}catch(e){invokingDepth--;flush();throw e;}invokingDepth--;
    // Pure identity/lifetime checks only: no currentness callback after the
    // coordinator's final actual data read and before resource dispatch.
    if(!sameLifetime()){clearBroken();flush();throw error('UI_DISPLAY_CHANGED','The displayed UI attachment lifetime changed.');}
    return raw;
   }});
  },
  beginResourceUI(){
   if(dispatchDepth||invokingDepth||creating)throw error('UI_ATTACHMENT_REENTRY','Start resource UI outside callbacks.');
   if(!controller||!current()){clearBroken();throw error('UI_REBIND_REQUIRED','The actual UI connection is unavailable.');}
   if(resourceInvocation||controller.pending)throw error('UI_RESOURCE_PENDING','A UI invocation is already pending.');
   const token=Object.freeze({});resourceInvocation=token;let ended=false;
   const end=()=>{if(ended)return;ended=true;if(resourceInvocation===token){resourceInvocation=null;if(controller&&!closed)fanout('onPending',controller.pending);}};
   try{fanout('onPending',controller.pending);if(!controller||!current())throw error('UI_REBIND_REQUIRED','The connection retired while displaying resource pending.');return end;}catch(e){end();throw e;}
  },
  diagnostics(){return Object.freeze({controllerCreations:creations,liveControllers:controller?1:0,attachments:records.size,attachmentRevision:revision,resourceUIPending:resourceInvocation!==null,broken,closed});},
  dispose(){if(closed)return;closed=true;for(const r of records)r.active=false;records.clear();revision++;retire();}
 });
}
