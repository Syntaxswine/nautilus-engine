import assert from 'node:assert/strict';
import * as core from '@nautilus-engine/core';
import * as T from '@nautilus-engine/renderer/render-effects/three';
import {createCurveTileDocument,compileCurveTiles} from '@nautilus-engine/curve-tile-art-candidate';
import {createCurveTilePreview} from '@nautilus-engine/curve-tile-art-candidate/three';
import {curveTileStudies} from '@nautilus-engine/curve-tile-art-candidate/catalogue';
import {createHeightProfileStudy} from '@nautilus-engine/curve-tile-art-candidate/families/heights';
import {createProfileSweepStudy,sweepStudy} from '@nautilus-engine/curve-tile-art-candidate/families/sweeps';
assert.equal(globalThis.document,undefined);assert.equal(curveTileStudies().length,294);
const map=core.blankMap('Installed artist proof'),before=JSON.stringify(map);assert.ok(Array.isArray(core.validateMap(map)));
const material=new T.MeshStandardMaterial(),materials={surface:material,base:material,side:material},scene=new T.Scene(),sentinel=new T.Group();scene.add(sentinel);let borrowedDisposals=0;material.addEventListener('dispose',()=>borrowedDisposals++);
const document=createCurveTileDocument({kind:'ring',center:[2.17,2.31],radius:1.43,width:.63}),cells=[];for(let y=0;y<4;y++)for(let x=0;x<4;x++)cells.push([x,y]);
// Only plain detached art mesh records cross this private provider seam.
const detached=JSON.parse(JSON.stringify(compileCurveTiles(document,cells).tiles)),view=createCurveTilePreview(T,detached,{materials,seed:17}),height=createHeightProfileStudy(T,{material}),sweep=createProfileSweepStudy(T,{...sweepStudy('cornice'),material});
for(const v of [view,height,sweep]){scene.add(v.root);assert.ok(v.root instanceof T.Group);for(const child of v.root.children)assert.ok(child.geometry instanceof T.BufferGeometry);}
view.dispose();view.dispose();height.dispose();sweep.dispose();assert.deepEqual(scene.children,[sentinel]);assert.equal(borrowedDisposals,0);assert.equal(JSON.stringify(map),before);material.dispose();assert.equal(borrowedDisposals,1);
console.log(JSON.stringify({status:'pass',studies:294,hostThreeRevision:T.REVISION,headless:true,borrowedResourcesPreserved:true,coreMapUnchanged:true,canonicalTileCoreAvailable:typeof core.createTileCatalogue==='function',qualification:'Actual declared core/renderer packages plus a private artist-candidate package. This does not prove frozen TileRecipe binding, engine registration, editor repair or game adoption.'}));
