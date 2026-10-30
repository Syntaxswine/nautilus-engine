// Runs only in an offline installed consumer. A second physical core package
// supplies the opaque-handle rejection check; no renderer/provider is invented.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const name=process.env.NAUTILUS_AUTHORING_PACKAGE,peer=process.env.NAUTILUS_AUTHORING_PEER,declared=process.env.NAUTILUS_AUTHORING_DECLARED==='true';
const A=await import(name+'/windows/authoring'),W=await import(name+'/windows'),F=await import(name+'/adapters/farmyard/windows'),Core=await import(name),Other=await import(peer+'/windows');
const fixtures=JSON.parse(fs.readFileSync(new URL('./authored-fixtures.json',import.meta.url))),source=JSON.parse(fixtures.native),tall=JSON.parse(fixtures.tall),consumer={...Core.engineManifest(),id:'installed-authoring-proof'};
if(!consumer.schemas.some(s=>s.id===A.WINDOW_AUTHORING_CONTRACT.kind))consumer.schemas.push({id:A.WINDOW_AUTHORING_CONTRACT.kind,versions:[1]});
const d=A.createWindowAuthoringDocument(source),before=d.serialize(),id=source.placements[0].id;
assert.equal(d.apply({kind:'move',placementId:id,x:31,y:31.5}).ok,true);const moved=d.serialize();assert.equal(d.undo().ok,true);assert.equal(d.serialize(),before);assert.equal(d.redo().ok,true);assert.equal(d.serialize(),moved);assert.deepEqual(A.openWindowAuthoring(d.serialize()),d.snapshot.document);
const h=A.prepareWindowAuthoring(source),geometry=A.windowAuthoringGeometry(h),projection=A.windowAuthoringGeometryProjection(h),ray={purpose:'projectile',floorId:'ground',from:{x:21,y:24,h:1},to:{x:21,y:19,h:1}};
assert.equal(W.queryWindowSegment(geometry,ray).nearest.kind,'glass');
assert.throws(()=>Other.queryWindowSegment(geometry,ray));
const transported=JSON.parse(JSON.stringify(projection));assert.deepEqual(transported,projection);assert.equal(transported.content[0].placementId,id);assert.equal(transported.content[0].coveredEdges.length,3);
transported.document.placements[0].id='detached';assert.equal(A.windowAuthoringGeometryProjection(h).document.placements[0].id,id);
assert.equal(A.windowAuthoringReadiness(h).saveable,true);assert.equal(A.windowAuthoringReadiness(h).preview.ready,false);assert.equal(A.windowAuthoringReadiness(h).handoff.ready,false);
assert.equal(A.windowAuthoringCompatibility(h,consumer).ok,false);consumer.capabilities.push(...W.WINDOW_HOST_SERVICES.map(s=>({id:s.id,versions:[1]})));assert.equal(A.windowAuthoringCompatibility(h,consumer).ok,true);assert.throws(()=>A.bindWindowAuthoringHandoff(h,consumer,{}));
assert.throws(()=>A.exportWindowAuthoringLegacy(h));assert.equal(A.windowAuthoringGeometryProjection(A.prepareWindowAuthoring(tall)).members.find(m=>m.kind==='glass').bounds.height,10.6);
assert.deepEqual(F.FARMYARD_WINDOW_CATALOGUE.presets.map(p=>p.id),JSON.parse(fs.readFileSync(new URL('tests/fixtures/window-authoring/source-catalogue.json',new URL('./node_modules/'+name+'/',import.meta.url)))).presets.map(p=>p.id));
const card=A.windowAuthoringUsageCard();for(const key of ['guide','schema','registration'])assert.ok(fs.statSync(new URL(card[key])).size>0);assert.equal(JSON.parse(fs.readFileSync(new URL(card.schema))).$id,A.WINDOW_AUTHORING_CONTRACT.schemaUri);assert.match(card.status,/candidate/);
const packageURL=new URL('./node_modules/'+name+'/',import.meta.url),request=JSON.parse(fs.readFileSync(new URL(card.registration))),pkg=JSON.parse(fs.readFileSync(new URL('package.json',packageURL)));
for(const file of request.packageSupport){assert.ok(pkg.files.includes(file));assert.ok(fs.existsSync(new URL(file,packageURL)));}
for(const service of W.WINDOW_HOST_SERVICES)assert.equal(Core.engineManifest().capabilities.some(c=>c.id===service.id),false);
if(declared){assert.equal(pkg.exports['./windows/authoring'],'./packages/windows-authoring/index.js');const s=Core.schemaDocuments().filter(s=>s.id===A.WINDOW_AUTHORING_CONTRACT.kind);assert.equal(s.length,1);assert.equal(s[0].version,1);assert.equal(s[0].uri,A.WINDOW_AUTHORING_CONTRACT.schemaUri);assert.equal(s[0].url,card.schema);}
else {await assert.rejects(import(peer+'/windows/authoring'),error=>error.code==='ERR_PACKAGE_PATH_NOT_EXPORTED');assert.equal((await import(peer)).schemaDocuments().some(s=>s.id===A.WINDOW_AUTHORING_CONTRACT.kind),false);}
const example=await import('./guide-example.mjs');assert.equal(example.reopened.placements[0].dimensions.height,10.6);assert.equal(example.document.snapshot.history.undo,1);assert.equal(example.projection.content.length,1);
assert.equal(globalThis.window,undefined);assert.equal(globalThis.document,undefined);
console.log(JSON.stringify({status:'pass',declared,availability:declared?'actual-declared-core':'private-candidate-overlay',productionAvailability:declared,actualDeclaredAuthoringEntry:declared,sourcePresets:39,guideExample:'executed; only package prefix substituted for private overlay',schemaAndGuideURLs:true,wholeUnderlayRoundTrip:true,undoRedo:true,missingHostRefusal:true,secondPhysicalCoreHandleRejected:true,detachedProjectionTransport:true,presenterTested:false,gameAdopted:false}));
