import {loadBlueprint,blueprintRequirements,negotiateCapabilities} from '../map-core/index.js';
import {WINDOW_GEOMETRY_CONTRACT as C,compileWindowPlacements,inspectWindowGeometry,windowRequirements,windowCompatibility,clipWindowLegacyWall} from '../windows-core/index.js';
import {FARMYARD_WINDOW_DEFINITIONS,connectFarmyardWindows} from '../adapters/farmyard/windows.js';
import {EDGES} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/environment.js';
import {AUTHORING_LIMITS,boundedData,fields,identity,integer,freeze,encode,bytes,fail,pointer,WindowAuthoringError} from './data.js';

export const WINDOW_AUTHORING_CONTRACT=Object.freeze({kind:'nautilus-window-authoring',version:1,schemaUri:'urn:nautilus:schema:window-authoring:1',entry:'./windows/authoring',profileId:C.profileId,sourceCommit:C.sourceCommit,sourceVersion:C.sourceVersion,status:'unregistered headless authoring candidate; presentation and live services are separate'});
const documents=new WeakSet(),prepared=new WeakMap();
const forbidden=new Set(['farmyardWindows','windowBreaks','windowSequence','windowEvents','windowState','windowPaneState']);
const authorityKinds=new Set(['nautilus-window-authoring','nautilus-window-pane-state','nautilus-farmyard-window-host-save','nautilus-window-geometry-snapshot','nautilus-window-placement-document']);
function noOldAuthority(value,path='/baseBlueprint') {
  if(!value||typeof value!=='object')return;
  if(authorityKinds.has(value.kind))fail('AUTHORING_MIGRATION_REQUIRED',path,'Embedded pane authority requires a separately reviewed lossless conversion.');
  for(const [key,child]of Object.entries(value)) {
    if(forbidden.has(key)||path==='/baseBlueprint'&&key==='windows')fail('AUTHORING_MIGRATION_REQUIRED',path+'/'+pointer(key),'Retain the original file; old pane data cannot be erased or nested into authoring.');
    noOldAuthority(child,path+'/'+pointer(key));
  }
}
function edgeKey(key,path) {
  const match=/^([es]):(0|[1-9][0-9]*):(0|[1-9][0-9]*)(?::(0|[1-9][0-9]*))?(?![\s\S])/.exec(key);
  if(!match)fail('AUTHORING_INVALID_EDGE',path,'Use an explicit native portable-map edge.');
  return {canonical:match.slice(1,4).join(':'),layer:Number(match[4]||0)};
}
export function baseEdgeFacts(base) {
  const facts=new Map(),raw=new Set();
  for(const [key,sourceKind]of Object.entries(base.edges||{})) {
    const parsed=edgeKey(key,'/baseBlueprint/edges/'+pointer(key));if(parsed.layer)continue;
    if(raw.has(parsed.canonical))fail('AUTHORING_AMBIGUOUS_EDGE','/baseBlueprint/edges/'+pointer(key),'Duplicate ground aliases cannot be classified losslessly.');raw.add(parsed.canonical);
    if(!Object.hasOwn(EDGES,sourceKind))fail('AUTHORING_UNKNOWN_EDGE','/baseBlueprint/edges/'+pointer(key),'Supply a supported native edge family.');
    const rule=EDGES[sourceKind],semantic=rule.opensTo||sourceKind==='door'||sourceKind==='doorway-concrete-open'?'door':'wall';
    facts.set(parsed.canonical,{edge:parsed.canonical,semantic,locked:false,sourceKind});
  }
  for(const [key,difficulty]of Object.entries(base.edgeLocks||{})) {
    const parsed=edgeKey(key,'/baseBlueprint/edgeLocks/'+pointer(key));if(parsed.layer)continue;
    const fact=facts.get(parsed.canonical);if(!fact)fail('AUTHORING_ORPHAN_LOCK','/baseBlueprint/edgeLocks/'+pointer(key),'A ground lock requires its original door edge.');fact.locked=!!difficulty;
  }
  return facts;
}
function validate(input) {
  if(documents.has(input))return input;
  const d=boundedData(input);fields(d,['kind','version','id','worldId','profileId','definitions','baseBlueprint','placements','bindings'],'');
  if(d.kind!==WINDOW_AUTHORING_CONTRACT.kind||d.version!==1)fail('AUTHORING_UNSUPPORTED_SCHEMA','/version','Use nautilus-window-authoring v1.');
  identity(d.id,'/id');identity(d.worldId,'/worldId');
  if(d.profileId!==C.profileId)fail('AUTHORING_UNSUPPORTED_PROFILE','/profileId','Select the fixed native quarter-turn profile.');
  fields(d.definitions,['sourceCommit','version'],'/definitions');
  if(d.definitions.sourceCommit!==C.sourceCommit||d.definitions.version!==C.sourceVersion)fail('AUTHORING_DEFINITION_MISMATCH','/definitions','Keep the exact accepted definition source/version.');
  noOldAuthority(d.baseBlueprint);
  if(d.baseBlueprint?.version!==2||d.baseBlueprint?.kind==='red-shift-block')fail('AUTHORING_MAP_REQUIRED','/baseBlueprint','This wrapper accepts complete portable maps only.');
  if(bytes(encode(d.baseBlueprint))>AUTHORING_LIMITS.baseBytes)fail('AUTHORING_BASE_LIMIT','/baseBlueprint','Retain the base map 4,000,000-byte limit.');
  try{loadBlueprint(d.baseBlueprint);}catch(error){throw new WindowAuthoringError('AUTHORING_INVALID_BASE','/baseBlueprint',error instanceof Error?error.message:'Invalid portable base map.');}
  integer(d.baseBlueprint.width,1,240,'/baseBlueprint/width');integer(d.baseBlueprint.height,1,240,'/baseBlueprint/height');
  if(!Array.isArray(d.placements)||d.placements.length>1024||!Array.isArray(d.bindings)||d.bindings.length>1024)fail('AUTHORING_LIMIT','/placements','Use at most 1,024 native placements/bindings.');
  return d;
}
function compile(d,queryRevision) {
  const world={id:d.worldId,floorId:'ground',grid:{width:d.baseBlueprint.width,height:d.baseBlueprint.height}},facts=baseEdgeFacts(d.baseBlueprint),needed=new Set();
  for(const [i,p]of d.placements.entries()) {
    let spec;try{spec=FARMYARD_WINDOW_DEFINITIONS.resolve({id:p?.definitionId,...(p?.joins!==undefined?{joins:p.joins}:{}),...(p?.dimensions!==undefined?{dimensions:p.dimensions}:{})});}
    catch(error){throw new WindowAuthoringError(error.code||'AUTHORING_INVALID_PLACEMENT','/placements/'+i+(error.path||''),'The fixed native definition/dimensions could not be resolved.');}
    const horizontal=(p.rotation??0)%180===0,along=horizontal?p.x:p.y,across=horizontal?p.y:p.x,start=along-(spec.width-1)/2;
    for(let n=0;n<spec.width;n++)needed.add(horizontal?`s:${start+n}:${across-.5}`:`e:${across-.5}:${start+n}`);
  }
  for(const key of needed)if(!facts.has(key))facts.set(key,{edge:key,semantic:'empty',locked:false});
  // Native edge occupants are not inferred from their names. Their mere claim
  // on a covered edge conflicts; live actor/body tests remain host-owned.
  for(const group of ['interactables','doors'])if(d.baseBlueprint[group]!==undefined) {
    const occupants=d.baseBlueprint[group];if(!Array.isArray(occupants))fail('AUTHORING_UNKNOWN_OCCUPANTS','/baseBlueprint/'+group,'Supply an explicit native edge-occupant list before overlay preparation.');
    for(const [i,item]of occupants.entries())if(item&&typeof item==='object'&&Object.hasOwn(item,'edge')) {
      const edge=edgeKey(item.edge,'/baseBlueprint/'+group+'/'+i+'/edge');
      if(!edge.layer&&needed.has(edge.canonical))fail('AUTHORING_EDGE_OCCUPIED','/baseBlueprint/'+group+'/'+i+'/edge','A retained edge occupant cannot be covered by a window overlay.');
    }
  }
  // The pane kernel is not the complete world query. Keep the entire base in
  // authoring, but do not spend its bounded fact array on unrelated map edges.
  const edgeFacts=[...needed].map(edge=>{const fact=facts.get(edge);return {...fact,underlay:{semantic:fact.semantic,locked:fact.locked,...(fact.sourceKind?{sourceKind:fact.sourceKind}:{})}};});
  const wire={kind:'nautilus-window-placement-document',version:1,id:d.id,profileId:d.profileId,queryRevision,placements:d.placements,bindings:d.bindings,observedBroken:{}};
  try{return {geometry:compileWindowPlacements(wire,{definitions:FARMYARD_WINDOW_DEFINITIONS,world,edgeFacts}),edgeFacts};}
  catch(error){throw new WindowAuthoringError(error.code||'AUTHORING_COMPILE_FAILED',error.path||'/placements',error instanceof Error?error.message:'Native pane compilation failed.');}
}
function heightDiagnostics(base) {
  const paths=[];
  for(const [i,layer]of (base.upper||[]).entries())if(Object.keys(layer).length)paths.push('/baseBlueprint/upper/'+i);
  for(const key of ['stairs','climbs'])if(base[key]?.length)paths.push('/baseBlueprint/'+key);
  for(const key of ['props','starts','guards','exits'])for(const [i,item]of (base[key]||[]).entries())if(item.z)paths.push('/baseBlueprint/'+key+'/'+i+'/z');
  for(const key of Object.keys(base.edges||{}))if(edgeKey(key,'/baseBlueprint/edges').layer)paths.push('/baseBlueprint/edges/'+pointer(key));
  return paths.map(path=>({code:'AUTHORING_UNSUPPORTED_BASE_HEIGHT',path,reason:'Retain this authoring, but no layer-index-to-metre conversion or multilevel runtime projection is implemented.',action:'Use a compatible ground-only base or an explicitly reviewed richer adapter.'}));
}
export function prepareWindowAuthoring(input,options={}) {
  const settings=boundedData(options);fields(settings,['queryRevision'],'/options',[]);const queryRevision=Object.hasOwn(settings,'queryRevision')?settings.queryRevision:0;integer(queryRevision,0,Number.MAX_SAFE_INTEGER,'/options/queryRevision');
  const document=validate(input),{geometry,edgeFacts}=compile(document,queryRevision);freeze(document);documents.add(document);
  const handle=Object.freeze({kind:'prepared-window-authoring',version:1,id:document.id,contentDigest:geometry.contentDigest,geometryDigest:geometry.geometryDigest,queryRevision});
  prepared.set(handle,{document,geometry,edgeFacts,diagnostics:document.placements.length?heightDiagnostics(document.baseBlueprint):[]});return handle;
}
export function readPrepared(handle) {const value=prepared.get(handle);if(!value)fail('AUTHORING_PREPARATION_REQUIRED','/prepared','Use a preparation from this authoring/core module instance.');return value;}
export function openWindowAuthoring(input) {return readPrepared(prepareWindowAuthoring(input)).document;}
export function serializeWindowAuthoring(input) {return encode(documents.has(input)?input:openWindowAuthoring(input));}
export function windowAuthoringGeometryProjection(handle) {return inspectWindowGeometry(readPrepared(handle).geometry);}
// Same-core host use only. Separately installed renderers receive the detached
// projection above, never this module-instance-scoped kernel handle.
export function windowAuthoringGeometry(handle) {return readPrepared(handle).geometry;}
export function inspectWindowAuthoring(handle) {const p=readPrepared(handle);return structuredClone({document:p.document,edgeFacts:p.edgeFacts,geometry:inspectWindowGeometry(p.geometry),diagnostics:p.diagnostics});}
export function windowAuthoringRequirements(handle) {
  const {document,geometry}=readPrepared(handle);
  return {authoring:{schema:{id:WINDOW_AUTHORING_CONTRACT.kind,version:1},required:[],optional:[]},base:blueprintRequirements(document.baseBlueprint),windows:windowRequirements(geometry)};
}
export function windowAuthoringCompatibility(handle,consumer) {
  const checked=boundedData(consumer),requirements=windowAuthoringRequirements(handle),p=readPrepared(handle);
  const scopes={authoring:negotiateCapabilities(requirements.authoring,checked),base:negotiateCapabilities(requirements.base,checked),windows:windowCompatibility(p.geometry,checked)};
  return {ok:!p.diagnostics.length&&Object.values(scopes).every(result=>result.ok),negotiationOnly:true,scopes,diagnostics:structuredClone(p.diagnostics)};
}
export function windowAuthoringReadiness(handle) {
  const p=readPrepared(handle);return {saveable:true,geometryPrepared:true,preview:{ready:false,code:'AUTHORING_PRESENTER_UNBOUND'},handoff:{ready:false,code:p.diagnostics.length?'AUTHORING_UNSUPPORTED_BASE_HEIGHT':'AUTHORING_HOST_UNBOUND'},diagnostics:structuredClone(p.diagnostics),requirements:windowAuthoringRequirements(handle)};
}
export function bindWindowAuthoringHandoff(handle,consumer,services) {
  const p=readPrepared(handle),compatibility=windowAuthoringCompatibility(handle,consumer);
  if(!compatibility.ok)fail('AUTHORING_INCOMPATIBLE_CONSUMER','/consumer','Authoring, base and pane requirements must all negotiate without omission.');
  if(!p.document.placements.length)return {authoring:serializeWindowAuthoring(p.document),connection:null,compatibility,adopted:false};
  const connection=connectFarmyardWindows(services);
  try{if(!windowCompatibility(p.geometry,connection.manifest()).ok)fail('AUTHORING_HOST_UNBOUND','/services','Bind all six actual version-1 host services.');return {authoring:serializeWindowAuthoring(p.document),connection,compatibility,adopted:false};}
  catch(error){connection.dispose();throw error;}
}
export function clipWindowAuthoringLegacyWall(handle,wall) {return clipWindowLegacyWall(readPrepared(handle).geometry,wall);}
export function exportWindowAuthoringLegacy(input,options={}) {
  const settings=boundedData(options);fields(settings,['target'],'/options',[]);const document=prepared.has(input)?readPrepared(input).document:openWindowAuthoring(input);
  if((Object.hasOwn(settings,'target')?settings.target:'map')!=='map'||document.placements.length)fail('AUTHORING_EXPORT_REFUSED','/placements','Keep the complete envelope; pane legacy/block/generation export is unsupported.');return encode(document.baseBlueprint);
}
export function protectCoveredBaseEdges(previous,next) {
  const before=readPrepared(previous),after=baseEdgeFacts(next),snapshot=inspectWindowGeometry(before.geometry),oldFacts=baseEdgeFacts(before.document.baseBlueprint);
  const raw=(base,edge)=>Object.fromEntries(['edges','edgeLocks'].map(group=>[group,Object.fromEntries(Object.entries(base[group]||{}).filter(([key])=>{const p=edgeKey(key,'/baseBlueprint/'+group);return !p.layer&&p.canonical===edge;}))]));
  for(const edge of snapshot.coveredEdges)if(encode(oldFacts.get(edge)??null)!==encode(after.get(edge)??null)||encode(raw(before.document.baseBlueprint,edge))!==encode(raw(next,edge)))fail('AUTHORING_COVERED_BASE_EDGE','/baseBlueprint/edges/'+pointer(edge),'Remove/move the overlay before changing its retained underlay edge or lock.');
}
