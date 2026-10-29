import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ROCK_ITEM,ROCK_PROFILE,ROCK_CONTRACT,openRock,serializeRock} from '@nautilus-engine/map-core/items';
import {sharedAsset} from '@nautilus-engine/map-core/assets';
import {engineManifest,SCHEMA_IDS,FEATURE_IDS,schemaDocuments} from '@nautilus-engine/map-core/contracts';
import {negotiateCapabilities} from '@nautilus-engine/map-core/capabilities';

test('public rock discovery and capability negotiation describe optional consumer adoption',()=>{
 const asset=sharedAsset(ROCK_ITEM.id);assert.equal(asset.category,'Items');assert.equal(asset.entry,'./items/three');
 assert.equal(asset.dimensions.height,ROCK_PROFILE.radius*2);assert.equal(ROCK_CONTRACT.id,FEATURE_IDS.rockItems);
 asset.source.project='changed';assert.equal(sharedAsset(ROCK_ITEM.id).source.project,'nautilus');
 const need={schema:{id:SCHEMA_IDS.rock,version:1},required:[{id:ROCK_CONTRACT.id,minVersion:1,maxVersion:1}],optional:[]};
 assert.equal(negotiateCapabilities(need).ok,true);
 const host=engineManifest();host.capabilities=host.capabilities.filter(entry=>entry.id!==ROCK_CONTRACT.id);
 const unsupported=negotiateCapabilities(need,host);assert.equal(unsupported.ok,false);assert.equal(unsupported.errors[0].code,'UNSUPPORTED_REQUIRED_FEATURE');
 assert.match(unsupported.errors[0].action,/implementing this feature/);
 host.capabilities.push({id:ROCK_CONTRACT.id,versions:[1]});host.schemas=host.schemas.filter(entry=>entry.id!==SCHEMA_IDS.rock);
 assert.equal(negotiateCapabilities(need,host).errors[0].code,'UNSUPPORTED_SCHEMA');
});

test('published rock schemas resolve independently and golden world state stays canonical',()=>{
 const documents=schemaDocuments();
 for(const id of [SCHEMA_IDS.rock,SCHEMA_IDS.rockNoise]){const entry=documents.find(document=>document.id===id);assert.ok(entry);const schema=JSON.parse(fs.readFileSync(new URL(entry.url),'utf8'));assert.equal(schema.$id,entry.uri);assert.equal(schema.additionalProperties,false);}
 const source=fs.readFileSync(new URL('./fixtures/items/rock-world-v1.json',import.meta.url),'utf8').trimEnd();
 assert.equal(serializeRock(openRock(source)),source);
 assert.throws(()=>openRock({...JSON.parse(source),version:2}),/Unsupported/);
 assert.throws(()=>openRock({...JSON.parse(source),futureInventory:[]}),/Unsupported/);
});

test('rock source record matches the unchanged reviewed donor bytes',()=>{
 const evidence=JSON.parse(fs.readFileSync(new URL('../docs/reviews/2026-10-29-rock-distraction.sources.json',import.meta.url),'utf8'));
 assert.match(evidence.source.commit,/^[a-f0-9]{40}$/);assert.ok(evidence.source.preservedFile.includes(evidence.source.commit));
 const data=fs.readFileSync(new URL('../'+evidence.source.preservedFile,import.meta.url));
 assert.equal(data.length,evidence.source.bytes);
 return import('node:crypto').then(({createHash})=>assert.equal(createHash('sha256').update(data).digest('hex'),evidence.source.sha256));
});
