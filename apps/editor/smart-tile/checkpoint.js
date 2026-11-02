import {sha256} from '../../../packages/parts-core/hash.js';
import {SMART_TILE_INTERFACE as C,SMART_TILE_LIMITS as L} from './contract.js';

export class SmartTileError extends TypeError {
  constructor(code,path,message){super(message);this.name='SmartTileError';this.code=code;this.diagnostics=[{code,path,message,action:'Keep accepted source, history and view; correct the named field or recover the original request.'}];}
}
export const fail=(code,path,message)=>{throw new SmartTileError(code,path,message);};
const plain=v=>v!==null&&typeof v==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
export const bytes=text=>new TextEncoder().encode(text).length;
const ptr=k=>k.replaceAll('~','~0').replaceAll('/','~1');
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
export const smartTileDigest=value=>sha256(canonical(smartTileData(value)));
const sourceChecks=new WeakMap();
export function smartTileData(input){
  if(typeof input==='string'){if(bytes(input)>L.checkpointBytes)fail('CHECKPOINT_LIMIT','/','Checkpoint exceeds 16 MB.');try{input=JSON.parse(input);}catch{fail('INVALID_CHECKPOINT_JSON','/','Supply complete JSON.');}}
  const active=new Set();let nodes=0,text=0;
  function copy(v,path,depth){
    if(++nodes>L.nodes||depth>L.depth)fail('CHECKPOINT_LIMIT',path,'Checkpoint exceeds its node/depth budget.');
    if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return v;
    if(typeof v==='string'){text+=v.length;if(text>L.checkpointBytes)fail('CHECKPOINT_LIMIT',path,'Text budget exceeded.');return v;}
    if(typeof v!=='object'||active.has(v)||!Array.isArray(v)&&!plain(v))fail('INVALID_CHECKPOINT_DATA',path,'Use finite acyclic plain JSON.');
    const array=Array.isArray(v),keys=Reflect.ownKeys(v);if(keys.length>L.nodes||array&&v.length>65536)fail('CHECKPOINT_LIMIT',path,'Record/array budget exceeded.');
    for(const key of keys){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(v,key);if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||array&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=v.length))fail('INVALID_CHECKPOINT_DATA',path,'Accessors, hidden/symbol fields and exotic arrays refuse before invocation.');text+=key.length;}
    if(text>L.checkpointBytes)fail('CHECKPOINT_LIMIT',path,'Text budget exceeded.');active.add(v);const out=array?[]:{};
    if(array)for(let i=0;i<v.length;i++){if(!Object.hasOwn(v,i))fail('INVALID_CHECKPOINT_DATA',path,'Sparse arrays refuse.');out.push(copy(Object.getOwnPropertyDescriptor(v,String(i)).value,path+'/'+i,depth+1));}
    else for(const key of keys)Object.defineProperty(out,key,{value:copy(Object.getOwnPropertyDescriptor(v,key).value,path+'/'+ptr(key),depth+1),enumerable:true,writable:true,configurable:true});active.delete(v);return out;
  }
  const out=copy(input,'',0);if(bytes(JSON.stringify(out))>L.checkpointBytes)fail('CHECKPOINT_LIMIT','/','Checkpoint exceeds 16 MB.');return out;
}
export function fields(value,keys,path,required=keys){if(!plain(value))fail('INVALID_CHECKPOINT_RECORD',path,'Expected a plain record.');for(const key of Object.keys(value))if(!keys.includes(key))fail('UNKNOWN_CHECKPOINT_FIELD',path+'/'+ptr(key),'Unknown versioned field.');for(const key of required)if(!Object.hasOwn(value,key))fail('MISSING_CHECKPOINT_FIELD',path+'/'+key,'Required field absent.');}
export function id(v,path){if(typeof v!=='string'||v.length>96||!/^[A-Za-z0-9][A-Za-z0-9_.:-]*(?![\s\S])/.test(v))fail('INVALID_ID',path,'Supply a stable ASCII identity of at most 96 characters.');}
const digest=(v,path)=>{if(typeof v!=='string'||!/^[a-f0-9]{64}(?![\s\S])/.test(v))fail('INVALID_DIGEST',path,'Supply an exact digest.');};
const integer=(v,path)=>{if(!Number.isSafeInteger(v)||v<0)fail('INVALID_INTEGER',path,'Supply a nonnegative safe integer.');};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
function services(deps){
  const result={};for(const [name,methods]of [['mapCore',['loadBlueprint']],['tiles',['openTileBundle','tileLayoutToken']]]){const d=Object.getOwnPropertyDescriptor(deps,name);if(!d||!Object.hasOwn(d,'value'))fail('MISSING_CORE','/core/'+name,'Borrow the actual public core namespace.');for(const method of methods){const fn=Object.getOwnPropertyDescriptor(d.value,method);if(!fn||!Object.hasOwn(fn,'value')||typeof fn.value!=='function')fail('MISSING_CORE','/core/'+name+'/'+method,'Bind the actual public function.');}result[name]=d.value;}return result;
}
const authorities=new Set(['nautilus-tile-bundle','nautilus-tile-layout','nautilus-tile-recipe','nautilus-functional-parts','nautilus-extended-world','nautilus-window-authoring','nautilus-window-pane-state','nautilus-farmyard-window-host-save']);
function refuseAuthority(v,path){if(!v||typeof v!=='object')return;if(authorities.has(v.kind))fail('SOURCE_AUTHORITY_UNSUPPORTED',path,'The read-only source must be a complete portable map, not a nested authoring authority.');for(const [k,item]of Object.entries(v)){if(k==='farmyardWindows')fail('SOURCE_AUTHORITY_UNSUPPORTED',path+'/'+k,'Keep the original legacy window file; this proof does not migrate it.');refuseAuthority(item,path+'/'+ptr(k));}}
function document(input,deps){
  fields(input,['id','sourceJSON','floorBinding','tileBundle'],'/document');id(input.id,'/document/id');
  if(typeof input.sourceJSON!=='string'||bytes(input.sourceJSON)>L.sourceBytes)fail('SOURCE_LIMIT','/document/sourceJSON','Retain complete original map JSON within 4 MB.');
  let source;try{source=smartTileData(input.sourceJSON);}catch(error){throw error;}
  refuseAuthority(source,'/document/sourceJSON');if(!plain(source)||source.version!==2||source.kind==='red-shift-block')fail('SOURCE_MAP_REQUIRED','/document/sourceJSON','Open a complete portable map v2; block/window/world composition is outside this proof.');
  let checked=sourceChecks.get(deps.mapCore);if(!checked){checked=new Set();sourceChecks.set(deps.mapCore,checked);}if(!checked.has(input.sourceJSON)){deps.mapCore.loadBlueprint(source);checked.add(input.sourceJSON);while(checked.size>2)checked.delete(checked.values().next().value);}
  fields(input.floorBinding,['id','version','floors'],'/document/floorBinding');if(input.floorBinding.id!=='editor-supplied-native-floors-v1'||input.floorBinding.version!==1)fail('FLOOR_PROFILE_UNSUPPORTED','/document/floorBinding','Use explicit supplied native floor bindings v1.');
  const floors=input.floorBinding.floors;if(!Array.isArray(floors)||!floors.length||floors.length>64)fail('FLOOR_LIMIT','/document/floorBinding/floors','Supply the real available floors.');const ids=new Set(),layers=new Set();
  for(const [i,f]of floors.entries()){const path='/document/floorBinding/floors/'+i;fields(f,['id','label','elevationM','legacyLayer'],path);id(f.id,path+'/id');if(ids.has(f.id)||typeof f.label!=='string'||!f.label.length||f.label.length>128||!Number.isFinite(f.elevationM)||Object.is(f.elevationM,-0))fail('INVALID_FLOOR',path,'Retain unique supplied floor IDs, labels and native elevations.');ids.add(f.id);integer(f.legacyLayer,path+'/legacyLayer');if(f.legacyLayer>=source.levels||layers.has(f.legacyLayer))fail('INVALID_FLOOR_BINDING',path,'Bind each supplied legacy layer once within the retained source.');layers.add(f.legacyLayer);}
  if(bytes(JSON.stringify(input.tileBundle))>L.bundleBytes)fail('BUNDLE_LIMIT','/document/tileBundle','Canonical tile bundle exceeds 4 MB.');
  const opened=deps.tiles.openTileBundle(input.tileBundle);if(opened.bundle.layout.instances.length>L.owners||opened.bundle.recipes.length>L.recipes)fail('PROOF_OWNER_LIMIT','/document/tileBundle','This proof allows 32 authored owners/recipes, not 32 derived cells.');
  const expected=floors.map(({id,elevationM})=>({id,elevationM}));if(canonical(expected)!==canonical(opened.bundle.layout.floors))fail('FLOOR_BINDING_MISMATCH','/document/tileBundle/layout/floors','Tile floors must exactly retain the supplied floor table, without inferred elevations.');
  return input;
}
function validateV1Operation(input,doc,deps,before,target){
  fields(input,['kind','version','id','documentId','action','expected','request','targetBundle'],'/operation');if(input.kind!==C.operation||input.version!==1)fail('UNSUPPORTED_OPERATION','/operation','Use the editor operation v1.');id(input.id,'/operation/id');if(input.documentId!==doc.id||!['edit','undo','redo'].includes(input.action))fail('INVALID_OPERATION','/operation','Operations retain one document and an explicit history action.');
  fields(input.expected,['token','contextToken'],'/operation/expected');digest(input.expected.token,'/operation/expected/token');digest(input.expected.contextToken,'/operation/expected/contextToken');if(!plain(input.request)||input.request.id!==input.id)fail('RECOVERY_ID_MISMATCH','/operation/request','Keep the exact original request identity.');
  document(target,deps);deps.tiles.openTileBundle(input.targetBundle,{requireResolved:true});
  if(input.targetBundle.layout.id!==doc.tileBundle.layout.id)fail('OPERATION_LAYOUT_MISMATCH','/operation/targetBundle/layout/id','An operation retains the accepted layout identity.');
  if(input.action==='edit'){
    if(input.request.version!==1)fail('INVALID_EDIT_REQUEST','/operation/request/version','Retain the actual v1 repair request.');
    const expected=input.request.expected;fields(expected,['revision','layoutDigest','catalogueDigest','contextToken'],'/operation/request/expected');integer(expected.revision,'/operation/request/expected/revision');for(const key of ['layoutDigest','catalogueDigest','contextToken'])digest(expected[key],'/operation/request/expected/'+key);
    if(expected.contextToken!==input.expected.contextToken||input.targetBundle.layout.revision!==expected.revision+1)fail('OPERATION_EXPECTATION_MISMATCH','/operation/request/expected','Retain the captured edit context and exactly one layout revision.');
    if(before){const l=before.tileBundle.layout;if(expected.revision!==l.revision||expected.layoutDigest!==deps.tiles.tileLayoutToken(l)||expected.catalogueDigest!==l.catalogueDigest||smartTileDigest(l.extensions)!==smartTileDigest(input.targetBundle.layout.extensions))fail('OPERATION_EXPECTATION_MISMATCH','/operation/request/expected','The request must bind the accepted source layout, catalogue and preserved extensions.');}
  }else {
    fields(input.request,['id','kind','action','targetDocumentDigest'],'/operation/request');
    if(input.request.kind!=='smart-tile-history-restore'||input.request.action!==input.action||input.request.targetDocumentDigest!==smartTileDigest(target))fail('HISTORY_TARGET_MISMATCH','/operation/request','A history restore retains the exact saved document digest.');
  }
  return input;
}
const v1Policy=Object.freeze({
  formats:Object.freeze({checkpoint:C.checkpoint,checkpointVersion:1,journal:C.journal,journalVersion:1,operation:C.operation,operationVersion:1}),
  validateDocument:(input,deps)=>document(input,deps),
  targetDocument:(before,op)=>({...before,tileBundle:op.targetBundle}),
  validateOperation:validateV1Operation
});

// One algorithm for both formats. Policies supply closed domain grammars and
// complete-target interpretation; they own no storage, history or recovery.
export function createSmartTileCheckpointCodec(dependencies,policy=v1Policy,options=undefined){
  const bound=services(dependencies),validated=new WeakMap();
  const hooks={};for(const name of ['validateDocument','targetDocument','validateOperation']){const d=Object.getOwnPropertyDescriptor(policy,name);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')fail('CHECKPOINT_POLICY','/policy/'+name,'Bind an own explicit synchronous checkpoint policy function.');hooks[name]=d.value;}
  const f=Object.getOwnPropertyDescriptor(policy,'formats');if(!f||!Object.hasOwn(f,'value'))fail('CHECKPOINT_POLICY','/policy/formats','Bind own plain format data.');const formats=smartTileData(f.value);fields(formats,['checkpoint','checkpointVersion','journal','journalVersion','operation','operationVersion'],'/policy/formats');
  for(const key of ['checkpoint','journal','operation']){id(formats[key],'/policy/formats/'+key);if(!Number.isSafeInteger(formats[key+'Version'])||formats[key+'Version']<1)fail('CHECKPOINT_POLICY','/policy/formats/'+key+'Version','Bind an explicit positive format version.');}Object.freeze(formats);
  function configRecord(value,keys,path){
    if(!plain(value))fail('CHECKPOINT_POLICY',path,'Supply own plain constructor configuration.');
    for(const key of Reflect.ownKeys(value)){const slot=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!keys.includes(key)||!slot.enumerable||!Object.hasOwn(slot,'value'))fail('CHECKPOINT_POLICY',path,'Unknown or accessor constructor configuration.');}
    return key=>Object.getOwnPropertyDescriptor(value,key)?.value;
  }
  let reuse=null;
  if(options!==undefined){
    const option=configRecord(options,['ownedV3Successors'],'/options');
    if(Object.hasOwn(options,'ownedV3Successors')){
      const value=option('ownedV3Successors'),get=configRecord(value,['version','sourceBindingToken','inspectData'],'/options/ownedV3Successors');
      if(Reflect.ownKeys(value).length!==3||get('version')!==1||typeof get('sourceBindingToken')!=='string'||!/^[a-f0-9]{64}(?![\s\S])/.test(get('sourceBindingToken'))||typeof get('inspectData')!=='function'||formats.checkpoint!=='nautilus-tile-authoring-editor-checkpoint'||formats.journal!=='nautilus-tile-authoring-editor-journal'||formats.operation!=='nautilus-tile-authoring-editor-operation'||['checkpointVersion','journalVersion','operationVersion'].some(k=>formats[k]!==3))fail('CHECKPOINT_POLICY','/options/ownedV3Successors','Opt in only the reviewed C1 v3 policy, fixed source binding and strict reader.');
      reuse=Object.freeze({sourceBindingToken:get('sourceBindingToken'),inspectData:get('inspectData')});
    }
  }
  const limits={entries:64,bytes:8*1024*1024,nodes:65536,text:4194304},facts=reuse?new Map():null,witnesses=reuse?new WeakSet():null;
  const charges={bytes:0,nodes:0,text:0},counts={admissions:0,evictions:0,oversizeMisses:0,baseMisses:0,hits:0,misses:0,stageReuses:0,settleReuses:0,fullReads:0,tokenHits:0,tokenMisses:0};
  const fresh=input=>smartTileData(reuse.inspectData(input));
  const baseOf=d=>plain(d)&&plain(d.tileBundle)&&plain(d.tileBundle.layout)&&plain(d.constraints)?{id:d.id,sourceJSON:d.sourceJSON,floorBinding:d.floorBinding,finishBinding:d.finishBinding,layoutId:d.tileBundle.layout.id,minimumClearanceM:d.constraints.minimumClearanceM}:null;
  const targetBase=op=>op?.target?.kind==='nautilus-tile-authoring-target-fields'&&op.target.version===1&&op.target.sourceBindingToken===reuse.sourceBindingToken;
  function shapeCharge(value){
    let nodes=1,text=0;const visit=v=>{nodes++;if(typeof v==='string')text+=v.length;else if(v&&typeof v==='object')for(const key of Object.keys(v)){text+=key.length;visit(v[key]);}};
    visit(value);return {nodes,text};
  }
  function footprint(checkpoint,entry,shape){
    // Derive all retained fact keys/scalars/copies from the actual entry. These
    // three references alias the checkpoint graph already charged once below.
    // Reserve a materialized token and maximum admitted charge-number widths;
    // replacing either placeholder cannot increase the measured footprint.
    const shadow={...entry,root:null,receipts:null,pending:null,documentDigest:'0'.repeat(64),token:'0'.repeat(64),charge:{bytes:limits.bytes,nodes:limits.nodes,text:limits.text}},extra=shapeCharge(shadow);
    return {bytes:bytes(JSON.stringify(checkpoint))+bytes(JSON.stringify(shadow)),nodes:shape.nodes+extra.nodes,text:shape.text+extra.text};
  }
  const fits=cost=>cost.bytes<=limits.bytes&&cost.nodes<=limits.nodes&&cost.text<=limits.text;
  function discard(key){const entry=facts.get(key);facts.delete(key);for(const name of ['bytes','nodes','text'])charges[name]-=entry.charge[name];counts.evictions++;}
  function proofFor(c){
    const entry=facts.get(c),known=validated.get(c);
    if(!entry||!known||known.mapCore!==bound.mapCore||known.tiles!==bound.tiles||!Object.isFrozen(c)||entry.root!==c.document||entry.receipts!==c.journal.receipts||entry.pending!==c.journal.pending||entry.serial!==c.journal.serial||entry.kind!==c.kind||entry.version!==c.version||entry.journalKind!==c.journal.kind||entry.journalVersion!==c.journal.version){counts.misses++;return null;}
    facts.delete(c);facts.set(c,entry);counts.hits++;return entry;
  }
  function admit(c,deps,verified={}){
    if(!reuse)return;
    const base=baseOf(c.document);if(!base||typeof c.document.sourceJSON!=='string'||c.document.kind!=='nautilus-tile-workbench-document'||c.document.version!==3||c.journal.receipts.some(r=>!targetBase(r.operation))||c.journal.pending!==null&&!targetBase(c.journal.pending)){counts.baseMisses++;return;}
    const shape=shapeCharge(c);
    // Reject a provably oversized retained graph before allocating its duplicate
    // JSON strings. Both base/document JSON must contain the entire source text.
    if(shape.nodes>limits.nodes||shape.text+2*c.document.sourceJSON.length>limits.text){counts.oversizeMisses++;return;}
    const baseJSON=JSON.stringify(base);
    if(verified.baseJSON!==baseJSON&&smartTileDigest(base)!==reuse.sourceBindingToken){counts.baseMisses++;return;}
    const documentJSON=JSON.stringify(c.document),receiptsJSON=JSON.stringify(c.journal.receipts),pendingJSON=JSON.stringify(c.journal.pending),ids=c.journal.receipts.map(r=>r.id);
    const entry={root:c.document,receipts:c.journal.receipts,pending:c.journal.pending,kind:c.kind,version:c.version,journalKind:c.journal.kind,journalVersion:c.journal.version,serial:c.journal.serial,baseJSON,documentJSON,receiptsJSON,pendingJSON,ids:Object.freeze(ids),documentDigest:verified.documentDigest??null,token:verified.token??null,charge:null};
    const charge=footprint(c,entry,shape);
    if(!fits(charge)){counts.oversizeMisses++;return;}
    if(facts.has(c))discard(c);
    while(facts.size&&(facts.size>=limits.entries||!fits({bytes:charges.bytes+charge.bytes,nodes:charges.nodes+charge.nodes,text:charges.text+charge.text})))discard(facts.keys().next().value);
    entry.documentDigest??=smartTileDigest(c.document);entry.charge=charge;
    facts.set(c,entry);for(const name of ['bytes','nodes','text'])charges[name]+=charge[name];counts.admissions++;
  }
  function ownedToken(c){
    const entry=proofFor(c);if(!entry){counts.tokenMisses++;return smartTileCheckpointToken(c);}if(entry.token===null){counts.tokenMisses++;entry.token=smartTileCheckpointToken(c);}else counts.tokenHits++;return entry.token;
  }
  function constructed(candidate,witness){
    if(!witnesses.has(witness))return openSmartTileCheckpoint(bound,candidate);
    const c=fresh(candidate),deps=services(bound),source=witness.source,entry=proofFor(source);
    fields(c,['kind','version','document','journal'],'');if(c.kind!==formats.checkpoint||c.version!==formats.checkpointVersion)fail('UNSUPPORTED_CHECKPOINT','/version','Use the explicitly bound Editor-local checkpoint format.');c.document=document(c.document,deps);
    fields(c.journal,['kind','version','serial','receipts','pending'],'/journal');if(c.journal.kind!==formats.journal||c.journal.version!==formats.journalVersion)fail('UNSUPPORTED_JOURNAL','/journal','Use the explicitly bound transaction journal format.');integer(c.journal.serial,'/journal/serial');if(!Array.isArray(c.journal.receipts)||c.journal.receipts.length>L.receipts)fail('JOURNAL_LIMIT','/journal/receipts','Retain at most 128 durable receipts; no silent eviction.');
    const base=baseOf(c.document),sameHeader=entry&&entry===witness.entry&&c.kind===source.kind&&c.version===source.version&&c.journal.kind===source.journal.kind&&c.journal.version===source.journal.version&&base&&JSON.stringify(base)===entry.baseJSON;
    let documentDigest,token;
    if(witness.kind==='stage'){
      if(!sameHeader||c.journal.serial!==source.journal.serial||JSON.stringify(c.document)!==entry.documentJSON||JSON.stringify(c.journal.receipts)!==entry.receiptsJSON||JSON.stringify(c.journal.pending)!==witness.operationJSON||source.journal.pending!==null||!targetBase(c.journal.pending))return openSmartTileCheckpoint(bound,c);
      operation(c.journal.pending,c.document,deps,c.document);if(entry.ids.includes(c.journal.pending.id))fail('RECOVERY_ID_REUSED','/journal/pending','A settled request cannot also be pending.');token=ownedToken(source);if(c.journal.pending.expected.token!==token)fail('STALE_CHECKPOINT','/journal/pending','Pending recovery must bind the complete accepted source.');documentDigest=entry.documentDigest;
    }else{
      const n=source.journal.receipts.length,r=c.journal.receipts[n],p='/journal/receipts/'+n;
      if(!sameHeader||c.journal.serial!==source.journal.serial+1||c.journal.receipts.length!==n+1||c.journal.pending!==null||JSON.stringify(c.journal.receipts.slice(0,n))!==entry.receiptsJSON||entry.pendingJSON!==witness.operationJSON||JSON.stringify(source.journal.pending)!==witness.operationJSON||JSON.stringify(c.document)!==witness.documentJSON||!r||!targetBase(r.operation))return openSmartTileCheckpoint(bound,c);
      fields(r,['id','operationDigest','outcome','beforeToken','afterDocumentDigest','operation'],p);id(r.id,p+'/id');for(const key of ['operationDigest','beforeToken','afterDocumentDigest'])digest(r[key],p+'/'+key);
      if(entry.ids.includes(r.id)||!['committed','not-committed'].includes(r.outcome))fail('INVALID_RECEIPT',p,'Retain unique receipt identities and explicit outcomes.');operation(r.operation,c.document,deps,source.document);
      if(r.id!==r.operation.id||r.operationDigest!==smartTileDigest(r.operation)||r.beforeToken!==r.operation.expected.token||JSON.stringify(r.operation)!==witness.operationJSON||r.outcome!==witness.outcome)fail('RECEIPT_MISMATCH',p,'Retain the complete original operation and its exact identity.');
      if(r.beforeToken!==ownedToken(source))fail('RECEIPT_BEFORE_MISMATCH',p+'/beforeToken','The receipt must bind its exact preceding accepted document and journal.');documentDigest=smartTileDigest(c.document);if(r.afterDocumentDigest!==documentDigest)fail('RECEIPT_OUTCOME_MISMATCH',p,'The receipt outcome and document digest must describe the retained accepted state.');
    }
    if(c.journal.serial!==c.journal.receipts.length)fail('JOURNAL_SERIAL_MISMATCH','/journal/serial','Retain every settled receipt; history is not silently compacted.');
    freeze(c);validated.set(c,deps);admit(c,deps,{baseJSON:entry.baseJSON,documentDigest,token});counts[witness.kind==='stage'?'stageReuses':'settleReuses']++;return c;
  }
  function successor(candidate,source,kind,extra){
    const entry=proofFor(source);if(!entry)return openSmartTileCheckpoint(bound,candidate);
    const witness=Object.freeze({source,entry,kind,...extra});witnesses.add(witness);try{return constructed(candidate,witness);}finally{witnesses.delete(witness);}
  }
  const document=input=>hooks.validateDocument(input,bound);
  function targetDocument(before,op){const next=hooks.targetDocument(before,op);return document(next);}
  function operation(input,doc,deps,before=null){
    if(input?.kind!==formats.operation||input.version!==formats.operationVersion)fail('UNSUPPORTED_OPERATION','/operation','Use the explicitly bound operation format.');
    const target=targetDocument(doc,input);return hooks.validateOperation(input,doc,deps,before,target);
  }
function openSmartTileCheckpoint(dependencies,input){
  const deps=services(dependencies),known=validated.get(input);if(known&&known.mapCore===deps.mapCore&&known.tiles===deps.tiles)return input;
  if(reuse)counts.fullReads++;
  const c=reuse?fresh(input):smartTileData(input);fields(c,['kind','version','document','journal'],'');if(c.kind!==formats.checkpoint||c.version!==formats.checkpointVersion)fail('UNSUPPORTED_CHECKPOINT','/version','Use the explicitly bound Editor-local checkpoint format.');c.document=document(c.document,deps);
  fields(c.journal,['kind','version','serial','receipts','pending'],'/journal');if(c.journal.kind!==formats.journal||c.journal.version!==formats.journalVersion)fail('UNSUPPORTED_JOURNAL','/journal','Use the explicitly bound transaction journal format.');integer(c.journal.serial,'/journal/serial');if(!Array.isArray(c.journal.receipts)||c.journal.receipts.length>L.receipts)fail('JOURNAL_LIMIT','/journal/receipts','Retain at most 128 durable receipts; no silent eviction.');
  const ids=new Set(),receipts=c.journal.receipts;
  // Before the first committed target, the original initial bundle is not
  // duplicated in this format. Refused prefixes retain one document digest.
  // Once a target is known, validate every full before-token and outcome.
  let accepted=receipts.some(r=>plain(r)&&r.outcome==='committed')?null:c.document,afterDigest=null;
  for(const [i,r]of receipts.entries()){
    const p='/journal/receipts/'+i;fields(r,['id','operationDigest','outcome','beforeToken','afterDocumentDigest','operation'],p);id(r.id,p+'/id');for(const key of ['operationDigest','beforeToken','afterDocumentDigest'])digest(r[key],p+'/'+key);
    if(ids.has(r.id)||!['committed','not-committed'].includes(r.outcome))fail('INVALID_RECEIPT',p,'Retain unique receipt identities and explicit outcomes.');ids.add(r.id);operation(r.operation,c.document,deps,accepted);
    if(r.id!==r.operation.id||r.operationDigest!==smartTileDigest(r.operation)||r.beforeToken!==r.operation.expected.token)fail('RECEIPT_MISMATCH',p,'Retain the complete original operation and its exact identity.');
    if(accepted){const before={...c,document:accepted,journal:{...c.journal,serial:i,receipts:receipts.slice(0,i),pending:null}};if(r.beforeToken!==smartTileCheckpointToken(before))fail('RECEIPT_BEFORE_MISMATCH',p+'/beforeToken','The receipt must bind its exact preceding accepted document and journal.');}
    if(r.outcome==='committed')accepted=targetDocument(accepted??c.document,r.operation);
    if(accepted&&r.afterDocumentDigest!==smartTileDigest(accepted)||r.outcome==='not-committed'&&afterDigest!==null&&r.afterDocumentDigest!==afterDigest)fail('RECEIPT_OUTCOME_MISMATCH',p,'The receipt outcome and document digest must describe the retained accepted state.');
    afterDigest=r.afterDocumentDigest;
  }
  if(receipts.length&&afterDigest!==smartTileDigest(c.document))fail('RECEIPT_DOCUMENT_MISMATCH','/journal/receipts','The final receipt must describe the complete retained document.');
  if(c.journal.serial!==c.journal.receipts.length)fail('JOURNAL_SERIAL_MISMATCH','/journal/serial','Retain every settled receipt; history is not silently compacted.');
  if(c.journal.pending!==null){operation(c.journal.pending,c.document,deps,c.document);if(ids.has(c.journal.pending.id))fail('RECOVERY_ID_REUSED','/journal/pending','A settled request cannot also be pending.');if(c.journal.pending.expected.token!==smartTileCheckpointToken(c))fail('STALE_CHECKPOINT','/journal/pending','Pending recovery must bind the complete accepted source.');}
  freeze(c);validated.set(c,deps);if(reuse)admit(c,deps,{documentDigest:receipts.length?afterDigest:undefined});return c;
}
function createSmartTileCheckpoint(deps,input){return openSmartTileCheckpoint(deps,{kind:formats.checkpoint,version:formats.checkpointVersion,document:input,journal:{kind:formats.journal,version:formats.journalVersion,serial:0,receipts:[],pending:null}});}
function serializeSmartTileCheckpoint(deps,input){return JSON.stringify(openSmartTileCheckpoint(deps,input));}
function stageSmartTileOperation(deps,input,rawOperation){
  const c=openSmartTileCheckpoint(deps,input),op=reuse?fresh(rawOperation):smartTileData(rawOperation);if(c.journal.pending)fail('RECOVERY_REQUIRED','/journal/pending','Recover the original request before another operation.');if(c.journal.receipts.length>=L.receipts)fail('JOURNAL_LIMIT','/journal/receipts','Journal capacity is full; preserve source and receipts.');
  if(c.journal.receipts.some(r=>r.id===op.id))fail('REQUEST_ID_REUSED','/operation/id','Use each request identity once.');operation(op,c.document,services(deps),c.document);if(op.expected.token!==(reuse?ownedToken(c):smartTileCheckpointToken(c)))fail('STALE_CHECKPOINT','/operation/expected/token','The complete retained checkpoint changed.');
  const candidate={...structuredClone(c),journal:{...structuredClone(c.journal),pending:op}};
  return reuse?successor(candidate,c,'stage',{operationJSON:JSON.stringify(op)}):openSmartTileCheckpoint(deps,candidate);
}
function settleSmartTileOperation(deps,input,requestId,outcome){
  const c=openSmartTileCheckpoint(deps,input),op=c.journal.pending;if(!op||op.id!==requestId)fail('RECOVERY_ID_MISMATCH','/journal/pending','Settle only the exact original request.');if(!['committed','not-committed'].includes(outcome))fail('INVALID_OUTCOME','/outcome','Use an authoritative settled outcome.');
  if(reuse){const inspected=fresh(op);if(JSON.stringify(inspected)!==JSON.stringify(op))fail('RECEIPT_MISMATCH','/journal/pending','Keep the exact inspected original operation.');operation(inspected,c.document,services(deps),c.document);}
  if((reuse?ownedToken(c):smartTileCheckpointToken(c))!==op.expected.token)fail('STALE_CHECKPOINT','/journal/pending','Pending recovery does not bind the complete accepted source.');
  const nextDocument=structuredClone(outcome==='committed'?targetDocument(c.document,op):c.document),receipt={id:op.id,operationDigest:smartTileDigest(op),outcome,beforeToken:op.expected.token,afterDocumentDigest:smartTileDigest(nextDocument),operation:structuredClone(op)};
  const candidate={...structuredClone(c),document:nextDocument,journal:{...structuredClone(c.journal),serial:c.journal.serial+1,receipts:[...structuredClone(c.journal.receipts),receipt],pending:null}};
  return reuse?successor(candidate,c,'settle',{operationJSON:JSON.stringify(op),documentJSON:JSON.stringify(nextDocument),outcome}):openSmartTileCheckpoint(deps,candidate);
}
function inspectSmartTileRecovery(deps,pendingInput,authoritativeInput,requestId){
  const pending=openSmartTileCheckpoint(deps,pendingInput),actual=openSmartTileCheckpoint(deps,authoritativeInput),op=pending.journal.pending;if(!op||op.id!==requestId)fail('RECOVERY_ID_MISMATCH','/requestId','Recover with the original request ID, never a new edit.');
  const receipt=actual.journal.receipts.find(r=>r.id===requestId);if(receipt){const expected=settleSmartTileOperation(deps,pending,requestId,receipt.outcome);if(receipt.operationDigest===smartTileDigest(op)&&smartTileDigest(expected)===smartTileDigest(actual))return {state:'settled',outcome:receipt.outcome,requestId,checkpoint:actual};}
  if(actual.journal.pending?.id===requestId&&smartTileDigest(actual)===smartTileDigest(pending)||actual.journal.pending===null&&smartTileCheckpointToken(actual)===op.expected.token)return {state:'not-written',requestId,checkpoint:actual};
  return {state:'unresolved',code:'RECOVERY_DIVERGED',requestId,checkpoint:null};
}
  const codec={formats,
    open:input=>openSmartTileCheckpoint(bound,input),
    create:input=>createSmartTileCheckpoint(bound,input),
    serialize:input=>serializeSmartTileCheckpoint(bound,input),
    token:reuse?input=>ownedToken(openSmartTileCheckpoint(bound,input)):smartTileCheckpointToken,
    stage:(input,op)=>stageSmartTileOperation(bound,input,op),
    settle:(input,requestId,outcome)=>settleSmartTileOperation(bound,input,requestId,outcome),
    inspectRecovery:(pending,actual,requestId)=>inspectSmartTileRecovery(bound,pending,actual,requestId),
    targetDocument
  };
  if(reuse)codec.ownedSuccessorCacheStats=()=>Object.freeze({entries:facts.size,chargedBytes:charges.bytes,chargedNodes:charges.nodes,chargedTextCodeUnits:charges.text,...counts});
  return Object.freeze(codec);
}
const legacyCodecs=new WeakMap();
function legacyCodec(deps){const bound=services(deps);let known=legacyCodecs.get(deps);if(!known||known.mapCore!==bound.mapCore||known.tiles!==bound.tiles){known={...bound,codec:createSmartTileCheckpointCodec(deps)};legacyCodecs.set(deps,known);}return known.codec;}
// Existing public-to-the-host v1 facade and serialized grammar are retained.
export const openSmartTileCheckpoint=(deps,input)=>legacyCodec(deps).open(input);
export const createSmartTileCheckpoint=(deps,input)=>legacyCodec(deps).create(input);
export const serializeSmartTileCheckpoint=(deps,input)=>legacyCodec(deps).serialize(input);
export const stageSmartTileOperation=(deps,input,operation)=>legacyCodec(deps).stage(input,operation);
export const settleSmartTileOperation=(deps,input,id,outcome)=>legacyCodec(deps).settle(input,id,outcome);
export const inspectSmartTileRecovery=(deps,pending,actual,id)=>legacyCodec(deps).inspectRecovery(pending,actual,id);
export function smartTileCheckpointToken(c){return smartTileDigest({...c,journal:{...c.journal,pending:null}});}
