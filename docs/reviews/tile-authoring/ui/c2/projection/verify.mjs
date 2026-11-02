// Static DESIGN controls only. Never a runtime UI/Host implementation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {readTileAuthoringUIView} from '../../../../../../apps/editor/tile-authoring/ui/panel.js';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=file=>JSON.parse(fs.readFileSync(file));
const source=read(path.join(here,'source.json')),schema=read(path.join(here,'projection.schema.json'));
const git=(rev,file)=>execFileSync('git',['show',rev+':'+file],{cwd:root,maxBuffer:32*1024*1024});
const out=path.join(root,'artifacts/ui-c2-projection-static'),stage=path.join(out,'validator-'+source.pins.core);fs.mkdirSync(stage,{recursive:true});
const validatorFiles=['data.js','budget.js','contract.js','contract.schema.json','abi/proposal.schema.json'];
const validatorInputs=[];
for(const file of validatorFiles){const original='candidates/tile-authoring/core/c2/'+file,bytes=git(source.pins.core,original),target=path.join(stage,file);fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target))assert.ok(fs.readFileSync(target).equals(bytes),'Preserve unknown modified validator input');fs.writeFileSync(target,bytes);validatorInputs.push({commit:source.pins.core,path:original,bytes:bytes.length,sha256:sha(bytes)});}
fs.writeFileSync(path.join(stage,'package.json'),'{"private":true,"type":"module","description":"Pinned pure validator for documentation controls only"}\n');
const V=await import(pathToFileURL(path.join(stage,'data.js')).href);
const forbidden=()=>{throw Error('Static shape controls may not compile, hash or repair source');};
const tiles={tileLayoutToken:forbidden,compileTileRecipe:forbidden,openTileBundle:forbidden};
const shape=(name,value)=>V.shape(tiles,name,V.readData(value),new V.Budget(),schema);
const sources=Object.fromEntries(Object.entries(source.fixtureSources).map(([key,row])=>[key,readGit(row)]));
function readGit(row){return JSON.parse(git(row.commit,row.path));}
const pin=r=>({id:r.id,revision:r.revision,contentDigest:r.contentDigest}),same=(a,b)=>assert.deepEqual(a,b);
const controls=[];
function pass(name,run){const detail=run();controls.push({name,status:'pass',...(detail??{})});}
function reject(name,run){pass(name,()=>{assert.throws(run);return{expected:'refusal'};});}
function projectionCheck(p,w){
  const x=w.input,d=x.document;
  same(p.basis,{documentId:d.id,contentRevision:d.contentRevision,expected:x.command.expected,floorId:x.appearanceSource.authority.floorId});
  assert.ok(d.floorBinding.floors.some(f=>f.id===p.basis.floorId));
  same(p.groupsPresent,d.authoring.decorations.groups.length>0);
  const expectedChoices=d.authoring.ownerPins.flatMap((ownerPin,i)=>{const owner=d.tileBundle.layout.instances.find(o=>o.id===ownerPin.ownerId),def=d.authoring.library.definitions.find(r=>r.id===ownerPin.definition.id&&r.revision===ownerPin.definition.revision&&r.contentDigest===ownerPin.definition.contentDigest);return def.body.surfaces.map(s=>({ownerId:owner.id,ownerLabel:'Copy '+(i+1),definition:ownerPin.definition,surfaceId:s.id,surfaceLabel:'Top surface',floorId:owner.floorBindings[s.floorSlot],floorLabel:d.floorBinding.floors.find(f=>f.id===owner.floorBindings[s.floorSlot]).label,locked:owner.locked}));});same(p.choices,expectedChoices);
  if(p.selection){
    const s=p.selection,o=d.tileBundle.layout.instances.find(o=>o.id===s.ownerId);assert.ok(o);const ownerPin=d.authoring.ownerPins.find(p=>p.ownerId===o.id),def=d.authoring.library.definitions.find(r=>JSON.stringify(pin(r))===JSON.stringify(ownerPin.definition)),frame=def.body.surfaces.find(f=>f.id===s.surfaceId);assert.ok(frame);same(s.frame,frame);same(s.floorId,o.floorBindings[frame.floorSlot]);same(s.pose,{originM:o.origin,quarterTurns:o.transform.quarterTurns,mirrorX:o.transform.mirrorX,locked:o.locked,definition:ownerPin.definition});
    const saved=d.authoring.decorations.surfaces.find(b=>b.ownerId===s.ownerId&&b.surfaceId===s.surfaceId),derived=saved??w.plan.targetDocument.authoring.decorations.surfaces.find(b=>b.ownerId===s.ownerId&&b.surfaceId===s.surfaceId);assert.ok(derived);same(s.target,{ownerId:derived.ownerId,surfaceId:derived.surfaceId,floorId:derived.floorId,bindingDigest:derived.bindingDigest});same(s.grid,{id:frame.grid.id,version:frame.grid.version,digest:derived.gridDigest});same(s.bindingState,saved?'bound':'prospective');
    const marks=d.authoring.decorations.chunks.flatMap(c=>c.marks).filter(m=>m.target.ownerId===s.ownerId&&m.target.surfaceId===s.surfaceId);same(s.layers,(saved?.layers??[]).map(l=>({value:l,markIds:marks.filter(m=>m.layerId===l.id).map(m=>m.id),opacityStatus:l.opacity===0?'hidden-by-opacity':'opacity-enabled'})));same(s.marks,marks.map(m=>({id:m.id,revision:m.revision,layerId:m.layerId,ordinal:m.ordinal,artwork:m.graphic.artwork,groupId:m.groupId})));same(s.selectedMark,s.selectedMarkId?marks.find(m=>m.id===s.selectedMarkId):null);assert.ok(s.selectedLayerId===null||s.layers.some(l=>l.value.id===s.selectedLayerId));same(s.groups,d.authoring.decorations.groups.map(g=>({id:g.id,floorId:g.floorId,memberMarkIds:g.memberMarkIds})));
  }
  same(p.palette.map(r=>({artwork:r.artwork,label:r.label,resourceRef:r.resourceRef,frameId:r.frameId})),d.authoring.library.artwork.map(r=>({artwork:pin(r),label:r.body.label,resourceRef:d.resourceRefs.find(x=>JSON.stringify(x.artwork)===JSON.stringify(pin(r))),frameId:r.body.imageView.frame.id})));
  if(p.chosenArtwork)assert.ok(p.palette.some(r=>JSON.stringify(r.artwork)===JSON.stringify(p.chosenArtwork)));
  if(p.observation){const c=x.appearanceSource;same(p.observation,{profiles:c.profiles,authority:c.authority,visual:c.visual,history:c.history,resourceLeaseSetDigest:c.resourceLeaseSetDigest,ledger:{sequence:c.ledger.sequence,scopeDigest:c.ledger.scopeDigest,preservedObjectsDigest:c.ledger.preservedObjectsDigest,geometryLeaseSetDigest:c.ledger.geometry.geometryLeaseSetDigest,geometryObjectsDigest:c.ledger.geometry.geometryObjectsDigest}});}
  // These are explicitly non-live controls. No DTO can turn them into readiness.
  assert.equal(p.availability,'unavailable');assert.ok(Object.values(p.gates).every(g=>g.enabled===false));
  assert.ok(Object.values(p.deferred).every(v=>v==='unavailable'));
  if(p.current.state==='unknown'){same(p.current.requestId,p.current.recoveryRequestId);same(p.current.requestId,x.command.requestId);}
}
function firstCommandCheck(command,w){
  const d=w.input.document;same(command.expected,w.input.command.expected);assert.equal(command.operations.length,2);const [layers,add]=command.operations;assert.equal(layers.kind,'surface.layers');assert.equal(add.kind,'decoration.add');assert.equal(layers.body.layers.length,1);same(layers.body.removedLayerMarkIds,[]);same(layers.body.target,add.body.mark.target);same(layers.body.layers[0].id,add.body.mark.layerId);assert.equal(add.body.mark.groupId,null);assert.equal(add.body.mark.revision,1);assert.ok(d.authoring.library.artwork.some(r=>JSON.stringify(pin(r))===JSON.stringify(add.body.mark.graphic.artwork)),'Artwork must already belong to the actual source, not an omitted import');
}
const fixtures=source.fixtures.map(file=>({file,value:read(path.join(here,'fixtures',file))}));
for(const {file,value}of fixtures)pass('closed finite '+file,()=>{shape('Fixture',value);if(value.kind==='projection')projectionCheck(value.payload,sources[value.source]);else{same(value.payload.basis,{documentId:sources[value.source].input.document.id,contentRevision:sources[value.source].input.document.contentRevision,expected:sources[value.source].input.command.expected,floorId:sources[value.source].input.appearanceSource.authority.floorId});same(value.payload.result.basis,value.payload.basis);assert.equal(value.payload.result.status,'refused');}return{source:value.source,classification:value.classification};});
const pristine=fixtures.find(x=>x.file==='prospective-unavailable.json').value,painted=fixtures.find(x=>x.file==='bound-mark-readonly.json').value;
pass('all 30 palette Pins/refs come from the recorded source library',()=>{assert.equal(painted.payload.palette.length,30);assert.ok(painted.payload.palette.every(r=>r.thumbnail==='unavailable'));});
pass('prospective target/grid digest values are copied from Core output',()=>{const p=pristine.payload;assert.equal(p.selection.bindingState,'prospective');assert.equal(p.selection.layers.length,0);same(p.selection.target.bindingDigest,sources.pristine.plan.targetDocument.authoring.decorations.surfaces[0].bindingDigest);});
pass('declaration syntax only (not full tsc)',()=>{stripTypeScriptTypes(fs.readFileSync(path.join(here,'projection.d.ts'),'utf8'),{mode:'strip'});});
for(const field of Object.keys(painted.payload.basis.expected))reject('stale Expected '+field,()=>{const p=structuredClone(painted.payload);p.basis.expected[field]=typeof p.basis.expected[field]==='number'?p.basis.expected[field]+1:(p.basis.expected[field]==='0'.repeat(64)?'1':'0').repeat(64);projectionCheck(p,sources.painted);});
for(const [name,mutate]of [
  ['unknown projection field',p=>p.payload.authorityToken='not allowed'],
  ['serialized thumbnail handle',p=>p.payload.palette[0].handle={native:true}],
  ['serialized artwork URL',p=>p.payload.palette[0].url='https://example.invalid/image.png'],
  ['invented layer visibility',p=>p.payload.selection.layers[0].value.visible=false],
  ['Stage B pretend-ready',p=>p.payload.deferred.bytePacks='available'],
  ['Plan3 pretend-ready',p=>p.payload.deferred.combinedPlacement='available']
])reject(name,()=>{const p=structuredClone(painted);mutate(p);shape('Fixture',p);});
for(const [name,mutate]of [
  ['foreign owner ID',p=>p.selection.ownerId='foreign.owner'],
  ['foreign definition Pin',p=>p.selection.pose.definition.revision++],
  ['foreign grid digest',p=>p.selection.grid.digest='0'.repeat(64)],
  ['stale frame geometry digest',p=>p.selection.frame.geometryDigest='0'.repeat(64)],
  ['foreign mark ID',p=>p.selection.selectedMarkId='foreign.mark'],
  ['lost layer membership',p=>p.selection.layers[0].markIds=[]],
  ['changed artwork revision',p=>p.palette[0].artwork.revision++],
  ['changed resource ref',p=>p.palette[0].resourceRef.imageViewDigest='0'.repeat(64)],
  ['profile DTOs alone enable Stage',p=>p.gates.firstMark.enabled=true]
])reject(name,()=>{const p=structuredClone(painted.payload);mutate(p);projectionCheck(p,sources.painted);});
for(const value of [NaN,Infinity,-0])reject('noncanonical finite number '+String(value),()=>{const p=structuredClone(painted);p.payload.selection.pose.originM[0]=value;V.readData(p);});
reject('accessor never evaluated',()=>{let called=0;const value={};Object.defineProperty(value,'x',{enumerable:true,get(){called++;return 1;}});try{V.readData(value);}finally{same(called,0);}});
reject('duplicate decoded JSON field',()=>V.readData('{"a":1,"a":2}'));
reject('first form cannot supply target hashes/IDs',()=>{const f=structuredClone(fixtures.find(x=>x.value.kind==='construction-refusal').value.payload.form);f.target=pristine.payload.selection.target;shape('Form',f);});
reject('empty grid selection is not all-surface',()=>shape('MaskDraft',{kind:'grid-cells',cells:[]}));
pass('first batch closed shape only; missing retained artwork still refuses',()=>{const input=sources.pristine.input,command=structuredClone(input.command);command.operations=command.operations.filter(o=>o.kind!=='content.import');shape('FirstMarkCommand',command);assert.throws(()=>firstCommandCheck(command,sources.pristine));return{structuralOnly:true,executable:false};});
reject('first batch operation order is fixed',()=>{const c=structuredClone(sources.pristine.input.command);c.operations=c.operations.filter(o=>o.kind!=='content.import').reverse();shape('FirstMarkCommand',c);});
pass('C1 reader accepts the additional finite field without changed defaults',()=>{const p=painted.payload,x=sources.painted.input,actions=Object.fromEntries(Object.keys(p.gates).filter(k=>!['selection','firstMark'].includes(k)).map(k=>[k,{enabled:false,diagnostics:[]}])) ,base={snapshot:{document:x.document,expected:x.command.expected},presentation:{command:null,scope:'whole-workspace',targetOwnerIds:[],includeSelectedDecorationDefaults:false,selectedCaptureMarkIds:[],review:null,retainedApplyRequest:null,outcome:null,actions},commandJSON:null};const old=readTileAuthoringUIView(base),next=readTileAuthoringUIView({...base,overlay:p});const without={...next};delete without.overlay;same(without,old);assert.ok(Object.isFrozen(next.overlay.selection));assert.throws(()=>readTileAuthoringUIView({...base,presentation:{...base.presentation,includeSelectedDecorationDefaults:true},overlay:p}));return{baseView:'explicit minimal render double over committed Core source; not a Host'};});
pass('required additional-key fence detects changes absent from C1 legacy key',()=>{const p=painted.payload,q=structuredClone(p);q.palette[0].availability='failed';same(p.basis,q.basis);same(p.current,q.current);assert.notDeepEqual(p,q);const ordered=structuredClone(p);ordered.palette.reverse();assert.notDeepEqual(p,ordered);const keys=structuredClone(p);keys.basis.expected=Object.fromEntries(Object.entries(keys.basis.expected).reverse());same(p,keys);return{runtimeHookImplemented:false};});
pass('all committed input provenance remains exact',()=>{for(const r of source.inputs){const b=git(r.commit,r.path);same(b.length,r.bytes);same(sha(b),r.rawSha256);}for(const r of source.outputs){const b=fs.readFileSync(path.join(here,r.path));same(b.length,r.bytes);same(sha(b),r.sha256);}});
const options=Object.fromEntries(process.argv.slice(2).map(arg=>{const match=/^--(typescript-root|python-deps)=(.+)$/.exec(arg);assert.ok(match,'Only optional isolated static tooling paths are accepted');return[match[1],path.resolve(match[2])];}));
let typecheck=null,independentSchema=null;
if(options['typescript-root']){
 const packageFile=path.join(options['typescript-root'],'package.json'),metadata=read(packageFile);assert.equal(metadata.version,'5.8.3');
 execFileSync(process.execPath,[path.join(options['typescript-root'],'lib/tsc.js'),'--strict','--noEmit','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--lib','ES2022,DOM',path.join(here,'type-controls.ts')],{cwd:root,windowsHide:true,timeout:60000,stdio:'pipe'});
 typecheck={version:metadata.version,strict:true,noEmit:true,negativeControls:[...fs.readFileSync(path.join(here,'type-controls.ts'),'utf8').matchAll(/@ts-expect-error/g)].length,packageSha256:sha(fs.readFileSync(packageFile))};controls.push({name:'strict positive/negative TypeScript consumers',status:'pass',...typecheck});
}
if(options['python-deps']){
 const text=execFileSync('python',['-B',path.join(here,'verify_schema.py'),'--dependencies='+options['python-deps'],'--core-schema='+path.join(stage,'contract.schema.json')],{cwd:root,windowsHide:true,timeout:60000,encoding:'utf8',maxBuffer:1024*1024});independentSchema=JSON.parse(text);assert.equal(independentSchema.status,'pass');controls.push({name:'independent Draft2020-12 schema controls',status:'pass',...independentSchema});
}
const report={kind:'nautilus-c2-ui-projection-static-controls',version:1,status:'pass',scope:'Closed finite shapes, copied Core witness relationships, declaration syntax and refusal/fence controls only. No live Host, pointer/native ownership, successful Stage/Review/Apply, decoder or recovery proof.',checks:controls,inputs:source.outputs,validatorInputs,typescript:typecheck??{syntaxOnly:true,fullTypeCheck:false},independentSchema,runtimeChanges:0,publicRegistration:false,browserStarted:false,retainedHelpers:0,push:false,finishedAt:new Date().toISOString()};fs.writeFileSync(path.join(here,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:controls.length,fixtures:fixtures.length,exactPalettePins:30,Host:false,native:false,runtimeChanges:0,push:false}));
