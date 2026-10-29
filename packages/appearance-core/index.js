// Separate headless appearance envelope. Legacy formats/enums remain unchanged.
import {inputData,fields,identifier,integer,finite,ordered,bytes,fail,WorldError} from '../world-core/validation.js';
import {loadBlueprint} from '../map-core/persistence.js';
import {EditingDocument} from '../map-core/roof-document.js';
import {passable} from '../map-core/maps.js';
import {wallRunsBlockStep} from '../map-core/wall-runs.js';
import {extractBlock,placeBlock} from '../map-core/roof-blocks.js';
import {rotateSceneryBlock} from '../map-core/roof-rotation.js';
import {blueprintRequirements,assertRequirements} from '../map-core/capabilities.js';
import {BEAR_FEATURE,BEAR_OUTFITS,BEAR_WEAPONS} from '../actors-bear/index.js';
export const APPEARANCE_CONTRACT=Object.freeze({schemaId:'nautilus-appearance-document',version:1,featureId:BEAR_FEATURE,maxActors:256,maxBytes:8000000,maxAuthoredBytes:65536,maxHistory:32,maxHistoryBytes:16000000});
const actorFields=['id','species','outfit','weapon','role','x','y','z','heading','authored'],sameCell=(a,b)=>a.x===b.x&&a.y===b.y&&(a.z||0)===(b.z||0),copy=value=>structuredClone(value);
function baseDocument(blueprint){return new EditingDocument().open(JSON.stringify(blueprint));}
function sizeOf(document){return document.blueprint.kind==='red-shift-block'?24:240;}
export function openAppearance(input){
  const data=inputData(input,APPEARANCE_CONTRACT.maxBytes);fields(data,['kind','version','blueprint','actors'],'');
  if(data.kind!==APPEARANCE_CONTRACT.schemaId||data.version!==1)fail('UNSUPPORTED_APPEARANCE_SCHEMA','/version','Expected nautilus-appearance-document version 1.');
  data.blueprint=loadBlueprint(data.blueprint);return actorsData(data);
}
// The class reuses this check for actor-only edits against its private, already
// validated base. No public reference can mutate that cached blueprint.
function actorsData(data){
  if(!Array.isArray(data.actors)||data.actors.length>APPEARANCE_CONTRACT.maxActors)fail('APPEARANCE_ACTOR_LIMIT','/actors','Declare at most 256 appearance actors.');
  if(bytes(JSON.stringify(data))>APPEARANCE_CONTRACT.maxBytes)fail('APPEARANCE_BYTE_LIMIT','/','Appearance document exceeds 8,000,000 UTF-8 bytes.');
  const base=data.blueprint,ids=new Set(),cells=[],size=sizeOf(data);
  for(const [index,actor]of data.actors.entries()){
    const path='/actors/'+index;fields(actor,actorFields,path);identifier(actor.id,path+'/id');if(ids.has(actor.id))fail('DUPLICATE_APPEARANCE_ID',path+'/id','Appearance actor IDs must be unique.');ids.add(actor.id);
    if(actor.species!=='bear'||!BEAR_OUTFITS.includes(actor.outfit)||!BEAR_WEAPONS.includes(actor.weapon)||!['guard','npc'].includes(actor.role))fail('UNSUPPORTED_APPEARANCE',path,'Choose the real bear model, a supported outfit/equipment and Guard/NPC role.');
    integer(actor.x,0,size-1,path+'/x');integer(actor.y,0,size-1,path+'/y');integer(actor.z,0,Math.min(5,base.levels-1),path+'/z');finite(actor.heading,0,359.99999999999994,path+'/heading');
    if(!actor.authored||Array.isArray(actor.authored)||typeof actor.authored!=='object'||bytes(JSON.stringify(actor.authored))>APPEARANCE_CONTRACT.maxAuthoredBytes)fail('INVALID_AUTHORED_CHARACTER',path+'/authored','Preserve a plain authored-character object within 65,536 UTF-8 bytes.');
    if(cells.some(other=>sameCell(other,actor))||[...(base.starts||[]),...(base.guards||[])].some(other=>sameCell(other,actor)))fail('APPEARANCE_OCCUPIED',path,'Another authored character occupies this placement anchor.');
    if(!passable(base,actor)||wallRunsBlockStep(base,actor,actor))fail('APPEARANCE_UNSUPPORTED_ANCHOR',path,'Place the bear on a supported, unblocked legacy authoring tile. Native body/weapon clearance remains a separate geometry-provider check.');cells.push(actor);
  }
  return data;
}
export function createAppearance(blueprint,actors=[]){return openAppearance({kind:APPEARANCE_CONTRACT.schemaId,version:1,blueprint,actors});}
export function serializeAppearance(input){return JSON.stringify(ordered(openAppearance(input)));}
export function appearanceRequirements(input){const data=openAppearance(input),base=blueprintRequirements(data.blueprint);return {schema:{id:APPEARANCE_CONTRACT.schemaId,version:1},required:[...base.required,...(data.actors.length?[{id:BEAR_FEATURE,minVersion:1,maxVersion:1}]:[])],optional:[]};}
export function assertAppearanceCompatible(input,consumer){const data=openAppearance(input);assertRequirements(appearanceRequirements(data),consumer);return data;}
export function exportLegacyAppearance(input){const data=openAppearance(input);if(data.actors.length)fail('APPEARANCE_DOWNGRADE_REFUSED','/actors','Bear appearance cannot be exported as a bare legacy map/block; keep the complete appearance envelope.');return copy(data.blueprint);}
export function validateAppearance(input){try{openAppearance(input);return [];}catch(error){return error.diagnostics||[{code:'INVALID_APPEARANCE',path:'/',message:error.message,action:'Correct the complete appearance document before loading.'}];}}
function sector(sx,sy){integer(sx,0,9,'/sector/x');integer(sy,0,9,'/sector/y');}
const inSector=(actor,sx,sy)=>actor.x>=sx*24&&actor.x<(sx+1)*24&&actor.y>=sy*24&&actor.y<(sy+1)*24;
export function captureAppearanceSector(input,sx,sy){const data=openAppearance(input);if(sizeOf(data)!==240)fail('APPEARANCE_MAP_REQUIRED','/blueprint','Capture a sector from a full map.');sector(sx,sy);return createAppearance(extractBlock(baseDocument(data.blueprint).editor.map,sx,sy),data.actors.filter(actor=>inSector(actor,sx,sy)).map(actor=>({...copy(actor),x:actor.x-sx*24,y:actor.y-sy*24})));}
export function rotateAppearanceBlock(input){const data=openAppearance(input);if(sizeOf(data)!==24)fail('APPEARANCE_BLOCK_REQUIRED','/blueprint','Rotate a complete appearance block.');return createAppearance(rotateSceneryBlock(data.blueprint),data.actors.map(actor=>({...copy(actor),x:23-actor.y,y:actor.x,heading:(actor.heading+90)%360})));}
export function placeAppearanceBlock(input,blockInput,sx,sy){
  const data=openAppearance(input),block=openAppearance(blockInput);sector(sx,sy);if(sizeOf(data)!==240||sizeOf(block)!==24)fail('APPEARANCE_BLOCK_REQUIRED','/blueprint','Place an appearance block into a full appearance map.');
  const retained=data.actors.filter(actor=>!inSector(actor,sx,sy)),ids=new Set(retained.map(actor=>actor.id)),idMap={};
  const incoming=block.actors.map(actor=>{let id=actor.id,next=1;while(ids.has(id))id=actor.id.slice(0,78)+'-copy-'+next++;ids.add(id);idMap[actor.id]=id;return {...copy(actor),id,x:actor.x+sx*24,y:actor.y+sy*24};});
  return {document:createAppearance(placeBlock(baseDocument(data.blueprint).editor.map,block.blueprint,sx,sy),[...retained,...incoming]),idMap};
}
function outcome(next,extra={}){return {ok:true,next,cells:[],error:null,...extra};}
export class AppearanceDocument {
  #data;#past=[];#future=[];
  constructor(input){this.revision=0;this.changed=false;if(input!==undefined)this.open(input);}
  open(input){const candidate=openAppearance(input);this.#data=candidate;this.#past=[];this.#future=[];this.revision=0;this.changed=false;return this;}
  get block(){return sizeOf(this.#data)===24;}get size(){return sizeOf(this.#data);}get blueprint(){return copy(this.#data.blueprint);}get actors(){return copy(this.#data.actors);}snapshot(){return copy(this.#data);}export(){return JSON.stringify(ordered(this.#data));}
  preview(command){
    try{const specification=inputData(command,APPEARANCE_CONTRACT.maxBytes);if(!specification||typeof specification!=='object')throw Error('Supply an appearance authoring command.');const next=this.snapshot();
      if(specification.expectedRevision!==undefined&&specification.expectedRevision!==this.revision)fail('STALE_APPEARANCE_REVISION','/expectedRevision','Preview/apply from the current authoring revision.');
      const allowed={place:['type','actor','expectedRevision'],update:['type','id','patch','expectedRevision'],remove:['type','id','expectedRevision'],base:['type','command','expectedRevision'],replace:['type','document','expectedRevision'],'place-block':['type','document','sx','sy','expectedRevision']};
      if(!Object.hasOwn(allowed,specification.type))fail('UNSUPPORTED_APPEARANCE_COMMAND','/type','Choose place, update, remove, base, replace or place-block.');fields(specification,allowed[specification.type],'/command',allowed[specification.type].filter(key=>key!=='expectedRevision'));
      if(specification.type==='place')next.actors.push(copy(specification.actor));
      else if(specification.type==='update'){identifier(specification.id,'/command/id');const index=next.actors.findIndex(actor=>actor.id===specification.id);if(index<0)throw Error('Select an existing appearance actor.');const patch=specification.patch;fields(patch,actorFields.filter(key=>key!=='id'),'/command/patch',[]);next.actors[index]={...next.actors[index],...copy(patch)};}
      else if(specification.type==='remove'){if(!next.actors.some(actor=>actor.id===specification.id))throw Error('Select an existing appearance actor.');next.actors=next.actors.filter(actor=>actor.id!==specification.id);}
      else if(specification.type==='replace')return outcome(openAppearance(specification.document));
      else if(specification.type==='place-block'){const placed=placeAppearanceBlock(next,specification.document,specification.sx,specification.sy);return outcome(placed.document,{idMap:placed.idMap});}
      else {const base=baseDocument(next.blueprint),result=base.apply(specification.command);if(!result.ok)throw Error(result.error||'Rejected legacy base edit.');next.blueprint=JSON.parse(base.export());}
      return outcome(specification.type==='base'?openAppearance(next):actorsData(next));
    }catch(error){return {ok:false,next:this.snapshot(),cells:[],error:error.message,code:error.code||'INVALID_APPEARANCE_COMMAND',diagnostics:error.diagnostics||[]};}
  }
  #commit(candidate){const previous=this.export(),pastBytes=this.#past.reduce((sum,item)=>sum+bytes(item),0);if(this.#past.length>=APPEARANCE_CONTRACT.maxHistory||pastBytes+bytes(previous)+bytes(JSON.stringify(candidate))>APPEARANCE_CONTRACT.maxHistoryBytes)fail('APPEARANCE_HISTORY_CAPACITY','/history','Authoring history is full; explicitly clear saved history before more edits.');this.#past.push(previous);this.#future=[];this.#data=copy(candidate);this.revision++;this.changed=true;}
  apply(command){const staged=this.preview(command);if(!staged.ok)return staged;try{this.#commit(staged.next);return {...staged,revision:this.revision};}catch(error){return {ok:false,next:this.snapshot(),cells:[],error:error.message,code:error.code,diagnostics:error.diagnostics};}}
  replace(input){const candidate=openAppearance(input);this.#commit(candidate);return this;}
  undo(){if(!this.#past.length)return false;const candidate=JSON.parse(this.#past.at(-1));this.#future.push(this.export());this.#past.pop();this.#data=candidate;this.revision++;this.changed=true;return true;}
  redo(){if(!this.#future.length)return false;const candidate=JSON.parse(this.#future.at(-1));this.#past.push(this.export());this.#future.pop();this.#data=candidate;this.revision++;this.changed=true;return true;}
  history(){return {undo:this.#past.length,redo:this.#future.length};}clearHistory(){this.#past=[];this.#future=[];}
  inspect(x,y,z=0){const actor=this.#data.actors.find(actor=>sameCell(actor,{x,y,z}));if(actor)return {type:'appearance-actor',label:'Bear '+actor.role,data:copy(actor),cells:[{x:actor.x,y:actor.y,z:actor.z}]};return baseDocument(this.#data.blueprint).inspect(x,y,z);}
  rotate(id){const actor=this.#data.actors.find(actor=>actor.id===id);return actor?this.apply({type:'update',id,patch:{heading:(actor.heading+90)%360}}):{ok:false,error:'Select an existing appearance actor.'};}
  capture(sx,sy){return captureAppearanceSector(this.#data,sx,sy);}place(block,sx,sy){return this.apply({type:'place-block',document:block,sx,sy});}
}
export function createAppearanceDocument(blueprint,actors=[]){return new AppearanceDocument(createAppearance(blueprint,actors));}
export {WorldError as AppearanceError};
