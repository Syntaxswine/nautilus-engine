import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as core from '@nautilus-engine/core/tiles';
import {schemaDocuments} from '@nautilus-engine/core/contracts';
import * as T from '@nautilus-engine/renderer/render-effects/three';
import {prepareTileArt,TILE_ART_DEPENDENCY} from '@nautilus-engine/core/tiles/art';
import {createTileArtProvider} from '@nautilus-engine/renderer/tiles/art/three';
import {canonicalTileArtExample,surfaceRecipe,binaryFieldRecipe,pathRecipe,tileArtBundle,tileArtTransforms} from '@nautilus-engine/core/tiles/art/example';
import {boundaryMaterialProof} from './boundary-material-proof.mjs';
import {inputGradeProof} from './input-grade-proof.mjs';
import {tileLifecycleProof} from './lifecycle-proof.mjs';

const expected=JSON.parse(fs.readFileSync(new URL('./expected-installed.json',import.meta.url))),source=expected.source;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const packageURL=name=>new URL('./node_modules/'+name+'/',import.meta.url);
const walk=(url,prefix='')=>fs.readdirSync(new URL(prefix||'.',url),{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(url,prefix+item.name+'/'):[prefix+item.name]);
const read=(url,file)=>fs.readFileSync(new URL(file,url));
function excluded(files){
  for(const file of files){
    assert.equal(file.startsWith('tests/')||file.startsWith('art/curve-tiles/')||file.startsWith('packages/curve-tiles/'),false,'Lab/proof data entered runtime: '+file);
    assert.equal(file.startsWith('vendor/farmyard-grenades/')||file.startsWith('vendor/farmyard-grenade-visuals/'),false,'Raw donor game entered runtime: '+file);
    assert.equal(file.startsWith('docs/reviews/tile-visuals/previews/')||file.startsWith('docs/reviews/curve-tiles/previews/'),false,'Review image entered runtime: '+file);
    assert.equal(file.startsWith('packages/tiles-core/')&&(/-v2\.schema\.json$/.test(file)||['candidate-v2.js','render-model.js','render-plan.js','v2-records.js','v2-shapes.js','zero-exposure.js'].some(name=>file.endsWith('/'+name))||file.includes('/planar-')),false,'Private v2/C1 entered runtime: '+file);
  }
}
const installed={};
for(const [profile,p]of Object.entries(expected.packages)){
  const url=packageURL(p.name),pkg=JSON.parse(read(url,'package.json')),physical=walk(url);
  assert.deepEqual([...pkg.files].sort(),[...p.files,'package-provenance.json'].sort(),profile+' declared whitelist');
  assert.deepEqual(physical.sort(),[...p.files,'package-provenance.json','package.json'].sort(),profile+' physical installed closure');
  excluded(physical);
  for(const file of p.critical)assert.equal(sha(read(url,file.path)),file.sha256,'Installed '+profile+' changed '+file.path);
  installed[profile]={url,pkg};
}
for(const [entry,file]of Object.entries(source.entries)){
  const profile=entry.endsWith('/three')?'renderer':'core',owner=installed[profile];
  assert.equal(owner.pkg.exports[entry],file);
  assert.equal(import.meta.resolve(expected.packages[profile].name+entry.slice(1)),new URL(file,owner.url).href);
  const other=profile==='core'?'renderer':'core';assert.equal(installed[other].pkg.exports[entry],undefined);
}
assert.equal(installed.core.pkg.exports['./tiles'],'./packages/tiles-core/index.js');
assert.equal(core.TILE_CONTRACT.registration.startsWith('declared'),true);
assert.equal(TILE_ART_DEPENDENCY,source.canonicalCoreCheckpoint,'Historical v1 provenance remains708; package availability comes from actual exports.');
for(const file of source.coreFiles.filter(file=>file.path.endsWith('.schema.json'))){
  const url=new URL(file.path,installed.core.url),document=JSON.parse(fs.readFileSync(url)),matches=schemaDocuments().filter(schema=>schema.url===url.href);
  assert.equal(matches.length,1);assert.equal(matches[0].version,1);assert.equal(matches[0].uri,document.$id);
}
const supportURLs={};
for(const [profile,owner]of Object.entries(installed)){
  for(const file of source.packageSupport)assert.ok(read(owner.url,file).length>0,file);
  const metadata=JSON.parse(read(owner.url,'packages/tile-visuals/source.json'));
  assert.equal(metadata.id,'nautilus.native-tile-surfaces');assert.equal(metadata.availability,'registered-optional');
  assert.deepEqual(metadata.acceptedRuntime,source.acceptedRuntime);assert.deepEqual(metadata.runtime,source.runtime);assert.deepEqual(metadata.metadataAdaptations,source.metadataAdaptations);assert.deepEqual(metadata.atlas,source.atlas);
  for(const key of ['guide','notice']){const url=new URL(metadata[key],owner.url);assert.ok(fs.statSync(url).size>0);supportURLs[profile+':'+key]=url.href;}
  assert.equal(sha(read(owner.url,source.threeNotice.path)),source.threeNotice.sha256);
}
assert.equal(sha(read(installed.renderer.url,source.atlas.path)),source.atlas.sha256);
assert.equal(read(installed.renderer.url,source.atlas.path).length,source.atlas.bytes);
const rendererProviderFiles=installed.renderer.pkg.files.filter(file=>file.startsWith('packages/tile-visuals/')&&file.endsWith('.js'));
assert.deepEqual(rendererProviderFiles,source.profiles.renderer.providerFiles);

const bundle=canonicalTileArtExample(core),saved=JSON.stringify(bundle),opened=core.openTileBundle(saved,{requireResolved:true});
const projection=JSON.parse(JSON.stringify(prepareTileArt(core,opened.bundle,{detailsByInstance:{'paving-a':0,'paving-b':2}})));
assert.equal(projection.statuses.presentation.provider,'nautilus.native-tile-surfaces');
const material=new T.MeshStandardMaterial({vertexColors:true});let borrowedDisposals=0;
material.addEventListener('dispose',()=>borrowedDisposals++);
let view,samples=0;
const scene=new T.Scene(),sentinel=new T.Group();scene.add(sentinel);
try{
  view=createTileArtProvider(T,projection,{materialForInstance:()=>material,profileBindings:projection.entries.flatMap(entry=>entry.inspected.ports.map(port=>({profiles:port.profiles,boundaryMaterial:port.geometry.materialIntervals[0].material,material})))});scene.add(view.root);
  for(const port of view.interfaces){
    assert.ok(port.geometry instanceof T.BufferGeometry);
    for(const [attribute,values,divisor]of [['position',port.record.geometry.positions,1e6],['normal',port.record.geometry.normals,1e12],['parameterTangent',port.record.geometry.tangents,1e12]])assert.deepEqual(port.geometry.attributes[attribute].array,new Float32Array(values.flatMap(v=>[v[0]/divisor,v[2]/divisor,v[1]/divisor])));
    assert.deepEqual(port.geometry.attributes.uv.array,new Float32Array(port.record.geometry.uv.flat()));
    const surfaces=view.root.children.find(group=>group.name==='tile:'+port.instanceId).children.filter(mesh=>mesh.userData.role==='canonical-surface');
    for(let i=0;i<port.geometry.attributes.position.count;i++){
      const canonical=['position','normal','uv'].flatMap(key=>Array.from({length:key==='uv'?2:3},(_,j)=>port.geometry.attributes[key].array[i*(key==='uv'?2:3)+j]));
      assert.ok(surfaces.some(mesh=>{const attributes=mesh.geometry.attributes;for(let j=0;j<attributes.position.count;j++){const actual=['position','normal','uv'].flatMap(key=>Array.from({length:key==='uv'?2:3},(_,n)=>attributes[key].array[j*(key==='uv'?2:3)+n]));if(actual.every((value,n)=>value===canonical[n]))return true;}return false;}),'Every canonical interface sample must occur in an actual surface triangle');samples++;
    }
  }
  assert.equal(projection.bundle.recipes.find(recipe=>recipe.id==='path').shape.path.points[1][0],2.123456789);
  assert.equal(JSON.stringify(bundle),saved);assert.deepEqual(projection.bundle,opened.bundle);
  const gameplay=view.statuses.gameplay,gameplayKeys=['query','support','navigation','fire'];
  assert.equal(Object.getPrototypeOf(gameplay),null);
  assert.deepEqual(Reflect.ownKeys(gameplay).sort(),[...gameplayKeys].sort());
  for(const key of gameplayKeys)assert.equal(gameplay[key],'unbound',key);
  view.setResident(['paving-b']);
  const neighbor=view.interfaces.find(port=>port.instanceId==='paving-b'),before=Object.fromEntries(['position','normal','parameterTangent','uv'].map(key=>[key,neighbor.geometry.attributes[key].array.slice()]));
  assert.equal(view.removeInstance('paving-a'),true);
  for(const [key,values]of Object.entries(before))assert.deepEqual(neighbor.geometry.attributes[key].array,values);
}finally{view?.dispose();view?.dispose();if(view)assert.equal(view.diagnostics().ownedGeometry,0);assert.deepEqual(scene.children,[sentinel]);assert.equal(borrowedDisposals,0);material.dispose();}
const api={prepareTileArt,createTileArtProvider},fixtures={surfaceRecipe,binaryFieldRecipe,pathRecipe,tileArtBundle,tileArtTransforms};
const materialReview=boundaryMaterialProof(core,T,api,fixtures),inputReview=inputGradeProof(core,T,api,fixtures);
assert.equal(materialReview.status,'pass',JSON.stringify(materialReview.failures));assert.equal(materialReview.cases.length,48);assert.equal(materialReview.edgesChecked,384);
assert.equal(inputReview.status,'pass',JSON.stringify(inputReview));assert.equal(inputReview.getters.length,12);assert.equal(inputReview.instanceIds.length,14);assert.equal(inputReview.grades.length,7);
const lifecycle=tileLifecycleProof(core,T,api,{...fixtures,canonicalTileArtExample});assert.equal(lifecycle.status,'pass');assert.equal(lifecycle.cases,10);
const example=await import('./guide-example.mjs'),result=example.tileArtExampleResult;
assert.ok(result&&typeof result==='object');assert.equal(result.status,'pass');
for(const key of ['actualPublicEntries','sourceBundlePreserved','canonicalBundleReopened','borrowedPoolSurvived','gameplayUnbound'])assert.equal(result[key],true,key);
assert.equal(result.finalOwnedGeometry,0);
assert.equal(globalThis.document,undefined);assert.equal(globalThis.window,undefined);
console.log(JSON.stringify({status:'pass',availability:'actual-declared-core-and-renderer',actualDeclaredCore:true,actualDeclaredRenderer:true,privateProvider:false,installedRuntimeSupportAtlasAndNoticeHashes:true,publicEntriesAndGuideURLs:true,supportURLs,lifecycle,materialBindingCases:materialReview.cases.length,materialEdgesChecked:materialReview.edgesChecked,accessorCases:inputReview.getters.length,prototypeIdCases:inputReview.instanceIds.length,authoredGradeCases:inputReview.grades.length,coreContract:core.TILE_CONTRACT.version,threeRevision:T.REVISION,canonicalSamplesReferenced:samples,sourceControlsRetained:true,canonicalBundleReopened:true,neighborSurvivedRemoval:true,borrowedResourcesPreserved:true,gameplayUnbound:true,guideExample:result,scope:'Native flat surfaces; editor, body/support/query/navigation/fire/water and game adoption unbound'}));
