import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {fantasyEquipmentArt,listFantasyEquipmentArt} from '../packages/fantasy-equipment-art/catalogue.js';
import {buildEquipmentGeometry,equipmentGeometryBounds} from '../packages/fantasy-equipment-art/geometry.js';
const reference=JSON.parse(fs.readFileSync(new URL('../assets/fantasy-equipment/painted-v2/baseline-reference.json',import.meta.url)));
const pick=({id,version,axes,grip,sockets,finishes,parts,articulation,units,nativeScale})=>({id,version,axes,grip,sockets,finishes,parts,articulation,units,nativeScale});
test('painted revision keeps every reviewed ID, grip transform, socket name, finish and articulation contract',()=>{
 assert.equal(reference.baseline,'5d19e6198b25e14ef98caf8dbad04ba739f96506');assert.equal(reference.source.tree,'4504277cc6576a7c425c1c6668aa82041403c4bc');assert.deepEqual(listFantasyEquipmentArt().map(c=>c.id),reference.models.map(c=>c.id));for(const old of reference.models)assert.deepEqual(JSON.parse(JSON.stringify(pick(fantasyEquipmentArt(old.id)))),old.metadata);
});
test('all draw/load combinations preserve fixed native marker paths and remain in declared visual bounds',()=>{
 let samples=0;for(const old of reference.models){const card=fantasyEquipmentArt(old.id),draws=['bow','crossbow'].includes(old.id)?Array.from({length:41},(_,i)=>i/40):[0];for(const draw of draws)for(const loaded of [false,true]){const data=buildEquipmentGeometry(old.id,{draw,loaded}),bounds=equipmentGeometryBounds(data);assert.deepEqual(Object.keys(data.anchors),Object.keys(old.anchorsAt0));for(const [name,a] of Object.entries(old.anchorsAt0))for(let i=0;i<3;i++){const expected=a[i]+(old.anchorsAt1[name][i]-a[i])*draw;assert(Math.abs(data.anchors[name][i]-expected)<1e-12,old.id+' '+name);}for(let i=0;i<3;i++){assert(bounds.min[i]>=card.bounds.min[i]-1e-12);assert(bounds.max[i]<=card.bounds.max[i]+1e-12);assert(bounds.min[i]>=old.bounds.min[i]-1e-6);assert(bounds.max[i]<=old.bounds.max[i]+1e-6);}samples++;}}
 assert.equal(samples,190);
});
test('skin detail replaces mesh detail within bounded per-instance texture and total encoded budgets',()=>{
 let before=0,after=0,oldBatches=0,newBatches=0;for(const old of reference.models){const card=fantasyEquipmentArt(old.id);before+=old.resources.triangles;after+=card.resources.triangles;oldBatches+=old.resources.meshBatches;newBatches+=card.resources.meshBatches;assert(card.resources.triangles<=old.resources.triangles);assert.equal(card.resources.textures,1);assert.equal(card.resources.textureBytes,1048576);assert.deepEqual(card.resources.textureSize,[512,512]);if(!['bow','crossbow'].includes(card.id))assert(card.resources.meshBatches<=4);}
 assert(after<before*.4);assert(newBatches<oldBatches);assert(fs.statSync(new URL('../packages/fantasy-equipment-art/paint-data.js',import.meta.url)).size<4*1024*1024);
 const blade=buildEquipmentGeometry('sword'),badge=buildEquipmentGeometry('emblem-metal-shield');assert(blade.batches.some(b=>b.paintRegions.includes('front')));assert(blade.batches.some(b=>b.paintRegions.includes('grip')));assert(badge.batches.some(b=>b.paintRegions.includes('front')&&b.paintRegions.includes('back')));
});
