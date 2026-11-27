import assert from 'node:assert/strict';import fs from'node:fs';import{fileURLToPath}from'node:url';
import * as THREE from '@nautilus-engine/map-core/render-effects/three';
import {fantasyEquipmentArt,listFantasyEquipmentArt} from '@nautilus-engine/map-core/fantasy-equipment-art';
import {createFantasyEquipmentModel} from '@nautilus-engine/map-core/fantasy-equipment-art/three';
import {meleeEquipment,equipmentLoadout} from '@nautilus-engine/map-core/melee';
import {observePaintedModel}from'./model-observation.mjs';
const expected=JSON.parse(fs.readFileSync(new URL('./expected.json',import.meta.url))),originalFetch=globalThis.fetch,actual=[];
assert.equal(typeof globalThis.document,'undefined');globalThis.fetch=()=>{throw Error('Unexpected image/network fetch');};
try{for(const row of expected.models){const value=observePaintedModel(THREE,createFantasyEquipmentModel,row.id,row.finish);assert.deepEqual(value,row);actual.push({id:row.id,finish:row.finish,pixels:value.texture.sha256,uv:value.meshes.map(m=>({name:m.name,sha256:m.uv})),nonOpaquePixels:value.texture.nonOpaquePixels});}}finally{globalThis.fetch=originalFetch;}
assert.equal(actual.length,18);assert.equal(listFantasyEquipmentArt().length,15);assert.equal(meleeEquipment('pick').hands,2);assert.throws(()=>equipmentLoadout('pick','round-wood-shield'),{code:'MELEE_TWO_HANDS'});assert.equal(fantasyEquipmentArt('sword').handoff.provenance,'assets/fantasy-equipment/painted-v2/provenance.json');
await assert.rejects(import('@nautilus-engine/map-core/fantasy-equipment-art/paint-layout'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
const entries=['fantasy-equipment-art','fantasy-equipment-art/three','melee','native-actors/melee/three'],resolved=entries.map(p=>fileURLToPath(import.meta.resolve('@nautilus-engine/map-core/'+p)));assert(resolved.every(p=>p.includes('node_modules')));console.log(JSON.stringify({status:'passed',models:actual,noNetworkFetch:true,noDOM:true,privateLayoutNotExported:true,resolved}));
