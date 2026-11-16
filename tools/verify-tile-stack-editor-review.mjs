// Root-owned current-source-bound evidence for the reviewed native B2 integration.
// Importing this module reads/writes nothing and never launches the collector.
import assert from 'node:assert/strict';
import {npmFilePatterns} from './npm-files.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const sha=b=>createHash('sha256').update(b).digest('hex');
const digest=/^[a-f0-9]{64}$/,uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const atlas='assets/buildings/painted-materials-v2.png',modes=['source','built','installed'];
const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const immutable=rows=>Object.freeze(rows.map(row=>Object.freeze(row)));
export const TILE_STACK_REVIEW_BINDINGS=immutable([
  ['@nautilus-engine/core','core','.','packages/map-core/index.js'],
  ['@nautilus-engine/core/floors','core','./floors','packages/floor-navigation/index.js'],
  ['@nautilus-engine/core/tiles','core','./tiles','packages/tiles-core/index.js'],
  ['@nautilus-engine/core/tiles/art','core','./tiles/art','packages/tile-visuals/prepare.js'],
  ['@nautilus-engine/core/tiles/art/example','core','./tiles/art/example','packages/tile-visuals/example.js'],
  ['@nautilus-engine/core/tiles/stack','core','./tiles/stack','packages/tile-stack-core/index.js'],
  ['@nautilus-engine/core/tiles/finishes','core','./tiles/finishes','packages/tile-finishes/catalogue.js'],
  ['@nautilus-engine/renderer/tiles/art/three','renderer','./tiles/art/three','packages/tile-visuals/three.js'],
  ['@nautilus-engine/renderer/tiles/finishes/three','renderer','./tiles/finishes/three','packages/tile-finishes/finishes.js'],
  ['@nautilus-engine/renderer/render-effects/three','renderer','./render-effects/three','packages/render-effects/three.js']
].map(([specifier,profile,entry,file])=>({specifier,profile,entry,file})));
export const TILE_STACK_REVIEW_CHECKS=Object.freeze([
  'real-public-stack-one-prepare-15-native-floors-480-cells','overview-retains-all-native-allocations',
  'overview-picks-whole-owner-on-actual-native-floor','cutaway-capture-independent-of-drawing-floor',
  'actual-finish-skin.stone-flags','actual-finish-skin.timber-boards','actual-finish-skin.poured-concrete',
  'complete-undo-redo-save-reopen','synthetic-before-same-request-no-reapply',
  'synthetic-after-same-request-no-reapply','synthetic-cancel-after-same-request-no-reapply',
  'verified-owned-and-borrowed-resource-retirement','nonuniform-native-fifteen-height-proof',
  'actual-original-line-surface','actual-original-arc-surface','actual-original-cubic-surface',
  'path-cosmetic-finish-copy-on-write','native-touch-second-finger-and-escape-quarantine',
  'native-touch-rectangle-captures-v2-finish'
]);
export const TILE_STACK_REVIEW_CAPTURES=Object.freeze([
  'uniform-overview','uniform-cutaway','stone-flags','timber-boards','poured-concrete',
  'nonuniform-overview','original-line-arc-cubic','phone-390','phone-390-full','phone-320','phone-320-full'
]);
export const TILE_STACK_INTERNAL_BINDINGS=immutable([
  'packages/parts-core/hash.js','packages/windows-authoring/journal.js','packages/tile-stack-core/contracts.js'
].map(file=>({profile:'core',file,entry:null,scope:'engine-app internal physical dependency; no public export claimed'})));
export const TILE_STACK_REVIEW_LINEAGE=Object.freeze({baseline:'d0ecfdfb35110616fbd4c03ad41775acf6a2d163',ui:'8622c77234036d786474689f7e70671ecf01136b',stackController:'f754afcc9f46b196f258bf09e8091c962c9b31f8',sharedControllerSource:'f9ea6ce0ad5600ce07f4be634a29b699d61790f8',sharedCheckpointRuntime:'1e8d0d702938e7418dc0203383516ab0c26a6e6a'});
// Explicit tool/source-authentication inventory. Do not feed Node tooling into
// the browser runtime dependency parser or infer that this discovers Node imports.
const verificationFiles=[
  '.github/workflows/check.yml',
  'tools/review-tile-stack-editor.mjs','tools/verify-tile-stack-editor-review.mjs',
  'tools/art-review-browser.mjs','tools/build.mjs','tools/verify-build.mjs','tools/distribution.mjs','tools/module-references.mjs',
  'tools/check.mjs','tools/check-smart-tile-editor-source.mjs','tools/tile-stack-editor-source.mjs',
  'tools/tile-stack-editor-b2-source.mjs','docs/reviews/smart-tile-editor/sources.json',
  'tools/tile-authoring-editor-source.mjs','docs/reviews/tile-authoring/architect/c1-sources.json',
  'docs/reviews/smart-tile-editor/integration-sources.json','docs/reviews/tile-stack/architect/b1-sources.json',
  'docs/reviews/tile-stack/architect/b2-sources.json','tools/check-tile-stack-source.mjs',
  'tools/check-tile-finishes-source.mjs','tools/check-tile-visuals-source.mjs',
  'tools/check-tile-visuals-lifecycle.mjs','tools/tile-stack-registration.mjs','tools/tile-surface-corrections.mjs',
  'tools/tile-authoring-registration.mjs','tools/shared-artwork-registration.mjs','tools/check-tile-authoring-core-source.mjs',
  'tools/npm-files.mjs','tools/train-registration.mjs',
  'tools/check-native-window-presenter.mjs','packages/tile-authoring-core/source.json',
  'packages/tile-stack-core/source.json','packages/tile-finishes/source.json','packages/tile-visuals/source.json',
  'packages/map-core/contract-manifest.js','packages/map-core/capabilities.js','package.json','upstream.json','NOTICE.md'
];
export const tileStackVerificationFiles=()=>[...verificationFiles].sort();
export const TILE_STACK_FLOOR_HEIGHTS=Object.freeze({
  'aft-native-fifteen':Object.freeze([0,2.12,4.24,6.36,8.48,10.6,12.72,14.84,16.96,19.08,21.2,23.32,25.44,27.56,29.68]),
  'nonuniform-fifteen':Object.freeze([0,2.12,4.24,6.75,9.1,12.4,15,18.6,21.3,24.9,28.2,31,34.8,38.1,42.7])
});
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const token=v=>sha(canonical(v));
// The host's smartTileDigest parses a top-level JSON string before hashing.
// Its sourceDigest therefore binds the parsed map; floorBinding separately
// preserves the SHA-256 of the original JSON bytes, including whitespace.
export function tileStackReviewSourceDigests(sourceJSON){
  assert.equal(typeof sourceJSON,'string');
  return {parsedSourceDigest:token(JSON.parse(sourceJSON)),sourceSha256:sha(sourceJSON)};
}
function relative(file){assert.equal(typeof file,'string');assert.ok(file&&!path.posix.isAbsolute(file)&&!file.includes('\\')&&!file.includes('%')&&!/[\x00-\x1f\x7f?#]/.test(file)&&path.posix.normalize(file)===file&&!file.split('/').some(p=>!p||p==='.'||p==='..'),'Unsafe evidence path: '+file);return file;}
function fileAt(root,file){relative(file);let resolved=root;for(const p of file.split('/')){resolved=path.join(resolved,p);assert.equal(fs.lstatSync(resolved).isSymbolicLink(),false,'Symlink evidence: '+file);}assert.equal(fs.statSync(resolved).isFile(),true,file);return resolved;}
const read=(root,file)=>fs.readFileSync(fileAt(root,file));
const json=(root,file)=>{const p=fileAt(root,file);assert.ok(fs.statSync(p).size<=128*1024*1024,'Oversized review JSON: '+file);return JSON.parse(fs.readFileSync(p,'utf8'));};
const row=(root,file)=>{const b=read(root,file);return {file,bytes:b.length,sha256:sha(b)};};
function named(rows,key){assert.ok(Array.isArray(rows));const map=new Map();for(const r of rows){assert.ok(r&&typeof r==='object');assert.equal(map.has(r[key]),false,'Duplicate '+key+': '+r[key]);map.set(r[key],r);}return map;}
const integer=(n,max=Number.MAX_SAFE_INTEGER)=>assert.ok(Number.isSafeInteger(n)&&n>=0&&n<=max,'Invalid bounded count: '+n);
const timestamp=v=>{assert.equal(typeof v,'string');const n=Date.parse(v);assert.ok(Number.isFinite(n),'Invalid evidence timestamp.');return n;};
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<.000002,'Wrong literal native height: '+a+' != '+b);
const reportDirectory=mode=>'artifacts/tile-stack-editor-'+mode+'/';
function walk(root,directory){const absolute=path.join(root,directory);assert.equal(fs.lstatSync(absolute).isSymbolicLink(),false);return fs.readdirSync(absolute,{withFileTypes:true}).flatMap(e=>{assert.equal(e.isSymbolicLink(),false);return e.isDirectory()?walk(root,directory+'/'+e.name):/\.(js|css)$/.test(e.name)?[directory+'/'+e.name]:[];});}
export function tileStackReviewHostFiles(projectRoot){const root=path.resolve(projectRoot);return [...walk(root,'apps/editor/smart-tile'),...walk(root,'apps/editor/tile-stack'),'examples/tile-stack-editor.html','examples/tile-stack-editor.js','packages/floor-navigation/dom.js','packages/floor-navigation/style.css'].sort();}

export function tileStackInstalledHostPlan(projectRoot){
  const root=path.resolve(projectRoot),files=tileStackReviewHostFiles(root),bytes=new Map(files.map(f=>[f,read(root,f)])),adaptations=[];
  function replace(file,from,to,scope){const before=bytes.get(file).toString();assert.equal(before.split(from).length,2,'Literal adaptation must occur once: '+file);const after=before.replace(from,to);bytes.set(file,Buffer.from(after));adaptations.push({file,from,to,beforeSha256:sha(before),afterSha256:sha(after),scope});}
  replace('packages/floor-navigation/dom.js',"from './index.js'","from '@nautilus-engine/core/floors'",'actual declared public entry');
  replace('apps/editor/tile-stack/profile.js',"from '../../../packages/tile-stack-core/index.js'","from '@nautilus-engine/core/tiles/stack'",'actual declared public entry');
  for(const [file,dependency]of [['apps/editor/smart-tile/checkpoint.js','packages/parts-core/hash.js'],['apps/editor/smart-tile/session.js','packages/windows-authoring/journal.js'],['apps/editor/tile-stack/floors.js','packages/parts-core/hash.js'],['apps/editor/tile-stack/checkpoint.js','packages/tile-stack-core/contracts.js']])replace(file,"from '../../../"+dependency+"'","from '../../../node_modules/@nautilus-engine/core/"+dependency+"'",'engine-app internal physical dependency; no public export claimed');
  const html=bytes.get('examples/tile-stack-editor.html').toString(),maps=[...html.matchAll(/<script type="importmap">([\s\S]*?)<\/script>/g)];assert.equal(maps.length,1);const imports=JSON.parse(maps[0][1]).imports;assert.deepEqual(Object.keys(imports).sort(),TILE_STACK_REVIEW_BINDINGS.map(b=>b.specifier).sort());for(const b of TILE_STACK_REVIEW_BINDINGS)assert.equal(imports[b.specifier],'../'+b.file);
  replace('examples/tile-stack-editor.html',maps[0][0],'<script type="importmap">'+JSON.stringify({imports:Object.fromEntries(TILE_STACK_REVIEW_BINDINGS.map(b=>[b.specifier,'../node_modules/@nautilus-engine/'+b.profile+'/'+b.file]))})+'</script>','ten actual declared public entries');
  replace('examples/tile-stack-editor.html','href="../'+atlas+'"','href="../node_modules/@nautilus-engine/renderer/'+atlas+'"','actual installed renderer atlas');
  return {adaptations,hostFiles:files.map(file=>({file,sourceSha256:sha(read(root,file)),stagedSha256:sha(bytes.get(file))})),internalBindings:TILE_STACK_INTERNAL_BINDINGS};
}

export async function tileStackReviewInputModel({projectRoot}={}){
  assert.equal(typeof projectRoot,'string','Pass the actual projectRoot explicitly from the draft.');const root=path.resolve(projectRoot);
  const {moduleClosure,distribution,packageProvenance,root:distributionRoot}=await import(pathToFileURL(path.join(root,'tools/distribution.mjs')).href);assert.equal(path.resolve(distributionRoot),root);
  const pkg=json(root,'package.json'),plans=Object.fromEntries(['core','renderer'].map(p=>[p,distribution(p)]));assert.deepEqual(pkg.files,npmFilePatterns(distribution().files),'Current Root whitelist must be exact.');
  for(const b of TILE_STACK_REVIEW_BINDINGS){assert.equal(pkg.exports[b.entry],'./'+b.file);assert.equal(plans[b.profile].exports[b.entry],'./'+b.file);}
  // Only the actual browser/public runtime entries enter moduleClosure.
  const closures=Object.fromEntries(['core','renderer'].map(p=>[p,[...new Set(TILE_STACK_REVIEW_BINDINGS.filter(b=>b.profile===p).flatMap(b=>moduleClosure([b.file])))].sort()]));
  const hostFiles=tileStackReviewHostFiles(root),inputs=[...new Set([...hostFiles,...Object.values(closures).flat(),...TILE_STACK_INTERNAL_BINDINGS.map(b=>b.file),atlas])].sort().map(f=>row(root,f));
  const verificationInputs=tileStackVerificationFiles().map(file=>({file,sha256:sha(read(root,file))}));
  const profileInputs=[],packages={};
  for(const [profile,plan]of Object.entries(plans)){
    const files=plan.files.map(file=>row(root,file));for(const r of files)profileInputs.push({profile,...r});
    const manifest={name:plan.name,version:pkg.version,private:true,type:'module',description:pkg.description,engines:pkg.engines,exports:plan.exports,files:npmFilePatterns([...plan.files,'package-provenance.json'])};
    const provenance=packageProvenance(profile,files.map(r=>({path:r.file,bytes:r.bytes,sha256:r.sha256})),{version:pkg.version});
    const generated=[['package.json',manifest,true],['package-provenance.json',provenance,false]].map(([file,data,newline])=>{const b=Buffer.from(JSON.stringify(data,null,2)+(newline?'\n':''));return {file,bytes:b.length,sha256:sha(b),data:JSON.parse(b)};});
    packages[profile]={name:plan.name,version:pkg.version,manifest:generated[0],provenance:generated[1],physicalFiles:[...files,...generated.map(({data,...r})=>r)].sort((a,b)=>a.file.localeCompare(b.file))};
  }
  profileInputs.sort((a,b)=>(a.profile+'/'+a.file).localeCompare(b.profile+'/'+b.file));
  const sourceBindings=['docs/reviews/tile-stack/architect/b1-sources.json','docs/reviews/tile-stack/architect/b2-sources.json','docs/reviews/tile-authoring/architect/c1-sources.json'].map(file=>({file,sha256:sha(read(root,file))}));
  const fingerprint=sha(JSON.stringify({inputs,verificationInputs,profileInputs,bindings:TILE_STACK_REVIEW_BINDINGS,sourceBindings,manifest:{name:pkg.name,version:pkg.version,exports:pkg.exports,files:pkg.files},profiles:Object.fromEntries(Object.entries(plans).map(([p,v])=>[p,{name:v.name,exports:v.exports,files:v.files}]))}));
  const atlasBytes=read(root,atlas);assert.ok(atlasBytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));const atlasIdentity={sha256:sha(atlasBytes),bytes:atlasBytes.length,width:atlasBytes.readUInt32BE(16),height:atlasBytes.readUInt32BE(20)};
  return {root,pkg,plans,closures,hostFiles,inputs,verificationInputs,profileInputs,packages,sourceBindings,fingerprint,atlasIdentity,hostPlan:tileStackInstalledHostPlan(root)};
}

// Collector-side DTO projection only. Reads its existing proofSnapshot result;
// no new runtime/DOM API, authority or engine import is introduced.
export function tileStackReviewSummary(raw){
  const s=raw.state,checkpoint=JSON.parse(raw.checkpointJSON);assert.equal(token(checkpoint),raw.checkpointDigest);
  return {phase:s.phase,revision:s.revision,serial:s.checkpointSerial,history:s.history,floor:s.floor,inspection:s.inspection,owners:s.owners,readiness:s.readiness,resources:s.resources,checkpointDigest:raw.checkpointDigest,sourceDigest:raw.sourceDigest,native:raw.native,input:raw.input,counts:raw.counts,planeHeightM:raw.planeHeightM,hostPool:raw.hostPool,hostLeases:raw.hostLeases,disposed:raw.disposed,checkpointVersion:checkpoint.version,document:checkpoint.document,documentDigest:token(checkpoint.document),floors:s.floors,workspace:s.workspace,selectedOwnerId:s.selectedOwnerId,atlas:raw.atlas};
}
// This independently useful subset also accepts historical observed snapshots;
// it cannot authorize a matrix pass without the complete summary/input proof.
export function assertTileStackNativeSnapshot(s,{retired=false,profileId=null}={}){
  assert.ok(s&&typeof s==='object');for(const k of ['sourceDigest','checkpointDigest'])assert.match(s[k],digest);
  integer(s.revision);integer(s.serial);integer(s.history.undo);integer(s.history.redo);assert.ok(Array.isArray(s.owners)&&s.owners.length<=32);
  const r=s.resources;assert.deepEqual([r.maxRoots,r.maxTriangles,r.maxCells],[2,50000,1024]);for(const k of ['accepted','candidate','acquiring','retiring','roots','triangles','cells'])integer(r[k]);assert.equal(r.roots,r.accepted+r.candidate+r.acquiring+r.retiring);assert.ok(r.roots<=2&&r.triangles<=50000&&r.cells<=1024);
  for(const k of ['query','support','navigation','fire','water','game'])assert.equal(s.readiness[k].state,'unbound');
  const n=s.native;assert.deepEqual(n.inspection,s.inspection);assert.equal(n.drawingFloorId,s.floor.id);assert.equal(n.pool.maxMaterials,64);integer(n.pool.ownedMaterials,64);integer(n.pool.leases,64);assert.equal(n.pool.newTextures,0);assert.equal(n.pool.ownedGeometry,0);assert.deepEqual(n.resources.retirementErrors,[]);
  assert.ok(Array.isArray(n.views)&&n.views.length<=2);assert.equal(n.views.length,r.roots);assert.equal(n.views.reduce((a,v)=>a+v.cellCount,0),r.cells);assert.equal(n.views.reduce((a,v)=>a+v.provider.triangles,0),r.triangles);assert.equal(n.pool.leases,n.views.reduce((a,v)=>a+v.instances.length,0));
  for(const v of n.views){assert.ok(['accepted','candidate','acquiring','retiring'].includes(v.role));integer(v.cellCount,1024);assert.equal(v.cells.length,v.cellCount);assert.equal(v.provider.instances,v.instances.length);assert.ok(v.provider.triangles<=50000);assert.equal(v.provider.disposed,false);assert.equal(v.provider.appearance.disposed,v.instances.length===0);assert.equal(v.provider.appearance.ownedGeometry??0,0);assert.equal(v.provider.appearance.newTextures??0,0);assert.equal(v.provider.appearance.owners,v.instances.length);assert.equal(v.provider.appearance.bindings,v.instances.length);named(v.instances,'id');for(const c of v.cells){const owner=v.instances.find(o=>o.id===c.ownerId);assert.ok(owner);assert.equal(c.floorId,owner.floorId);assert.equal(c.clip.min.length,2);assert.equal(c.clip.max.length,2);assert.ok(c.clip.min.every((x,i)=>Number.isFinite(x)&&Number.isFinite(c.clip.max[i])&&x<c.clip.max[i]));}}
  if(profileId!==null){const heights=TILE_STACK_FLOOR_HEIGHTS[profileId];assert.ok(heights);for(const v of n.views)for(const o of v.instances){assert.match(o.floorId,/^F(?:0[0-9]|1[0-4])$/);const h=heights[Number(o.floorId.slice(1))];for(const m of o.meshes){assert.equal(m.materialType,'MeshStandardMaterial');assert.equal(m.heightRangeM.length,2);m.heightRangeM.forEach(x=>near(x,h));}}}
  assert.ok(Array.isArray(s.hostPool)&&s.hostPool.length>0&&s.hostPool.every(x=>x===(retired?1:0)));assert.ok(Array.isArray(s.hostLeases)&&s.hostLeases.length===2&&s.hostLeases.every(x=>x===(retired?0:1)));assert.equal(s.disposed,retired);assert.equal(n.pool.disposed,retired);
  if(retired){assert.equal(s.phase,'disposed');assert.deepEqual([r.roots,r.triangles,r.cells,n.pool.ownedMaterials,n.pool.leases],[0,0,0,0,0]);assert.deepEqual(n.views,[]);assert.equal(n.resources.closing,true);assert.equal(n.resources.atlasReleased,true);assert.equal(n.resources.baseReleased,true);}
  integer(s.counts.prepare);integer(s.counts.apply);assert.ok(s.counts.apply<=s.counts.prepare);near(s.planeHeightM,s.floor.elevationM);return s;
}
export function assertTileStackReviewSnapshot(s,options={}){
  assertTileStackNativeSnapshot(s,{...options,profileId:s.document?.floorBinding?.profile?.id??null});assert.equal(s.checkpointVersion,2);assert.match(s.documentDigest,digest);assert.equal(s.documentDigest,token(s.document));
  const d=s.document,l=d.tileBundle.layout,f=d.floorBinding,c=d.constraints,sourceDigests=tileStackReviewSourceDigests(d.sourceJSON);assert.deepEqual(Object.keys(d).sort(),['id','sourceJSON','floorBinding','finishBinding','tileBundle','constraints'].sort());assert.equal(sourceDigests.parsedSourceDigest,s.sourceDigest);assert.equal(sourceDigests.sourceSha256,f.sourceSha256);assert.equal(f.kind,'nautilus-tile-stack-floor-binding');assert.equal(f.version,1);
  const heights=TILE_STACK_FLOOR_HEIGHTS[f.profile.id];assert.ok(heights,'Unknown literal floor profile.');assert.equal(f.profile.version,1);assert.equal(f.floors.length,15);assert.deepEqual(s.floors,f.floors);assert.deepEqual(l.floors,f.floors.map(({id,elevationM})=>({id,elevationM})));
  for(const [i,row]of f.floors.entries()){assert.equal(row.id,'F'+String(i).padStart(2,'0'));assert.equal(row.label,String(i+1));assert.equal(row.elevationM,heights[i]);assert.deepEqual(row.source,i<3?{kind:'legacy-layer',layerIndex:i}:{kind:'authored-tile'});}
  assert.equal(s.workspace.sourceDocumentDigest,s.documentDigest);assert.equal(s.workspace.sourceConstraintsDigest,token(c));assert.equal(s.workspace.sourceSha256,f.sourceSha256);assert.equal(s.workspace.floorTableId,f.id);assert.deepEqual(s.workspace.finishBinding,d.finishBinding);assert.equal(s.floor.elevationM,f.floors.find(v=>v.id===s.floor.id)?.elevationM);
  const byOwner=named(l.instances,'id');assert.equal(byOwner.size,s.owners.length);for(const o of s.owners){const p=byOwner.get(o.id),recipe=d.tileBundle.recipes.find(r=>r.id===p?.recipeId);assert.ok(recipe);assert.equal(o.recipeId,p.recipeId);assert.equal(o.locked,p.locked);assert.equal(o.floorId,p.floorBindings.base);assert.equal(o.shapeKind,recipe.shape.kind);assert.equal(o.skinId,recipe.interior.skinId);assert.equal(o.finishId,o.skinId);}
  assert.equal(c.kind,'nautilus-stack-constraints');assert.equal(c.version,1);assert.equal(c.floorProfileId,f.profile.id);assert.ok(c.minimumClearanceM>=.000001);named(c.owners,'instanceId');named(c.managedRelations,'id');for(const r of c.managedRelations){assert.equal(r.kind,'cross');assert.ok(byOwner.has(r.a)&&byOwner.has(r.b)&&r.a!==r.b&&r.clearanceM>=c.minimumClearanceM);assert.deepEqual(l.relations.find(v=>v.id===r.id),r);}
  for(const v of s.native.views)for(const owner of v.instances){const floor=f.floors.find(f=>f.id===owner.floorId);assert.ok(floor);assert.ok(owner.meshes.length>0);for(const mesh of owner.meshes){assert.equal(mesh.materialType,'MeshStandardMaterial');assert.equal(mesh.finishId,owner.finishId);assert.equal(mesh.heightRangeM.length,2);mesh.heightRangeM.forEach(h=>near(h,floor.elevationM));}if(v.role==='accepted'){const saved=byOwner.get(owner.id);assert.ok(saved);assert.equal(owner.recipeId,saved.recipeId);assert.equal(owner.finishId,d.tileBundle.recipes.find(r=>r.id===saved.recipeId).interior.skinId);}}
  assert.equal(s.atlas.verifiedSha256,s.atlas.sha256);assert.equal(s.atlas.verifiedBytes,s.atlas.bytes);assert.equal(s.atlas.path,atlas);return s;
}
const stripIds=v=>Array.isArray(v)?v.map(stripIds):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['id','parentId'].includes(k)).map(([k,x])=>[k,stripIds(x)])):v;
export function tileStackSemanticState(s){
  const d=s.document,layout=d.tileBundle.layout;
  const ownerKey=id=>{const p=layout.instances.find(v=>v.id===id);if(!p)return null;const recipe=d.tileBundle.recipes.find(r=>r.id===p.recipeId);return {floorBindings:p.floorBindings,origin:p.origin,transform:p.transform,locked:p.locked,anchors:p.anchorIds.map(id=>{const a=recipe.anchors.find(a=>a.id===id);return {kind:a.kind,parentKind:recipe.anchors.find(p=>p.id===a.parentId)?.kind??null};}),frame:recipe.frame,shape:stripIds(recipe.shape),interior:recipe.interior};};
  const sort=rows=>rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const views=s.native.views.map(v=>({
    role:v.role,visible:v.visible,cellCount:v.cellCount,triangles:v.provider.triangles,
    instances:sort(v.instances.map(o=>({
      floorId:o.floorId,visible:o.visible,finishId:o.finishId,
      meshes:o.meshes.map(m=>({vertices:m.vertices,heightRangeM:m.heightRangeM.map(h=>Math.round(h*1e5)/1e5),materialType:m.materialType,finishId:m.finishId}))
    })))
  }));
  return {
    phase:s.phase,revision:s.revision,serial:s.serial,
    history:{undo:s.history.undo,redo:s.history.redo},floor:s.floor,inspection:s.inspection,
    sourceDigest:s.sourceDigest,readiness:s.readiness,counts:s.counts,
    selectedOwner:ownerKey(s.selectedOwnerId),owners:sort(layout.instances.map(o=>ownerKey(o.id))),
    constraints:{minimumClearanceM:d.constraints.minimumClearanceM,
      owners:sort(d.constraints.owners.map(o=>({owner:ownerKey(o.instanceId),primaryReservationId:o.primaryReservationId}))),
      relations:sort(d.constraints.managedRelations.map(r=>({kind:r.kind,ends:sort([ownerKey(r.a),ownerKey(r.b)]),clearanceM:r.clearanceM})))},
    floorBinding:d.floorBinding,finishBinding:d.finishBinding,recipeCount:d.tileBundle.recipes.length,
    templateCount:d.tileBundle.templates.length,layoutRevision:layout.revision,resources:s.resources,
    native:{drawingFloorId:s.native.drawingFloorId,inspection:s.native.inspection,pool:s.native.pool,resources:s.native.resources,views},
    hostPool:s.hostPool,hostLeases:s.hostLeases,disposed:s.disposed
  };
}
function assertStack(s,profile){
  assert.equal(s.document.floorBinding.profile.id,profile);assert.equal(s.owners.length,15);assert.equal(s.owners.filter(o=>o.locked).length,14);assert.ok(s.owners.every(o=>o.locked===(o.floorId!=='F14')));assert.equal(s.document.constraints.owners.length,15);assert.equal(s.document.constraints.managedRelations.length,105);assert.equal(s.document.tileBundle.layout.relations.length,105);assert.equal(s.resources.cells,480);assert.equal(s.native.pool.leases,15);const v=s.native.views.find(v=>v.role==='accepted');assert.ok(v);assert.equal(v.cellCount,480);assert.equal(v.instances.length,15);assert.deepEqual(v.instances.map(o=>o.floorId).sort(),Array.from({length:15},(_,i)=>'F'+String(i).padStart(2,'0')));
}
export function assertTileStackInspectionUI(ui,s){
  assert.ok(ui,'Inspection UI observations are required.');
  const floor=s.floor,mode=s.inspection.mode,cutoff=s.floors.find(f=>f.id===s.inspection.cutawayFloorId);
  assert.equal(floor.mode,'manual','Character follow/contact modes are unbound in this authoring profile.');
  assert.equal(ui.drawing,'Drawing floor '+floor.label+' · '+floor.elevationM+' m · '+floor.mode);
  const expected=mode==='overview'?'View: Overview · All declared floors':mode==='selected-floor'?'View: Selected floor '+floor.label+' · '+floor.elevationM+' m':cutoff?'View: Cutaway through floor '+cutoff.label+' · '+cutoff.elevationM+' m (captured cutoff)':null;
  assert.ok(expected);assert.equal(ui.view,expected);assert.equal(ui.forcedColors,false);
  assert.deepEqual(ui.buttons.map(b=>b.label),['Selected floor','Overview','Cutaway here']);
  assert.ok(ui.buttons.every(b=>['true','false'].includes(b.pressed)));
  for(const button of ui.buttons)for(const field of ['background','color','weight'])assert.ok(typeof button[field]==='string'&&button[field].trim().length>0,'Missing measured inspection button '+field+'.');
  const active=ui.buttons.filter(b=>b.pressed==='true'),inactive=ui.buttons.filter(b=>b.pressed==='false');
  assert.equal(active.length,1);assert.equal(inactive.length,2);assert.equal(active[0].label,{'selected-floor':'Selected floor',overview:'Overview',cutaway:'Cutaway here'}[mode]);
  assert.equal(active[0].weight,'700');assert.ok(inactive.every(b=>b.background!==active[0].background&&b.color!==active[0].color),'The active inspection mode must be visible in normal colours.');
}
export function assertTileStackReviewChecks(checks){
  assert.deepEqual(checks.map(c=>c.name),TILE_STACK_REVIEW_CHECKS);const byName=named(checks,'name');for(const c of checks){assert.equal(c.status,'pass',c.name);assertTileStackReviewSnapshot(c.snapshot,{retired:c.name==='verified-owned-and-borrowed-resource-retirement'});}
  const s=name=>byName.get(name).snapshot,first=s(TILE_STACK_REVIEW_CHECKS[0]);assertStack(first,'aft-native-fifteen');assert.deepEqual(first.counts,{prepare:1,apply:1});
  for(const index of [0,1,3]){const check=byName.get(TILE_STACK_REVIEW_CHECKS[index]);assertTileStackInspectionUI(check.inspectionUI,check.snapshot);}
  assert.equal(s(TILE_STACK_REVIEW_CHECKS[1]).native.views[0].instances.filter(o=>o.visible).length,15);
  const picked=s(TILE_STACK_REVIEW_CHECKS[2]);assert.equal(picked.owners.find(o=>o.id===picked.selectedOwnerId)?.floorId,'F14');assert.equal(picked.floor.id,'F00');
  const cut=s(TILE_STACK_REVIEW_CHECKS[3]);assert.deepEqual(cut.inspection,{mode:'cutaway',cutawayFloorId:'F07'});assert.equal(cut.floor.id,'F12');assert.equal(cut.native.views[0].instances.filter(o=>o.visible).length,8);
  let previous=first;for(const [i,id]of ['skin.stone-flags','skin.timber-boards','skin.poured-concrete'].entries()){const current=s('actual-finish-'+id);assertStack(current,'aft-native-fifteen');assert.deepEqual(current.counts,{prepare:i+2,apply:i+2});assert.deepEqual(current.document.constraints,previous.document.constraints);const top=current.owners.find(o=>o.floorId==='F14');assert.equal(top.skinId,id);for(const o of previous.document.tileBundle.layout.instances.filter(v=>v.floorBindings.base!=='F14'))assert.deepEqual(current.document.tileBundle.layout.instances.find(v=>v.id===o.id),o);for(const recipe of previous.document.tileBundle.recipes)assert.deepEqual(current.document.tileBundle.recipes.find(v=>v.id===recipe.id),recipe);previous=current;}
  const opened=s('complete-undo-redo-save-reopen');assert.deepEqual(opened.document,previous.document);assert.equal(opened.history.undo,0);assert.equal(opened.history.redo,0);assert.deepEqual(opened.counts,{prepare:4,apply:4});
  for(const [i,fault]of ['before','after','cancel-after'].entries()){const current=s('synthetic-'+fault+'-same-request-no-reapply');assert.deepEqual(current.counts,{prepare:5+i,apply:5+i});assert.equal(current.phase,fault==='before'?'draft':'idle');if(fault==='before')assert.deepEqual(current.document,opened.document);}
  assertStack(s('nonuniform-native-fifteen-height-proof'),'nonuniform-fifteen');
  // The collector authors these controls through the shared source-form codec,
  // not through the art example factory's different sample curves.
  const authoredPaths={line:{kind:'line',id:'path',a:[0,0,0],b:[8,0,0]},arc:{kind:'arc',id:'path',center:[0,0],radius:4,startRad:0,sweepRad:Math.PI/2,h0:0,h1:0},cubic:{kind:'cubic',id:'path',points:[[0,0,0],[2.123456789,5.0000000001,0],[6,4,0],[8.0000000001,4,0]]}};
  for(const [i,kind]of ['line','arc','cubic'].entries()){const current=s('actual-original-'+kind+'-surface');assert.equal(current.document.floorBinding.profile.id,'nonuniform-fifteen');assert.equal(current.owners.length,i+1);assert.deepEqual(current.counts,{prepare:i+1,apply:i+1});const owner=current.document.tileBundle.layout.instances.find(o=>o.id===current.selectedOwnerId),recipe=current.document.tileBundle.recipes.find(r=>r.id===owner.recipeId);assert.equal(recipe.shape.kind,'profile-sweep');assert.deepEqual(recipe.shape.path,authoredPaths[kind]);assert.equal(recipe.shape.widthM,.85);assert.equal(recipe.interior.variantSeed,137);assert.equal(recipe.interior.skinId,'skin.timber-boards');assert.deepEqual(owner.origin,[75+i*35,75,18.6]);assert.equal(owner.floorBindings.base,'F07');}
  const finish=s('path-cosmetic-finish-copy-on-write');assert.deepEqual(finish.counts,{prepare:4,apply:4});const last=s('actual-original-cubic-surface');assert.deepEqual(finish.document.constraints,last.document.constraints);for(const old of last.document.tileBundle.recipes)assert.deepEqual(finish.document.tileBundle.recipes.find(r=>r.id===old.id),old);const oldOwner=last.document.tileBundle.layout.instances.find(o=>o.id===last.selectedOwnerId),newOwner=finish.document.tileBundle.layout.instances.find(o=>o.id===oldOwner.id);assert.deepEqual({...newOwner,recipeId:oldOwner.recipeId,contentDigest:oldOwner.contentDigest},oldOwner);const oldRecipe=last.document.tileBundle.recipes.find(r=>r.id===oldOwner.recipeId),newRecipe=finish.document.tileBundle.recipes.find(r=>r.id===newOwner.recipeId);assert.deepEqual(newRecipe,{...oldRecipe,id:newRecipe.id,contentVersion:oldRecipe.contentVersion+1,interior:{...oldRecipe.interior,skinId:'skin.stone-flags'}});for(const o of last.document.tileBundle.layout.instances.filter(v=>v.id!==oldOwner.id))assert.deepEqual(finish.document.tileBundle.layout.instances.find(v=>v.id===o.id),o);
  const touch=s('native-touch-second-finger-and-escape-quarantine');assert.equal(touch.owners.length,0);assert.deepEqual(touch.counts,{prepare:0,apply:0});assert.equal(touch.input.pointers,0);
  const phone=byName.get('native-touch-rectangle-captures-v2-finish');assert.deepEqual(phone.snapshot.counts,{prepare:1,apply:1});assert.equal(phone.snapshot.owners.length,1);assert.equal(phone.snapshot.owners[0].skinId,'skin.brick-pavers');assert.ok(phone.trustedEvents.length>8&&phone.trustedEvents.every(e=>e.trusted===true));assert.ok(phone.trustedEvents.some(e=>e.type==='gotpointercapture'));
  return checks.map(c=>({name:c.name,state:tileStackSemanticState(c.snapshot)}));
}

export function assertTileStackReviewHelper(helper,receipt,{mode}={}){
  assert.ok(modes.includes(mode));assert.equal(helper.owner,receipt.owner);assert.equal(typeof helper.owner,'string');assert.ok(helper.owner.length);assert.equal(helper.purpose,receipt.purpose);assert.equal(helper.purpose,'B2 stack Editor '+mode+' actual native host acceptance');
  for(const value of [helper.process,helper.browser]){assert.ok(value&&Number.isSafeInteger(value.pid)&&value.pid>0);assert.equal(typeof value.executable,'string');assert.ok(value.executable.length);assert.match(value.creationFiletime??value.creationTicks,/^\d+$/);}
  assert.deepEqual(receipt.process,helper.process);assert.deepEqual(receipt.browser,helper.browser);assert.equal(helper.project,'Nautilus Engine');integer(helper.port,65535);assert.ok(helper.port>0);assert.equal(receipt.port,helper.port);assert.equal(receipt.httpClosed,true);assert.equal(receipt.browserClosed,true);
  const started=timestamp(helper.startedAt),expires=timestamp(helper.expiresAt),stopped=timestamp(receipt.stoppedAt);assert.ok(expires>started&&expires-started<=600000);assert.ok(stopped>=started&&stopped<=expires+2000,'Helper outlived bounded expiry.');return {started,stopped};
}
export function assertTileStackReviewEnvelope(report,model,mode){
  assert.equal(report.version,1);assert.equal(report.status,'pass');assert.equal(report.mode,mode);assert.equal(report.smoke,false);assert.equal(report.evidenceVersion,2,'Historical reports do not provide the Root matrix proof.');assert.match(report.runId,uuid);
  assert.deepEqual(report.bindings,TILE_STACK_REVIEW_BINDINGS);assert.deepEqual(report.inputs,model.inputs);assert.deepEqual(report.verificationInputs,model.verificationInputs);assert.deepEqual(report.sourceBindings,model.sourceBindings);assert.equal(report.inputFingerprint,model.fingerprint,'Stale current-source/package/tool fingerprint.');for(const [key,value]of Object.entries(TILE_STACK_REVIEW_LINEAGE))assert.equal(report[key],value);
  assert.deepEqual(report.requiredChecks,TILE_STACK_REVIEW_CHECKS);assert.deepEqual(report.requiredCaptures,TILE_STACK_REVIEW_CAPTURES);assert.ok(report.backend&&typeof report.backend.browserVersion==='string'&&report.backend.browserVersion.length);assert.ok(['msedge','chrome','chromium'].includes(report.backend.channel));assert.equal(report.backend.browserType,'chromium');assert.equal(typeof report.backend.node,'string');assert.equal(typeof report.backend.platform,'string');assert.deepEqual(report.backend.phone,{widths:[390,320],height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
}
export function assertTileStackInstalledProof(proof,model,{started,finished}={}){
  const root=model.root;assert.ok(proof);assert.equal(proof.privatePlannerCopy,false);assert.equal(proof.fixtureAdapter,false);assert.equal(proof.noSourceFallback,true);assert.equal(proof.offlineInstall,true);assert.equal(proof.allPublicBindingsRequested,true);assert.equal(proof.stageRemoved,true);assert.deepEqual(proof.internalBindings,TILE_STACK_INTERNAL_BINDINGS);assert.deepEqual(proof.blockedRequests,[]);
  assert.deepEqual(Object.keys(proof.packages).sort(),['core','renderer']);
  for(const profile of ['core','renderer']){
    const p=proof.packages[profile],want=model.packages[profile];assert.equal(p.name,want.name);assert.equal(p.version,want.version);assert.match(p.archiveSha256,digest);relative(p.archiveFile);assert.ok(p.archiveFile.startsWith('artifacts/distribution/')&&p.archiveFile.endsWith('.tgz'));assert.equal(sha(read(root,p.archiveFile)),p.archiveSha256);const mtime=fs.statSync(fileAt(root,p.archiveFile)).mtimeMs;assert.ok(mtime>=started-2000,'Stale installed archive.');
    assert.deepEqual(p.manifest,want.manifest,'Physical installed manifest does not match all current entries/whitelist.');assert.deepEqual(p.provenance,want.provenance,'Physical installed provenance is incomplete or stale.');assert.deepEqual(p.physicalFiles,want.physicalFiles,'Missing/extra/stale physical installed file.');
  }
  assert.deepEqual(proof.installedFiles,model.profileInputs,'All declared physical package source files must be verified.');assert.deepEqual(proof.hostFiles,model.hostPlan.hostFiles);assert.deepEqual(proof.adaptations,model.hostPlan.adaptations,'Undeclared literal host relocation.');
  const prefix=proof.stagePrefix;assert.match(prefix,/^\/artifacts\/tile-stack-installed-[A-Za-z0-9]{6}\/$/);assert.equal(fs.existsSync(path.join(root,prefix.slice(1))),false,'Installed stage survives cleanup.');assert.ok(Array.isArray(proof.requestedFiles)&&proof.requestedFiles.length);assert.equal(new Set(proof.requestedFiles).size,proof.requestedFiles.length);assert.deepEqual([...proof.requestedFiles].sort(),proof.requestedFiles);
  for(const request of proof.requestedFiles){assert.equal(typeof request,'string');assert.equal(path.posix.normalize(request),request);assert.ok(!/[\\%?#\x00-\x1f\x7f]/.test(request));if(model.hostFiles.some(f=>request===prefix+f))continue;const profile=['core','renderer'].find(p=>request.startsWith(prefix+'node_modules/@nautilus-engine/'+p+'/'));assert.ok(profile,'Source/private-provider fallback: '+request);const file=request.slice((prefix+'node_modules/@nautilus-engine/'+profile+'/').length);relative(file);assert.ok(model.plans[profile].files.includes(file),'Undeclared installed request '+file);}
  for(const b of TILE_STACK_REVIEW_BINDINGS)assert.ok(proof.requestedFiles.includes(prefix+'node_modules/@nautilus-engine/'+b.profile+'/'+b.file),'Unrequested public entry '+b.specifier);for(const b of TILE_STACK_INTERNAL_BINDINGS)assert.ok(proof.requestedFiles.includes(prefix+'node_modules/@nautilus-engine/'+b.profile+'/'+b.file),'Missing labelled internal dependency '+b.file);assert.ok(proof.requestedFiles.includes(prefix+'node_modules/@nautilus-engine/renderer/'+atlas));
}
function assertCaptures(report,model,{started,finished}={}){
  const root=model.root,directory=reportDirectory(report.mode);assert.deepEqual(report.captures.map(c=>c.name),TILE_STACK_REVIEW_CAPTURES);
  return report.captures.map(c=>{assert.equal(c.file,directory+c.name+'.png');assertTileStackReviewSnapshot(c.state);assert.equal(c.checkpointDigest,c.state.checkpointDigest);assert.equal(c.stateSha256,sha(JSON.stringify(c.state)));assert.equal(c.beforeStateSha256,c.stateSha256,'Source changed during screenshot.');const time=timestamp(c.capturedAt);assert.ok(time>=started&&time<=finished);const bytes=read(root,c.file);assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Capture is not PNG.');assert.equal(sha(bytes),c.sha256);const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),phone=c.name.match(/^phone-(390|320)(-full)?$/);if(phone){assert.equal(width,Number(phone[1]));assert.ok(phone[2]?height>=844:height===844);}else assert.deepEqual([width,height],[1600,1100]);const mtime=fs.statSync(fileAt(root,c.file)).mtimeMs;assert.ok(mtime>=started-2000&&mtime<=finished+2000,'Stale PNG capture.');
    for(const [k,value]of Object.entries(model.atlasIdentity))assert.equal(c.state.atlas[k==='sha256'?'verifiedSha256':k==='bytes'?'verifiedBytes':k],value,'Capture loaded a different atlas.');if(c.name==='uniform-overview'){assertStack(c.state,'aft-native-fifteen');assert.equal(c.state.inspection.mode,'overview');}if(c.name==='uniform-cutaway'){assertStack(c.state,'aft-native-fifteen');assert.deepEqual(c.state.inspection,{mode:'cutaway',cutawayFloorId:'F07'});}if(c.name==='nonuniform-overview'){assertStack(c.state,'nonuniform-fifteen');assert.equal(c.state.inspection.mode,'overview');}if(c.name==='original-line-arc-cubic'){assert.equal(c.state.owners.length,3);assert.equal(c.state.inspection.mode,'overview');}if(c.name.startsWith('phone-'))assert.equal(c.state.owners.length,1);
    return {name:c.name,sha256:c.sha256,stateSha256:c.stateSha256,capturedAt:c.capturedAt,state:tileStackSemanticState(c.state)};
  });
}
function gitSource(root){const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:2*1024*1024,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});const [head,headTree]=git('show','-s','--format=%H%n%T','HEAD').trim().split(/\r?\n/);assert.match(head,/^[a-f0-9]{40}$/);assert.match(headTree,/^[a-f0-9]{40}$/);const status=git('status','--porcelain=v1','--untracked-files=normal');return {head,headTree,dirty:status.length>0,statusSha256:sha(status),scope:'HEAD/tree identify the base; current fingerprint identifies dirty bytes. No claim that dirty inputs belong to the HEAD tree.'};}
function writeAggregate(root,result){const directory=path.join(root,'artifacts');if(!fs.existsSync(directory))fs.mkdirSync(directory);assert.equal(fs.lstatSync(directory).isSymbolicLink(),false);const target=path.join(directory,'tile-stack-editor-matrix.json');if(fs.existsSync(target)){assert.equal(fs.lstatSync(target).isSymbolicLink(),false);assert.equal(fs.statSync(target).isFile(),true);}fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');}
export async function verifyTileStackEditorReview({projectRoot=defaultRoot,write=true,now=Date.now(),maxAgeMs=24*60*60*1000}={}){
  const root=path.resolve(projectRoot);assert.ok(Number.isFinite(now)&&Number.isFinite(maxAgeMs)&&maxAgeMs>0);
  try{
    // The trusted current checkout supplies expectations, never a report.
    const model=await tileStackReviewInputModel({projectRoot:root}),summaries=[],semantic={},runIds=new Set(),browsers=new Set();let backend=null;
    for(const mode of modes){
      const directory=reportDirectory(mode),report=json(root,directory+'review.json');assertTileStackReviewEnvelope(report,model,mode);assert.equal(runIds.has(report.runId),false,'Reused run ID.');runIds.add(report.runId);
      const helper=json(root,directory+'helper-process.json'),receipt=json(root,directory+'cleanup-receipt.json'),times=assertTileStackReviewHelper(helper,receipt,{mode}),started=timestamp(report.startedAt),finished=timestamp(report.finishedAt);assert.ok(started<=times.started&&times.stopped<=finished&&finished<=now+2000&&started>=now-maxAgeMs,'Stale or inconsistent review lifetime.');assert.equal(report.lifecycle.helperProcessSha256,sha(read(root,directory+'helper-process.json')));assert.equal(report.lifecycle.cleanupReceiptSha256,sha(read(root,directory+'cleanup-receipt.json')));
      const browserIdentity=JSON.stringify(helper.browser);assert.equal(browsers.has(browserIdentity),false,'Reused browser lifetime.');browsers.add(browserIdentity);for(const f of ['review.json','helper-process.json','cleanup-receipt.json']){const m=fs.statSync(fileAt(root,directory+f)).mtimeMs;assert.ok(m>=started-2000&&m<=finished+2000,'Stale lifecycle file: '+f);}
      for(const f of ['browser-failure.json','workflow-failure.json','workflow-failure.png'])if(fs.existsSync(path.join(root,directory+f)))assert.ok(fs.statSync(fileAt(root,directory+f)).mtimeMs<started,'Fresh failure artifact exists: '+f);
      if(mode==='built')for(const r of model.inputs)assert.equal(sha(read(root,'dist/'+r.file)),r.sha256,'Stale built input '+r.file);
      if(backend===null)backend=report.backend;else assert.deepEqual(report.backend,backend,'Different browser/device configurations.');
      const states=assertTileStackReviewChecks(report.checks),captures=assertCaptures(report,model,{started,finished});for(const c of report.checks)for(const [k,value]of Object.entries(model.atlasIdentity))assert.equal(c.snapshot.atlas[k==='sha256'?'verifiedSha256':k==='bytes'?'verifiedBytes':k],value,'Check loaded a different atlas.');semantic[mode]={checks:states,captures:captures.map(({name,state})=>({name,state}))};
      if(mode==='installed')assertTileStackInstalledProof(report.installation,model,{started,finished});else assert.equal(report.installation,null);
      summaries.push({mode,runId:report.runId,reportSha256:sha(read(root,directory+'review.json')),startedAt:report.startedAt,finishedAt:report.finishedAt,checks:states.length,captures:captures.map(({state,...r})=>r),cleanup:{helperProcessSha256:report.lifecycle.helperProcessSha256,cleanupReceiptSha256:report.lifecycle.cleanupReceiptSha256,port:helper.port,httpClosed:true,browserClosed:true}});
    }
    assert.deepEqual(semantic.built,semantic.source,'Built semantic authority/history/native presentation differs.');assert.deepEqual(semantic.installed,semantic.source,'Installed semantic authority/history/native presentation differs.');
    for(const r of [...model.inputs,...model.verificationInputs,...model.profileInputs])assert.equal(sha(read(root,r.file)),r.sha256,'Current input changed during verification: '+r.file);
    const result={version:1,evidenceVersion:2,status:'pass',checkedAt:new Date(now).toISOString(),source:gitSource(root),inputSha256:model.fingerprint,sourceBindings:model.sourceBindings,modes,requiredChecks:TILE_STACK_REVIEW_CHECKS,requiredCaptures:TILE_STACK_REVIEW_CAPTURES,runs:summaries,sameDefinedSemanticProjection:true,actualDeclaredCoreAndRenderer:true,installedStageRemoved:true,recordedCleanupClosed:true,scope:'Current runtime/tool/source-auth/distribution/package-bound three-mode proof. Captures bind their own observed state/PNG/time. Parity excludes UUIDs, image bytes and timings; it is not full save/pixel byte identity or device performance. Cleanup verifies recorded process/browser identities and closed receipts, not a live port scan. Source authentication itself remains with the Root source fences.'};if(write)writeAggregate(root,result);return result;
  }catch(error){if(write)writeAggregate(root,{version:1,evidenceVersion:2,status:'failed',checkedAt:new Date(now).toISOString(),message:String(error.message).slice(0,4000),scope:'No current matrix pass; any prior aggregate pass is replaced.'});throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);assert.ok(args.length===0&&path.basename(path.dirname(fileURLToPath(import.meta.url)))==='tools'||args.length===2&&args[0]==='--root','Use --root PROJECT when executing the draft outside tools/.');const r=await verifyTileStackEditorReview({projectRoot:args[1]??defaultRoot});console.log(JSON.stringify({status:r.status,inputSha256:r.inputSha256,modes:3,checksPerMode:TILE_STACK_REVIEW_CHECKS.length,capturesPerMode:TILE_STACK_REVIEW_CAPTURES.length}));
}
