import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../packages/render-effects/three.js';
import {createGrenadeOverlay} from '../packages/grenade-ui/view.js';
const data=()=>({actor:{x:2,y:3},point:{x:7,y:8},preview:{ok:true,blast:5,trajectory:[{x:2,y:3,z:1.1},{x:4,y:5,z:2},{x:7,y:8,z:.08}],footprint:[{x:12,y:8},{x:7,y:13},{x:2,y:8},{x:12,y:8}]}});
test('grenade preview forwards accepted geometry and delegates HUD framing without altering caller data',()=>{
 const scene=new THREE.Scene(),calls=[],frame={span:20,target:{x:4,y:5}},overlay=createGrenadeOverlay(THREE,{scene,cameraFrame(...args){calls.push(args);return frame;}}),input=data(),original=structuredClone(input);assert.equal(overlay.update(input),true);
 const line=overlay.root.children[0],positions=Array.from(line.geometry.attributes.position.array);assert.deepEqual(positions,[2,Math.fround(1.1),3,4,2,5,7,Math.fround(.08),8]);assert.deepEqual(input,original);
 const viewport={width:390,height:844,left:16,right:374,top:100,bottom:500};assert.equal(overlay.frame(viewport,12),frame);assert.equal(calls[0][1],viewport);assert.equal(calls[0][2],12);assert.deepEqual(calls[0][0].slice(0,3),original.preview.trajectory);assert.equal(calls[0][0].length,21);
 input.preview.trajectory[0].x=999;assert.equal(overlay.frame(viewport,12),frame);assert.equal(calls[1][0][0].x,2);overlay.dispose();
});
test('unsupported preview hides geometry; self-danger keeps source coral and invalid geometry fails visibly',()=>{
 const overlay=createGrenadeOverlay(THREE,{scene:new THREE.Scene(),cameraFrame:()=>({})}),input=data();input.preview.selfDanger=true;overlay.update(input);assert.equal(overlay.root.children[0].material.color.getHex(),0xf08068);
 assert.equal(overlay.update({...input,preview:{ok:false,reason:'Unsupported floor'}}),false);assert.equal(overlay.root.visible,false);assert.equal(overlay.frame({},12),null);
 input.preview.trajectory[1].z=NaN;assert.throws(()=>overlay.update(input),/finite/);assert.equal(overlay.root.visible,false);overlay.dispose();
});
test('overlay updates and repeated disposal release owned resources once and preserve borrowed scene/art',()=>{
 const scene=new THREE.Scene(),borrowedGeometry=new THREE.BoxGeometry(),borrowedMaterial=new THREE.MeshBasicMaterial(),borrowed=new THREE.Mesh(borrowedGeometry,borrowedMaterial);scene.add(borrowed);let borrowedDisposals=0;borrowedGeometry.addEventListener('dispose',()=>borrowedDisposals++);borrowedMaterial.addEventListener('dispose',()=>borrowedDisposals++);
 const overlay=createGrenadeOverlay(THREE,{scene,cameraFrame:()=>({})}),observed=new Map();const track=()=>{for(const object of overlay.root.children)for(const resource of [object.geometry,object.material])if(!observed.has(resource)){observed.set(resource,0);resource.addEventListener('dispose',()=>observed.set(resource,observed.get(resource)+1));}};track();overlay.update(data());track();overlay.update(data());track();overlay.clear();assert.equal(overlay.root.visible,false);overlay.dispose();overlay.dispose();assert.equal(overlay.root.parent,null);assert.deepEqual(scene.children,[borrowed]);assert.equal(borrowedDisposals,0);for(const count of observed.values())assert.equal(count,1);assert.throws(()=>overlay.update(data()),/disposed/);assert.throws(()=>overlay.frame({},12),/disposed/);borrowedGeometry.dispose();borrowedMaterial.dispose();
});
