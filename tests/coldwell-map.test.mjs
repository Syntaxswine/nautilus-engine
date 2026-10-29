import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {validateMap,parseMap,openDocument,neighbors} from '../packages/map-core/index.js';import {validateWorld} from '../packages/world-core/index.js';
import {createColdwellSurface,coldwellCompanion,coldwellHeightReference,buildColdwellInfill,assertColdwellImport,COLDWELL_SITE} from '../packages/coldwell-map/index.js';import {area,intersect,circle} from '../packages/silo/geometry.js';
const map=createColdwellSurface(),read=p=>JSON.parse(fs.readFileSync(new URL('../maps/coldwell-site/'+p,import.meta.url))),hash=b=>createHash('sha256').update(b).digest('hex');
test('Coldwell surface is deterministic native map data with clear approach, trees and support buildings',()=>{
 assert.equal(globalThis.window,undefined);assert.deepEqual(createColdwellSurface(),map);assert.deepEqual(validateMap(map),[]);assert.deepEqual(parseMap(JSON.stringify(map)),map);
 assert.equal(map.props.filter(p=>p.kind.startsWith('tree')).length,78);assert.equal(map.guards.length,0);assert.equal(map.starts.length,4);assert.equal(map.terrain[190][104],'ground-dirt');
 for(let x=100;x<=107;x++)assert.equal(map.edges[`s:${x}:144`],undefined);assert.equal(map.edges['s:99:144'],'fence-chainlink');
 for(const b of COLDWELL_SITE.buildings){assert.equal(map.edges[`s:${b.doorX}:${b.y+b.depth-1}`],'door-steel-closed');assert.ok(map.upper[0][`${b.x},${b.y}`]);}
});
test('ground paths reach the open gate, building interiors and both surface access approaches',()=>{
 const targets=new Set(['94,139','110,116','119,92','73,118','163,118','104,224']),queue=[{x:104,y:190,z:0}],seen=new Set(['104,190']);
 for(let i=0;i<queue.length&&targets.size;i++){const p=queue[i];targets.delete(p.x+','+p.y);for(const q of neighbors(map,p,undefined,false)){if(q.z!==0)continue;const k=q.x+','+q.y;if(!seen.has(k)){seen.add(k);queue.push(q);}}}
 assert.deepEqual([...targets],[]);
});
test('the surface leaves exact reservations and round boundary infill never fills the silo',()=>{
 assert.equal(map.terrain.flat().filter(t=>t==='void').length,319);for(const r of COLDWELL_SITE.groundReservations)for(let y=r.y;y<r.y+r.depth;y++)for(let x=r.x;x<r.x+r.width;x++)assert.equal(map.terrain[y][x],'void');
 const mesh=buildColdwellInfill(),floor=mesh.semantics.floors[0],hole=circle([149,103],8.5);const sum=floor.cells.reduce((n,c)=>n+c.area,0);assert.ok(Math.abs(sum-(17*17-area(hole)))<1e-7);
 for(const c of floor.cells)for(const p of c.polygons)assert.ok(area(intersect(p,hole))<1e-7);assert.equal(floor.nativeTop,0);assert.equal(mesh.metresPerUnit,1);
});
test('placement preserves signed silo coordinates and all 23 exact world datums',()=>{
 const c=coldwellCompanion(),t=c.coordinates.placement;assert.deepEqual([111+t.x,18+t.y,0+t.h],[149.5,103.5,46.64]);assert.equal(-46.64+t.h,0);assert.deepEqual(c.coordinates.nativeScale,[1,1,1]);assert.equal(-.5+c.coordinates.legacySurfaceToWorld.x,0);assert.equal(239.5+c.coordinates.legacySurfaceToWorld.y,240);
 const w=coldwellHeightReference();assert.deepEqual(validateWorld(w),[]);assert.equal(w.floors.length,23);assert.equal(w.floors[22].elevationM,46.64);assert.equal(w.surfaces.length,0);for(let i=1;i<23;i++)assert.ok(Math.abs(w.floors[i].elevationM-w.floors[i-1].elevationM-2.12)<1e-8);
});
test('a receiver cannot strip required silo geometry or claim an unsupported surface-only import',()=>{
 const bundle=read('map.bundle.json');assert.throws(()=>assertColdwellImport(bundle,{capabilities:[]}),e=>e.code==='UNSUPPORTED_COLDWELL_MAP'&&e.diagnostics.length===5);
 assert.deepEqual(assertColdwellImport(bundle,{capabilities:bundle.requiredCapabilities}),bundle);
 for(const edit of [b=>b.requiredCapabilities=[],b=>b.companion.required=false,b=>b.companion.file='surface.map.json',b=>b.source.siloCommit='moving-main']){const b=structuredClone(bundle);edit(b);assert.throws(()=>assertColdwellImport(b,{capabilities:bundle.requiredCapabilities}),/complete versioned/);}
});
test('native edits, undo/redo and saved reload retain the authored surface and separate companion',()=>{
 const d=openDocument(map),before=d.export(),companion=JSON.stringify(coldwellCompanion());assert.ok(d.apply({tool:'floor',start:{x:103,y:186,z:0}}).ok);const after=d.export();assert.notEqual(after,before);d.undo();assert.equal(d.export(),before);d.redo();assert.equal(d.export(),after);assert.equal(openDocument(after).export(),after);assert.equal(JSON.stringify(coldwellCompanion()),companion);
});
test('all delivered map components match their hashes and the real Farmyard importer reports refusal',()=>{
 const b=read('map.bundle.json');for(const f of b.files){const bytes=fs.readFileSync(new URL('../maps/coldwell-site/'+f.file,import.meta.url));assert.equal(hash(bytes),f.sha256);assert.equal(bytes.length,f.bytes);}
 assert.deepEqual(read('surface.map.json'),map);const packed=read('surface.map.rle.json'),flat=packed.terrainRLE.flatMap(([t,n])=>Array(n).fill(t));assert.deepEqual(flat,map.terrain.flat());
 const report=JSON.parse(fs.readFileSync(new URL('../docs/reviews/coldwell-map/compatibility.json',import.meta.url)));assert.equal(report.farmyard.acceptedByCurrentImporter,false);assert.ok(report.farmyard.probes.every(p=>p.result==='rejected'));assert.equal(report.farmyard.sources.length,3);assert.equal(report.engineCommit,COLDWELL_SITE.engineCommit);
});
