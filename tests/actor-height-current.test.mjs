// Current regression checks derived from the sealed actor/height intake.
// Its original verify.test.mjs and evidence hashes remain byte-preserved.
// Bear is a separately reviewed provider; the twelve proposed bindings stay private.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const inventory=read('docs/reviews/actor-height-intake/sources.json');
const measured=read('docs/reviews/actor-height-intake/measurements.json');
const actors=read('packages/assets/bindings/actor-intake-v1.json');
const tall=read('packages/assets/bindings/tall-building-intake-v1.json');
const sha=b=>createHash('sha256').update(b).digest('hex');

test('source records identify complete commits, unique Git paths and closed dependency graphs with exact byte budgets',()=>{
 assert.equal(inventory.baselineCommit,'ddfd43cf4b156eeb82b5c27772fe977ec10b0633');
 for(const s of inventory.sources){
  assert.match(s.commit,/^[a-f0-9]{40}$/);assert.equal(new Set(s.files.map(f=>f.path)).size,s.fileCount);
  assert.equal(s.files.reduce((n,f)=>n+f.bytes,0),s.bytes);
  for(const f of s.files){assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(f.bytes)&&f.bytes>0);assert.equal(path.posix.normalize(f.path),f.path);assert.ok(!f.path.startsWith('/')&&!f.path.startsWith('../')&&!f.path.includes('\\'));}
 }
 for(const c of inventory.closures){
  const s=inventory.sources.find(s=>s.id===c.source),files=new Set(c.files),byPath=new Map(s.files.map(f=>[f.path,f]));
  assert.equal(files.size,c.fileCount);assert.equal([...files].reduce((n,p)=>n+byPath.get(p).bytes,0),c.bytes);
  for(const p of [...c.entries,...c.explicitResourceEnvelope])assert.ok(files.has(p));
  for(const e of c.edges){assert.ok(files.has(e.from)&&files.has(e.to));assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(e.from),e.specifier)),e.to);}
 }
});

test('each existing body factory, data file and normal paint points at unchanged vendored bytes',()=>{
 assert.equal(actors.actors.length,12);assert.equal(new Set(actors.actors.map(a=>a.sourceSpecies)).size,12);
 for(const a of actors.actors){
  for(const source of [a.factory,a.meshData,a.normalPaint]){
   const bytes=fs.readFileSync(path.join(root,source.path));assert.equal(bytes.length,source.bytes);assert.equal(sha(bytes),source.sha256);
  }
  const code=fs.readFileSync(path.join(root,a.factory.path),'utf8');assert.ok(code.includes('export function '+a.factory.export));
  assert.equal(a.factoryAnimationClipCount,0);assert.ok(a.neutralHeight>1&&a.neutralHeight<2);
  assert.ok(a.restBodyGeometry.triangles>=9000&&a.restBodyGeometry.triangles<12000);
  if(a.sourceSpecies==='hen'){assert.equal(a.boneNames.length,11);assert.equal(a.equipment.method,null);}else{assert.equal(a.boneNames.length,17);assert.ok(a.boneNames.includes(a.equipment.rightPalm.bone));}
 }
});

test('existing Misha throw keeps its source marker, one release identity and explicit rock/support blockers',()=>{
 const c=actors.firstRockWorkflowCandidate;
 assert.equal(c.identity.existingName,'Misha');assert.equal(c.identity.existingPresetId,'demolition');assert.equal(c.identity.species,'donkey');
 assert.equal(c.markers.semanticEvents.filter(m=>m.id==='prop-release').length,1);
 assert.equal(c.markers.semanticEvents.find(m=>m.id==='prop-release').seconds,measured.motion.throw.constants.release);
 assert.equal(measured.motion.throw.constants.release,1.92);assert.equal(c.markers.durationSeconds,4.6);
 assert.equal(measured.motion.throw.directRockPropRejected,true);assert.equal(measured.motion.throw.seekRepeatsReleasedState,true);
 assert.ok(measured.motion.throw.largestHeldGripError<1e-5);
 assert.ok(c.measuredClearance.standingHeight>c.measuredClearance.ordinaryDoorHeight);
 assert.ok(c.measuredClearance.minimumProneY<-.12);
});

test('high building binds only real source plates and stair landings, retaining decorative crown and voids',()=>{
 assert.deepEqual(tall.surfaces.map(f=>f.sourceLevel),[1,3,5,7,9,19,23]);
 for(const s of tall.surfaces)assert.ok(Math.abs(s.localSurfaceY-s.sourceLevel*2.12)<1e-8);
 assert.equal(tall.countSemantics.pavilionStories,4);assert.equal(tall.countSemantics.fifteenConnectedOccupiedStoriesVerified,false);
 assert.equal(tall.crown.sourceMarker,36);assert.equal(tall.crown.localHeight,76.32);assert.equal(tall.crown.createFloor,false);
 assert.equal(tall.surfaces.some(s=>s.sourceLevel===36),false);assert.ok(tall.surfaces.filter(s=>s.sourceLevel>=9).every(s=>s.holes.length>0));
 assert.equal(tall.stairs.length,4);assert.equal(tall.stairs.reduce((n,s)=>n+s.treads,0),288);
 for(const s of tall.stairs)for(const l of s.proposedLinks){assert.ok([1,3,5].includes(l.fromSourceLevel));assert.equal(l.toSourceLevel-l.fromSourceLevel,2);assert.ok(Math.abs(l.toY-l.fromY-24*s.treadRiseMetres)<1e-8);}
 assert.equal(tall.ownership.measured.borrowedTextureDisposals,0);assert.equal(tall.ownership.measured.borrowedMaterialDisposals,0);
 assert.equal(tall.ownership.measured.unobservedDisposals,0);assert.equal(tall.ownership.measured.duplicateObservedDisposals,0);
});

test('historical actor/height proposal stays private while only reviewed bear presentation entries are public',()=>{
 const pkg=read('package.json');
 assert.equal(inventory.donorRuntimeBytesImported,0);assert.equal(inventory.upstreamPinsChanged,false);
 for(const document of [actors,tall]){assert.equal(document.status,'proposed-binding-data-only');assert.equal(document.publicExport,null);assert.equal(document.loaderImplementation,null);}
 assert.deepEqual(Object.keys(pkg.exports).filter(k=>k.startsWith('./actors')).sort(),['./actors/bear','./actors/bear/three']);
 assert.equal(pkg.exports['./actors/bear'],'./packages/actors-bear/index.js');assert.equal(pkg.exports['./actors/bear/three'],'./packages/actors-bear/provider.js');
 assert.ok(pkg.files.every(p=>!p.startsWith('packages/assets/bindings/')));
});
