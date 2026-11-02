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

export async function reviewTileAuthoringSelectLabels({output='ui-tile-authoring-c1-select-labels',usability=false}={}){
  const {withArtReview}=await import('./art-review-browser.mjs');
  const out=path.join(root,'artifacts',output);
  fs.mkdirSync(out,{recursive:true});
  const inputFiles=['apps/editor/tile-authoring/ui/panel.js','apps/editor/tile-authoring/ui/commands.js','apps/editor/tile-authoring/ui/styles.css','tools/ui-review-tile-authoring-c1.mjs','tools/art-review-browser.mjs'];
  const inputs=inputFiles.map(file=>{const bytes=fs.readFileSync(path.join(root,file));return{file,bytes:bytes.length,sha256:digest(bytes)};});
  const report={kind:'nautilus-ui-c1-select-label-review',version:1,status:'pending',scope:'Actual production mount and native Edge DOM/accessibility names only. Explicit render-only document/service/constructor doubles; no Core command or production HostService/native renderer integration.',actualDOM:true,actualHost:false,packetsExecuted:false,inputs,checks:[],retainedHelpers:0};
  const save=()=>fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2)+'\n');
  try{
    save();
    await withArtReview('C1 stable select accessible names',async({page,context,browser,baseURL})=>{
      report.backend={channel:process.env.NAUTILUS_REVIEW_CHANNEL||(process.platform==='win32'?'msedge':'chromium'),version:browser.version(),node:process.version};
      await page.route(baseURL+'/__c1_select_labels__',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><title>C1 select accessible-name check</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/apps/editor/tile-authoring/ui/styles.css"><main></main></html>'}));
      await page.goto(baseURL+'/__c1_select_labels__');
      await page.evaluate(async usability=>{
        const {mountTileAuthoringUI}=await import('/apps/editor/tile-authoring/ui/panel.js');
        const {TILE_AUTHORING_EXPECTED_FIELDS}=await import('/apps/editor/tile-authoring/ui/commands.js');
        const hash=c=>c.repeat(64),pin=r=>({id:r.id,revision:r.revision,contentDigest:r.contentDigest});
        const definition=(id,revision,label)=>({kind:'nautilus-recipe-definition',version:1,id,revision,contentDigest:hash(String(revision)),body:{label,recipe:{kind:'render-only-double',id:'recipe.'+id,anchors:[]},sourceProfile:'local-level-region-v1',surfaces:[],requires:[],notices:[]}});
        const preset=(id,label,d)=>({kind:'nautilus-tile-preset',version:1,id,revision:1,contentDigest:hash('a'),body:{label,definition:pin(d),defaultLayers:[],defaultMarks:[],requires:[],notices:[]}});
        const actions=['recipe.create','recipe.clone','recipe.revise','preset.save','preset.place','placement.upgrade','review','apply','cancel','recover','undo','redo','save','open','retryPresentation'];
        let view={snapshot:{document:{kind:'nautilus-tile-workbench-document',version:3,id:'render-only-select-labels',sourceJSON:'{"renderOnly":true}',floorBinding:{floors:[{id:'F00',label:'1',elevationM:0}]},finishBinding:{id:'render-only'},tileBundle:{layout:{revision:0,instances:[]}},contentRevision:0,authoring:{library:{definitions:[],presets:[],artwork:[]},decorations:{surfaces:[],chunks:[],groups:[]},ownerPins:[]},resourceRefs:[]},expected:Object.fromEntries(TILE_AUTHORING_EXPECTED_FIELDS.map(k=>[k,k==='workspaceRevision'?0:hash('a')]))},presentation:{command:null,scope:'new-immutable-library-record',targetOwnerIds:[],includeSelectedDecorationDefaults:false,selectedCaptureMarkIds:[],review:null,retainedApplyRequest:null,outcome:null,actions:Object.fromEntries(actions.map(n=>[n,{enabled:true,diagnostics:[]}]))},commandJSON:null};
        if(usability){
          view.readiness={authoring:{state:'saveable'},visual:{state:'accepted'},navigation:{state:'unbound'}};
          for(const kind of ['surface.layers','decoration.add','decoration.update','decoration.remove','stroke.group','owner.remove','content.import','content.export','requirements.inspect'])view.presentation.actions[kind]={enabled:false,diagnostics:[{code:'C1_FEATURE_UNAVAILABLE',message:'This feature is unavailable in the rectangle authoring profile.',action:'Preserve source and use a supported explicit operation.'}]};
        }
        const observers=new Set(),calls=[],historyCalls=[];
        const forbidden=name=>()=>{calls.push(name);throw Error('Render-only check must not call '+name);};
        const service=Object.fromEntries(['describe','snapshot','query','prepare','apply','cancel','recover'].map(name=>[name,forbidden(name)]));
        const binding={service,getSnapshot:()=>view,subscribe(fn){observers.add(fn);return()=>observers.delete(fn);},collectCommand:forbidden('collectCommand'),discardDraft:forbidden('discardDraft'),allocateIds:forbidden('allocateIds'),borrowedFloorController:{state:{selectedId:'F00'}},history:usability?{save(){historyCalls.push('save');throw Object.assign(new Error('RENDER_ONLY_SAVE_REFUSED: Checkpoint could not be saved.'),{code:'RENDER_ONLY_SAVE_REFUSED'});}}:{}};
        const mounted=mountTileAuthoringUI(document.querySelector('main'),binding,{tiles:{renderOnly:true},authoring:{createRectangleDefinition:forbidden('producer'),sealTileContentRecord:forbidden('sealer')},rectangleSpec:forbidden('rectangleSpec')});
        function publish(mode){
          const d1=definition('definition.a',1,usability?'B1':'A1'),d2=definition('definition.b',2,'B2');
          const populated=mode!=='empty';
          const definitions=populated?[d1,d2]:[],presets=populated?[preset('preset.p','P1',d1),preset('preset.q','Q1',d2)]:[];
          const ownerPins=populated?[{ownerId:'owner.one',definition:pin(d1)},{ownerId:'owner.two',definition:pin(d2)}]:[];
          if(mode==='changed'){
            definitions[0].body.label='A1 changed visible option';
            definitions.reverse();presets[0].body.label='P1 changed visible option';presets.reverse();ownerPins.reverse();
          }
          view={...view,snapshot:{...view.snapshot,document:{...view.snapshot.document,authoring:{...view.snapshot.document.authoring,library:{...view.snapshot.document.authoring.library,definitions,presets},ownerPins},tileBundle:{layout:{revision:0,instances:ownerPins.map(p=>({id:p.ownerId,locked:false}))}}}}};
          for(const fn of observers)fn(view);
        }
        window.selectLabelCheck={publish,calls,historyCalls,setOutcome(outcome){view={...view,presentation:{...view.presentation,outcome}};for(const fn of observers)fn(view);},dispose:()=>mounted.dispose(),observers:()=>observers.size};
      },usability);
      const cdp=await context.newCDPSession(page);
      const controls=[['Definition revision','definition'],['Preset revision','preset'],['Selected upgrade target','owner']];
      async function check(phase,{empty=false,preserve=null}={}){
        const tree=await cdp.send('Accessibility.getFullAXTree');
        const values={};
        for(const [label,name] of controls){
          const exact=page.getByLabel(label,{exact:true}),role=page.getByRole('combobox',{name:label,exact:true});
          assert.equal(await exact.count(),1,phase+': exact label '+label);
          assert.equal(await role.count(),1,phase+': exact accessible name '+label);
          assert.equal(await exact.isEnabled(),true);
          const dom=await exact.evaluate(n=>({id:n.id,name:n.name,value:n.value,explicitLabel:n.getAttribute('aria-label'),visibleLabel:n.labels[0]?.childNodes[0]?.textContent,htmlFor:n.labels[0]?.htmlFor,options:[...n.options].map(o=>o.text)}));
          assert.equal(dom.name,name);assert.equal(dom.explicitLabel,label);assert.equal(dom.visibleLabel,label);assert.equal(dom.htmlFor,dom.id);
          assert.equal(tree.nodes.filter(n=>!n.ignored&&n.role?.value==='combobox'&&n.name?.value===label).length,1,phase+': native AX name '+label);
          if(empty)assert.equal(dom.value,'',phase+': no automatic selection '+label);
          if(preserve)assert.equal(dom.value,preserve[name],phase+': preserve exact selected value '+label);
          values[name]=dom.value;
          report.checks.push({phase,label,status:'pass',exactLabel:true,exactRoleName:true,nativeAXName:true,...dom});
        }
        assert.deepEqual(await page.evaluate(()=>selectLabelCheck.calls),[],'Render-only review must not execute commands');
        save();return values;
      }
      await check('initial empty',{empty:true});
      await page.evaluate(()=>selectLabelCheck.publish('populated'));
      await check('populated unselected',{empty:true});
      for(const [label] of controls){const node=page.getByLabel(label,{exact:true}),values=await node.locator('option').evaluateAll(options=>options.map(o=>o.value));await node.selectOption(values[1]);}
      const selected=await check('selected');
      await page.getByLabel('Preset revision',{exact:true}).focus();
      const focused=await page.evaluate(()=>document.activeElement.id);
      await page.evaluate(()=>selectLabelCheck.publish('changed'));
      await check('option text/order changed',{preserve:selected});
      assert.equal(await page.evaluate(()=>document.activeElement.id),focused,'Refresh must preserve focused select node');
      await page.evaluate(()=>selectLabelCheck.publish('empty'));
      await check('selected options removed',{empty:true});
      await page.evaluate(()=>selectLabelCheck.publish('populated'));
      await check('options restored without automatic selection',{empty:true});
      assert.equal(await page.getByRole('button',{name:'Stage two copies',exact:true}).isDisabled(),true,'P1 must not be auto-picked');
      if(usability)await checkTileAuthoringUsabilityDOM(page,report);
      await page.screenshot({path:path.join(out,'select-labels.png'),fullPage:true});
      assert.deepEqual(await page.evaluate(()=>selectLabelCheck.dispose()),[]);
      assert.equal(await page.evaluate(()=>selectLabelCheck.observers()),0);
      report.selectionPolicy='Empty selection remains deliberate; removed options reset empty; no automatic P1/upgrade target. Existing valid selection and focused select node survive option changes.';
    },{source:true,output,timeoutMs:60000});
    report.lifecycle=JSON.parse(fs.readFileSync(path.join(out,'cleanup-receipt.json')));
    assert.equal(report.lifecycle.httpClosed,true);assert.equal(report.lifecycle.browserClosed,true);
    for(const item of inputs)assert.equal(digest(fs.readFileSync(path.join(root,item.file))),item.sha256,'Input changed during review');
    report.status='pass';report.finishedAt=new Date().toISOString();save();return report;
  }catch(error){report.status='failed';report.error=error.message;report.finishedAt=new Date().toISOString();save();throw error;}
}

async function checkTileAuthoringUsabilityDOM(page,report){
  report.usabilityChecks=[];
  const record=(name,detail={})=>report.usabilityChecks.push({name,status:'pass',...detail});
  const root=page.locator('.tile-authoring-ui'),details=root.locator('details');
  assert.equal(await details.getAttribute('open'),null);
  const visible=await root.innerText();assert.equal(visible.includes('C1_FEATURE_UNAVAILABLE'),false);assert.equal(visible.includes('unbound'),false);assert.equal(/[a-f0-9]{64}/.test(visible),false);
  const raw=await details.textContent();assert.ok(raw.includes('C1_FEATURE_UNAVAILABLE'));assert.ok(raw.includes('unbound'));
  record('No unattempted feature warnings, hashes or raw readiness in the closed main flow');
  for(const label of ['Definition revision','Preset revision']){
    const rows=await page.getByLabel(label,{exact:true}).locator('option').evaluateAll(nodes=>nodes.slice(1).map(n=>({text:n.text,value:n.value,title:n.title})));
    for(const row of rows){assert.match(row.text,/ · r\d+$/);assert.equal(row.text.includes('definition.'),false);assert.equal(row.text.includes('preset.'),false);assert.deepEqual(JSON.parse(row.title),JSON.parse(row.value));}
  }
  assert.deepEqual(await page.getByLabel('Selected upgrade target',{exact:true}).locator('option').evaluateAll(nodes=>nodes.slice(1).map(n=>n.text)),['Copy 1','Copy 2']);
  record('Short record/copy labels retain the exact values and advanced pin titles');
  assert.equal(await page.getByRole('button',{name:'Stage two copies',exact:true}).getAttribute('title'),'Select a preset revision.');
  record('Disabled placement explains the missing explicit preset choice locally');
  await page.getByLabel('Definition revision',{exact:true}).selectOption({label:'B2 · r2'});
  await page.getByLabel('Selected upgrade target',{exact:true}).selectOption('owner.one');
  assert.equal(await root.locator('.ta-copy-scope').textContent(),'Copy 1 · From B1 r1 → B2 r2');
  record('Selected copy shows From B1 r1 to B2 r2 without an ID');
  const sizing=await root.evaluate(n=>[...n.querySelectorAll('input,select,button,summary,.ta-hint,.ta-copy-scope')].filter(x=>x.getClientRects().length).map(x=>({tag:x.tagName,height:x.getBoundingClientRect().height,fontPx:parseFloat(getComputedStyle(x).fontSize)})));
  assert.ok(sizing.every(x=>x.fontPx>=14));assert.ok(sizing.filter(x=>['INPUT','SELECT','BUTTON','SUMMARY'].includes(x.tag)).every(x=>x.height>=44));
  record('Visible ordinary text is at least 14px and controls are at least 44px',{elements:sizing.length});
  const error={code:'RENDER_ONLY_SAVE_REFUSED',message:'Checkpoint could not be saved.',action:''};
  await page.evaluate(error=>selectLabelCheck.setOutcome({outcome:'rejected',committed:false,requestId:'render-only-error',diagnostics:[error,error]}),error);
  assert.equal(await root.getByRole('alert').innerText(),'Checkpoint could not be saved.');
  record('Duplicate current outcome diagnostics appear once');
  await page.getByRole('button',{name:'Save checkpoint',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.ta-fault').textContent==='Checkpoint could not be saved.',undefined,{timeout:3000});
  assert.equal(await root.getByRole('alert').innerText(),'Checkpoint could not be saved.');
  assert.deepEqual(await page.evaluate(()=>selectLabelCheck.calls),[]);
  assert.deepEqual(await page.evaluate(()=>selectLabelCheck.historyCalls),['save']);
  await page.evaluate(()=>selectLabelCheck.setOutcome({outcome:'committed',committed:true,requestId:'render-only-next-result',presentation:'ready',diagnostics:[]}));
  assert.equal(await root.getByRole('alert').isVisible(),false);
  record('Attempted history-port error appears once, clears for the next result, and executes no command producer or HostService');
}

export async function reviewTileAuthoringUsabilityCaptures(reviewDirectory){
  const {withArtReview}=await import('./art-review-browser.mjs');
  const fixed='ad41c12f6bf9fa8a2d9579296114eb880cee0930',previousUI='95511cb6f04dcba65656b2d9156c6173a84d6198';
  const directory=path.resolve(reviewDirectory),stage=path.join(directory,'source'),inventoryFile=path.join(directory,'staged-inputs.json'),checkpointFile=path.join(directory,'accepted-checkpoint.json');
  const inventoryBytes=fs.readFileSync(inventoryFile),inventory=JSON.parse(inventoryBytes),checkpointJSON=fs.readFileSync(checkpointFile,'utf8'),checkpoint=JSON.parse(checkpointJSON);
  assert.equal(inventory.fixed,fixed);assert.equal(checkpoint.document.contentRevision,6);assert.equal(checkpoint.document.authoring.ownerPins.length,2);
  const fixedFiles=new Map();
  for(const row of inventory.inputs){const bytes=fs.readFileSync(path.join(stage,row.file));assert.equal(digest(bytes),row.sha256,'Immutable Root input '+row.file);fixedFiles.set(row.file,bytes);}
  const overrides=new Map(['apps/editor/tile-authoring/ui/panel.js','apps/editor/tile-authoring/ui/styles.css'].map(file=>[file,fs.readFileSync(path.join(root,file))]));
  assert.ok(fs.readFileSync(path.join(root,'apps/editor/tile-authoring/ui/commands.js')).equals(fixedFiles.get('apps/editor/tile-authoring/ui/commands.js')));
  const output='ui-tile-authoring-c1-usability-native',out=path.join(root,'artifacts',output);fs.mkdirSync(out,{recursive:true});
  const report={kind:'nautilus-ui-c1-usability-captures',version:1,status:'pending',scope:'Actual fixed Root source Host loads its previously accepted checkpoint. Only UI panel/CSS routes are overridden. Selection/camera/capture only; no Stage/Review/Apply, save/history/recovery campaign, installed proof or performance claim.',fixedHost:fixed,core:'3df11ce6e62fb94806e30652b87168949f8ef4dd',previousUI,inventory:{file:inventoryFile,sha256:digest(inventoryBytes),inputs:inventory.inputs},checkpoint:{file:checkpointFile,sha256:digest(Buffer.from(checkpointJSON))},overrides:[...overrides].map(([file,b])=>({file,bytes:b.length,sha256:digest(b)})),checks:[],captures:[],retainedHelpers:0};
  const save=()=>fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2)+'\n');
  try{
    save();
    await withArtReview('C1 usability captures from accepted fixed workspace',async({page,context,browser,baseURL,errors,failedRequests})=>{
      report.backend={channel:process.env.NAUTILUS_REVIEW_CHANNEL||(process.platform==='win32'?'msedge':'chromium'),version:browser.version(),node:process.version,phone:'Viewport emulation only; no physical-phone or performance claim'};
      const requested=new Set();
      async function bind(ctx){
        await ctx.route('**/*',async route=>{
          const request=route.request(),url=new URL(request.url());
          if(url.origin!==baseURL||request.method()!=='GET')return route.abort();
          const file=decodeURIComponent(url.pathname).slice(1),bytes=overrides.get(file)??fixedFiles.get(file);
          assert.ok(bytes,'No checkout/network fallback for '+file);requested.add(file);
          const type={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'}[path.extname(file)]??'application/octet-stream';
          return route.fulfill({contentType:type,body:bytes});
        });
        await ctx.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:'nautilus-tile-authoring-editor-v3:'+checkpoint.document.id,value:checkpointJSON});
      }
      const snapshot=p=>p.evaluate(()=>tileAuthoringEditorProof.proofSnapshot());
      const rows=()=>JSON.parse(checkpointJSON).document.authoring.library.definitions;
      async function capture(p,name){
        await p.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
        const before=await snapshot(p),layout=await p.locator('.tile-authoring-ui').evaluate(n=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,panelHeight:n.getBoundingClientRect().height,detailsOpen:n.querySelector('details').open,visibleText:n.innerText}));
        assert.equal(await p.locator('.ta-review .ta-actions').count(),1);assert.equal(await p.locator('.ta-actions').evaluate(n=>getComputedStyle(n).position),'static');assert.equal(layout.detailsOpen,false);assert.ok(layout.scrollWidth<=layout.viewport);assert.equal(layout.visibleText.includes('C1_FEATURE_UNAVAILABLE'),false);assert.equal(layout.visibleText.includes('unbound'),false);assert.equal(/[a-f0-9]{64}/.test(layout.visibleText),false);
        assert.deepEqual(JSON.parse(before.checkpointJSON).document,checkpoint.document);assert.deepEqual(before.counts,{prepare:0,apply:0});assert.ok(before.drawCalls>0);
        for(const label of ['Definition revision','Preset revision','Selected upgrade target'])assert.equal(await p.getByRole('combobox',{name:label,exact:true}).count(),1);
        const file=path.join(out,name+'.png');await p.screenshot({path:file,fullPage:true});const after=await snapshot(p);
        assert.equal(before.checkpointJSON,after.checkpointJSON);assert.deepEqual(before.native,after.native);assert.deepEqual(before.counts,after.counts);
        report.captures.push({name,file:path.relative(root,file).replaceAll('\\','/'),sha256:digest(fs.readFileSync(file)),layout,checkpointSha256:digest(Buffer.from(after.checkpointJSON)),counts:after.counts,native:after.native});save();
      }
      for(const width of [1600,390,320]){
        const ctx=width===1600?context:await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}),p=width===1600?page:await ctx.newPage();
        if(width!==1600){p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failedRequests.push({url:r.url(),status:r.status()});});}
        try{
          await bind(ctx);await p.goto(baseURL+'/examples/tile-authoring-editor.html');await p.waitForFunction(()=>window.tileAuthoringEditorProof?.ready===true&&tileAuthoringEditorProof.proofSnapshot().state.phase==='idle',undefined,{timeout:30000});
          await p.getByRole('button',{name:'Frame tiles',exact:true}).click();
          for(const label of ['Definition revision','Preset revision','Selected upgrade target'])assert.equal(await p.getByLabel(label,{exact:true}).inputValue(),'');
          await capture(p,width===1600?'desktop-accepted':'phone-'+width);
          if(width===1600){
            const target=rows().find(r=>r.body.label==='B2'),owner=checkpoint.document.authoring.ownerPins.find(p=>p.definition.revision===1);
            assert.ok(target&&owner);await p.getByLabel('Definition revision',{exact:true}).selectOption(JSON.stringify(tileAuthoringPin(target)));await p.getByLabel('Selected upgrade target',{exact:true}).selectOption(owner.ownerId);
            const scope=await p.locator('.ta-copy-scope').innerText();assert.match(scope,/^Copy [12] · From B1 r1 → B2 r2$/);await capture(p,'desktop-selected-copy');report.checks.push({name:'Actual selected-copy revision labels retain exact values',status:'pass',scope});
          }
          const ordinary=await p.locator('.tile-authoring-ui').evaluate(n=>[...n.querySelectorAll('p,label,input,select,button,summary')].filter(x=>x.getClientRects().length).map(x=>({tag:x.tagName,font:parseFloat(getComputedStyle(x).fontSize),height:x.getBoundingClientRect().height})));
          assert.ok(ordinary.every(x=>x.font>=14));assert.ok(ordinary.filter(x=>['INPUT','SELECT','BUTTON','SUMMARY'].includes(x.tag)).every(x=>x.height>=44));
          assert.deepEqual(await p.evaluate(()=>tileAuthoringEditorProof.dispose()),[]);
          const cleanup=await p.evaluate(()=>tileAuthoringEditorProof.cleanupSnapshot());assert.deepEqual([cleanup.resources.roots,cleanup.resources.cells,cleanup.resources.triangles,cleanup.native.pool.ownedMaterials,cleanup.native.pool.leases],[0,0,0,0,0]);assert.ok(cleanup.hostLeases.every(n=>n===0));
          report.checks.push({name:'Capture '+width+' preserves source, zero prepare/apply, labels, sizing and resource retirement',status:'pass'});save();
        }finally{if(!p.isClosed())await p.evaluate(()=>window.tileAuthoringEditorProof?.dispose()).catch(()=>{});if(width!==1600)await ctx.close();}
      }
      report.requested=[...requested].sort();assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
    },{source:true,output,timeoutMs:180000});
    report.lifecycle=JSON.parse(fs.readFileSync(path.join(out,'cleanup-receipt.json')));assert.equal(report.lifecycle.httpClosed,true);assert.equal(report.lifecycle.browserClosed,true);
    for(const row of inventory.inputs)assert.equal(digest(fs.readFileSync(path.join(stage,row.file))),row.sha256,'Fixed Root inputs unchanged');
    for(const row of report.overrides)assert.equal(digest(fs.readFileSync(path.join(root,row.file))),row.sha256);
    report.status='pass';report.finishedAt=new Date().toISOString();save();return report;
  }catch(error){report.status='failed';report.error=error.message;report.finishedAt=new Date().toISOString();save();throw error;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length===3&&process.argv[2]==='--protocol')console.log(JSON.stringify(reviewTileAuthoringUIProtocol(),null,2));
  else if(process.argv.length===3&&process.argv[2]==='--select-labels'){const report=await reviewTileAuthoringSelectLabels();console.log(JSON.stringify({status:report.status,checks:report.checks.length,actualDOM:true,actualHost:false,retainedHelpers:report.retainedHelpers},null,2));}
  else if(process.argv.length===4&&process.argv[2]==='--usability'){
    const dom=await reviewTileAuthoringSelectLabels({output:'ui-tile-authoring-c1-usability-dom',usability:true});
    const native=await reviewTileAuthoringUsabilityCaptures(process.argv[3]);
    console.log(JSON.stringify({status:'pass',labelChecks:dom.checks.length,usabilityChecks:dom.usabilityChecks.length,nativeCaptures:native.captures.length,nativeChecks:native.checks.length,retainedHelpers:0},null,2));
  }
  else if(process.argv.length===4&&process.argv[2]==='--constructors'){
    const report=await reviewTileAuthoringConstructors(process.argv[3]);
    console.log(JSON.stringify({status:report.status,coreCommit:report.coreCommit,coreModules:report.coreInputs.length,checks:report.checks.length,actualCoreConstruction:true,actualHost:false,packetsExecuted:false,browserStarted:false},null,2));
  }else throw Error('UI_C1_NATIVE_REVIEW_GATED: Use --protocol, --select-labels, --usability <fixed Root review directory> or --constructors <approved fixed Core SHA>. Actual source/built/installed browser proof still requires reviewed fixed Editor HostService/ledger; no C0/fixture runtime fallback.');
}
