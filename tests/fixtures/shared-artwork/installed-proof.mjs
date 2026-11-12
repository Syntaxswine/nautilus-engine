// Runs inside one ordinary offline consumer with exactly one engine package.
// The source checkout contributes only this proof/expected hashes, never runtime.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const expected=JSON.parse(fs.readFileSync('expected.json')),sha=b=>createHash('sha256').update(b).digest('hex'),canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v),token=v=>sha(canonical(v));
const {profile,plan,fixture}=expected,anchor=import.meta.resolve(expected.specifier),packageRoot=path.resolve('node_modules',...plan.name.split('/'));
assert.equal(fs.realpathSync(new URL(anchor)),path.join(fs.realpathSync(packageRoot),'packages/assets/index.js'));
assert.deepEqual(fs.readdirSync('node_modules/@nautilus-engine').sort(),[plan.name.split('/')[1]]);
const manifest=JSON.parse(fs.readFileSync(path.join(packageRoot,'package.json')));assert.equal(manifest.name,plan.name);assert.deepEqual(manifest.exports,plan.exports);assert.equal(manifest.dependencies,undefined);
function walk(dir,base=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{assert.equal(e.isSymbolicLink(),false);const rel=base+e.name;return e.isDirectory()?walk(path.join(dir,e.name),rel+'/'):[rel];}).sort();}
assert.deepEqual(walk(packageRoot),[...new Set([...plan.files.map(f=>f.file),'package.json','package-provenance.json'])].sort());
for(const f of plan.files){const b=fs.readFileSync(path.join(packageRoot,f.file));assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256,f.file);}
const provenance=JSON.parse(fs.readFileSync(path.join(packageRoot,'package-provenance.json')));assert.equal(provenance.profile,profile);assert.deepEqual(provenance.files,plan.files.map(({file,bytes,sha256})=>({path:file,bytes,sha256})));
assert.equal(walk(packageRoot).some(f=>/^(?:candidates|artifacts|tests|tools)\//.test(f)),false);
const previousFetch=globalThis.fetch;let fetchCalls=0;globalThis.fetch=()=>{fetchCalls++;throw Error('Metadata must not fetch');};
let Assets;try{Assets=await import(expected.specifier);}finally{globalThis.fetch=previousFetch;}assert.equal(fetchCalls,0);assert.equal(typeof globalThis.window,'undefined');assert.equal(typeof globalThis.document,'undefined');
const records=Assets.listSharedArtwork();assert.equal(token(records),fixture.canonicalRecordsDigest);assert.equal(token(fixture.pins.map(p=>Assets.sharedArtworkDefaults(p))),fixture.defaultGraphicsDigest);assert.equal(token(fixture.pins.map(p=>Assets.sharedArtworkImage(p))),fixture.imageDeliveryDigest);
const all=Assets.listSharedAssets(),railway=Assets.listSharedAssets({category:'Railway'}),reviewed=fixture.railway;
const vehicles=Assets.listSharedAssets({category:'Vehicles'}),vehiclePins=fixture.roadVehicles,vehicleStart=reviewed.precedingRows+reviewed.ids.length;
assert.equal(vehicles.length,vehiclePins.count);assert.equal(token(vehicles),vehiclePins.rowsDigest,'Reviewed complete vehicle metadata');
assert.equal(all.length,vehicleStart+vehiclePins.count);
assert.equal(token(all.slice(0,reviewed.precedingRows)),reviewed.precedingRowsDigest,'Complete catalogue before Railway');
assert.deepEqual(all.slice(reviewed.precedingRows,vehicleStart),railway,'Railway retains its exact two reviewed rows');
assert.deepEqual(all.slice(vehicleStart),vehicles,'Only the reviewed 24 vehicle rows follow Railway');
assert.deepEqual(railway.map(row=>row.id),reviewed.ids);
assert.equal(token(railway),reviewed.rowsDigest,'Reviewed Railway rows');
assert.equal(token(all.slice(0,407)),fixture.originalAssetRowsDigest);assert.equal(token(Assets.listSharedAssets({category:'Artwork'})),fixture.discoveryRowsDigest);assert.equal(Assets.listSharedAssets({category:'Buildings'}).length,61);
assert.equal('sharedArtworkDiscoveryRows' in Assets,false);assert.equal('sharedArtworkPayloadPaths' in Assets,false);
const first=fixture.pins[0],changed=Assets.sharedArtwork(first);changed.body.notices[0].noticeText='consumer change';assert.equal(token(Assets.listSharedArtwork()),fixture.canonicalRecordsDigest);assert.throws(()=>Assets.sharedArtwork({...first,revision:999}));assert.throws(()=>Assets.sharedArtwork({id:first.id,version:1,digest:first.contentDigest}));
let files=0;for(const f of fixture.payloads){const present=fs.existsSync(path.join(packageRoot,f.path));assert.equal(present,profile!=='core',f.path);if(present){const b=fs.readFileSync(path.join(packageRoot,f.path));assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);files++;}}
const imagePaths=new Set();for(const pin of fixture.pins){const image=Assets.sharedArtworkImage(pin);assert.equal(image.readiness,'not-assessed');assert.equal(image.locations.some(l=>l.profile==='core'),false);if(profile==='core'){assert.equal(image.locations.some(l=>l.package===plan.name),false);continue;}const l=image.locations.find(l=>l.profile===profile);assert.ok(l);assert.equal(l.package,plan.name);assert.equal(l.anchorSpecifier,expected.specifier);const locatorAnchor=import.meta.resolve(l.anchorSpecifier);assert.equal(locatorAnchor,anchor);const png=new URL(l.relativeToAnchor,locatorAnchor),body=fs.readFileSync(png);assert.equal(fs.realpathSync(png),fs.realpathSync(path.join(packageRoot,l.packagePath)));assert.equal(body.length,image.blob.byteLength);assert.equal(sha(body),image.blob.sha256);assert.deepEqual([body.readUInt32BE(16),body.readUInt32BE(20)],[image.blob.widthPx,image.blob.heightPx]);imagePaths.add(l.packagePath);}
assert.equal(imagePaths.size,profile==='core'?0:2);
for(const file of ['packages/assets/index.d.ts','packages/assets/artwork.d.ts','packages/tile-authoring-core/index.d.ts'])assert.ok(fs.existsSync(path.join(packageRoot,file)));
if(profile==='renderer'||profile==='assets')assert.equal(fs.existsSync(path.join(packageRoot,'packages/tile-authoring-core/index.js')),false);
if(profile==='assets'){const {listBuildingAssets,buildingAssetURLs}=await import(plan.name);assert.equal(listBuildingAssets().length,48);assert.ok(fs.statSync(new URL(buildingAssetURLs('bramble-ranch').model)).size>0);}
console.log(JSON.stringify({status:'pass',profile,package:plan.name,specifier:expected.specifier,physicalFiles:plan.files.length+2,records:30,oldRowsExact:407,preRailwayRowsExact:reviewed.precedingRows,railwayRowsExact:railway.length,railwayKitCommit:reviewed.kitCommit,buildings:61,payloadFiles:files,pngPages:imagePaths.size,pureMetadataFetchCalls:fetchCalls,coreRuntimeRequired:false,privateOrSourceFallback:false,declarations:'physical closure; real compiler is a separate required driver step'}));
