import {api,slots,copyData,canonical,freeze,fail} from './data.js';
const prepared=new WeakMap(),source='251bf8094b5f9ebe44208443084c1a6d6658512a',version='industrial-windows/2';
const projectionKeys=['kind','version','sceneId','worldId','profileId','contentDigest','geometryDigest','queryRevision','document','world','edgeFacts','resolvedDefinitions','content','members','coveredEdges'];
function definitions(input){const d=slots(input,['sourceCommit','version','resolve']);if(d.sourceCommit!==source||d.version!==version||typeof d.resolve!=='function')fail('DEFINITION_MISMATCH','Use the accepted fixed Farmyard definitions.');return d;}
function optionsData(input,runtime){
  const options=slots(input,runtime?['legacyWalls','publication']:['legacyWalls'],runtime?['publication']:[]);
  return {legacyWalls:Object.hasOwn(options,'legacyWalls')?copyData(options.legacyWalls):[],...(runtime?{publication:copyData(options.publication)}:{})};
}
function verify(core,fixed,raw,walls){
  const p=copyData(raw);slots(p,projectionKeys);
  // Reopen plain data in THIS public module instance. Never pass an authoring
  // handle into another copy of windows-core or invent a public projection API.
  const snapshot={kind:'nautilus-window-geometry-snapshot',version:1,document:p.document,world:p.world,edgeFacts:p.edgeFacts,resolvedDefinitions:p.resolvedDefinitions,contentDigest:p.contentDigest,geometryDigest:p.geometryDigest};
  const compiled=core.openWindowGeometry(snapshot,{definitions:fixed}),verified=core.inspectWindowGeometry(compiled);
  if(canonical(p)!==canonical(verified))fail('PROJECTION_MISMATCH','Every projection field must equal the public compiled geometry.');
  if(!Array.isArray(walls)||walls.length>4096)fail('WALL_LIMIT','Use at most 4096 explicit legacy-wall records.');
  const seen=new Set(),legacyWalls=walls.map(w=>{
    // The public clip function validates exact provenance, span and top height.
    const clipped=core.clipWindowLegacyWall(compiled,w);
    if(seen.has(w.edge))fail('DUPLICATE_WALL','Use one legacy record per edge.');seen.add(w.edge);
    return {original:w,clipped};
  });
  return {projection:p,legacyWalls};
}
function remember(plan,scope){const handle=Object.freeze({kind:'prepared-native-window-view',version:1,...scope});prepared.set(handle,freeze({...plan,scope}));return handle;}
export function prepareRuntimeWindowView(module,fixedDefinitions,state,input){
  // Check plain options/publication before calling ANY borrowed core function.
  const options=optionsData(input,true),publication=slots(options.publication,['receiptId','geometry']);
  if(typeof publication.receiptId!=='string'||!publication.receiptId.length||publication.receiptId.length>4096)fail('INVALID_PUBLICATION','Keep the exact acknowledged publication receipt identity.');
  const fixed=definitions(fixedDefinitions),core=api(module,['windowStateGeometry','inspectWindowGeometry','serializeWindowState','openWindowGeometry','clipWindowLegacyWall']);
  const geometry=core.windowStateGeometry(state),raw=core.inspectWindowGeometry(geometry),saved=copyData(JSON.parse(core.serializeWindowState(state)));
  if(canonical(raw)!==canonical(publication.geometry))fail('STALE_PUBLICATION','The acknowledged publication must match the actual current state geometry.');
  const plan=verify(core,fixed,raw,options.legacyWalls);
  return remember(plan,{mode:'runtime',profileId:raw.profileId,sceneId:raw.sceneId,worldId:raw.worldId,stateId:saved.id,contentEpoch:saved.contentEpoch,contentDigest:raw.contentDigest,geometryDigest:raw.geometryDigest,geometryRevision:raw.queryRevision,stateRevision:saved.revision,publicationReceiptId:publication.receiptId});
}
export function prepareAuthoringWindowView(module,fixedDefinitions,projection,input={}){
  const options=optionsData(input,false),raw=copyData(projection),fixed=definitions(fixedDefinitions),core=api(module,['inspectWindowGeometry','openWindowGeometry','clipWindowLegacyWall']);
  if(raw?.document?.observedBroken&&Object.keys(raw.document.observedBroken).length)fail('AUTHORING_MASK_REFUSED','Authoring preview cannot fabricate live pane damage.');
  const plan=verify(core,fixed,raw,options.legacyWalls),p=plan.projection;
  return remember(plan,{mode:'authoring',profileId:p.profileId,sceneId:p.sceneId,worldId:p.worldId,contentDigest:p.contentDigest,geometryDigest:p.geometryDigest,geometryRevision:p.queryRevision});
}
export function readPrepared(handle){const found=prepared.get(handle);if(!found)fail('PREPARATION_REQUIRED','Use a preparation from this presenter instance.');return found;}
export function inspectPreparedWindowView(handle){return structuredClone(readPrepared(handle));}
