// Gate A presentation proposal. Targets the fixed Editor v2 presentation shape only.
export const TILE_STACK_UI_PROPOSAL=Object.freeze({
  kind:'nautilus-tile-stack-ui-proposal',version:1,
  base:'5d69c2130eb64b6f4e31bc672e884bdc33bf47d2',
  editorContract:'ce3a1afa02f70a478356de45c64364bb460b9c25',
  adapterKind:'nautilus-tile-stack-editor-adapter',adapterVersion:2,
  optionalMethods:Object.freeze(['lockOwner','setInspection'])
});
const phases=['idle','draft','preparing','review','applying','recovery-required','presentation-error','disposed'];
export const phaseLabel=phase=>({idle:'Ready',draft:'Draft — review required',preparing:'Preparing review',review:'Review — ready to apply',applying:'Applying','recovery-required':'Edit result unknown','presentation-error':'Accepted preview needs retry',disposed:'Session closed'})[phase];
const plain=value=>value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
function ownData(value,key,label){
  const slot=value!==null&&typeof value==='object'&&Object.getOwnPropertyDescriptor(value,key);
  if(!slot||!slot.enumerable||!Object.hasOwn(slot,'value'))throw new TypeError(label+' requires own plain data fields.');
  return slot.value;
}
function record(value,keys,label){
  if(!plain(value)||Reflect.ownKeys(value).some(key=>!keys.includes(key)))throw new TypeError(label+' must be an explicit plain versioned record.');
  for(const key of keys)ownData(value,key,label);
  return value;
}
const identity=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}(?![\s\S])/.test(value);
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}(?![\s\S])/.test(value);
// UI identity/projection validation only. Profile names and native floor geometry
// remain supplied/validated by Editor; no source, catalogue provenance or policy hash is recomputed.
function readWorkspaceIdentity(value){
  const workspace=record(ownData(value,'workspace','Snapshot'),['id','checkpointVersion','policyToken','floorProfile','floorTableId','floorTableToken','sourceSha256','finishBinding'],'Workspace');
  const profile=record(workspace.floorProfile,['id','version'],'Floor profile');
  const finish=record(workspace.finishBinding,['id','version','digest'],'Finish binding');
  if(workspace.checkpointVersion!==2||profile.version!==1||finish.version!==1)throw new TypeError('Use workspace v2, floor profile v1 and finish binding v1; unknown versions refuse.');
  if(![workspace.id,profile.id,workspace.floorTableId,finish.id].every(identity))throw new TypeError('Workspace/profile/table/finish identities must be stable ASCII IDs of at most 96 characters.');
  if(![workspace.policyToken,workspace.floorTableToken,workspace.sourceSha256,finish.digest].every(digest))throw new TypeError('Workspace tokens, source SHA and finish digest require exact lowercase SHA-256 values.');
  const catalogue=record(ownData(value,'finishCatalogue','Snapshot'),['id','version','digest','entries'],'Finish catalogue');
  if(!identity(catalogue.id)||catalogue.version!==1||!digest(catalogue.digest)||!Array.isArray(catalogue.entries)||!catalogue.entries.length||catalogue.entries.length>64)throw new TypeError('A fixed typed finish catalogue v1 is required.');
  if(finish.id!==catalogue.id||finish.version!==catalogue.version||finish.digest!==catalogue.digest)throw new TypeError('Finish catalogue disagrees with the captured workspace binding.');
  return {workspace,catalogue};
}
export function readTileStackUISnapshot(value,floorState){
  if(value?.version!==2||value.interface?.kind!==TILE_STACK_UI_PROPOSAL.adapterKind||value.interface.version!==2)throw new TypeError('Bind the explicit tile-stack Editor v2 adapter; v1 drafts are not upgraded.');
  if(!phases.includes(value.phase)||!value.actions||!Array.isArray(value.owners)||!Array.isArray(value.diagnostics))throw new TypeError('Invalid Editor UI snapshot.');
  if(!value.owners.every(owner=>owner&&typeof owner.id==='string'&&typeof owner.locked==='boolean'))throw new TypeError('Invalid whole-owner presentation.');
  for(const action of ['setTool','setDraft','finish','stack','selectOwner','review','apply','cancel','recover','retryPresentation','setInspection'])if(typeof value.actions[action]!=='boolean')throw new TypeError('Missing Editor action flag: '+action);
  const {workspace,catalogue}=readWorkspaceIdentity(value);
  const ids=new Set();
  for(const entry of catalogue.entries){
    if(!entry||typeof entry.id!=='string'||!Number.isSafeInteger(entry.version)||entry.version<1||typeof entry.label!=='string'||typeof entry.available!=='boolean'||(entry.available?entry.reason!==null:typeof entry.reason!=='string'||!entry.reason))throw new TypeError('Malformed typed finish choice.');
    if(ids.has(entry.id))throw new TypeError('Each fixed catalogue has one active version per finish ID.');ids.add(entry.id);
  }
  const actual=floorState.floors,floor=actual.find(item=>item.id===floorState.selectedId);
  if(!Array.isArray(value.floors)||value.floors.length!==actual.length||value.floors.some((row,index)=>!row||row.id!==actual[index].id||row.label!==actual[index].label||row.elevationM!==actual[index].elevationM))throw new TypeError('Declared Editor floors disagree with the actual controller.');
  if(!floor||value.floor?.id!==floor.id||value.floor.elevationM!==floor.elevationM||value.floor.mode!==floorState.mode)throw new TypeError('Editor and borrowed floor context disagree.');
  if(value.acceptedMinimumClearanceM!==undefined&&value.acceptedMinimumClearanceM!==null&&(typeof value.acceptedMinimumClearanceM!=='number'||!Number.isFinite(value.acceptedMinimumClearanceM)||value.acceptedMinimumClearanceM<=0))throw new TypeError('Accepted minimum must be a positive host value, null, or unreported.');
  return value;
}
export function workspaceUIBinding(value){
  const {workspace:w,catalogue:c}=readWorkspaceIdentity(value);
  return JSON.stringify([
    w.id,w.checkpointVersion,w.policyToken,w.floorProfile.id,w.floorProfile.version,
    w.floorTableId,w.floorTableToken,w.sourceSha256,
    w.finishBinding.id,w.finishBinding.version,w.finishBinding.digest,
    c.id,c.version,c.digest,
    c.entries.map(({id,version,label})=>({id,version,label})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
  ]);
}
function finite(value,label){
  if(!['number','string'].includes(typeof value)||typeof value==='string'&&!value.trim())throw new TypeError('Enter '+label+' explicitly.');
  const number=Number(value);if(!Number.isFinite(number))throw new TypeError(label+' must be finite.');return number;
}
export function tileStackIntent({rectangle,floorIds,minimumClearanceM},floors){
  if(!rectangle||!['rectangle','stack'].includes(rectangle.tool)||!Array.isArray(rectangle.origin)||rectangle.origin.length!==2)throw new TypeError('Supply the current Editor rectangle source.');
  if(!Array.isArray(floorIds)||floorIds.length<2||floorIds.length>15||new Set(floorIds).size!==floorIds.length)throw new TypeError('Select two to fifteen distinct declared stack floors.');
  const known=new Set(floors.map(floor=>floor.id));if(floorIds.some(id=>!known.has(id)))throw new TypeError('A selected floor is not declared by the host.');
  if(rectangle.origin.some(n=>typeof n!=='number'||!Number.isFinite(n))||!['widthM','depthM'].every(key=>typeof rectangle[key]==='number'&&Number.isFinite(rectangle[key])&&rectangle[key]>0)||!Number.isInteger(rectangle.seed)||rectangle.seed<0||rectangle.seed>4294967295)throw new TypeError('Retain finite planar dimensions and an explicit uint32 seed.');
  const clearance=finite(minimumClearanceM,'requested minimum clearance');if(!(clearance>0))throw new TypeError('Minimum clearance must be positive.');
  if(typeof rectangle.finishId!=='string'||!rectangle.finishId)throw new TypeError('The v2 source rectangle needs its captured finishId.');
  const selected=new Set(floorIds);
  // Only intent: original planar dimensions/seed/finish, IDs and explicit request.
  return {tool:'stack',ownerId:null,origin:[...rectangle.origin],widthM:rectangle.widthM,depthM:rectangle.depthM,seed:rectangle.seed,floorIds:floors.filter(floor=>selected.has(floor.id)).map(floor=>floor.id),minimumClearanceM:clearance,lockPolicy:'all-except-highest',finishId:rectangle.finishId};
}
export function tileFinishIntent({ownerId,finishId},catalogue){
  if(typeof ownerId!=='string'||!ownerId)throw new TypeError('Select a whole authored owner.');
  const entry=catalogue.entries.find(item=>item.id===finishId);if(!entry)throw new TypeError('Choose a current finish ID from the captured catalogue.');
  if(!entry.available)throw new TypeError(entry.reason);
  return {tool:'finish',ownerId,finishId:entry.id};
}
