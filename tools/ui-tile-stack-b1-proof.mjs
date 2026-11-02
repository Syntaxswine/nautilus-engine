// Fixed-object UI/B1 conformance only. No peer checkout, live host registration,
// native presentation or authority implementation is imported into the UI candidate.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readTileStackUISnapshot,workspaceUIBinding} from '../candidates/tile-stack/ui/contract.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const B1='4b0499cc776fcd85fdd415fa7344982b75fbf8fb',PUBLIC='cae053d3afcd2a10d2226e06b387db76ab102dd5';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(args,extra={})=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:64*1024*1024,...extra});
if(typeof vm.SourceTextModule!=='function')throw Error('Run with --experimental-vm-modules for immutable Git-object imports.');
const sources=new Map(),loaded=new Map();
for(const [commit,prefixes]of [[B1,['apps/editor','candidates/tile-stack','tests/fixtures/tile-stack-editor/b1.mjs']],[PUBLIC,['packages','vendor']]]){
 const files=git(['ls-tree','-r','--name-only',commit,'--',...prefixes]).toString().trim().split('\n').filter(file=>/\.m?js$/.test(file));
 const output=git(['cat-file','--batch'],{input:files.map(file=>commit+':'+file).join('\n')+'\n'});let offset=0;
 for(const file of files){
  const end=output.indexOf(10,offset),header=output.subarray(offset,end).toString(),match=/^([a-f0-9]{40}) blob ([0-9]+)$/.exec(header);
  if(!match)throw Error('Unexpected Git-object batch header: '+header);
  const size=Number(match[2]),bytes=output.subarray(end+1,end+1+size);offset=end+size+2;
  sources.set(commit+':'+file,{commit,path:file,bytes,gitBlob:match[1],sha256:sha(bytes)});
 }
}
const revision=file=>/^(packages|vendor)\//.test(file)?PUBLIC:B1;
const cache=new Map();
function moduleFor(file){
 const key=revision(file)+':'+file;if(cache.has(key))return cache.get(key);
 const row=sources.get(key);if(!row)throw Error('Missing immutable module: '+key);
 loaded.set(key,{commit:row.commit,path:row.path,bytes:row.bytes.length,gitBlob:row.gitBlob,sha256:row.sha256});
 const module=new vm.SourceTextModule(row.bytes.toString(),{identifier:key});
 cache.set(key,module);return module;
}
const entry=moduleFor('tests/fixtures/tile-stack-editor/b1.mjs');
await entry.link((specifier,from)=>{
 if(!specifier.startsWith('.'))throw Error('Unexpected nonrelative headless dependency: '+specifier);
 const file=path.posix.normalize(path.posix.join(path.posix.dirname(from.identifier.slice(41)),specifier));
 if(file.startsWith('../'))throw Error('Module escaped repository.');
 return moduleFor(file);
});
await entry.evaluate();
const H=entry.namespace,profiles=[],snapshots=[];
for(const profileId of ['aft-native-fifteen','nonuniform-fifteen']){
 const h=await H.harness({document:H.documentFixture(profileId)}),rows=[];let initialBinding;
 const inspect=label=>{
  const snapshot=h.session.getSnapshot(),read=readTileStackUISnapshot(snapshot,h.floors.state),binding=workspaceUIBinding(read);
  assert.equal(read,snapshot);assert.equal(Object.keys(snapshot.workspace).length,11);
  for(const field of ['sourceDocumentDigest','sourceConstraintsDigest','floorProfileDigest'])assert.match(snapshot.workspace[field],/^[a-f0-9]{64}$/);
  if(initialBinding===undefined)initialBinding=binding;else assert.equal(binding,initialBinding,label);
  snapshots.push({profileId,label,snapshot});
  rows.push({label,phase:snapshot.phase,revision:snapshot.revision,sourceDocumentDigest:snapshot.workspace.sourceDocumentDigest,sourceConstraintsDigest:snapshot.workspace.sourceConstraintsDigest,floorProfileDigest:snapshot.workspace.floorProfileDigest});
  return snapshot;
 };
 try{
  const initial=inspect('initial');
  if(profileId==='aft-native-fifteen'){
   await H.apply(h);const applied=inspect('after Apply');
   assert.notEqual(applied.workspace.sourceDocumentDigest,initial.workspace.sourceDocumentDigest);
   assert.notEqual(applied.workspace.sourceConstraintsDigest,initial.workspace.sourceConstraintsDigest);
   assert.equal((await h.session.undo()).committed,true);inspect('after Undo');
   assert.equal((await h.session.redo()).committed,true);inspect('after Redo');
  }
  const changed=structuredClone(h.session.getSnapshot());changed.workspace.floorProfileDigest='e'.repeat(64);
  readTileStackUISnapshot(changed,h.floors.state);assert.notEqual(workspaceUIBinding(changed),initialBinding);
  profiles.push({profileId,rows,immutableProfileChangeDetected:true});
 }finally{
  h.session.dispose();assert.equal(h.session.getSnapshot().resources.roots,0);h.floors.dispose();
 }
}
const report={scope:'Actual fixed B1 snapshot/UI-reader conformance, with resource-only B1 view stand-in and compatibility finishes. Not B1 authority acceptance, native presentation, live browser wiring or installed proof.',
 b1:B1,publicFoundation:PUBLIC,uiContractSha256:sha(fs.readFileSync(path.join(root,'candidates/tile-stack/ui/contract.js'))),
 profiles,snapshots,loadedSources:[...loaded.values()],allOwnedHarnessesDisposed:true};
const out=path.join(root,'artifacts/tile-stack-ui/b1-digests');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'actual-b1.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({profiles:profiles.length,snapshots:snapshots.length,workspaceFields:11,mutableSourceUpdatesKeepBinding:true,immutableProfileChangesDetected:true,allOwnedHarnessesDisposed:true,loadedModules:loaded.size}));
