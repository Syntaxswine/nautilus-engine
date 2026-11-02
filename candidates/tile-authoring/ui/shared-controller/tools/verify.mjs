import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {moduleReferencesBatch,resolveModuleFile} from '../../../../../tools/module-references.mjs';

const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(here,'../../../..');
const prefix='candidates/tile-authoring/ui/shared-controller/';
const baseline='938ea1f78d305d86c163f9e4e84033236916e897';
const rootPin='648cad33c3e0e1f36b4313b1492b1a750492ece4';
const rootTree='168f35cbddcc8115269ea886475a14511c4ecdac';
const rootParent='1e6a97b67c57917160db89db34cbae9e4e46f90c';
const panelHash='81e0d2ad2aaa52c01b9d1d3ed172b5bef951b4f8e7440c8218e591f787425db4';
const panelBlob='5e061e9ef0ad643ad5b77b238f751734a4e6849f';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=args=>execFileSync('git',['-c','core.longpaths=true',...args],{cwd:root,windowsHide:true,maxBuffer:32e6});
const lines=bytes=>bytes.toString('utf8').trim().split(/\r?\n/).filter(Boolean);
const read=file=>fs.readFileSync(path.join(here,file));
const indexed=process.argv.includes('--index');
function checkIndex(file,bytes){if(indexed)assert.ok(git(['show',':'+prefix+file]).equals(bytes),'Exact indexed bytes: '+file);}

assert.equal(git(['rev-parse',rootPin+'^{tree}']).toString().trim(),rootTree);
assert.equal(git(['rev-parse',rootPin+'^']).toString().trim(),rootParent);
assert.equal(git(['rev-parse',rootPin+':apps/editor/tile-authoring/ui/panel.js']).toString().trim(),panelBlob);
for(const file of lines(git(['diff','--name-only',baseline])))assert.ok(file.startsWith(prefix),'Protected path changed: '+file);
for(const old of ['candidates/tile-authoring/ui/c2-host-bridge','candidates/tile-authoring/ui/c2-read-pairing']){
 assert.equal(git(['diff',baseline,'--',old]).length,0,'Preserve every old file and receipt: '+old);
 assert.equal(git(['ls-files','--others','--exclude-standard','--',old]).length,0);
}
const baselineSource=JSON.parse(git(['show',baseline+':candidates/tile-authoring/ui/c2-read-pairing/source.json']));
for(const row of baselineSource.rootInputs)assert.equal(sha(fs.readFileSync(path.join(root,row.path))),row.sha256,'Protected normal runtime: '+row.path);

const vendor=JSON.parse(read('vendor/source.json'));
assert.equal(vendor.root,rootPin);assert.equal(vendor.protectedBaseline,baseline);assert.equal(vendor.inputs.length,4);
const originals=new Set();
for(const row of vendor.inputs){
 assert.equal(row.commit,rootPin);
 const bytes=read(row.vendored),origin=git(['show',row.commit+':'+row.path]);
 assert.ok(bytes.equals(origin),'Original Git-object bytes: '+row.vendored);
 assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);checkIndex(row.vendored,bytes);originals.add(row.vendored);
}
const original=read('vendor/root648/panel.js');assert.equal(sha(original),panelHash);
const equivalence=vendor.previousRootProvenance;
assert.equal(equivalence.commit,baseline);assert.equal(equivalence.equivalentReviewedRootCommit,rootPin);assert.equal(equivalence.sha256,panelHash);
assert.ok(git(['show',baseline+':'+equivalence.path]).equals(original),'938e coordinator is exactly the committed reviewed Root panel');
const expectedChanges=[
 {from:'rectangleSpec,onError=()=>{}}={})',to:'rectangleSpec,onError=()=>{},attachCoordinator=null}={})'},
 {from:'  const commands=createTileAuthoringCommands({tiles,authoring})',to:"  if(attachCoordinator!==null&&typeof attachCoordinator!=='function')throw issue('UI_ATTACHMENT_FACTORY_REQUIRED','Supply an explicit borrowed coordinator attachment factory.');\n  const commands=createTileAuthoringCommands({tiles,authoring})"},
 {from:'controller=createTileAuthoringUIController(binding,{onView:render,onPending:updateGates,onError:showError})',to:'controller=(attachCoordinator??createTileAuthoringUIController)(binding,{onView:render,onPending:updateGates,onError:showError})'}
];
assert.deepEqual(vendor.mountContinuation.changes,expectedChanges);
let semantic=original.toString('utf8');
for(const {from,to} of expectedChanges){assert.equal(semantic.split(from).length,2,'One semantic mount anchor');semantic=semantic.replace(from,to);}
assert.ok(read('proposal/root-panel.semantic.js.txt').equals(Buffer.from(semantic)));
assert.equal(vendor.mountContinuation.semanticSha256,sha(Buffer.from(semantic)));
const continued='// Explicit private Root mount continuation; default algorithm unchanged.\n'+semantic.replace("from './commands.js'","from './vendor/root648/commands.js'");
assert.ok(read('c1-mount.mjs').equals(Buffer.from(continued)),'Only three mount edits, import relocation and provenance comment');
const controllerStart=original.indexOf('export function createTileAuthoringUIController('),controllerEnd=original.indexOf('\n// One explicit attachment',controllerStart);
assert.ok(controllerStart>0&&controllerEnd>controllerStart);
assert.ok(read('c1-mount.mjs').includes(original.subarray(controllerStart,controllerEnd)),'Actual Root algorithm unchanged');

// Apply the proposed patch only to this disposable, explicitly isolated scratch
// tree. Git discovery is checked before apply; the actual Root tree is untouched.
const proof=path.join(root,'artifacts','ui-shared-controller-patch-proof');
const target=path.join(proof,'apps/editor/tile-authoring/ui/panel.js');
assert.ok(target.startsWith(path.join(root,'artifacts')+path.sep));
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,original);
const env={...process.env,GIT_CEILING_DIRECTORIES:path.dirname(proof),GIT_DISCOVERY_ACROSS_FILESYSTEM:'0'};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR'])delete env[key];
const probe=spawnSync('git',['rev-parse','--show-toplevel'],{cwd:proof,env,windowsHide:true,encoding:'utf8'});
assert.notEqual(probe.status,0,'Scratch must not discover the real repository');
const scratchGit=args=>execFileSync('git',['-c','core.autocrlf=false',...args],{cwd:proof,env,windowsHide:true});
const patchFile=path.join(here,'proposal/root-mount-opt-in.patch');
const stat=scratchGit(['apply','--numstat',patchFile]).toString().trim().split('\t');
assert.equal(stat.length,3);assert.equal(stat[2],'apps/editor/tile-authoring/ui/panel.js');
scratchGit(['apply','--check',patchFile]);scratchGit(['apply',patchFile]);
assert.ok(fs.readFileSync(target).equals(Buffer.from(semantic)),'Proposed patch yields the exact semantic continuation');

const files=[],modules=[];
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,entry.name),rel=path.relative(here,file).replaceAll('\\','/');
 if(entry.isDirectory()){if(rel!=='evidence')visit(file);continue;}
 if(rel==='source.json')continue;
 const bytes=fs.readFileSync(file);
 if(!originals.has(rel))files.push({path:rel,bytes:bytes.length,sha256:sha(bytes)});
 if(/\.(mjs|js)$/.test(rel))modules.push({filename:file,source:bytes.toString('utf8')});
}}
visit(here);files.sort((a,b)=>a.path.localeCompare(b.path));
let relativeEdges=0,browserSourceEdges=0;
for(const module of moduleReferencesBatch(modules))for(const specifier of module.specifiers){
 if(specifier==='/' + prefix + 'tests/browser-fixture.mjs'&&module.filename===path.join(here,'tools/browser-review.mjs')){
  assert.ok(fs.statSync(path.join(root,prefix,'tests/browser-fixture.mjs')).isFile(),'Exact same-source DOM fixture');browserSourceEdges++;continue;
 }
 const dependency=resolveModuleFile(specifier,module.filename,{root});
 if(dependency===null)assert.ok(specifier.startsWith('node:'),'No package/network fallback: '+specifier);
 else{assert.ok(fs.statSync(dependency).isFile(),'Dependency exists: '+specifier);relativeEdges++;}
}
const hub=read('hub.mjs').toString('utf8'),mount=read('mount.mjs').toString('utf8');
assert.equal([...hub.matchAll(/\bcreateTileAuthoringUIController\(/g)].length,1,'One exact Root factory call');
assert.ok(hub.includes("from './vendor/root648/panel.js'"));assert.ok(hub.includes('overlay:view.overlay'));
assert.doesNotMatch(hub,/\.prepare\s*\(|\.apply\s*\(|forAuthoringAttempt\s*\(|randomUUID|createHash|cancelPendingPreparation/,'No executor, credit source or cancellation alias');
assert.equal([...mount.matchAll(/attachCoordinator:attach/g)].length,2,'Both real panels borrow the same attachment factory');
assert.equal([...mount.matchAll(/hub\.attach\(/g)].length,1,'One callback-fanout adapter to the same hub; no second controller');
const resource=read('resource-control.mjs').toString('utf8');
assert.ok(resource.includes("button.dataset.action='load-selected-artwork'"));assert.ok(resource.includes('await loadSelected.call(resourceActions,read)'));
assert.doesNotMatch(resource,/\.prepare\s*\(|\.apply\s*\(|allocateIds|collectCommand|discardDraft|createTileAuthoringUIController|createHash|JSON\.parse/,'Load is resource presentation only');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
assert.ok(!JSON.stringify(pkg.exports).includes('shared-controller'));assert.ok(pkg.files.every(file=>!file.startsWith(prefix)));

if(process.argv.includes('--record'))fs.writeFileSync(path.join(here,'source.json'),JSON.stringify({
 kind:'private-one-Root-controller-UI-attachment-hub',version:1,baseline,branch:'codex/tile-authoring-ui-shared-controller',
 reviewedRoot:{commit:rootPin,tree:rootTree,parent:rootParent,panelBlob,panelSha256:panelHash},
 originalManifest:'vendor/source.json',files,protectedNormalRuntimeInputs:baselineSource.rootInputs,
 consumers:{library:'Private explicit Root opt-in mount; proposed semantic patch only',overlay:{commit:baseline,path:'candidates/tile-authoring/ui/c2-read-pairing/component.mjs',status:'Unchanged, including intrinsic producer and readonly lookup'}},
 lifetime:'One actual Root controller/subscription until last attachment closes; later attachment is a new UI lifetime',
 bindings:{actualSessionCorePreparation:'UNBOUND',native:'UNBOUND',browserWideEditingMeter:'UNBOUND',pendingPreparationCancellation:'Separate reviewed SAME-session helper; no alias or eighth service verb',resourceActions:'Optional Root-owned loadSelected(actualIssuedRead); actual d8/native RESOURCE work remains UNBOUND'},
 proof:{actualRootController:true,actualC1AndC2DOM:true,workbenchSessionReadinessHistory:'Protocol fixtures',hostApply:false,native:false,editingMeter:false,wal:false},
 normalBuildAndNavigationUnchanged:true,noPush:true,retainedHelpers:[]
},null,2)+'\n');
const source=JSON.parse(read('source.json'));assert.deepEqual(source.files,files);assert.equal(source.reviewedRoot.commit,rootPin);
for(const row of files)checkIndex(row.path,read(row.path));checkIndex('source.json',read('source.json'));
const summary={originalInputs:vendor.inputs.length,ownedFiles:files.length,modules:modules.length,relativeEdges,browserSourceEdges,reviewedRoot:rootPin,
 rootPanelSha256:panelHash,exactRootAlgorithm:true,proposedPatchAppliedInIsolatedScratch:true,semanticMountEdits:3,
 prior938eAndA4AllBytesAndReceiptsUnchanged:true,normalRuntimeAndDistributionUnchanged:true,indexBytesVerified:indexed,
 proof:{hostApply:false,native:false,editingMeter:false,wal:false},noPush:true};
if(process.argv.includes('--receipt'))fs.writeFileSync(path.join(here,'evidence','provenance.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
