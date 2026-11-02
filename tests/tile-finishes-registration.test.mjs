import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
// Headless metadata only: no finish adapter, geometry provider, Three or browser.
import {tileFinishCatalogue,tileFinishBinding,tileFinishFamily,tileFinishChoice,TILE_FINISH_ATLAS,TILE_FINISH_CONTENT_DIGEST,TILE_FINISH_BASE,TILE_FINISH_RUNTIME} from '../packages/tile-finishes/catalogue.js';

const artist='6df9c11fc6cf7fabf0e7a7d0e8acc4ee753e6c03',root=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const publicDigest='5b4c25105568a1f99569dbb6bd2d6308c067bbb41763c4bd6bfddfa3552bc0e1',privateDigest='4da6c7e85b9819aa6c6d847b0447d5baa80db77a824a04e24579209ccc0c381b';
const sourceBytes=fs.readFileSync(new URL('../packages/tile-finishes/source.json',import.meta.url));
assert.equal(sha(sourceBytes),'a01866a7380fa15e56a10d8f72e5c0100aeebc633d495e801623282236751dd1');
const source=JSON.parse(sourceBytes),originalBytes=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show',artist+':candidates/tile-stack/art/catalogue.js'],{windowsHide:true,maxBuffer:8*1024*1024});
assert.equal(sha(originalBytes),source.runtime.find(r=>r.sourcePath==='candidates/tile-stack/art/catalogue.js').sourceSha256);
// Historical immutable metadata comparison, not a private provider fallback.
const historical=await import('data:text/javascript;base64,'+originalBytes.toString('base64'));
const catalogue=tileFinishCatalogue(),original=historical.tileFinishCatalogue();
function deeplyFrozen(value,seen=new Set()){
  if(!value||typeof value!=='object'||seen.has(value))return;
  seen.add(value);assert.equal(Object.isFrozen(value),true);for(const v of Object.values(value))deeplyFrozen(v,seen);
}

test('registered finish library has a distinct whole-content binding and deeply frozen metadata',()=>{
  const {digest,...content}=catalogue,{digest:oldDigest,...oldContent}=original;
  assert.equal(digest,publicDigest);assert.equal(TILE_FINISH_CONTENT_DIGEST,publicDigest);assert.equal(sha(Buffer.from(JSON.stringify(content))),publicDigest);
  assert.equal(oldDigest,privateDigest);assert.equal(sha(Buffer.from(JSON.stringify(oldContent))),privateDigest);
  assert.equal(catalogue.id,'nautilus-tile-finish-library');assert.equal(original.id,'nautilus-tile-finish-catalogue');assert.notEqual(catalogue.id,original.id);assert.notEqual(digest,oldDigest);
  assert.deepEqual(tileFinishBinding(),{id:catalogue.id,version:1,digest:publicDigest});assert.deepEqual(historical.tileFinishBinding(),{id:original.id,version:1,digest:privateDigest});
  assert.equal(catalogue.saveBinding.catalogueId,catalogue.id);assert.equal(catalogue.saveBinding.catalogueVersion,1);assert.equal(tileFinishCatalogue(),catalogue);
  deeplyFrozen(catalogue);assert.equal(Object.isFrozen(tileFinishBinding()),true);
});

test('promotion retains all four original appearance, physical boundary, seed, resource and limit records',()=>{
  assert.equal(catalogue.families.length,4);assert.equal(TILE_FINISH_BASE,historical.TILE_FINISH_BASE);assert.equal(TILE_FINISH_RUNTIME,historical.TILE_FINISH_RUNTIME);
  assert.deepEqual(TILE_FINISH_ATLAS,original.atlas);assert.deepEqual(catalogue.legacyCompatibility,original.legacyCompatibility);
  for(const old of original.families){
    const expected=structuredClone(old);expected.availability='registered-optional';expected.example='examples/tile-stack-editor.html';expected.builderChecklist='packages/tile-finishes/README.md';
    assert.deepEqual(tileFinishFamily(old.id),expected);assert.equal(tileFinishFamily(old.id).limits.newTextures,0);assert.equal(tileFinishFamily(old.id).limits.ownedGeometry,0);
  }
  assert.equal(tileFinishFamily('unknown-finish'),null);assert.equal(catalogue.atlas,TILE_FINISH_ATLAS);
});

test('saved finish choices retain finite explicit IDs and seeds and refuse accessors without invoking them',()=>{
  for(const family of catalogue.families)for(const variantSeed of [0,1,771,4294967295]){
    const input={skinId:family.id,version:1,variantSeed},snapshot=structuredClone(input),result=tileFinishChoice(input);
    assert.deepEqual(result,input);assert.deepEqual(input,snapshot);assert.notEqual(result,input);assert.equal(Object.isFrozen(result),true);
  }
  for(const changed of [{skinId:'unknown'},{version:2},{variantSeed:-0},{variantSeed:-1},{variantSeed:4294967296},{variantSeed:1.5},{variantSeed:Infinity},{extra:'must refuse'}]){
    assert.throws(()=>tileFinishChoice({skinId:catalogue.families[0].id,version:1,variantSeed:0,...changed}),e=>e.code==='INVALID_FINISH_CHOICE');
  }
  let calls=0;const hostile={version:1,variantSeed:0};Object.defineProperty(hostile,'skinId',{enumerable:true,get(){calls++;return catalogue.families[0].id;}});
  assert.throws(()=>tileFinishChoice(hostile),e=>e.code==='INVALID_FINISH_CHOICE');assert.equal(calls,0);
  const inherited=Object.assign(Object.create({skinId:catalogue.families[0].id}),{version:1,variantSeed:0});assert.throws(()=>tileFinishChoice(inherited),e=>e.code==='INVALID_FINISH_CHOICE');
});

test('catalogue declares the separately pinned provider correction and reuses the original atlas bytes',()=>{
  assert.deepEqual(original.providerRefusals.map(r=>r.transform),[{quarterTurns:1,mirrorX:false},{quarterTurns:3,mirrorX:true}]);
  assert.deepEqual(catalogue.providerRefusals,[]);assert.deepEqual(catalogue.providerCorrections,[{
    sourceCommit:'93a94778779b800227f3886b1ca63fae1abc2543',target:'packages/tile-visuals/prepare.js',
    patchSha256:'c7eac2b728479132a4badd9ab2fc819fead29530e6fe2dee07f862289cbe6173',
    baseSha256:'eaaee23e079ed9e0d0f91454b1ffcbe732f053f6f44cc63ef612db15dd7e287e',
    sha256:'fb6ec8359a1ca2c3bfd739861cb7734d70f65a7ec5fe57375c357c536998d7e3',
    scope:'Generated arc startRad only; authored numeric validation unchanged'
  }]);
  assert.equal(source.providerCorrection.sourceCommit,catalogue.providerCorrections[0].sourceCommit);
  assert.equal(sha(fs.readFileSync(new URL('../packages/tile-visuals/prepare.js',import.meta.url))),catalogue.providerCorrections[0].sha256);
  const atlas=fs.readFileSync(new URL('../assets/buildings/painted-materials-v2.png',import.meta.url));assert.equal(atlas.length,TILE_FINISH_ATLAS.bytes);assert.equal(sha(atlas),TILE_FINISH_ATLAS.sha256);
});
