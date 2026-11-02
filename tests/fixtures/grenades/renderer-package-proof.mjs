import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '@nautilus-engine/renderer/render-effects/three';
import {createGrenadeModel,createNativeGrenadePresentation,grenadeVisualResourceURLs} from '@nautilus-engine/renderer/grenades/three';
import {createGrenadeOverlay} from '@nautilus-engine/renderer/grenades/view';

const base=new URL('node_modules/@nautilus-engine/renderer/',import.meta.url);
const provenance=JSON.parse(fs.readFileSync(new URL('package-provenance.json',base)));
assert.equal(provenance.profile,'renderer');
const urls=grenadeVisualResourceURLs();assert.deepEqual(Object.keys(urls).sort(),['grenadePaint','horseData','horsePaint']);
for(const [name,url]of Object.entries(urls)){
 assert.ok(url.startsWith(base.href),'Installed resource must stay in its package');
 const bytes=fs.readFileSync(new URL(url)),record=provenance.files.find(record=>new URL(record.path,base).href===url);
 assert.ok(record,name+' provenance');assert.equal(bytes.length,record.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
 if(name!=='horseData')assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
}
for(const folder of ['vendor/farmyard-grenades/','vendor/farmyard-grenade-visuals/'])assert.equal(fs.existsSync(new URL(folder,base)),false);
const hostTexture=new T.Texture();let borrowedDisposals=0;hostTexture.addEventListener('dispose',()=>borrowedDisposals++);
const prop=await createGrenadeModel({texture:hostTexture});
assert.ok(prop.root instanceof T.Group);assert.equal(prop.triangles,820);assert.equal(prop.parts.length,5);prop.dispose();prop.dispose();assert.equal(borrowedDisposals,0);
const visual=await createNativeGrenadePresentation({presentationId:'["installed-grenade",1]',horseData:JSON.parse(fs.readFileSync(new URL(urls.horseData))),horseTexture:hostTexture,grenadeTexture:hostTexture,
 preparePaint({texture}){const material=new T.MeshBasicMaterial({map:texture});return {material,dispose(){material.dispose();texture.dispose();}};}});
assert.ok(visual.root instanceof T.Group);
try{
 const pose=visual.seek({elapsedSeconds:1.92,actor:{x:0,y:0,h:0,headingRad:0},projectile:{state:'flying',x:0,y:0,h:1.1}});
 assert.deepEqual(pose.nativeScale,[1,1,1]);assert.ok(Math.abs(pose.releasePoint[1]-1.5672673578529783)<1e-7);assert.equal(pose.visibleCasingMeshes,3);
 assert.deepEqual(pose.authoritativePoint,[0,1.1,0]);assert.equal(pose.cosmeticOnly,true);
 visual.seek({elapsedSeconds:2.1,actor:{x:0,y:0,h:0,headingRad:0},projectile:{state:'ended'}});
 assert.equal(visual.diagnostics().visibleCasingMeshes,0);
}finally{visual.dispose();}
const scene=new T.Scene(),retained=new T.Group();scene.add(retained);
const overlay=createGrenadeOverlay(T,{scene,cameraFrame:()=>null});overlay.dispose();overlay.dispose();assert.deepEqual(scene.children,[retained]);
assert.equal(borrowedDisposals,0);hostTexture.dispose();assert.equal(borrowedDisposals,1);
console.log('Installed optional renderer: public native grenade/horse, shared Three, exact packaged resources, cosmetic release, overlay and borrowed-resource cleanup pass.');
