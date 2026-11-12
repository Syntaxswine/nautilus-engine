// Fixed reviewed C1 delivery; actual fresh browser workflow remains a gate.
// Import is inert. Calling the model reads current inputs; it never writes/launches.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {sharedArtworkBuildBytes} from './shared-artwork-registration.mjs';
import {trainBuildBytes} from './train-registration.mjs';
import {playerSetupRootBytes} from './player-setup-registration.mjs';

export const TILE_AUTHORING_REVIEW_STATUS='fixed-source-workflow-candidate';
export const TILE_AUTHORING_REVIEW_LINEAGE=Object.freeze({
 editor:'f9ea6ce0ad5600ce07f4be634a29b699d61790f8',
 editorCode:'fd8885aa584f2f13057bb8b5f5c5e0597be6db27',
 editorRuntime:'1e8d0d702938e7418dc0203383516ab0c26a6e6a',
 ui:'8053b30e4db325ad16e07a456fcf8ef5030324a7',
 core:'3df11ce6e62fb94806e30652b87168949f8ef4dd',
 coreEvidence:'eedfc0149cbaa5715445ed2dc909c2d694a81d50',
 sourceModelStatus:'reviewed-source-authentication'
});
const immutable=rows=>Object.freeze(rows.map(Object.freeze));
export const TILE_AUTHORING_REVIEW_BINDINGS=immutable([
 ['@nautilus-engine/core','core','.','packages/map-core/index.js'],
 ['@nautilus-engine/core/floors','core','./floors','packages/floor-navigation/index.js'],
 ['@nautilus-engine/core/tiles','core','./tiles','packages/tiles-core/index.js'],
 ['@nautilus-engine/core/tiles/art','core','./tiles/art','packages/tile-visuals/prepare.js'],
 ['@nautilus-engine/core/tiles/art/example','core','./tiles/art/example','packages/tile-visuals/example.js'],
 ['@nautilus-engine/core/tiles/authoring','core','./tiles/authoring','packages/tile-authoring-core/index.js'],
 ['@nautilus-engine/core/tiles/finishes','core','./tiles/finishes','packages/tile-finishes/catalogue.js'],
 ['@nautilus-engine/renderer/tiles/art/three','renderer','./tiles/art/three','packages/tile-visuals/three.js'],
 ['@nautilus-engine/renderer/tiles/finishes/three','renderer','./tiles/finishes/three','packages/tile-finishes/finishes.js'],
 ['@nautilus-engine/renderer/render-effects/three','renderer','./render-effects/three','packages/render-effects/three.js']
].map(([specifier,profile,entry,file])=>({specifier,profile,entry,file})));
export const TILE_AUTHORING_REVIEW_CHECKS=Object.freeze([
 'human-library-source-unchanged','actual-six-step-human-workflow',
 'exact-history-no-new-repair','real-no-change-preserves-redo-and-source',
 'save-reopen-retains-complete-document-and-history',
 'actual-jsonl-same-service-producer-and-retained-packet',
 'cold-original-id-before-write','cold-original-id-after-write',
 'phone-390-actual-host','phone-320-actual-host',
 'native-helper-owned-resource-cleanup',
 'unsupported-command-refusal-preserves-complete-source'
]);
export const TILE_AUTHORING_REVIEW_STEPS=Object.freeze(['A1','B1','B2','P1','two-copies','one-upgrade']);
export const TILE_AUTHORING_REVIEW_CAPTURES=Object.freeze(['desktop-accepted','phone-390','phone-320']);
export const TILE_AUTHORING_ATLAS='assets/buildings/painted-materials-v2.png';
export const TILE_AUTHORING_INTERNAL_BINDINGS=immutable([
 ['packages/parts-core/hash.js',true],['packages/windows-authoring/journal.js',true],
 ['packages/tile-stack-core/contracts.js',false],['packages/tile-stack-core/index.js',false]
].map(([file,requiredRequest])=>({profile:'core',file,requiredRequest,scope:'Engine-app physical dependency, not an additional public importmap binding.'})));
export const reviewSha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const reviewCanonical=value=>Array.isArray(value)?'['+value.map(reviewCanonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+reviewCanonical(value[k])).join(',')+'}':JSON.stringify(value);
export const reviewToken=value=>reviewSha(reviewCanonical(value));
export function reviewRelative(file){assert.equal(typeof file,'string');assert.ok(file&&!path.posix.isAbsolute(file)&&!/[\\%?#\x00-\x1f\x7f]/.test(file)&&path.posix.normalize(file)===file&&!file.split('/').some(p=>!p||p==='.'||p==='..'),'Unsafe review path: '+file);return file;}
export function reviewFileAt(root,file){reviewRelative(file);let p=root;for(const part of file.split('/')){p=path.join(p,part);assert.equal(fs.lstatSync(p).isSymbolicLink(),false,'Symlink review path: '+file);}assert.equal(fs.statSync(p).isFile(),true);return p;}
export const reviewRead=(root,file)=>fs.readFileSync(reviewFileAt(root,file));
export function reviewJSON(root,file){const p=reviewFileAt(root,file);assert.ok(fs.statSync(p).size<=128*1024*1024,'Oversized review JSON');return JSON.parse(fs.readFileSync(p,'utf8'));}
export const reviewRow=(root,file)=>{const b=reviewRead(root,file);return {file,bytes:b.length,sha256:reviewSha(b)};};
const sortedUnique=values=>[...new Set(values)].sort();
const c1Namespace='apps/editor/tile-authoring/';
const c1Runtime=['checkpoint.js','host-service.js','jsonl.js','presentation.js','profile.js','seed.js','session.js','ui/commands.js','ui/panel.js','ui/styles.css'].map(f=>c1Namespace+f);
const c1Examples=['examples/tile-authoring-editor.html','examples/tile-authoring-editor.js'];
export function tileAuthoringReviewHostFiles(b2HostFiles){return sortedUnique([...b2HostFiles.filter(f=>!f.startsWith('examples/')),...c1Runtime,...c1Examples]);}

// A fixed literal stage plan: no parser-driven blanket rewriting or preferred-
// package fallback. Floor DOM/CSS are private app copies; their one Core import
// uses the declared floors export. Stack's unused profile/index is an explicitly
// labelled physical dependency, not an eleventh public binding.
export function tileAuthoringInstalledHostPlan({files}){
 assert.ok(files instanceof Map);const bytes=new Map([...files].map(([f,b])=>[f,Buffer.from(b)])),adaptations=[];
 const replace=(file,from,to,scope)=>{const before=bytes.get(file)?.toString();assert.equal(typeof before,'string');assert.equal(before.split(from).length,2,'Expected one literal relocation: '+file);const after=before.replace(from,to);bytes.set(file,Buffer.from(after));adaptations.push({file,from,to,beforeSha256:reviewSha(before),afterSha256:reviewSha(after),scope});};
 replace('packages/floor-navigation/dom.js',"from './index.js'","from '@nautilus-engine/core/floors'",'Copied floor DOM uses the actual declared Core floor entry.');
 for(const [file,dependency]of [
  ['apps/editor/smart-tile/checkpoint.js','packages/parts-core/hash.js'],
  ['apps/editor/smart-tile/session.js','packages/windows-authoring/journal.js'],
  ['apps/editor/tile-stack/checkpoint.js','packages/tile-stack-core/contracts.js'],
  ['apps/editor/tile-stack/floors.js','packages/parts-core/hash.js'],
  ['apps/editor/tile-stack/profile.js','packages/tile-stack-core/index.js']
 ])replace(file,"from '../../../"+dependency+"'","from '../../../node_modules/@nautilus-engine/core/"+dependency+"'",'Exact internal physical Core dependency.');
 const htmlFile='examples/tile-authoring-editor.html',html=bytes.get(htmlFile).toString(),maps=[...html.matchAll(/<script type="importmap">([\s\S]*?)<\/script>/g)];assert.equal(maps.length,1);
 const imports=JSON.parse(maps[0][1]).imports;assert.deepEqual(Object.keys(imports).sort(),TILE_AUTHORING_REVIEW_BINDINGS.map(b=>b.specifier).sort());for(const b of TILE_AUTHORING_REVIEW_BINDINGS)assert.equal(imports[b.specifier],'../'+b.file);
 replace(htmlFile,maps[0][0],'<script type="importmap">'+JSON.stringify({imports:Object.fromEntries(TILE_AUTHORING_REVIEW_BINDINGS.map(b=>[b.specifier,'../node_modules/@nautilus-engine/'+b.profile+'/'+b.file]))})+'</script>','Exactly ten actual declared public bindings; authoring replaces stack.');
 replace(htmlFile,'href="../'+TILE_AUTHORING_ATLAS+'"','href="../node_modules/@nautilus-engine/renderer/'+TILE_AUTHORING_ATLAS+'"','Actual installed renderer atlas body.');
 return {adaptations,hostFiles:[...bytes].map(([file,b])=>({file,bytes:b.length,sourceSha256:reviewSha(files.get(file)),stagedSha256:reviewSha(b)})).sort((a,b)=>a.file.localeCompare(b.file)),internalBindings:TILE_AUTHORING_INTERNAL_BINDINGS,files:bytes};
}

const extraVerificationFiles=[
 'tools/shared-artwork-registration.mjs',
 'tools/train-registration.mjs',
 'tools/editor-review-tile-authoring-c1.mjs','tools/verify-tile-authoring-editor-review.mjs',
 'tools/tile-authoring-editor-review-inputs.mjs','tools/tile-authoring-editor-source.mjs',
 'tools/editor-stage-tile-authoring-c1.mjs','tools/editor-direct-tile-authoring-c1.mjs',
 'docs/reviews/tile-authoring/architect/c1-sources.json',
 'docs/reviews/tile-authoring/editor/c1/source.json','docs/reviews/tile-authoring/editor/c1/ui-import.json',
 'docs/reviews/tile-authoring/editor/c1/core-import.json','docs/reviews/tile-authoring/editor/c1/helper-import.json',
 'docs/reviews/tile-authoring/ui/c1/source.json','docs/reviews/tile-authoring/core/c1-validation.json'
];
function namespace(root,dir){const absolute=path.join(root,dir);assert.equal(fs.lstatSync(absolute).isSymbolicLink(),false);return fs.readdirSync(absolute,{withFileTypes:true}).flatMap(e=>{assert.equal(e.isSymbolicLink(),false);return e.isDirectory()?namespace(root,dir+e.name+'/'):/\.(js|css)$/.test(e.name)?[dir+e.name]:[];}).sort();}
export async function tileAuthoringReviewInputModel({projectRoot}={}){
 assert.equal(typeof projectRoot,'string');const root=path.resolve(projectRoot);
 // Reuse the complete current physical package expectations unchanged. This
 // does not execute the B2 collector or change its source/metadata model.
 const b2Module=await import(pathToFileURL(path.join(root,'tools/verify-tile-stack-editor-review.mjs')).href);
 const b2=await b2Module.tileStackReviewInputModel({projectRoot:root});
 const sourceModule=await import(pathToFileURL(path.join(root,'tools/tile-authoring-editor-source.mjs')).href),c1=sourceModule.tileAuthoringEditorSourceModel({projectRoot:root});
 assert.equal(c1.sourceCommit,TILE_AUTHORING_REVIEW_LINEAGE.editor);assert.equal(c1.uiOrigin,TILE_AUTHORING_REVIEW_LINEAGE.ui);assert.equal(c1.coreSource,TILE_AUTHORING_REVIEW_LINEAGE.core);assert.equal(c1.coreEvidence,TILE_AUTHORING_REVIEW_LINEAGE.coreEvidence);assert.equal(c1.status,TILE_AUTHORING_REVIEW_LINEAGE.sourceModelStatus);
 assert.equal(c1.runtimeCheckpoint,TILE_AUTHORING_REVIEW_LINEAGE.editorRuntime);assert.equal(c1.runtimeFiles.length,14);assert.equal(c1.files.length,39);assert.equal(c1.namespaceFiles.length,10);assert.deepEqual(Object.keys(c1.sharedOverrides),['apps/editor/smart-tile/checkpoint.js','apps/editor/smart-tile/session.js']);
 const artworkBuild=sharedArtworkBuildBytes({object:(commit,file)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show',commit+':'+file],{windowsHide:true,timeout:30000,maxBuffer:2*1024*1024})});assert.ok(artworkBuild.before.equals(c1.buildAdaptation.expectedBuffer));
 for(const r of [...c1.files,...c1.coreFiles,...c1.dependencyEvidenceFiles,...c1.helperFiles,c1.metadata])assert.ok(reviewRead(root,r.path).equals(r.path==='tools/build.mjs'?playerSetupRootBytes('tools/build.mjs',trainBuildBytes(artworkBuild.expected)):r.expectedBuffer),'Unauthenticated C1 input: '+r.path);
 assert.deepEqual(namespace(root,c1Namespace),c1Runtime.sort());
 const hostFiles=tileAuthoringReviewHostFiles(b2.hostFiles);assert.equal(hostFiles.length,44);const hostPlan=tileAuthoringInstalledHostPlan({files:new Map(hostFiles.map(f=>[f,reviewRead(root,f)]))});
 const {moduleClosure,distribution}=await import(pathToFileURL(path.join(root,'tools/distribution.mjs')).href);
 const normalProfiles=Object.fromEntries(['core','renderer','assets','compatibility'].map(profile=>{const plan=distribution(profile);return [profile,{name:plan.name,exports:plan.exports,files:plan.files}];}));
 const closures=Object.fromEntries(['core','renderer'].map(p=>[p,sortedUnique(TILE_AUTHORING_REVIEW_BINDINGS.filter(b=>b.profile===p).flatMap(b=>moduleClosure([b.file])))]));
 for(const b of TILE_AUTHORING_REVIEW_BINDINGS){assert.equal(b2.pkg.exports[b.entry],'./'+b.file);assert.equal(b2.plans[b.profile].exports[b.entry],'./'+b.file);}
 for(const b of TILE_AUTHORING_INTERNAL_BINDINGS)assert.ok(b2.plans.core.files.includes(b.file));
 const inputs=sortedUnique([...hostFiles,...Object.values(closures).flat(),...TILE_AUTHORING_INTERNAL_BINDINGS.map(b=>b.file),TILE_AUTHORING_ATLAS]).map(f=>reviewRow(root,f));
 const verificationInputs=sortedUnique([...b2.verificationInputs.map(r=>r.file),...extraVerificationFiles,...c1.files.filter(f=>!c1.runtimeFiles.includes(f)).map(f=>f.path),...c1.dependencyEvidenceFiles.map(f=>f.path),...c1.helperFiles.map(f=>f.path)]).map(f=>reviewRow(root,f));
 const sourceBindings=sortedUnique([...b2.sourceBindings.map(r=>r.file),c1.metadata.path]).map(f=>reviewRow(root,f));
 const fingerprint=reviewToken({inputs,verificationInputs,sourceBindings,normalProfiles,profileInputs:b2.profileInputs,bindings:TILE_AUTHORING_REVIEW_BINDINGS,internalBindings:TILE_AUTHORING_INTERNAL_BINDINGS,lineage:TILE_AUTHORING_REVIEW_LINEAGE,hostPlan:{hostFiles:hostPlan.hostFiles,adaptations:hostPlan.adaptations},packages:b2.packages});
 return {root,status:TILE_AUTHORING_REVIEW_STATUS,lineage:TILE_AUTHORING_REVIEW_LINEAGE,b2,c1,inputs,verificationInputs,sourceBindings,normalProfiles,profileInputs:b2.profileInputs,packages:b2.packages,plans:b2.plans,hostFiles,hostPlan,fingerprint,atlasIdentity:b2.atlasIdentity,closures};
}

// Collect this exact raw snapshot plus the existing service/binding/root read
// in the SAME browser task. It observes the real service, not a new executor.
export function tileAuthoringReviewCheckpointToken(c){return reviewToken({...c,journal:{...c.journal,pending:null}});}
export function tileAuthoringReviewSummary(raw){
 const authority=JSON.parse(raw.checkpointJSON),s=raw.state,v=raw.view,d=raw.evidenceServiceSnapshot.document;
 assert.equal(reviewToken(authority),raw.checkpointDigest);assert.deepEqual(v.snapshot,raw.evidenceServiceSnapshot);assert.equal(raw.evidenceWorkbenchUsesService,true);
 const last=authority.journal.receipts.at(-1);
 return {phase:s.phase,revision:s.revision,serial:s.checkpointSerial,history:s.history,floor:s.floor,inspection:s.inspection,owners:s.owners,readiness:s.readiness,resources:s.resources,native:raw.native,input:raw.input,counts:raw.counts,hostPool:raw.hostPool,hostLeases:raw.hostLeases,disposed:raw.disposed,rendererMemory:raw.rendererMemory,atlas:raw.atlas,document:d,documentDigest:reviewToken(d),checkpointDigest:raw.checkpointDigest,checkpointBytesSha256:reviewSha(raw.checkpointJSON),authority:{recordDigest:raw.checkpointDigest,token:tileAuthoringReviewCheckpointToken(authority),documentDigest:reviewToken(authority.document),serial:authority.journal.serial,pendingRequestId:authority.journal.pending?.id??null,lastReceipt:last?{id:last.id,outcome:last.outcome,operationDigest:last.operationDigest,beforeToken:last.beforeToken,afterDocumentDigest:last.afterDocumentDigest}:null},sourceDigest:reviewToken(JSON.parse(d.sourceJSON)),sourceBytesSha256:reviewSha(d.sourceJSON),expected:v.snapshot.expected,source:v.snapshot.source,presentation:v.presentation,acceptedRootId:raw.evidenceAcceptedRootId,serviceConnectionSame:raw.evidenceWorkbenchUsesService};
}
