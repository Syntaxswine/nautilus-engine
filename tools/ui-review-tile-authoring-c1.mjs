import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createTileAuthoringCommands,rectangleSpecFromFields,tileAuthoringPin,tileAuthoringLabelMessage} from '../apps/editor/tile-authoring/ui/commands.js';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function reviewTileAuthoringUIProtocol(){
  const out=path.join(root,'artifacts/ui-tile-authoring-c1');
  fs.mkdirSync(out,{recursive:true});
  const args=['--test','--test-reporter=tap','tests/ui-tile-authoring-c1.test.mjs'];
  const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true});
  const log=(result.stdout??'')+(result.stderr??'');fs.writeFileSync(path.join(out,'protocol.log'),log);
  const inputs=['apps/editor/tile-authoring/ui/panel.js','apps/editor/tile-authoring/ui/commands.js','apps/editor/tile-authoring/ui/styles.css','tests/ui-tile-authoring-c1.test.mjs','tools/ui-review-tile-authoring-c1.mjs'].map(file=>{const b=fs.readFileSync(path.join(root,file));return {file,bytes:b.length,sha256:digest(b)};});
  const report={kind:'nautilus-ui-c1-protocol-review',version:1,status:result.status===0?'pass':'failed',scope:'Protocol doubles only. No actual Core authoring, Editor v3 host, browser or installed-package proof.',command:[process.execPath,...args],exitCode:result.status,tests:Number(log.match(/^# tests (\d+)/m)?.[1]??0),pass:Number(log.match(/^# pass (\d+)/m)?.[1]??0),fail:Number(log.match(/^# fail (\d+)/m)?.[1]??0),inputs,log:{file:'artifacts/ui-tile-authoring-c1/protocol.log',sha256:digest(Buffer.from(log))},acceptedMain:'d869410625b246cfff2b51089e7878c31951775c',coreContract:'43227894c50ec62b71806978195fff2c650eb388',uiContract:'678ceb609d05d2bc13e2a1f83cc7ab7e0e3c5cf2',actualCoreCommit:null,actualHostCommit:null,actualIntegration:false,browserStarted:false,retainedHelpers:0,finishedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(out,'protocol.json'),JSON.stringify(report,null,2)+'\n');
  if(result.error)throw result.error;
  if(result.status!==0)throw Error('UI_C1_PROTOCOL_FAILED: '+log.slice(-5000));
  return report;
}

const approvedCore='3df11ce6e62fb94806e30652b87168949f8ef4dd';
async function fixedCoreModules(coreCommit) {
  if(coreCommit!==approvedCore)throw Error('UI_C1_APPROVED_CORE_REQUIRED: Use the exact Root-approved Core checkpoint.');
  const {moduleReferencesBatch}=await import('./module-references.mjs');
  const stage=path.join(root,'artifacts/ui-tile-authoring-c1','constructors-'+coreCommit);
  const entries=['packages/tile-authoring-core/index.js','packages/tiles-core/index.js','packages/map-core/index.js','packages/tile-finishes/catalogue.js','tests/fixtures/tile-authoring/c1-workflow.mjs'];
  const loaded=new Map();let pending=[...entries];
  while(pending.length){
    const batch=[...new Set(pending)].filter(file=>!loaded.has(file));pending=[];if(!batch.length)break;
    const result=spawnSync('git',['cat-file','--batch'],{cwd:root,input:batch.map(file=>coreCommit+':'+file).join('\n')+'\n',maxBuffer:64*1024*1024,windowsHide:true});
    if(result.status!==0)throw Error('Fixed Git object read failed: '+result.stderr);
    let offset=0;const parsed=[];
    for(const file of batch){
      const end=result.stdout.indexOf(10,offset),header=result.stdout.subarray(offset,end).toString(),[blob,type,length]=header.split(' '),size=Number(length);
      if(type!=='blob'||!Number.isSafeInteger(size))throw Error('Missing fixed blob '+file+': '+header);
      const bytes=result.stdout.subarray(end+1,end+1+size);offset=end+1+size+1;
      loaded.set(file,{file,gitBlob:blob,bytes:bytes.length,sha256:digest(bytes),data:bytes});
      if(/\.(?:mjs|js)$/.test(file))parsed.push({filename:path.join(stage,file),source:bytes.toString('utf8'),file});
    }
    const references=moduleReferencesBatch(parsed);
    for(let i=0;i<references.length;i++)for(const specifier of references[i].specifiers){
      const file=parsed[i].file;
      if(specifier.startsWith('node:')){if(!file.startsWith('tests/'))throw Error('Unexpected Node-only runtime dependency '+file);continue;}
      if(!specifier.startsWith('.'))throw Error('No private/package/network fallback: '+file+' -> '+specifier);
      const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));
      if(resolved.startsWith('../')||!/\.(?:mjs|js|json)$/.test(resolved))throw Error('Unsupported fixed dependency '+resolved);
      if(!loaded.has(resolved))pending.push(resolved);
    }
  }
  fs.mkdirSync(stage,{recursive:true});
  const packageBytes=Buffer.from('{"type":"module","private":true,"description":"UI constructor-only fixed Git proof; not a host"}\n');
  const packageFile=path.join(stage,'package.json');
  if(fs.existsSync(packageFile)&&!fs.readFileSync(packageFile).equals(packageBytes))throw Error('Unknown stage package; preserve it for inspection.');
  fs.writeFileSync(packageFile,packageBytes);
  for(const value of loaded.values()){
    const file=path.join(stage,value.file);fs.mkdirSync(path.dirname(file),{recursive:true});
    if(fs.existsSync(file)&&digest(fs.readFileSync(file))!==value.sha256)throw Error('Changed fixed stage input '+value.file);
    fs.writeFileSync(file,value.data);
  }
  const module=async file=>import(pathToFileURL(path.join(stage,file)).href);
  const [authoring,tiles,map,finishes,fixture]=await Promise.all(entries.map(module));
  return {authoring,tiles,map,finishes,fixture,inventory:[...loaded.values()].map(({data,...record})=>record).sort((a,b)=>a.file.localeCompare(b.file)),stagePackage:{bytes:packageBytes.length,sha256:digest(packageBytes)}};
}
export async function reviewTileAuthoringConstructors(coreCommit){
  if(coreCommit!==approvedCore)throw Error('UI_C1_APPROVED_CORE_REQUIRED: Use the exact Root-approved Core checkpoint.');
  const out=path.join(root,'artifacts/ui-tile-authoring-c1');fs.mkdirSync(out,{recursive:true});
  const inputs=['apps/editor/tile-authoring/ui/panel.js','apps/editor/tile-authoring/ui/commands.js','apps/editor/tile-authoring/ui/styles.css','tests/ui-tile-authoring-c1.test.mjs','tools/ui-review-tile-authoring-c1.mjs'].map(file=>{const b=fs.readFileSync(path.join(root,file));return{file,bytes:b.length,sha256:digest(b)};});
  const report={kind:'nautilus-ui-c1-constructor-interop',version:1,status:'pending',coreCommit,coreDocsCommit:'eedfc0149cbaa5715445ed2dc909c2d694a81d50',scope:'Actual fixed public Core producer/sealer through UI form mapping/command assembly. Expected comes from the fixed C1 test fixture with unbound test authority. Packets are NOT executed. No production Editor HostService, retained write, browser, renderer, installed-package or game acceptance.',actualCoreConstruction:false,actualHost:false,actualIntegration:false,installedPackage:false,packetsExecuted:false,browserStarted:false,retainedHelpers:0,inputs,checks:[]};
  const save=()=>fs.writeFileSync(path.join(out,'constructors.json'),JSON.stringify(report,null,2)+'\n');
  const check=(name,run)=>{const detail=run();report.checks.push({name,status:'pass',...(detail??{})});save();};
  try{
    const {authoring:A,tiles:T,map:M,finishes:F,fixture:C,inventory,stagePackage}=await fixedCoreModules(coreCommit);
    report.coreInputs=inventory;report.stagePackage=stagePackage;
    check('exact-six-public-value-exports',()=>{assert.deepEqual(Object.keys(A).sort(),['bindTileAuthoringTarget','createRectangleDefinition','inspectTileAuthoringRequirements','planTileAuthoring','sealTileContentRecord','tileAuthoringDiscovery']);});
    const f=C.fixture(T,M,A,F),snapshot={document:f.document,source:C.projection(f.document),expected:C.expected(T,f.document,f.context),hostProtocolVersion:1,missingBindings:[]};
    let produce=0,seal=0;const returned=[];
    const actual={createRectangleDefinition(t,s){produce++;const value=A.createRectangleDefinition(t,s);returned.push(value);return value;},sealTileContentRecord(t,s){seal++;return A.sealTileContentRecord(t,s);}};
    const builder=createTileAuthoringCommands({tiles:T,authoring:actual});
    const command=(n)=>({snapshot,requestId:'ui.actual.request.'+n,opId:'ui.actual.op.'+n});
    const a=builder.rectangle({...command('a1'),kind:'recipe.create',spec:rectangleSpecFromFields({label:'A1',widthM:8,depthM:4},{kind:'recipe.create',ids:{definitionId:'ui.actual.a',recipeId:'ui.actual.recipe.a1',sourceIds:{prefix:'ui.actual.source',surfaceId:'ui.top',gridId:'ui.grid'}},finishId:f.context.availableFinishIds[0]})});
    const a1=a.operations[0].body.definition;report.actualCoreConstruction=true;report.actualFunctionsInvoked=['createRectangleDefinition','sealTileContentRecord'];report.snapshotAuthority='fixed C1 test fixture, unbound; not Editor';
    const b=builder.rectangle({...command('b1'),kind:'recipe.clone',base:a1,spec:rectangleSpecFromFields({label:'B1'},{kind:'recipe.clone',base:a1,ids:{definitionId:'ui.actual.b',recipeId:'ui.actual.recipe.b1'}})});
    const b1=b.operations[0].body.definition;
    const revised=builder.rectangle({...command('b2'),kind:'recipe.revise',base:b1,spec:rectangleSpecFromFields({label:'B2',depthM:5},{kind:'recipe.revise',base:b1,ids:{recipeId:'ui.actual.recipe.b2'}})});
    const b2=revised.operations[0].body.definition;
    check('actual-create-clone-revise-from-UI-fields-once',()=>{assert.equal(produce,3);assert.deepEqual(a1.body.recipe.anchors,b1.body.recipe.anchors);assert.deepEqual(b1.body.recipe.anchors,b2.body.recipe.anchors);assert.deepEqual(b1.body.recipe.reservations[0].max.slice(0,2),[8,4]);assert.deepEqual(b2.body.recipe.reservations[0].max.slice(0,2),[8,5]);assert.equal(b2.body.recipe.interior.skinId,b1.body.recipe.interior.skinId);assert.equal(b2.body.recipe.interior.variantSeed,b1.body.recipe.interior.variantSeed);assert.equal(b1.body.surfaces[0].id,b2.body.surfaces[0].id);assert.deepEqual(b1.body.notices,b2.body.notices);for(let i=0;i<3;i++)assert.deepEqual(tileAuthoringPin([a1,b1,b2][i]),returned[i].pin);return{producerCalls:produce,pins:[a1,b1,b2].map(tileAuthoringPin)};});
    const presetInput={kind:'nautilus-tile-preset',version:1,id:'ui.actual.p',revision:1,body:{label:'P1 pinned to B1',definition:tileAuthoringPin(b1),defaultLayers:[],defaultMarks:[],requires:b1.body.requires,notices:b1.body.notices}};
    const p=builder.preset({...command('p1'),input:presetInput}),p1=p.operations[0].body.preset;
    check('actual-preset-sealer-retains-B1-pin-and-notices',()=>{assert.equal(seal,1);assert.deepEqual(p1.body.definition,tileAuthoringPin(b1));assert.deepEqual(p1.body.notices,b1.body.notices);assert.deepEqual(p1.body.defaultMarks,[]);});
    const floor=f.document.floorBinding.floors[0],placement=(ownerId,x)=>({ownerId,originM:[x,0,floor.elevationM],floorBindings:{base:floor.id},transform:{quarterTurns:0,mirrorX:false},locked:false,anchorIds:b1.body.recipe.anchors.map(a=>a.id),freshMarkIds:[],freshLayerIds:[],chunkId:'chunk.'+ownerId});
    const place=builder.place({...command('two'),preset:p1,placements:[placement('ui.owner.one',40),placement('ui.owner.two',50)]});
    const upgrade=builder.upgrade({...command('upgrade'),ownerId:'ui.owner.one',from:b1,to:b2,anchorIds:b2.body.recipe.anchors.map(a=>a.id)});
    check('six-canonical-packets-constructed-not-executed',()=>{assert.deepEqual(place.operations[0].body.placements.map(p=>p.ownerId),['ui.owner.one','ui.owner.two']);assert.deepEqual(upgrade.operations[0].body.ownerIds,['ui.owner.one']);assert.deepEqual(upgrade.operations[0].body.to,tileAuthoringPin(b2));assert.deepEqual(p1.body.definition,tileAuthoringPin(b1));assert.equal(produce,3);assert.equal(seal,1);return{packets:6,executed:false,expectedOrigin:'fixed actual Core C1 fixture; unbound test authority, not Editor'};});
    const unicode='🧭'.repeat(120),unicodeSpec=rectangleSpecFromFields({label:unicode,widthM:0.1,depthM:64},{kind:'recipe.create',ids:{definitionId:'ui.unicode',recipeId:'ui.unicode.recipe',sourceIds:{prefix:'ui.unicode.source',surfaceId:'ui.unicode.top',gridId:'ui.unicode.grid'}},finishId:f.context.availableFinishIds[0]});
    const u=builder.rectangle({...command('unicode'),kind:'recipe.create',spec:unicodeSpec}).operations[0].body.definition;
    check('actual-Core-accepts-120-supplementary-label-points-and-boundary-dimensions',()=>{assert.equal(unicode.length,240);assert.equal(tileAuthoringLabelMessage(unicode),'');assert.equal(u.body.label,unicode);const mixed='A'.repeat(60)+'🧭'.repeat(60);assert.equal(tileAuthoringLabelMessage(mixed),'');assert.equal(A.createRectangleDefinition(T,{...unicodeSpec,identity:{...unicodeSpec.identity,id:'ui.mixed'},label:mixed}).definition.body.label,mixed);assert.deepEqual(u.body.recipe.reservations[0].max.slice(0,2),[0.1,64]);return{codePoints:120,utf16Units:240,dimensionsM:[0.1,64]};});
    const pu=builder.preset({...command('unicode-preset'),input:{...presetInput,id:'ui.unicode.preset',body:{...presetInput.body,label:unicode}}});
    check('actual-preset-label-has-no-UTF16-half-limit',()=>{assert.equal(pu.operations[0].body.preset.body.label,unicode);});
    check('UI-and-actual-Core-refuse-121-point-labels',()=>{assert.notEqual(tileAuthoringLabelMessage(unicode+'🧭'),'');assert.notEqual(tileAuthoringLabelMessage('A'.repeat(121)),'');assert.throws(()=>A.createRectangleDefinition(T,{...unicodeSpec,label:'A'.repeat(121)}));assert.throws(()=>rectangleSpecFromFields({label:unicode+'🧭',widthM:8,depthM:4},{kind:'recipe.create',ids:{definitionId:'bad',recipeId:'bad.recipe',sourceIds:{prefix:'bad.source',surfaceId:'bad.top',gridId:'bad.grid'}},finishId:f.context.availableFinishIds[0]}));assert.throws(()=>A.createRectangleDefinition(T,{...unicodeSpec,label:unicode+'🧭'}));assert.throws(()=>A.sealTileContentRecord(T,{...presetInput,body:{...presetInput.body,label:unicode+'🧭'}}));});
    check('actual-Core-and-UI-refuse-out-of-range-dimensions',()=>{for(const widthM of [0.099,64.001]){assert.throws(()=>rectangleSpecFromFields({label:'Bad',widthM,depthM:4},{kind:'recipe.create',ids:{definitionId:'bad',recipeId:'bad.recipe',sourceIds:{prefix:'bad.source',surfaceId:'bad.top',gridId:'bad.grid'}},finishId:f.context.availableFinishIds[0]}));assert.throws(()=>A.createRectangleDefinition(T,{...unicodeSpec,widthM}));}});
    check('negative-zero-refuses-without-JSON-normalization',()=>{assert.throws(()=>builder.rectangle({...command('negative-zero'),kind:'recipe.create',spec:{...unicodeSpec,variantSeed:-0}}));assert.throws(()=>A.createRectangleDefinition(T,{...unicodeSpec,variantSeed:-0}));});
    check('actual-sealer-verifies-supplied-digest-without-repair',()=>{assert.throws(()=>builder.preset({...command('bad-digest'),input:{...p1,contentDigest:'f'.repeat(64)}}));});
    const packets=Buffer.from(JSON.stringify({scope:report.scope,packetsExecuted:false,commands:[a,b,revised,p,place,upgrade]},null,2)+'\n');
    fs.writeFileSync(path.join(out,'constructor-packets.json'),packets);report.packetArtifact={file:'artifacts/ui-tile-authoring-c1/constructor-packets.json',bytes:packets.length,sha256:digest(packets)};
    for(const item of inputs)assert.equal(digest(fs.readFileSync(path.join(root,item.file))),item.sha256,'UI input changed during constructor proof');
    report.status='pass';report.finishedAt=new Date().toISOString();save();return report;
  }catch(error){report.status='failed';report.error=error.message;report.finishedAt=new Date().toISOString();save();throw error;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length===3&&process.argv[2]==='--protocol')console.log(JSON.stringify(reviewTileAuthoringUIProtocol(),null,2));
  else if(process.argv.length===4&&process.argv[2]==='--constructors'){
    const report=await reviewTileAuthoringConstructors(process.argv[3]);
    console.log(JSON.stringify({status:report.status,coreCommit:report.coreCommit,coreModules:report.coreInputs.length,checks:report.checks.length,actualCoreConstruction:true,actualHost:false,packetsExecuted:false,browserStarted:false},null,2));
  }else throw Error('UI_C1_NATIVE_REVIEW_GATED: Use --protocol or --constructors <approved fixed Core SHA>. Actual source/built/installed browser proof still requires reviewed fixed Editor HostService/ledger; no C0/fixture runtime fallback.');
}
