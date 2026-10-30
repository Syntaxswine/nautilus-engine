import {createGrenadeExample,grenadeContext,createGrenadeState,openGrenadeState,serializeGrenadeState,previewGrenade,stageGrenade,adoptGrenadeContext} from '@nautilus-engine/map-core/grenades';
export const SAVE_KEY='nautilus:grenade-reference:v1';
export const ACTIVE_KEY=SAVE_KEY+':active';
export function createReferenceState({id='native-grenade-reference',weapon='smg',scenario='yard',hp=90,ap=12,stock=3}={}){
 const context=grenadeContext(createGrenadeExample()),actor=context.actors.find(value=>value.id===context.control.actorId);
 // Derive the complete current schema from the public example. The visual actor
 // is explicitly a horse; this fixture does not substitute art for a sheep.
 Object.assign(actor,{name:'Horse worker',species:'horse',weapon,hp,ap,grenades:stock,grenadePackRounds:actor.grenadePackRounds.map(()=>stock)});
 if(scenario==='blocked')context.world.boxes=context.world.boxes.map(box=>({...box,height:5}));
 else if(scenario==='unexplored')context.world.seen=context.world.seen.filter(key=>key!=='23,10');
 else if(scenario!=='yard')throw Error('Unknown reference scenario.');
 return createGrenadeState({id,...context});
}
export function createGrenadeReferenceHost({state=createReferenceState(),storage,write=(key,value)=>storage.setItem(key,value),commandId=kind=>kind+'-'+crypto.randomUUID()}={}){
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||typeof write!=='function'||typeof commandId!=='function')throw Error('Supply durable synchronous storage and a fresh command ID allocator.');
 const copy=value=>structuredClone(value);let current=openGrenadeState(state),activeStamp=storage.getItem(ACTIVE_KEY),pending=null,lastCommand=null,conflict=false;
 // Construction is read-only. A new field's first durable transition uses the
 // same tracked CAS path; setup cannot persist a different session then throw.
 const serial=()=>serializeGrenadeState(current),requireSettled=()=>{if(pending)throw Error('Reconcile the pending save outcome first.');};
 const refusal=()=>{conflict=true;return {ok:false,code:'ACTIVE_CHANGED',reason:'The active field changed. Use active record to continue with its validated state.',next:openGrenadeState(current)};};
 function accept(transaction){current=openGrenadeState(transaction.next);activeStamp=transaction.next;pending=null;conflict=false;if(transaction.kind==='load')lastCommand=null;return copy(transaction.result);}
 function persist(staged,kind){
  if(!staged.ok)return copy(staged);
  if(staged.expected.state!==serial()||storage.getItem(ACTIVE_KEY)!==activeStamp)return refusal();
  const transaction={kind,before:activeStamp,next:serializeGrenadeState(staged.next),result:copy(staged)};pending=transaction;
  try{write(ACTIVE_KEY,transaction.next);return accept(transaction);}
  catch(error){throw Error('Save outcome unknown; reconcile before trying again. '+error.message);}
 }
 const host={
  snapshot(){return openGrenadeState(current);},
  context(){return grenadeContext(current);},
  preview(point){return previewGrenade(current,{actorId:current.control.actorId,point});},
  confirm(point){requireSettled();const command={version:1,id:commandId('throw'),expectedRevision:current.revision,actorId:current.control.actorId,point},staged=stageGrenade(current,command);if(staged.ok)lastCommand=copy(staged.receipt.command);return persist(staged,'throw');},
  retryLastCommand(){requireSettled();if(!lastCommand)throw Error('There is no throw command to retry.');return persist(stageGrenade(current,lastCommand),'throw');},
  equip(weapon){requireSettled();const context=grenadeContext(current),actor=context.actors.find(value=>value.id===context.control.actorId);actor.weapon=weapon;return persist(adoptGrenadeContext(current,{version:1,id:commandId('equip'),expectedRevision:current.revision,...context}),'context');},
  reconcile(){
   if(!pending)return {ok:true,outcome:'unchanged'};
   const stored=storage.getItem(ACTIVE_KEY),transaction=pending;
   if(stored===transaction.next){accept(transaction);return {ok:true,outcome:'committed',kind:transaction.kind,...(transaction.result.receipt?{receipt:copy(transaction.result.receipt)}:{})};}
   if(stored===transaction.before){pending=null;conflict=false;return {ok:true,outcome:'refused',kind:transaction.kind};}
   conflict=true;throw Error('The active record differs from both known outcomes. Use active record to validate and adopt the stored session explicitly.');
  },
  adoptActive(){const raw=storage.getItem(ACTIVE_KEY);if(raw===null)throw Error('There is no active record to adopt.');const next=openGrenadeState(raw);current=next;activeStamp=raw;pending=null;lastCommand=null;conflict=false;return host.snapshot();},
  save(){requireSettled();const value=serial();storage.setItem(SAVE_KEY,value);return value;},
  load(){
   requireSettled();const value=storage.getItem(SAVE_KEY);if(value===null)throw Error('No saved field is available.');const next=openGrenadeState(value),result=persist({ok:true,next,expected:{state:serial()}},'load');if(!result.ok)throw Error(result.reason);return host.snapshot();
  },
  diagnostics(){return {id:current.id,revision:current.revision,pending:!!pending,pendingKind:pending?.kind??null,conflict,lastCommand:lastCommand?copy(lastCommand):null,bodies:current.receipts.filter(value=>value.type==='throw').flatMap(value=>value.bodies).map(value=>({...value})),throwReceipts:current.receipts.filter(value=>value.type==='throw').length};}
 };
 return Object.freeze(host);
}
