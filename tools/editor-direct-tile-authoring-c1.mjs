// Actual Core/retained host/native CPU flow. Synthetic atlas, no DOM/WebGL or
// installed-package claim. Preserved finite entry for the early authority review.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {moduleClosure} from './distribution.mjs';
import {harness,definitions,pin,placeBody,upgradeBody} from '../tests/fixtures/tile-authoring-editor/c1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),history=process.argv.includes('--history'),stem=history?'editor-tile-authoring-performance':'editor-tile-authoring-current-direct',file=path.join(root,'artifacts',stem+'.jsonl'),summaryFile=path.join(root,'artifacts',stem+'-summary.json');fs.mkdirSync(path.dirname(file),{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),inputs=moduleClosure(['tools/editor-direct-tile-authoring-c1.mjs']).sort().map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),runId=randomUUID(),started=performance.now(),sourceHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true,encoding:'utf8'}).trim(),phases=[];
let host,status='running',failure=null;
const report=()=>fs.writeFileSync(summaryFile,JSON.stringify({version:1,runId,status,sourceHead,history,scope:'Actual Core/retained host/native CPU; synthetic atlas, no DOM/WebGL/installed/device claim. Production calls and proof work are timed separately.',inputs,phases,counts:host?.counts??null,elapsedMs:performance.now()-started,...(failure?{error:failure}:{})},null,2)+'\n');
const log=value=>fs.appendFileSync(file,JSON.stringify({at:new Date().toISOString(),runId,elapsedMs:performance.now()-started,...value})+'\n');
async function measured(name,kind,run){const start=performance.now(),cpu=process.cpuUsage();log({stage:'phase-start',name,kind,counts:host?.counts??null});try{const value=await run(),durationMs=performance.now()-start,usage=process.cpuUsage(cpu);phases.push({name,kind,durationMs,cpuMs:(usage.user+usage.system)/1000});log({stage:'phase-end',...phases.at(-1),counts:host?.counts??null});report();return value;}catch(error){log({stage:'phase-failed',name,kind,message:error.message});throw error;}}
async function edit(label,kind,body,{jsonl=false}={}){const command=await measured(label+' command','host query',()=>host.command(kind,body)),review=await measured(label+' prepare','production API',()=>jsonl?host.jsonl.dispatch(JSON.stringify({action:'prepare',command})):host.service.prepare(command));assert.equal(review.status,'reviewable');const request=host.workbench.getSnapshot().presentation.retainedApplyRequest,outcome=await measured(label+' apply','production API',()=>jsonl?host.jsonl.dispatch(JSON.stringify({action:'apply',request})):host.service.apply(request));assert.equal(outcome.committed,true);}
log({stage:'start',pid:process.pid,executable:process.execPath,purpose:'finite C1 native CPU/source authority review',source:'tools/editor-direct-tile-authoring-c1.mjs',sourceHead,history});report();
try{
  host=await measured('create host','production initialization',()=>harness());const original=host.document,accepted=host.scene.children.find(node=>node.userData.smartTileRole==='accepted'),records=await measured('definitions','fixture construction',()=>definitions()),{a,b1,b2,p}=records;
  await edit('create A1','recipe.create',{definition:a});await edit('clone B1','recipe.clone',{base:pin(a),definition:b1});await edit('revise B2','recipe.revise',{base:pin(b1),definition:b2});await edit('save P1','preset.save',{preset:p});
  assert.equal(host.counts.prepare,0);assert.equal(host.scene.children.find(node=>node.userData.smartTileRole==='accepted'),accepted);assert.deepEqual(host.service.snapshot().document.tileBundle,original.tileBundle);log({stage:'library'});
  await edit('place two','preset.place',placeBody(host,records),{jsonl:true});const placed=host.service.snapshot().document,other=placed.tileBundle.layout.instances.find(p=>p.id==='c1.owner.two');log({stage:'place'});
  await edit('upgrade one','placement.upgrade',upgradeBody(records));const after=(await measured('accepted checkpoint open','proof checkpoint open',()=>host.binding.codec.open(host.raw))).document;
  assert.deepEqual(after.tileBundle.layout.instances.find(p=>p.id===other.id),other);assert.deepEqual(after.authoring.library.presets[0],records.p);assert.equal(after.sourceJSON,original.sourceJSON);assert.deepEqual(host.counts,{prepare:2,apply:2,acquire:3,directRepair:0});assert.equal(Object.hasOwn(host.authority.read().journal.receipts[0].operation.target,'sourceJSON'),false);
  if(history){
    for(let i=1;i<=6;i++){const result=await measured('Undo '+i,'production API',()=>host.session.undo());await measured('Undo '+i+' committed assertion','proof assertion',()=>assert.equal(result.committed,true));}
    const initial=(await measured('initial history checkpoint open','proof checkpoint open',()=>host.binding.codec.open(host.raw))).document;await measured('whole initial document equality','proof assertion',()=>assert.deepEqual(initial,original));
    for(let i=1;i<=6;i++){const result=await measured('Redo '+i,'production API',()=>host.session.redo());await measured('Redo '+i+' committed assertion','proof assertion',()=>assert.equal(result.committed,true));}
    const restored=(await measured('restored checkpoint open','proof checkpoint open',()=>host.binding.codec.open(host.raw))).document;await measured('whole restored document equality','proof assertion',()=>assert.deepEqual(restored,after));assert.deepEqual(host.counts,{prepare:2,apply:2,acquire:7,directRepair:0});
    const historyBefore=host.session.getSnapshot().history,saved=await measured('save current checkpoint','production API',()=>host.session.save());assert.equal(saved.ok,true);assert.deepEqual(JSON.parse(saved.checkpointJSON).document,after);assert.equal((await measured('reopen current checkpoint','production API',()=>host.session.open(saved.checkpointJSON))).ok,true);assert.deepEqual(host.session.getSnapshot().history,historyBefore);assert.deepEqual(host.counts,{prepare:2,apply:2,acquire:8,directRepair:0});
  }
  for(const row of inputs)assert.equal(sha(fs.readFileSync(path.join(root,row.file))),row.sha256,'Measured input changed: '+row.file);status='pass';log({stage:'pass',counts:host.counts,contentRevision:after.contentRevision,checkpointBytes:host.raw.length});
}catch(error){status='failed';failure={message:error.message,stack:error.stack};log({stage:'failed',...failure});process.exitCode=1;}
finally{host?.dispose();log({stage:'closed'});report();}
