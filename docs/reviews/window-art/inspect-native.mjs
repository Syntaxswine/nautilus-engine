// Exercises original cached art factories; does not implement a renderer or pane authority.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {ROOT,CACHE,SOURCE,PROPOSAL} from './source-audit.mjs';
const base='sites/tactical-animal/dist/',load=n=>import(pathToFileURL(path.join(CACHE,base,n)));
const [T,C,G,W,S]=await Promise.all([load('aft/tactics/vendor/three.module.js'),load('art/windows/catalog.js'),load('art/windows/geometry.js'),load('window-system.js'),load('window-shatter.js')]);
const fixture=JSON.parse(fs.readFileSync(path.join(CACHE,'approved-proposal.json')));
assert.equal(fixture.sourceCommit,SOURCE);
const sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const triple=b=>({min:b.min.toArray(),max:b.max.toArray()});
const triangles=root=>{let count=0;root.traverse(o=>{if(o.isMesh)count+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});return count;};
const submissions=root=>{let meshes=0,lineObjects=0,lineSegments=0;root.traverse(o=>{if(o.isMesh)meshes++;if(o.isLineSegments){lineObjects++;lineSegments+=(o.geometry.index?.count||o.geometry.attributes.position.count)/2;}});return{meshes,lineObjects,lineSegments,drawObjects:meshes+lineObjects};};
let maximumBoundsError=0,memberChecks=0,paneChecks=0,cases=0;
function checkBox(actual,expected){for(let i=0;i<3;i++)for(const k of ['min','max']){const e=Math.abs(actual[k][i]-expected[k][i]);maximumBoundsError=Math.max(maximumBoundsError,e);assert.ok(e<1e-6,'Native member differs from source query bounds');}}
const fromQuery=b=>({min:[b.x0,b.z0,b.y0],max:[b.x1,b.height,b.y1]});
const catalogue=[],library=G.createWindowLibrary();
for(const definition of C.WINDOW_DEFINITIONS){
 const original=library.build(definition.id);
 try{catalogue.push({id:definition.id,span:original.spec.span,height:original.spec.height,borderless:original.spec.borderless,panes:original.spec.panes.map(p=>p.id),solids:original.spec.solids.map(p=>({id:p.id,role:p.role,material:p.material,bounds:p.bounds})),triangles:triangles(original.root),submissions:submissions(original.root),bounds:triple(new T.Box3().setFromObject(original.root))});}finally{original.dispose();}
 for(const left of [false,true])for(const right of [false,true])for(const rotation of [0,90,180,270]){
  const asset=library.build(definition.id,{joins:{left,right},rotation});
  try{cases++;assert.deepEqual(asset.root.scale.toArray(),[1,1,1]);
   const p={id:'native-'+cases,x:40,y:50,rotation};asset.root.position.set(p.x,0,p.y);asset.root.updateMatrixWorld(true);
   for(const member of asset.solidParts()){const actual=new T.Box3().setFromBufferAttribute(member.geometry.attributes.position).applyMatrix4(member.matrixWorld);checkBox(triple(actual),fromQuery(W.windowBox(p,{...member.bounds,id:member.id},'wall')));memberChecks++;}
   for(const pane of asset.spec.panes){checkBox(asset.paneWorldBounds(pane.id),fromQuery(W.windowBox(p,{...pane.bounds,id:pane.id},'glass')));paneChecks++;}
   const pane=asset.spec.panes[0];asset.setPaneVisible(pane.id,false);assert.equal(asset.paneParts().length,asset.spec.panes.length-1);assert.equal(asset.solidParts().length,asset.spec.solids.length);asset.setPaneVisible(pane.id,true);
  }finally{asset.dispose();}
 }
}
assert.equal(catalogue.length,39);
const fixturePlacements=[];
for(const p of fixture.placements){const a=library.build(p.definitionId,{joins:p.joins,dimensions:p.dimensions,rotation:p.rotation});try{a.root.position.set(p.x,0,p.y);a.root.updateMatrixWorld(true);fixturePlacements.push({placementId:p.id,definitionId:p.definitionId,length:p.id.length,panes:a.spec.panes.map(q=>q.id),bounds:triple(new T.Box3().setFromObject(a.root)),triangles:triangles(a.root)});}finally{a.dispose();}}
const fixtureRotations=[];
for(const row of fixture.rotations){const p=row.placement,a=library.build(p.definitionId,{dimensions:p.dimensions,rotation:p.rotation});try{a.root.position.set(p.x,0,p.y);a.root.updateMatrixWorld(true);checkBox(a.paneWorldBounds('r0c0'),fromQuery(row.bounds));assert.deepEqual(a.spec.panes.map(q=>q.id),row.paneIds);fixtureRotations.push({rotation:p.rotation,paneIds:row.paneIds,matched:true});}finally{a.dispose();}}
const tall=library.build(C.BORDERLESS_WINDOW_ID,{dimensions:{width:20,height:10.6}});let tallSummary;try{assert.equal(tall.spec.panes.length,1);assert.equal(tall.spec.solids.length,0);assert.equal(triangles(tall.root),4);tallSummary={id:tall.spec.id,width:tall.spec.span,height:tall.spec.height,panes:1,solids:0,triangles:4,frameDepth:tall.spec.frameDepth};}finally{tall.dispose();}
const joins=[];
for(const rotation of [0,90,180,270]){
 const a=library.build('window.full.clear.1m',{joins:{right:true},rotation}),b=library.build('window.full.clear.1m',{joins:{left:true},rotation});
 try{b.root.position.copy(new T.Vector3(1,0,0).applyAxisAngle(new T.Vector3(0,1,0),rotation*Math.PI/180));
  const right=a.solidParts().find(p=>p.id==='frame.right'),left=b.solidParts().find(p=>p.id==='frame.left');
  const box=p=>new T.Box3().setFromBufferAttribute(p.geometry.attributes.position).applyMatrix4(p.matrixWorld),A=box(right),B=box(left),size=A.clone().union(B).getSize(new T.Vector3());
  const width=rotation%180?size.z:size.x;assert.ok(Math.abs(width-.055)<1e-6);joins.push({rotation,combinedPostWidth:width,nativePostWidth:.055,paneIds:[a.spec.panes[0].id,b.spec.panes[0].id]});
 }finally{a.dispose();b.dispose();}
}
const styles=[];
for(const finish of C.WINDOW_FINISHES)for(const wall of C.WINDOW_WALLS){const a=library.build('window.waist.grid-3x2.3m',{finish:finish.id,wall});try{const m=a.panes.get('r0c0').glass.material,lower=a.solidParts().find(p=>p.role==='lower-wall'),mesh=a.root.getObjectByName(lower.id);styles.push({finish:finish.id,wall,glass:{color:m.color.getHexString(),roughness:m.roughness,metalness:m.metalness,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite},wallTexture:{width:mesh.material.map.image.width,height:mesh.material.map.image.height,bytes:mesh.material.map.image.data.byteLength},triangles:triangles(a.root)});}finally{a.dispose();}}
library.dispose();library.dispose();
const own=G.createWindowLibrary(),first=own.build('window.waist.grid-2x2.2m'),second=own.build('window.waist.grid-2x2.2m');
const shared=first.panes.get('r0c0').glass.material;let sharedDisposed=0;shared.addEventListener('dispose',()=>sharedDisposed++);
first.setPaneVisible('r0c0',false);assert.equal(second.isPaneVisible('r0c0'),true);first.dispose();assert.equal(sharedDisposed,0);second.paneWorldBounds('r0c0');own.dispose();own.dispose();second.dispose();assert.equal(sharedDisposed,1);
const shatter=[];
for(const [name,bounds]of [['full',C.describeWindow('window.full.clear.1m').panes[0].bounds],['waist',C.describeWindow('window.waist.grid-3x2.3m').panes[0].bounds],['tall-sheet',{min:[-10,0,-.004],max:[10,10.6,.004]}]])for(const direction of [-1,1]){
 const effect=S.createWindowShatter({kind:name==='tall-sheet'?C.BORDERLESS_WINDOW_ID:'window.full.clear.1m',seed:17,direction,bounds,includePane:false});
 try{assert.ok(effect.pieces.length<=70);let minY=Infinity;const samples=[];
  for(const time of [0,.1,.5,1.3,Math.max(1.3,effect.fadeStart),effect.duration-.001,effect.duration]){effect.sample(time);const d=effect.diagnostics();assert.equal(d.intact,false);assert.ok(d.bounds.every(Number.isFinite));const floor=Math.min(...d.bounds.filter((_,i)=>i%3===1));minY=Math.min(minY,floor);samples.push({time,minimumVertexHeight:floor,settled:d.settled,cleared:d.cleared,triangles:d.shards});}
  assert.ok(minY>=.003-1e-6);assert.equal(samples.at(-1).cleared,true);shatter.push({name,direction,pieces:effect.pieces.length,fadeStart:effect.fadeStart,duration:effect.duration,minimumVertexHeight:minY,samples});
 }finally{effect.dispose();effect.dispose();}
}
const moduleFile='aft/tactics/vendor/three.module.js',coreFile='aft/tactics/vendor/three.core.js',existing='vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/';
const normalized=f=>fs.readFileSync(f,'utf8').replaceAll('\r\n','\n');
const three={revision:T.REVISION,moduleSha256:sha(path.join(CACHE,base,moduleFile)),coreSha256:sha(path.join(CACHE,base,coreFile)),sameModuleBytesAsEngine:sha(path.join(CACHE,base,moduleFile))===sha(path.join(ROOT,existing,'three.module.js')),sameCoreBytesAsEngine:sha(path.join(CACHE,base,coreFile))===sha(path.join(ROOT,existing,'three.core.js')),moduleCodeEqualAfterCRLFNormalization:normalized(path.join(CACHE,base,moduleFile))===normalized(path.join(ROOT,existing,'three.module.js')),coreCodeEqualAfterCRLFNormalization:normalized(path.join(CACHE,base,coreFile))===normalized(path.join(ROOT,existing,'three.core.js'))};
const out={schemaVersion:1,sourceCommit:SOURCE,approvedProposal:PROPOSAL,scope:'Original native factory measurements and geometry/state observations; no new renderer, impact authority or provider implementation.',catalogue,cases,memberChecks,paneChecks,maximumBoundsError,fixturePlacements,fixtureRotations,tallSummary,joins,styles,ownership:{independentInstances:true,assetDisposalPreservesSharedMaterial:true,libraryDisposalOnce:true},shatter,three};
const raw='vendor/farmyard-grenades/'+SOURCE+'/sites/tactical-animal/dist/',aft='vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/';
const resources=[['native catalogue','art/windows/catalog.js',raw+'art/windows/catalog.js'],['window system','window-system.js',raw+'window-system.js'],['catalogue wrapper','window-catalogue.js',raw+'window-catalogue.js'],['native geometry','art/windows/geometry.js',raw+'art/windows/geometry.js'],['shatter','window-shatter.js',raw+'window-shatter.js'],['procedural materials','aft/tactics/hybrid-materials.js',aft+'tactics/hybrid-materials.js'],['diagonal roads helper','aft/tactics/diagonal-roads.js',aft+'tactics/diagonal-roads.js'],['audio','assets/audio/glass-smash-rubberduck-cc0.ogg',raw+'assets/audio/glass-smash-rubberduck-cc0.ogg']].map(([role,name,existingPath])=>{const target=path.join(ROOT,existingPath),source=path.join(CACHE,base,name),exists=fs.existsSync(target);return{role,sourcePath:name,existingPath,exists,rawEqual:exists&&sha(source)===sha(target),codeEqualAfterCRLFNormalization:exists&&name.endsWith('.js')?normalized(source)===normalized(target):null};});
fs.writeFileSync(path.join(ROOT,'docs/reviews/window-art/existing-resource-comparison.json'),JSON.stringify(resources,null,2)+'\n');
fs.writeFileSync(path.join(ROOT,'docs/reviews/window-art/measurements.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({definitions:catalogue.length,cases,memberChecks,paneChecks,maximumBoundsError,tall:tallSummary,shatterCases:shatter.length,three}));
