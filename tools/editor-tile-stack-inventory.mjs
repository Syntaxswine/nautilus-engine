// Finite, read-only Git-object inventory. Writes only this role's review report.
// No peer worktree, runtime registration, browser, server, install or retained helper.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const refs=Object.freeze({
  editor:'ce3a1afa02f70a478356de45c64364bb460b9c25',
  ui:'5b0d06ce93977addd438d3ad43f887fcd3278817',
  artist:'a536cfec20e609a6c507f000791d8d7e71ae6d18',
  planner:'45ecaef16bb39424c8b885d53acb4371654b4fa0',
  acceptedHost:'9e996f96b69ba4867e643b558e9fdfeaf752d19e',
  adoptedMain:'2502646482218524fd5129641da769bb82462e4d',
  customDraft:'845f72389743ebc37e02b21183c49d523faf3180'
});
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{windowsHide:true,maxBuffer:16*1024*1024});
const sha=data=>createHash('sha256').update(data).digest('hex');
const object=(commit,file)=>git('show',commit+':'+file);
const paths=(commit,prefix)=>git('ls-tree','-r','--name-only',commit,'--',prefix).toString().trim().split('\n').filter(Boolean);
const inspect=(commit,file)=>{
  const bytes=object(commit,file),text=bytes.toString(),lines=text.split(/\r?\n/);
  return {path:file,bytes:bytes.length,sha256:sha(bytes),gitBlob:git('rev-parse',commit+':'+file).toString().trim(),
    exports:lines.flatMap((text,index)=>/^export /.test(text)?[{line:index+1,text:text.slice(0,240)}]:[])};
};
for(const commit of Object.values(refs))assert.equal(git('rev-parse','--verify',commit+'^{commit}').toString().trim(),commit);
const groups=[['editor','candidates/tile-stack/editor/'],['ui','candidates/tile-stack/ui/'],['artist','candidates/tile-stack/art/'],['planner','candidates/tile-stack/core/']];
const components=Object.fromEntries(groups.map(([role,prefix])=>[role,{commit:refs[role],files:paths(refs[role],prefix).map(file=>inspect(refs[role],file))}]));

const integration=JSON.parse(object(refs.editor,'docs/reviews/smart-tile-editor/integration-sources.json'));
assert.equal(integration.sourceCommit,refs.acceptedHost);assert.equal(integration.files.length,15);
const host=integration.files.map(row=>{
  const bytes=object(refs.editor,row.path);
  assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);
  assert.ok(bytes.equals(object(refs.acceptedHost,row.path)),'Reviewed host differs: '+row.path);
  assert.ok(bytes.equals(object(refs.adoptedMain,row.path)),'Adopted main differs: '+row.path);
  return inspect(refs.editor,row.path);
});
const fences=[
  'docs/reviews/smart-tile-editor/sources.json',
  'docs/reviews/smart-tile-editor/integration-sources.json',
  'tools/check-smart-tile-editor-source.mjs','tools/check-tile-c2a-source.mjs',
  'tools/check-tile-visuals-source.mjs','tools/distribution.mjs','tools/build.mjs',
  'tools/verify-smart-tile-editor-review.mjs','.github/workflows/check.yml'
].map(file=>{
  return inspect(refs.editor,file);
});
const mustStay=['packages/tiles-core','packages/tile-visuals','packages/windows-authoring/journal.js','packages/floor-navigation'];
assert.equal(git('diff','--name-only',refs.adoptedMain,refs.editor,'--',...mustStay).toString(),'','Public/runtime baseline differs.');
const proposedProtectedChanges=[
  ['apps/editor/smart-tile/checkpoint.js','One shared codec factory; unchanged v1 wrappers plus explicit v2 policy and complete-target interpretation.'],
  ['apps/editor/smart-tile/authority.js','Inject that codec; preserve one final synchronous writer fence, whole-record CAS and same-ID recovery.'],
  ['apps/editor/smart-tile/storage.js','Inject matching codec and explicit v2 key policy; preserve v1 namespace and last-write fence.'],
  ['apps/editor/smart-tile/session.js','Explicit profile hooks around the one existing consumer, journal, preparation, context, target and snapshot.'],
  ['apps/editor/smart-tile/input.js','Profile-specific draft construction inside the existing pointer owner; retain all quarantine rules.'],
  ['apps/editor/smart-tile/presentation.js','One actual public geometry acquisition with optional Artist appearance and native-height visibility bindings.']
].map(([file,reason])=>({file,reason,currentSha256:host.find(row=>row.path===file).sha256}));
const report={kind:'nautilus-editor-tile-stack-refactor-inventory',version:1,status:'proposal-only',
  authorization:'Historical inventory of the fixed Gate A inputs. Subsequent B1 implementation authorization is documented separately; this report does not grant it.',refs,components,
  protectedHost:{sameBytesAt:[refs.editor,refs.acceptedHost,refs.adoptedMain],files:host},
  unchangedFencesAndOrchestration:fences,unchangedRuntimePaths:mustStay,proposedProtectedChanges,
  proposedUnchangedHost:host.filter(row=>!proposedProtectedChanges.some(change=>change.file===row.path)).map(row=>row.path),
  caveats:[
    'Fixed UI and Artist inputs are review references, pending focused builder corrections relayed by Architect.',
    'This reads source and records exact bytes; it does not execute or accept the functional planner or components.',
    'One complete tileBundle plus constraints target must govern validation, adoption, receipts, history and recovery.',
    'Current v1 compatibility and initial v2 policy proofs do not establish live fifteen-floor workflow acceptance.',
    'No browser, server, install, port, background process or retained helper is created.'
  ]};
const directory=path.join(root,'docs/reviews/tile-stack/editor/gate-b');fs.mkdirSync(directory,{recursive:true});
const target=path.join(directory,'inventory.json');
if(fs.existsSync(target))assert.equal(fs.lstatSync(target).isSymbolicLink(),false);
fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,componentFiles:Object.fromEntries(Object.entries(components).map(([k,v])=>[k,v.files.length])),unchangedHostFiles:host.length,proposedProtectedChanges:proposedProtectedChanges.length,unchangedFences:fences.length,output:path.relative(root,target).replaceAll('\\','/')}));
