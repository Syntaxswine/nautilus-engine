// Copied by tools/prove-bear-package.mjs into an isolated installed consumer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createBearProvider} from '@nautilus-engine/map-core/actors/bear/three';
import {bearResources,BEAR_OUTFITS,BEAR_WEAPONS} from '@nautilus-engine/map-core/actors/bear';
import {openAppearance,serializeAppearance,AppearanceDocument,assertAppearanceCompatible} from '@nautilus-engine/map-core/appearance';
import {engineManifest} from '@nautilus-engine/map-core/contracts';
import {fakeRenderer,jsonLoader,textureLoader} from './renderer-fixture.mjs';
import {runBearHandoffExample} from './handoff-proof.mjs';
for(const resource of bearResources()){assert.equal(new URL(resource.url).protocol,'file:');assert.ok(fs.statSync(new URL(resource.url)).size>100);}
const provider=createBearProvider({renderer:fakeRenderer(),loadJSON:jsonLoader,loadTexture:textureLoader()});let cases=0;
try{for(const outfit of BEAR_OUTFITS)for(const weapon of BEAR_WEAPONS){const actor=await provider.create({outfit,weapon});assert.equal(actor.worker.weapon.id,weapon);assert.equal(actor.selection.outfit,outfit);actor.dispose();assert.equal(actor.diagnostics().ownedResources,0);cases++;}const speaking=await provider.create({speaking:true});speaking.setJaw(.08);speaking.dispose();}finally{provider.dispose();await provider.whenIdle();}assert.equal(provider.stats().ownedResources,0);
const golden=JSON.parse(fs.readFileSync('golden-block.json','utf8')),data=openAppearance(golden),document=new AppearanceDocument(data);assert.deepEqual(openAppearance(serializeAppearance(document.snapshot())),golden);assertAppearanceCompatible(golden,engineManifest());document.rotate(golden.actors[0].id);assert.ok(document.undo());assert.deepEqual(document.snapshot(),golden);
const handoff=await runBearHandoffExample();
console.log(JSON.stringify({cases,resources:bearResources().map(resource=>({id:resource.id,bytes:fs.statSync(new URL(resource.url)).size,sha256:createHash('sha256').update(fs.readFileSync(new URL(resource.url))).digest('hex')})),appearance:true,ownedResourcesAfterClose:provider.stats().ownedResources,handoff}));
