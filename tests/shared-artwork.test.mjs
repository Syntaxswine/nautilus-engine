import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import * as Assets from '../packages/assets/index.js';
import {listBuildingAssets} from '../packages/assets/files.js';
import {sharedAssetCatalogueSource,checkSharedAssets} from '../tools/shared-assets.mjs';
import {distribution,moduleClosure} from '../tools/distribution.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),expected=JSON.parse(fs.readFileSync(new URL('./fixtures/shared-artwork/expected.json',import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex'),canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v),token=v=>sha(canonical(v));

test('generated palette appends30 rows without changing any of the407 existing asset records',()=>{
 checkSharedAssets();assert.equal(sharedAssetCatalogueSource(),fs.readFileSync(path.join(root,'packages/assets/catalogue.js'),'utf8'));
 const all=Assets.listSharedAssets();assert.equal(all.length,439+24);assert.equal(all.slice(439).filter(r=>r.source.commit==='5d8962e7764bce3fcfff8f4dfd4883bfec97b0ee'&&r.id.startsWith('vehicle:')).length,24);assert.equal(token(all.slice(0,407)),expected.originalAssetRowsDigest);assert.equal(new Set(all.map(r=>r.id)).size,all.length);
 assert.equal(token(Assets.listSharedAssets({category:'Artwork'})),expected.discoveryRowsDigest);assert.equal(Assets.listSharedAssets({category:'Buildings'}).length,61);assert.equal(listBuildingAssets().length,48);
});
test('all canonical record bodies, original defaults, ResourceRefs and image/frame/locator metadata stay exact',()=>{
 const records=Assets.listSharedArtwork();assert.equal(token(records),expected.canonicalRecordsDigest);assert.deepEqual(records.map(({id,revision,contentDigest})=>({id,revision,contentDigest})),expected.pins);
 assert.equal(token(expected.pins.map(p=>Assets.sharedArtworkDefaults(p))),expected.defaultGraphicsDigest);assert.equal(token(expected.pins.map(p=>Assets.sharedArtworkImage(p))),expected.imageDeliveryDigest);
 for(const r of records){const {contentDigest,...body}=r;assert.equal(token(body),contentDigest);assert.deepEqual(Assets.sharedArtwork({id:r.id,revision:r.revision,contentDigest}),r);}
 const defaults=expected.pins.map(p=>Assets.sharedArtworkDefaults(p));assert.equal(defaults.filter(g=>g.form==='stamp').length,29);assert.equal(defaults.filter(g=>g.form==='detail'&&g.wrap==='repeat').length,1);
});
test('exact-pin lookup refuses aliases, unknown content, inherited/accessor/nonenumerable extra fields without getters',()=>{
 const pin=expected.pins[0];for(const value of [pin.id,{id:pin.id},{id:pin.id,version:1,digest:pin.contentDigest},{...pin,latest:true},{...pin,revision:999},{...pin,contentDigest:'0'.repeat(64)},Object.create(pin)])assert.throws(()=>Assets.sharedArtwork(value));
 let calls=0;const accessor={...pin};Object.defineProperty(accessor,'id',{enumerable:true,get(){calls++;return pin.id;}});assert.throws(()=>Assets.sharedArtwork(accessor));assert.equal(calls,0);
 const hidden={...pin};Object.defineProperty(hidden,'extra',{value:true});assert.throws(()=>Assets.sharedArtwork(hidden));const symbol={...pin,[Symbol('extra')]:true};assert.throws(()=>Assets.sharedArtwork(symbol));
 assert.deepEqual(Assets.sharedArtwork(Object.assign(Object.create(null),pin)),Assets.sharedArtwork(pin));
});
test('all public metadata is detached at nested record/default/frame/location and discovery boundaries',()=>{
 const pin=expected.pins[0],record=Assets.sharedArtwork(pin),graphic=Assets.sharedArtworkDefaults(pin),image=Assets.sharedArtworkImage(pin),row=Assets.listSharedAssets({category:'Artwork'})[0];
 record.body.notices[0].noticeText='changed';graphic.transform.pivotUV[0]=999;image.imageView.frame.rectPx[0]=999;image.locations[0].package='changed';image.artist.artwork.id='changed';row.artworkPin.contentDigest='changed';
 assert.equal(token(Assets.listSharedArtwork()),expected.canonicalRecordsDigest);assert.equal(token(expected.pins.map(p=>Assets.sharedArtworkDefaults(p))),expected.defaultGraphicsDigest);assert.equal(token(expected.pins.map(p=>Assets.sharedArtworkImage(p))),expected.imageDeliveryDigest);assert.equal(token(Assets.listSharedAssets({category:'Artwork'})),expected.discoveryRowsDigest);
 assert.equal('sharedArtworkDiscoveryRows' in Assets,false);assert.equal('sharedArtworkPayloadPaths' in Assets,false);
});
test('metadata runtime closure is pure and all four profiles have exact public metadata/types with explicit binary placement',()=>{
 assert.deepEqual(moduleClosure(['packages/assets/index.js']),['packages/assets/artwork.js','packages/assets/catalogue.js','packages/assets/index.js']);
 for(const profile of ['core','renderer','assets','compatibility']){const p=distribution(profile);assert.equal(p.exports[profile==='assets'?'./catalogue':'./assets'],'./packages/assets/index.js');for(const f of ['packages/assets/artwork.js','packages/assets/index.d.ts','packages/assets/artwork.d.ts','packages/tile-authoring-core/index.d.ts','packages/assets/artwork-source.json','docs/shared-artwork.md'])assert.ok(p.files.includes(f),profile+' '+f);for(const f of expected.payloads)assert.equal(p.files.includes(f.path),profile!=='core',profile+' '+f.path);if(profile==='renderer'||profile==='assets')assert.equal(p.files.includes('packages/tile-authoring-core/index.js'),false);}
 for(const pin of expected.pins){const image=Assets.sharedArtworkImage(pin);assert.deepEqual(image.locations.map(l=>l.profile),['renderer','assets','compatibility']);for(const l of image.locations){assert.equal(l.anchorFile,'packages/assets/index.js');assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(l.anchorFile),l.relativeToAnchor)),l.packagePath);}assert.equal(image.readiness,'not-assessed');}
});
test('all six immutable payload/notice bytes and original canonical noticeText survive at public delivery paths',()=>{
 for(const f of expected.payloads){const b=fs.readFileSync(path.join(root,f.path));assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);}
 const notice=fs.readFileSync(path.join(root,'assets/artwork/local-graphics-v1/PROVENANCE.md'),'utf8');for(const r of Assets.listSharedArtwork())assert.ok(r.body.notices.some(n=>n.noticeText===notice));
 assert.equal(expected.payloads.filter(f=>f.kind==='unchanged-png').reduce((n,f)=>n+f.bytes,0),2560200);assert.equal(expected.payloads.reduce((n,f)=>n+f.bytes,0),2608334);
});
