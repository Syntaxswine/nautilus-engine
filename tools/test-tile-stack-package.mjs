import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {distribution,moduleClosure,packProfile,root} from './distribution.mjs';

export const TILE_STACK_ACCEPTED_SOURCE='45ecaef16bb39424c8b885d53acb4371654b4fa0';
const stackDirectory='packages/tile-stack-core/',stackEntry='./'+stackDirectory+'index.js';
const stackRuntime=['budget.js','contracts.js','geometry.js','ids.js','index.js'].map(file=>stackDirectory+file);
const sourceHeader='// Private Gate A host planner. No public registration, matching, CAS or history.';
const rootHeader='// Optional headless stack planner. Public core owns matching and repair; host owns commits.';
const sha=value=>createHash('sha256').update(value).digest('hex');
const inputFiles={
  'fixtures.mjs':'candidates/tile-stack/core/fixtures.mjs',
  'planner.test.mjs':'tests/tile-stack-core-planner.test.mjs',
  'contracts.test.mjs':'tests/tile-stack-core-contracts.test.mjs',
  'scenarios.mjs':'tools/tile-stack-core-scenarios.mjs',
  'measure.mjs':'tools/tile-stack-core-measure.mjs',
  'node-probe.mjs':'tools/tile-stack-core-node-probe.mjs',
  'oracle.py':'tools/tile-stack-core-oracle.py'
};
const firstFalsifiers=['tall-extra-reservation-forged-success-flags','missing-one-crossing-forged-success-flags','positive-returned-old-empty-bundle','next-managed-105-to-104-with-recomputed-digest','finish-returned-no-obligations'];
function gitObject(file){
  const child=childProcess.spawnSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show',TILE_STACK_ACCEPTED_SOURCE+':'+file],{windowsHide:true,timeout:30000,maxBuffer:24*1024*1024});
  if(child.error)throw child.error;assert.equal(child.status,0,child.stderr?.toString());return child.stdout;
}

// Only import specifiers/fixture locations change. The accepted test bodies,
// all18 scenario inputs/expectations and the complete Python oracle stay fixed.
// Exported for Root's static draft inspection before registration, not as a
// private/candidate execution mode of the installed proof.
export function tileStackProofInputs(targets,read=gitObject){
  for(const key of ['core','stack','contracts','ids'])assert.equal(typeof targets[key],'string');
  return Object.entries(inputFiles).map(([name,file])=>{
    const original=Buffer.from(read(file));let code=original.toString('utf8');const adaptations=[];
    const replace=(from,to,count=1)=>{assert.equal(code.split(from).length-1,count,'Unexpected accepted import count: '+file+' '+from);code=code.replaceAll(from,to);adaptations.push({from,to,count});};
    if(name==='fixtures.mjs')replace("'./contracts.js'",JSON.stringify(targets.stack));
    if(name==='planner.test.mjs'){
      replace("'../candidates/tile-stack/core/index.js'",JSON.stringify(targets.stack));
      replace("'../candidates/tile-stack/core/fixtures.mjs'","'./fixtures.mjs'");
      replace("process.env.NAUTILUS_STACK_CORE_IMPORT??'../packages/tiles-core/index.js'",JSON.stringify(targets.core));
      replace("'../candidates/tile-stack/core/ids.js'",JSON.stringify(targets.ids));
    }
    if(name==='contracts.test.mjs')replace("'../candidates/tile-stack/core/contracts.js'",JSON.stringify(targets.contracts));
    if(name==='scenarios.mjs'){
      replace("'../candidates/tile-stack/core/index.js'",JSON.stringify(targets.stack));
      replace("'../candidates/tile-stack/core/fixtures.mjs'","'./fixtures.mjs'");
    }
    if(name==='measure.mjs'){
      replace("'./tile-stack-core-scenarios.mjs'","'./scenarios.mjs'");
      replace("process.env.NAUTILUS_STACK_CORE_IMPORT??'../packages/tiles-core/index.js'",JSON.stringify(targets.core));
    }
    if(name==='node-probe.mjs'){
      replace("process.env.NAUTILUS_STACK_CORE_IMPORT??'../packages/tiles-core/index.js'",JSON.stringify(targets.core));
      replace("'../candidates/tile-stack/core/index.js'",JSON.stringify(targets.stack));
      replace("'../candidates/tile-stack/core/fixtures.mjs'","'./fixtures.mjs'");
    }
    if(name!=='oracle.py'){
      assert.equal(code.includes('NAUTILUS_STACK_CORE_IMPORT'),false,'No environment-selected core/fallback.');
      assert.equal(code.includes('candidates/tile-stack/core/'),false,'No private runtime import.');
      assert.equal(code.includes('../packages/'),false,'No unmapped source import.');
    }else assert.equal(code,original.toString('utf8'),'Independent oracle must remain byte-identical.');
    const bytes=Buffer.from(code);
    return {name,bytes,source:{pin:TILE_STACK_ACCEPTED_SOURCE,path:file,originalSha256:sha(original),adaptedSha256:sha(bytes),adaptations,
      role:name==='contracts.test.mjs'?'three internal contract checks (explicit whitebox)':name==='planner.test.mjs'?'25 accepted tests:24 public planner checks plus one verified physical ids.js allocator whitebox check':'deterministic fixture/proof tooling; no copied planner runtime'}};
  });
}
function counters(tap,expected){
  const counts=Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(key=>{const values=[...tap.matchAll(new RegExp('^# '+key+' (\\d+)\\s*$','gm'))];assert.equal(values.length,1,'Require one complete '+key+' TAP summary.');return [key,Number(values[0][1])];}));
  assert.equal(counts.tests,expected);assert.equal(counts.pass,expected);for(const key of ['fail','cancelled','skipped','todo'])assert.equal(counts[key],0);return counts;
}
function oracleSummary(data){
  assert.equal(data.schemaVersion,2);assert.equal(data.results.length,12);assert.equal(data.envelopeCases,18);assert.equal(data.mutationControls,16);assert.equal(data.mutations.length,16);
  assert.ok(data.mutations.every(m=>m.rejected===true&&m.inputAndExpectationUnchanged===true));
  for(const name of firstFalsifiers)assert.equal(data.mutations.filter(m=>m.name===name&&m.rejected).length,1,'Missing original falsifier '+name);
  const stronger=data.results.find(r=>r.name==='stronger-top-only');assert.ok(stronger);assert.deepEqual(stronger.managedClearanceCounts,{'2':91,'3':14});assert.equal(stronger.actualTargetChecked,true);
  return {schemaVersion:2,intervalCases:12,envelopeCases:18,mutationControls:16,originalFalsifiers:firstFalsifiers,allInputsAndExpectationsFixed:true,completeCoherentTargets:data.mutations.filter(m=>m.completeCoherentTarget).length,strongerTop:{actualTargetChecked:true,managedClearanceCounts:stronger.managedClearanceCounts}};
}

export function testTileStackPackage(){
  const output=path.join(root,'artifacts/tile-stack-integration/package-proof');fs.mkdirSync(output,{recursive:true});
  fs.rmSync(path.join(output,'installed-package-report.json'),{force:true});
  // Deliberately before packProfile, scratch creation, fixture staging or imports.
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.equal(manifest.exports?.['./tiles/stack'],stackEntry,'TILE_STACK_REGISTRATION_PENDING: actual ./tiles/stack export is required; no candidate overlay/fallback is available.');
  const normal=distribution('core');assert.equal(normal.name,'@nautilus-engine/core');assert.equal(normal.exports['./tiles/stack'],stackEntry);assert.equal(normal.exports['./tiles'],'./packages/tiles-core/index.js');
  assert.ok(normal.files.includes(stackDirectory+'api.d.ts'),'Stack declarations must be actually whitelisted.');
  assert.ok(!normal.files.some(file=>/^(?:candidates\/|tests\/|artifacts\/|tools\/)|^packages\/tiles-core\/(?:candidate-v2|v2-|composition-|planar-|render-(?:model|plan)|zero-exposure)|^packages\/tiles-core\/.*-v2\.schema\.json$/.test(file)),'Private C2/v2/proof inputs must remain outside the actual package.');
  const closure=moduleClosure([stackEntry.slice(2)]);assert.deepEqual(closure,stackRuntime.slice().sort());
  assert.deepEqual(normal.files.filter(f=>f.startsWith(stackDirectory)&&/\.m?js$/.test(f)),stackRuntime.slice().sort());
  const publicClosure=moduleClosure(['packages/tiles-core/index.js']);assert.equal(publicClosure.length,14);assert.equal(publicClosure.reduce((sum,file)=>sum+fs.statSync(path.join(root,file)).size,0),91604);
  const scratch=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'nautilus-registered-tile-stack-')),consumer=path.join(scratch,'consumer'),sourceProof=path.join(scratch,'source-proof'),installedProof=path.join(consumer,'proof'),shared=path.join(scratch,'proof-tools');
  const records=[],deadline=Date.now()+10*60*1000,sourceObjects=new Map(),nodeEvents=path.join(output,'node-processes.jsonl');let result,failure;
  const lifecycle=path.join(shared,'process-lifecycle.mjs');
  const env={...process.env,NODE_OPTIONS:'--import='+pathToFileURL(lifecycle).href,NAUTILUS_STACK_PROCESS_RECORD:nodeEvents,NAUTILUS_STACK_PROCESS_OWNER:'Architect, Nautilus Engine',NAUTILUS_STACK_PROCESS_PURPOSE:'registered stack package proof'};
  for(const key of ['NODE_TEST_CONTEXT','NODE_PATH','NAUTILUS_STACK_CORE_IMPORT'])delete env[key];
  function run(executable,args,cwd,purpose,filename=null,options={}){
    const remaining=deadline-Date.now();assert.ok(remaining>0,'Complete installed stack proof exceeded its 10-minute deadline.');
    const startedAt=new Date().toISOString(),child=childProcess.spawnSync(executable,args,{...options,cwd,encoding:'utf8',windowsHide:true,env:{...env,NAUTILUS_STACK_PROCESS_PURPOSE:purpose,...options.env},timeout:Math.min(remaining,120000),maxBuffer:24*1024*1024});
    records.push({owner:'Architect, Nautilus Engine',project:'Nautilus Engine',purpose,executable:path.basename(executable),pid:child.pid??null,startedAt,endedAt:new Date().toISOString(),foreground:true,endCondition:'bounded synchronous foreground exit',stopMethod:'owning process handle waited to exit',status:child.status,signal:child.signal??null,error:child.error?.code??null,exited:child.status!==null||child.signal!==null&&child.signal!==undefined,ports:[]});
    if(filename)fs.writeFileSync(path.join(output,filename),(child.stdout??'')+(child.stderr??''));
    if(child.error)throw child.error;assert.equal(child.status,0,(child.stdout??'')+(child.stderr??''));return child.stdout;
  }
  const read=file=>{if(!sourceObjects.has(file))sourceObjects.set(file,Buffer.from(run('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show',TILE_STACK_ACCEPTED_SOURCE+':'+file],root,'read immutable accepted proof input '+file)));return sourceObjects.get(file);};
  try{
    fs.writeFileSync(nodeEvents,'');
    for(const dir of [consumer,sourceProof,installedProof,shared])fs.mkdirSync(dir,{recursive:true});
    fs.copyFileSync(path.join(root,'tests/fixtures/tile-stack-registration/process-lifecycle.mjs'),lifecycle);
    const runtime=[];
    for(const file of [...stackRuntime,stackDirectory+'api.d.ts']){
      const original=read(file.replace(stackDirectory,'candidates/tile-stack/core/')),actual=fs.readFileSync(path.join(root,file));
      let expected=original;
      if(file===stackDirectory+'index.js'){assert.ok(original.toString('utf8').startsWith(sourceHeader+'\n'));expected=Buffer.from(original.toString('utf8').replace(sourceHeader,rootHeader));}
      assert.deepEqual(actual,expected,'Only the exact documented index header adaptation is permitted: '+file);
      runtime.push({path:file,sha256:sha(actual),bytes:actual.length,acceptedSha256:sha(original),adaptation:file.endsWith('/index.js')?{from:sourceHeader,to:rootHeader}:null});
    }
    for(const file of publicClosure)assert.deepEqual(fs.readFileSync(path.join(root,file)),read(file),'Public 14-module v1 tile closure changed: '+file);
    const npmCli=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')].find(file=>file&&path.basename(file)==='npm-cli.js'&&fs.existsSync(file));assert.ok(npmCli,'Use Node with npm installed.');
    // Use the unchanged real packProfile implementation. Its synchronous npm
    // command gets the same timeout/recording as our other foreground children;
    // package bytes, manifests, export tables and compiler APIs are not replaced.
    const originalExec=childProcess.execFileSync;let packed;
    try{childProcess.execFileSync=(executable,args,options)=>run(executable,args,options.cwd,'actual packProfile(core) npm pack','pack.log',options);syncBuiltinESMExports();packed=packProfile('core');}
    finally{childProcess.execFileSync=originalExec;syncBuiltinESMExports();}
    assert.equal(packed.name,normal.name);
    fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'registered-nautilus-stack-package-proof',private:true,type:'module'}));
    run(process.execPath,[npmCli,'install','--offline','--ignore-scripts','--package-lock=false','--no-audit','--no-fund','--cache',path.join(scratch,'npm-cache'),packed.file],consumer,'offline install actual core archive','install.log');
    const installedRoot=path.join(consumer,'node_modules','@nautilus-engine','core'),installedManifest=JSON.parse(fs.readFileSync(path.join(installedRoot,'package.json'),'utf8'));
    assert.deepEqual(installedManifest.exports,normal.exports);assert.equal(installedManifest.name,normal.name);assert.equal(installedManifest.version,manifest.version);
    const packageFiles=normal.files.map(file=>{const actual=fs.readFileSync(path.join(installedRoot,file)),expected=fs.readFileSync(path.join(root,file));assert.deepEqual(actual,expected,'Installed package bytes differ: '+file);return {path:file,sha256:sha(actual),bytes:actual.length};});
    const provenance=JSON.parse(fs.readFileSync(path.join(installedRoot,'package-provenance.json'),'utf8'));assert.equal(provenance.profile,'core');assert.deepEqual(provenance.files,packageFiles);
    const packageProof=path.join(consumer,'package-proof.mjs');fs.copyFileSync(path.join(root,'tests/fixtures/tile-stack-registration/package-proof.mjs'),packageProof);
    const identity=JSON.parse(run(process.execPath,[packageProof,installedRoot],consumer,'verify physical public stack entry','installed-entry.log'));assert.equal(identity.registered,true);assert.equal(identity.publicStack,true);assert.equal(identity.privateFallback,false);
    const adapted={};
    for(const [mode,destination,targets]of [
      ['source',sourceProof,{core:pathToFileURL(path.join(root,'packages/tiles-core/index.js')).href,stack:pathToFileURL(path.join(root,stackDirectory+'index.js')).href,contracts:pathToFileURL(path.join(root,stackDirectory+'contracts.js')).href,ids:pathToFileURL(path.join(root,stackDirectory+'ids.js')).href}],
      ['installed',installedProof,{core:'@nautilus-engine/core/tiles',stack:'@nautilus-engine/core/tiles/stack',contracts:pathToFileURL(path.join(installedRoot,stackDirectory+'contracts.js')).href,ids:pathToFileURL(path.join(installedRoot,stackDirectory+'ids.js')).href}]
    ]){
      adapted[mode]=tileStackProofInputs(targets,read).map(input=>{fs.writeFileSync(path.join(destination,input.name),input.bytes);return {...input.source,file:input.name};});
    }
    const suites=[];
    for(const [name,count,whitebox]of [['planner',25,1],['contracts',3,3]]){
      // Run each unchanged suite in one foreground process. This preserves all
      // assertions while preventing a timed-out runner from orphaning workers.
      const log=run(process.execPath,['--test','--experimental-test-isolation=none','--test-reporter=tap',name+'.test.mjs'],installedProof,'accepted '+name+' suite on actual installed package','installed-'+name+'.tap');
      suites.push({suite:name,...counters(log,count),whiteboxChecks:whitebox,qualification:whitebox?'Explicit verified physical package internals; not additional public APIs.':null});
    }
    assert.equal(suites.reduce((n,s)=>n+s.tests,0),28);
    const probes={};
    for(const [mode,location]of [['source',sourceProof],['installed',installedProof]]){
      probes[mode]=JSON.parse(run(process.execPath,['node-probe.mjs'],location,mode+' headless public stack import','node-probe-'+mode+'.log'));assert.equal(probes[mode].forbiddenDependencyAccesses,0);assert.equal(probes[mode].crossings,105);
      run(process.execPath,['measure.mjs',path.join(output,mode+'.json')],location,mode+' accepted 18-scenario replay',mode+'-measure.log');
    }
    const sourceEvidence=JSON.parse(fs.readFileSync(path.join(output,'source.json'),'utf8')),installedEvidence=JSON.parse(fs.readFileSync(path.join(output,'installed.json'),'utf8'));assert.equal(sourceEvidence.cases.length,18);assert.deepEqual(sourceEvidence,installedEvidence,'Promoted Root and actual installed public stack semantics differ.');
    const oraclePath=path.join(shared,'oracle.py');fs.writeFileSync(oraclePath,read(inputFiles['oracle.py']));const oracles={};
    for(const mode of ['source','installed']){
      run(process.platform==='win32'?'python':'python3',['-B',oraclePath,path.join(output,mode+'.json'),path.join(output,mode+'-oracle.json')],shared,mode+' independent fixed Decimal oracle',mode+'-oracle.log');
      oracles[mode]=JSON.parse(fs.readFileSync(path.join(output,mode+'-oracle.json'),'utf8'));oracleSummary(oracles[mode]);
    }
    assert.deepEqual(oracles.source,oracles.installed,'Independent oracle source/installed outcomes differ.');
    result={schemaVersion:1,status:'pass',identity:'actual declared @nautilus-engine/core/tiles/stack installed via unchanged packProfile(core); promoted Root source replay',registered:true,privateRuntimeCopied:false,privateFallback:false,sourcePin:TILE_STACK_ACCEPTED_SOURCE,packed,physicalPublicEntry:identity,runtime,publicTiles:{modules:14,bytes:91604,files:publicClosure},packageFiles,proofInputs:adapted,proofDrivers:['process-lifecycle.mjs','package-proof.mjs'].map(file=>({path:'tests/fixtures/tile-stack-registration/'+file,sha256:sha(fs.readFileSync(path.join(root,'tests/fixtures/tile-stack-registration',file)))})),suites,headless:probes,semanticCases:18,sourceInstalledEqual:true,independentOracleEqual:true,independentOracle:oracleSummary(oracles.source),historicalIdentity:'Accepted scenario evidence preserves its original private-candidate identity text byte-for-byte; execution identity and imports are the real registered package above.',scope:'Headless bounded rectangle stack planning plus existing public-v1 repair. Host CAS/history/persistence, rendering, C2/v2, floor separation and game adoption remain outside this proof.'};
  }catch(error){failure=error;}
  finally{
    const resolved=fs.realpathSync(scratch),temp=fs.realpathSync(os.tmpdir());assert.equal(resolved,path.resolve(scratch));assert.equal(path.dirname(resolved),temp);assert.ok(path.basename(resolved).startsWith('nautilus-registered-tile-stack-'));assert.notEqual(resolved,temp);
    const events=(fs.existsSync(nodeEvents)?fs.readFileSync(nodeEvents,'utf8'):'').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)),starts=events.filter(e=>e.event==='start'),exits=events.filter(e=>e.event==='exit'),allNodeChildrenExited=starts.every(s=>exits.some(e=>e.pid===s.pid&&e.observedStartAt===s.observedStartAt));
    fs.rmSync(resolved,{recursive:true,force:true});assert.equal(fs.existsSync(resolved),false);
    const cleanup={scratchPath:resolved,removed:true,consumerRemoved:!fs.existsSync(consumer),sourceProofRemoved:!fs.existsSync(sourceProof),allForegroundChildrenExited:records.every(r=>r.exited),allObservedNodeChildrenExited:allNodeChildrenExited,nodeLifetimes:starts.length,backgroundHelpers:0,browsers:0,servers:0,ports:[],retainedHelpers:0,processAccountingScope:'run()-owned foreground children and preload-observed Node lifetimes. Existing bounded synchronous module-reference parser subprocesses are outside this ledger.',packArtifacts:'Normal archive/provenance/stage artifacts remain under artifacts/distribution; no process or service is retained.'};
    fs.writeFileSync(path.join(output,'cleanup.json'),JSON.stringify({cleanup,processes:records,nodeProcesses:events},null,2)+'\n');
    if(result&&!failure){assert.equal(cleanup.allForegroundChildrenExited,true);assert.equal(cleanup.allObservedNodeChildrenExited,true);result.cleanup=cleanup;result.processes=records;fs.writeFileSync(path.join(output,'installed-package-report.json'),JSON.stringify(result,null,2)+'\n');}
  }
  if(failure)throw failure;
  console.log(JSON.stringify({status:result.status,registered:true,privateRuntimeCopied:false,tests:28,semanticCases:18,independentOracle:result.independentOracle,cleanup:result.cleanup},null,2));return result;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)testTileStackPackage();
