// Test-only intake audit. Reads immutable Git objects; never loads donor working
// files, changes donor refs, imports a runtime into Nautilus, or defines a pane ABI.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {blankMap,openDocument,blueprintRequirements,ENGINE_VERSION} from '../packages/map-core/index.js';

export const PANE_INTAKE_PINS=Object.freeze({source:'251bf8094b5f9ebe44208443084c1a6d6658512a',reviewedWindows:'3c29604bdfb4210864910369ec09c59095249e8a',canonicalMain:'8644b44ce1c049983fd722d83237ebb2dcec0eb3',orders:'e773317cdf605262c0f714eb90154c22c9f0d64a'});
const root=fileURLToPath(new URL('../',import.meta.url)),prefix='sites/tactical-animal/dist/';
const sourcePaths=['art/windows/catalog.json','art/windows/catalog.js','window-system.js','window-catalogue.js','window-authoring.js','window-editor.js','window-editor-controls.js','window-editor-buffers.js'];
const executable=new Set(['art/windows/catalog.js','window-system.js','window-catalogue.js','window-authoring.js']);
const sha256=value=>createHash('sha256').update(value).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const fixtureDirectory=path.join(root,'tests/fixtures/editor-panes');

export async function inspectPinnedEditorPanes(repository){
  if(!path.isAbsolute(repository))throw Error('Supply the explicit read-only donor repository path.');
  const git=(...args)=>execFileSync('git',['-C',repository,...args],{windowsHide:true,maxBuffer:2_000_000});
  git('merge-base','--is-ancestor',PANE_INTAKE_PINS.reviewedWindows,PANE_INTAKE_PINS.source);
  const blobs=new Map(sourcePaths.map(relative=>[relative,git('show',PANE_INTAKE_PINS.source+':'+prefix+relative)]));
  const roots=sourcePaths.map(relative=>{
    const bytes=blobs.get(relative),reviewed=git('show',PANE_INTAKE_PINS.reviewedWindows+':'+prefix+relative);
    return {path:prefix+relative,bytes:bytes.length,gitBlob:git('rev-parse',PANE_INTAKE_PINS.source+':'+prefix+relative).toString().trim(),sha256:sha256(bytes),sameAtReviewedWindowCommit:bytes.equals(reviewed)};
  });
  assert.ok(roots.every(item=>item.sameAtReviewedWindowCommit),'A selected root changed since the reviewed window commit.');
  const urls=new Map();
  function moduleURL(relative){
    if(urls.has(relative))return urls.get(relative);
    assert.ok(executable.has(relative),'Audit loader refuses dependencies outside the four explicit headless roots.');
    const source=blobs.get(relative).toString('utf8');assert.ok(!/\bimport\s*\(/.test(source),'No dynamic imports in the bounded audit closure.');
    const rewritten=source.replace(/\bfrom\s*(['"])(\.[^'"]+)\1/g,(_,quote,specifier)=>{
      const dependency=path.posix.normalize(path.posix.join(path.posix.dirname(relative),specifier));return 'from '+quote+moduleURL(dependency)+quote;
    });
    const url='data:text/javascript;base64,'+Buffer.from(rewritten).toString('base64');urls.set(relative,url);return url;
  }
  // Executes exact committed headless source in memory. Only relative import
  // addresses change; no source module is written into vendor/packages/apps.
  const authoring=await import(moduleURL('window-authoring.js'));
  const {windowSystem,windowDefinition}=await import(moduleURL('window-catalogue.js'));
  const {describeWindow,BORDERLESS_WINDOW_ID}=await import(moduleURL('art/windows/catalog.js'));
  const raw=JSON.parse(blobs.get('art/windows/catalog.json'));
  for(const item of raw.definitions){
    const actual=describeWindow(item.id);
    for(const key of ['span','height','sill','head','rows','columns','borderless'])assert.equal(actual[key],item[key],item.id+' / '+key+' differs between JSON and executable catalogue.');
    assert.deepEqual(actual.panes.map(pane=>pane.id),item.panes.map(pane=>pane.id),item.id+' pane identities differ.');
  }
  const catalogue={kind:'editor-pane-intake-facts',status:'test-only source facts; no public pane ABI or visual acceptance',sourceRepository:'https://github.com/Syntaxswine/farmyard-commando',pins:PANE_INTAKE_PINS,inspectionRoots:roots,
    catalogueVersion:raw.version,metrics:raw.metrics,finishes:raw.finishes.map(item=>item.id),walls:raw.walls,
    presets:raw.definitions.map(item=>({id:item.id,widthM:item.span,heightM:item.height,sillM:item.sill,headM:item.head,borderless:item.borderless,grid:[item.rows,item.columns],paneIds:item.panes.map(pane=>pane.id)})),
    resizableTemplate:{id:BORDERLESS_WINDOW_ID,catalogueTemplate:raw.templates[0],sectorWidthM:{minimum:1,maximum:240,wholeMetres:true},heightUnits:['metres','storeys'],heightPerStoreyM:raw.metrics.storeyHeight,sourceHeightPolicy:'positive representable metre height; no storey-count cap; host limits still required'},
    notices:{sourceProvenance:raw.provenance,sourceNoticePolicy:'Audit metadata only. Coder owns full immutable runtime closure and notices; this is not a distribution permission or import.'}};
  assert.equal(catalogue.presets.length,39);assert.equal(catalogue.presets.filter(item=>item.borderless).length,3);
  const dimensions={metres:authoring.authoredWindowDimensions('20','5','metres'),storeys:authoring.authoredWindowDimensions('20','5','storeys')};
  const sized=windowDefinition(BORDERLESS_WINDOW_ID,{},dimensions.storeys);
  const unjoined=describeWindow('window.full.grid-3x2.2m'),joined=describeWindow('window.full.grid-3x2.2m',{left:true,right:true});
  const joinComparison={definitionId:unjoined.id,paneIdsUnchanged:JSON.stringify(unjoined.panes.map(p=>p.id))===JSON.stringify(joined.panes.map(p=>p.id)),unjoinedPostWidthM:unjoined.solids[0].bounds.max[0]-unjoined.solids[0].bounds.min[0],joinedPostWidthM:joined.solids[0].bounds.max[0]-joined.solids[0].bounds.min[0]};
  const rotations=[0,90,180,270].map(rotation=>{
    const placement={id:'rot-'+rotation,definitionId:BORDERLESS_WINDOW_ID,x:24.5,y:24.5,rotation,dimensions:dimensions.storeys};
    const state={map:Array.from({length:64},()=>Array(64).fill('yard')),windows:[placement]},record=windowSystem.compile(state)[0];
    return {rotation,placement,coveredEdges:record.edges,paneIds:record.spec.panes.map(pane=>pane.id),solids:record.spec.solids.length};
  });
  const state={windows:[{...rotations[0].placement,id:'sheet-a'},{...rotations[0].placement,id:'sheet-b',y:34.5},{id:'divided',definitionId:'window.full.grid-3x2.3m',x:24,y:44.5,rotation:0}],revision:0};
  const first=windowSystem.breakPane(state,'sheet-a','r0c0',{x:24.5,y:24.5,h:9}),repeat=windowSystem.breakPane(state,'sheet-a','r0c0',{x:24.5,y:24.5,h:9});
  windowSystem.breakPane(state,'divided','r0c1',{x:24,y:44.5,h:1});
  const restored=windowSystem.restore(structuredClone(state)),boxes=windowSystem.boxes(restored);
  const damage={firstSequence:first.sequence,repeatedBreak:repeat,windowBreaks:restored.windowBreaks,sequence:restored.windowSequence,restoredEventsPresent:Object.hasOwn(restored,'windowEvents'),unbrokenOtherInstance:!windowSystem.broken(restored,'sheet-b','r0c0'),glassByInstance:Object.fromEntries(restored.windows.map(p=>[p.id,boxes.filter(box=>box.windowId===p.id&&box.kind==='glass').length])),brokenSheetStillHasPassage:boxes.some(box=>box.windowId==='sheet-a'&&box.role==='window-passage')};
  const edges={'s:20:21':'wall-brick','s:21:21':'window-brick','s:22:21':'wall-concrete'},base=blankMap('Pane editor intake');base.edges={...edges};
  const placed=authoring.placeWindow(base,{type:'edge',edge:'s:20:21',z:0},'window.full.clear.3m',{id:'editor-pane-a'}),removed=authoring.removeWindow(placed,'editor-pane-a');
  const fragment={kind:'editor-pane-intake-fragment',status:'frozen donor authoring fragment, not a new Nautilus format',name:base.name,beforeEdges:edges,afterEdges:placed.edges,extension:placed.farmyardWindows,afterRemoveEdges:removed.edges};
  const document=openDocument(base),before=document.export();document.replace(placed);const accepted=document.export();
  assert.equal(document.undo(),true);assert.equal(document.export(),before);assert.equal(document.redo(),true);assert.equal(document.export(),accepted);
  const reopened=openDocument(accepted);assert.deepEqual(reopened.map.farmyardWindows,placed.farmyardWindows);
  const doorObservations=['door-wood-closed','door-steel-closed','jail-door-closed'].map(kind=>{
    const map=blankMap('Door protection');map.edges['s:20:21']=kind;map.edgeLocks={'s:20:21':42};
    let candidate;
    try{candidate=authoring.placeWindow(map,{type:'edge',edge:'s:20:21',z:0},'window.full.clear.1m',{id:'door-probe'});}
    catch(error){return {kind,sourceAccepted:false,reason:error.message};}
    const host=openDocument(map),before=host.export();
    try{host.replace(candidate);return {kind,sourceAccepted:true,hostAccepted:true};}
    catch(error){assert.equal(host.export(),before);return {kind,sourceAccepted:true,hostAccepted:false,hostUnchanged:true,reason:error.message};}
  });
  const unlockedJail=blankMap('Unlocked jail door');unlockedJail.edges['s:20:21']='jail-door-closed';
  const unlockedCandidate=authoring.placeWindow(unlockedJail,{type:'edge',edge:'s:20:21',z:0},'window.full.clear.1m',{id:'unlocked-jail-probe'}),unlockedHost=openDocument(unlockedJail);unlockedHost.replace(unlockedCandidate);
  doorObservations.push({kind:'jail-door-closed',locked:false,sourceAccepted:true,hostAccepted:true,underlay:unlockedHost.map.farmyardWindows.instances[0].underlay});
  const rejection=(name,run)=>{try{run();return {name,rejected:false};}catch(error){return {name,rejected:true,reason:error.message};}};
  const rejections=[rejection('fractional-sector-width',()=>authoring.authoredWindowDimensions(20.5,5)),rejection('width-over-sector',()=>authoring.authoredWindowDimensions(241,5)),rejection('zero-height',()=>authoring.authoredWindowDimensions(20,0)),rejection('framed-custom-size',()=>describeWindow('window.full.clear.2m',{}, {width:2,height:5})),rejection('upper-floor-placement',()=>authoring.placeWindow(base,{type:'edge',edge:'s:20:21:1',z:1},'window.full.clear.1m',{id:'upper'})),rejection('overlapping-span',()=>authoring.placeWindow(placed,{type:'edge',edge:'s:21:21',z:0},'window.full.clear.2m',{id:'overlap'}))];
  const observations={kind:'editor-pane-intake-observations',pins:PANE_INTAKE_PINS,executedClosure:[...executable],dimensions,sizedSheet:{widthM:sized.width,heightM:sized.height,paneIds:sized.panes.map(p=>p.id),solidCount:sized.solids.length},joinComparison,rotations,damage,rejections,
    baselineOpaqueRetention:{engineVersion:ENGINE_VERSION,undoExact:true,redoExact:true,reopenExact:true,requiredCapabilities:blueprintRequirements(placed).required.map(item=>item.id),meaning:'Opaque JSON retention is not a supported pane export/consumer capability.'},
    doorObservations,unimplementedInThisPreparation:['public pane state/query ABI','native controls or renderer','transform/copy/delete API','supported consumer export/refusal','window traversal','live resize/preset-change damage migration']};
  return {'catalogue-facts.json':catalogue,'legacy-authoring-fragment.json':fragment,'observations.json':observations};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const index=process.argv.indexOf('--source-repository');if(index<0||!process.argv[index+1])throw Error('Use --source-repository ABSOLUTE_PATH [--write].');
  const fixtures=await inspectPinnedEditorPanes(process.argv[index+1]),write=process.argv.includes('--write');
  if(write)fs.mkdirSync(fixtureDirectory,{recursive:true});
  for(const [name,value]of Object.entries(fixtures)){const target=path.join(fixtureDirectory,name),serialized=json(value);if(write)fs.writeFileSync(target,serialized);else assert.equal(fs.readFileSync(target,'utf8'),serialized,'Regenerate only after reviewing source/observation differences: '+name);}
  const observed=fixtures['observations.json'];console.log(json({mode:write?'write':'check',presets:fixtures['catalogue-facts.json'].presets.length,executedFrozenModules:observed.executedClosure.length,rejections:observed.rejections,doorObservations:observed.doorObservations,baselineOpaqueRetention:observed.baselineOpaqueRetention}));
}
