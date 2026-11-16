import {openCharacter} from '../rules-core/index.js';
import {copy,fields,id,integer,number,point,fail,stable} from './data.js';
import {STEALTH_PROFILE} from './contract.js';
import {movementMode,previewStealthMove} from './movement.js';
import {previewAwareness,applyAwareness} from './awareness.js';

export function createStealthState(actors){
  if(!Array.isArray(actors))fail('STEALTH_DATA','Supply explicit actor IDs.');
  return openStealthState({kind:'nautilus-stealth-state',version:1,profile:STEALTH_PROFILE,revision:0,actors:actors.map(actorId=>({actorId,mode:'walk',stance:'standing',travelM:0})),contacts:[],receipts:[]});
}
export function openStealthState(input){
  const s=copy(typeof input==='string'?JSON.parse(input):input);fields(s,['kind','version','profile','revision','actors','contacts','receipts']);
  if(s.kind!=='nautilus-stealth-state'||s.version!==1||s.profile!==STEALTH_PROFILE)fail('STEALTH_SAVE_VERSION','Use the complete supported stealth v1 state.');integer(s.revision);
  if(!Array.isArray(s.actors)||!s.actors.length||s.actors.length>64||new Set(s.actors.map(a=>a.actorId)).size!==s.actors.length||!Array.isArray(s.contacts)||s.contacts.length>4096||!Array.isArray(s.receipts)||s.receipts.length>4224)fail('STEALTH_DATA','Bounded unique actors, contacts and receipts required.');
  for(const a of s.actors){fields(a,['actorId','mode','stance','travelM']);id(a.actorId);movementMode(a.mode,a.stance);number(a.travelM);}
  const known=new Set(s.actors.map(a=>a.actorId)),pairs=new Set();
  for(const c of s.contacts){fields(c,['observerId','targetId','score','lastKnown','perceived','seconds','combat','round','spent','signature','observerAP','targetAP']);
    if(!known.has(c.observerId)||!known.has(c.targetId)||c.observerId===c.targetId||pairs.has(c.observerId+'|'+c.targetId))fail('STEALTH_DATA','Contacts require unique retained actor pairs.');pairs.add(c.observerId+'|'+c.targetId);number(c.score,0,100);integer(c.perceived,0,2);number(c.seconds,0,60);integer(c.round);number(c.spent,0,60);number(c.observerAP);number(c.targetAP);
    if(typeof c.combat!=='boolean'||typeof c.signature!=='string'||c.signature.length>10000)fail('STEALTH_DATA','Invalid contact boundary.');if(c.lastKnown!==null)point(c.lastKnown);
  }
  const receipts=new Set();for(const r of s.receipts){fields(r,['id','type','stream','sequence','fingerprint']);id(r.id);if(typeof r.stream!=='string'||r.stream.length>512)fail('STEALTH_DATA','Invalid receipt stream.');const stream=JSON.parse(r.stream);if(!Array.isArray(stream)||stream[0]!==r.type||stream.length!==(r.type==='awareness'?3:2)||stream.slice(1).some(id=>!known.has(id)))fail('STEALTH_DATA','Receipt stream is not retained.');integer(r.sequence);if(receipts.has(r.stream)||!['posture','move','awareness'].includes(r.type)||typeof r.fingerprint!=='string'||r.fingerprint.length>25000)fail('STEALTH_DATA','Invalid durable command receipt.');receipts.add(r.stream);}
  return s;
}
function begin(input,command,type,stream){
  const s=openStealthState(input);id(command.id);integer(command.expectedRevision);integer(command.sequence);if(command.version!==1)fail('STEALTH_COMMAND_VERSION','Use a versioned stealth command.');
  const {expectedRevision,...identity}=command,fingerprint=stable(identity),old=s.receipts.find(r=>r.stream===stream);
  if(old&&command.sequence<old.sequence)fail('STEALTH_COMMAND_RETIRED','An older stream sequence cannot be replayed after its successor.');
  if(old&&command.sequence===old.sequence){if(old.id!==command.id||old.type!==type||old.fingerprint!==fingerprint)fail('STEALTH_COMMAND_CONFLICT','A durable command ID cannot be reused for another request.');return {state:s,repeated:true,fingerprint,stream};}
  if(s.revision!==command.expectedRevision)fail('STEALTH_STALE','Refresh the current host/stealth snapshot before committing.');
  return {state:s,repeated:false,fingerprint,stream};
}
function finish(start,command,type,events,character){
  const next=start.state;if(!start.repeated){next.revision++;next.receipts=next.receipts.filter(r=>r.stream!==start.stream);next.receipts.push({id:command.id,type,stream:start.stream,sequence:command.sequence,fingerprint:start.fingerprint});}
  return {ok:true,repeated:start.repeated,next:openStealthState(next),...(character?{character}:{}),events:start.repeated?[]:copy(events)};
}
function actor(state,actorId){id(actorId);const a=state.actors.find(a=>a.actorId===actorId);if(!a)fail('STEALTH_ACTOR','Bind a retained actor.');return a;}
export function stageStealthPosture(input,command){
  fields(command,['version','id','sequence','expectedRevision','actorId','mode','stance','confirmed']);if(command.confirmed!==true)fail('STEALTH_BOUNDARY','Posture changes require an accepted host boundary.');movementMode(command.mode,command.stance);
  const start=begin(input,command,'posture',stable(['posture',command.actorId])),a=actor(start.state,command.actorId);
  if(!start.repeated){a.mode=command.mode;a.stance=command.stance;}
  return finish(start,command,'posture',[{type:'stealth-posture',actorId:a.actorId,mode:a.mode,stance:a.stance}]);
}
export function stageStealthMove(input,characterInput,command){
  fields(command,['version','id','sequence','expectedRevision','actorId','specification','confirmation']);
  const c=command.confirmation;fields(c,['accepted','worldId','worldRevision','floorId','from','to']);
  if(c.accepted!==true)fail('STEALTH_BOUNDARY','Only accepted host movement may stage costs/noise.');id(c.worldId);id(c.floorId);integer(c.worldRevision);point(c.from);point(c.to);
  if(Math.abs(c.from.h-c.to.h)>1e-8)fail('STEALTH_GEOMETRY','This movement profile supports same-plane segments only; retain host traversal costs for slopes/floors.');
  const start=begin(input,command,'move',stable(['move',command.actorId])),a=actor(start.state,command.actorId),character=openCharacter(characterInput);
  if(character.id!==a.actorId)fail('STEALTH_ACTOR','Portable character identity differs.');
  if(start.repeated)return finish(start,command,'move',[],character);
  const spec=command.specification,preview=previewStealthMove(character,spec),distance=Math.hypot(c.to.x-c.from.x,c.to.y-c.from.y);
  if(spec.mode!==a.mode||spec.stance!==a.stance||Math.abs(distance-spec.distanceM)>1e-7||distance<1e-8)fail('STEALTH_BOUNDARY','Retain the committed posture and exact nonzero host segment length.');
  if(!preview.ok)return {ok:false,code:preview.code,repeated:false,next:openStealthState(input),character,events:[]};
  character.resources.ap=Math.max(0,character.resources.ap-preview.costs.ap);character.resources.stamina=Math.max(0,character.resources.stamina-preview.costs.stamina);a.travelM+=distance;
  return finish(start,command,'move',[{kind:'nautilus-stealth-footstep',version:1,id:command.id+':footstep',actorId:a.actorId,position:copy(c.to),radiusM:preview.noiseRadiusM,worldId:c.worldId,worldRevision:c.worldRevision}],openCharacter(character));
}
export function stageStealthAwareness(input,command){
  fields(command,['version','id','sequence','expectedRevision','observation','boundary','confirmed']);if(command.confirmed!==true)fail('STEALTH_BOUNDARY','Awareness requires a confirmed host time/action boundary.');
  const start=begin(input,command,'awareness',stable(['awareness',command.observation.observer.id,command.observation.target.id])),observation=previewAwareness(command.observation);actor(start.state,observation.observerId);actor(start.state,observation.targetId);
  if(start.repeated)return finish(start,command,'awareness',[]);
  const contacts=start.state.contacts,index=contacts.findIndex(c=>c.observerId===observation.observerId&&c.targetId===observation.targetId),before=index<0?null:contacts[index],next=applyAwareness(before,observation,command.boundary);
  if(index<0)contacts.push(next);else contacts[index]=next;
  return finish(start,command,'awareness',[{type:'stealth-contact',observerId:next.observerId,targetId:next.targetId,score:next.score,perceived:next.perceived}]);
}
export function openStealthSave(input){
  const data=copy(typeof input==='string'?JSON.parse(input):input);fields(data,['kind','version','state','characters']);if(data.kind!=='nautilus-stealth-save'||data.version!==1||!Array.isArray(data.characters))fail('STEALTH_SAVE_VERSION','Use a complete v1 stealth save.');
  data.state=openStealthState(data.state);data.characters=data.characters.map(openCharacter);const ids=new Set(data.characters.map(c=>c.id));
  if(ids.size!==data.characters.length||ids.size!==data.state.actors.length||data.state.actors.some(a=>!ids.has(a.actorId)))fail('STEALTH_ACTOR','Save every retained portable character exactly once.');
  return data;
}
export const exportStealthSave=({state,characters})=>JSON.stringify(openStealthSave({kind:'nautilus-stealth-save',version:1,state,characters}));
