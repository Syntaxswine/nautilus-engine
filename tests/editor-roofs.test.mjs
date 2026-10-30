import test from 'node:test';
import assert from 'node:assert/strict';
import {EditingDocument} from '../packages/map-core/roof-document.js';
import {blankMap,parseMap,requiredMapFeatures,assertMapCapabilities} from '../packages/map-core/roof-maps.js';
import {blockCanvas,extractBlock,validateBlock,openBlock,placeBlock,applyData} from '../packages/map-core/roof-blocks.js';
import {rotateSceneryBlock,rotateRoof} from '../packages/map-core/roof-rotation.js';
import {generateConnectedMap} from '../packages/map-core/roof-generator.js';
import {generateConnectedMap as legacyGenerate} from '../packages/map-core/prefab-generator.js';
import {ROOF_FEATURE,roofsOf,createSlopedRoof} from '../packages/roof-core/index.js';
import {roofFootprint} from '../packages/map-core/roof-data.js';
import {RoofLayer,ROOF_MAP_OFFSET} from '../apps/editor/roof-scene.js';
import {createRoofGroup,createRoofMaterial,PAINTED_ROOF_MATERIALS} from '../packages/roof-core/three.js';
import * as T from '../packages/render-effects/three.js';

const document=(block=false)=>new EditingDocument().open(JSON.stringify(block?extractBlock(blockCanvas('Roof block')):blankMap('Roof map')));
const command=(options={})=>({tool:'sloped-roof',options:{exact:true,x:4,y:5,width:8,depth:6,eaves:1,style:'gable',axis:'x',direction:1,pitch:30,overhang:.25,material:'slate',seed:27,...options}});
const add=(doc,options)=>{const result=doc.apply(command(options));assert.ok(result.ok,result.error);return result.roofPreview;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('roof preview is nonmutating, seed/settings are saved, and history preserves block metadata',()=>{
  for(const block of [false,true]){
    const doc=document(block),before=doc.export(),preview=doc.preview(command());
    assert.ok(preview.ok,preview.error);assert.equal(doc.export(),before);assert.equal(doc.editor.undo.length,0);
    const roof=add(doc);assert.deepEqual(roof,preview.roofPreview);assert.equal(roof.seed,27);assert.equal(roof.direction,1);
    const map=structuredClone(doc.editor.map);map.slopedRoofs.metadata={reference:['test','opaque'],version:19};map.slopedRoofs.roofs[0].metadata={grain:['fixed']};doc.replace(map);
    const saved=doc.export();assert.ok(doc.apply({tool:'floor',start:{x:17,y:18,z:0}}).ok);
    assert.ok(doc.undo());assert.equal(doc.export(),saved);assert.ok(doc.redo());
    const reopened=new EditingDocument().open(doc.export());assert.deepEqual(JSON.parse(reopened.export()),JSON.parse(doc.export()));
    assert.deepEqual(reopened.map.slopedRoofs.metadata,map.slopedRoofs.metadata);assert.deepEqual(roofsOf(reopened.map)[0].metadata,{grain:['fixed']});
    const snapshot=doc.export();assert.ok(doc.apply({tool:'erase-sloped-roof',options:{id:roof.id}}).ok);
    assert.deepEqual(doc.map.slopedRoofs.metadata,map.slopedRoofs.metadata);assert.equal(roofsOf(doc.map).length,0);
    assert.ok(doc.undo());assert.equal(doc.export(),snapshot);
  }
});

test('dragged rectangles use tile-edge coordinates and eaves remain separate from the editing floor',()=>{
  const doc=document(true),result=doc.apply({tool:'sloped-roof',start:{x:12,y:11,z:0},end:{x:5,y:7,z:0},options:{eaves:4,style:'hip',axis:'y',direction:-1,pitch:35,overhang:.4,material:'clay',seed:42}});
  assert.ok(result.ok,result.error);assert.deepEqual([result.roofPreview.x,result.roofPreview.y,result.roofPreview.width,result.roofPreview.depth],[5,7,8,5]);
  assert.equal(result.roofPreview.z,4);assert.equal(doc.map.levels,5);assert.equal(doc.map.upper.length,4);
  const selected=doc.inspect(7,9,4);assert.equal(selected.type,'sloped-roof');
  assert.notEqual(doc.inspect(7,9,0).type,'sloped-roof');assert.notEqual(doc.inspect(7,9,4,{roofs:false}).type,'sloped-roof');
  assert.equal(ROOF_MAP_OFFSET,-.5);
});

test('opening and ordinary edits preserve omitted compatibility defaults and metadata namespaces',()=>{
  for(const block of [false,true]){
    const source=document(block);add(source);const raw=JSON.parse(source.export());delete raw.slopedRoofs.roofs[0].direction;
    const doc=new EditingDocument().open(JSON.stringify(raw));assert.deepEqual(JSON.parse(doc.export()).slopedRoofs,raw.slopedRoofs);
    assert.ok(doc.apply({tool:'floor',start:{x:17,y:18,z:0}}).ok);assert.deepEqual(JSON.parse(doc.export()).slopedRoofs,raw.slopedRoofs);
    assert.ok(!Object.hasOwn(JSON.parse(doc.export()).slopedRoofs,'metadata'));assert.ok(!Object.hasOwn(JSON.parse(doc.export()).slopedRoofs.roofs[0],'metadata'));
  }
});

test('invalid roofs, malformed envelopes and failed replacements retain history, redo and document flags',()=>{
  const doc=document();add(doc);add(doc,{x:30,y:30});doc.undo();
  const state=()=>({text:doc.export(),undo:doc.editor.undo.length,redo:doc.editor.redo.length,revision:doc.revision,changed:doc.changed});
  const before=state();
  for(const options of [{x:-1},{width:.25},{eaves:0},{eaves:1.5},{eaves:6},{pitch:76},{overhang:2.1},{direction:0},{material:'unknown'},{seed:NaN},{x:239,width:8},{}]){
    assert.equal(doc.apply(command(options)).ok,false,JSON.stringify(options));assert.deepEqual(state(),before);
  }
  for(const extension of [null,{version:2,roofs:[]},{version:1,roofs:'bad'}]){
    const map=JSON.parse(before.text);map.slopedRoofs=extension;
    assert.throws(()=>doc.open(JSON.stringify(map)));assert.deepEqual(state(),before);
    assert.throws(()=>doc.replace(map));assert.deepEqual(state(),before);
    assert.throws(()=>parseMap(JSON.stringify(map)));assert.throws(()=>requiredMapFeatures(map));assert.throws(()=>assertMapCapabilities(map,[ROOF_FEATURE]));
  }
  assert.ok(doc.redo());assert.equal(roofsOf(doc.map).length,2);
});

test('gable, hip and both shed directions retain shape and opaque metadata through four block turns',()=>{
  for(const style of ['gable','hip','shed'])for(const direction of [-1,1]){
    const doc=document(true);add(doc,{style,direction,x:3.25,y:5.5,width:9,depth:6.5});
    doc.editor.map.slopedRoofs.roofs[0].metadata={plate:'preserved',names:['one','two']};doc.editor.map.slopedRoofs.metadata={author:'test'};doc.refresh();
    const block=JSON.parse(doc.export()),snapshot=JSON.stringify(block);let rotated=block;
    for(let n=0;n<4;n++)rotated=rotateSceneryBlock(rotated);
    assert.deepEqual(rotated.slopedRoofs,block.slopedRoofs);assert.equal(JSON.stringify(block),snapshot);
    const first=rotateSceneryBlock(block).slopedRoofs.roofs[0],original=block.slopedRoofs.roofs[0];
    close(first.x,24-original.y-original.depth);close(first.y,original.x);assert.equal(first.axis,'y');
    if(style==='shed')assert.equal(first.direction,-direction);
    const selection=doc.inspect(6,8,1);assert.equal(selection.type,'sloped-roof');
    assert.ok(doc.rotate(selection).ok);assert.ok(doc.undo());assert.equal(doc.export(),JSON.stringify(block,null,2));
  }
  const flipped=rotateRoof({id:'shed',style:'shed',axis:'y',direction:-1,x:4,y:5,width:8,depth:6});assert.equal(flipped.direction,-1);
});

test('capture, placement and replacement preserve native roof data, scoped IDs and copied metadata',()=>{
  const source=document(true);add(source,{style:'shed',direction:-1});source.editor.map.slopedRoofs.metadata={artist:['stable']};source.refresh();
  const block=JSON.parse(source.export()),input=JSON.stringify(block),doc=document();doc.place(block,2,3);
  const roof=roofsOf(doc.map)[0];close(roof.x,52);close(roof.y,77);assert.ok(roof.id.startsWith('s2-3-'));
  const captured=doc.capture(2,3);assert.equal(captured.slopedRoofs.roofs[0].direction,-1);
  assert.deepEqual([captured.slopedRoofs.roofs[0].x,captured.slopedRoofs.roofs[0].y],[4,5]);
  captured.slopedRoofs.metadata.artist.push('local');assert.deepEqual(doc.map.slopedRoofs.metadata,{artist:['stable']});
  assert.equal(JSON.stringify(block),input);const saved=doc.export();doc.place(JSON.parse(document(true).export()),2,3);
  assert.equal(roofsOf(doc.map).length,0);assert.ok(doc.undo());assert.equal(doc.export(),saved);
  assert.equal(roofsOf(openBlock(block)).length,1);assert.equal(validateBlock(block),block);
});

test('quarter-turn data produces the same roof vertices as rotating the original geometry',()=>{
  const vertices=data=>{const points=[];for(let i=0;i<data.positions.length;i+=3)points.push(data.positions.slice(i,i+3));return points;};
  const keys=points=>[...new Set(points.map(p=>p.map(n=>Math.abs(n)<1e-6?'0.000000':n.toFixed(6)).join(',')))].sort();
  for(const style of ['gable','hip','shed'])for(const axis of ['x','y'])for(const direction of [-1,1]){
    const roof={id:'rotation',x:4,y:5,width:8,depth:6,z:1,style,axis,direction,pitch:30,overhang:.25,material:'slate',seed:27};
    const original=vertices(createSlopedRoof(roof)),rotated=vertices(createSlopedRoof(rotateRoof(roof)));
    assert.deepEqual(keys(rotated),keys(original.map(([x,h,y])=>[24-y,h,x])),style+' '+axis+' '+direction);
  }
});

test('crossing roofs and overhangs reject sector capture or replacement before mutation',()=>{
  for(const options of [{x:20,y:30,width:40,depth:8},{x:24.1,y:30,width:8,depth:8,overhang:.25}]){
    const doc=document();add(doc,options);const before=doc.export();
    assert.throws(()=>doc.capture(1,1),/crosses this sector boundary/);
    assert.throws(()=>doc.place(JSON.parse(document(true).export()),1,1),/crosses this sector boundary/);assert.equal(doc.export(),before);
  }
});

test('block metadata conflicts and invalid assembly offsets cannot partially mutate a map',()=>{
  const source=document(true);add(source);const block=JSON.parse(source.export());block.slopedRoofs.metadata={paint:'a'};
  const target=document();add(target,{x:60,y:60});target.editor.map.slopedRoofs.metadata={paint:'b'};target.refresh();
  const before=target.export();assert.throws(()=>target.place(block,2,3),/Conflicting/);assert.equal(target.export(),before);
  const map=structuredClone(target.editor.map),snapshot=JSON.stringify(map);
  assert.throws(()=>applyData(map,block,48,72,true),/Conflicting/);assert.equal(JSON.stringify(map),snapshot);
  for(const offset of [[1,24],[-24,24],[0,240]]){assert.throws(()=>applyData(map,block,...offset,true));assert.equal(JSON.stringify(map),snapshot);}
});

test('whole-building lots reject separate roofs regardless of which is placed first',()=>{
  const roofFirst=document();add(roofFirst,{x:35,y:35,width:30,depth:30});const before=roofFirst.export();
  const result=roofFirst.apply({tool:'building-prefab',start:{x:40,y:40,z:0},options:{asset:'archer-worker',turns:0,clearance:1}});
  assert.equal(result.ok,false);assert.match(result.error,/whole-building prefab/);assert.equal(roofFirst.export(),before);
  const buildingFirst=document(),placed=buildingFirst.apply({tool:'building-prefab',start:{x:40,y:40,z:0},options:{asset:'archer-worker',turns:0,clearance:1}});
  assert.ok(placed.ok,placed.error);const saved=buildingFirst.export(),rejected=buildingFirst.apply(command({x:40,y:40}));
  assert.equal(rejected.ok,false);assert.match(rejected.error,/whole-building prefab/);assert.equal(buildingFirst.export(),saved);
});

test('roof capability rejection is explicit and existing maps retain their no-feature contract',()=>{
  const doc=document();assert.deepEqual(requiredMapFeatures(doc.map),[]);assertMapCapabilities(doc.map);
  add(doc);assert.deepEqual(requiredMapFeatures(doc.map),[ROOF_FEATURE]);assert.throws(()=>assertMapCapabilities(doc.map),/does not support procedural sloped roofs/);
  assert.doesNotThrow(()=>assertMapCapabilities(doc.map,[ROOF_FEATURE]));assert.throws(()=>assertMapCapabilities(doc.map,ROOF_FEATURE),/string array/);
});

test('seeded connected generation retains all roof references and matches the legacy no-roof path',()=>{
  const source=document(true),plain=JSON.parse(source.export());plain.connections={north:'none',east:'none',south:'none',west:'none'};
  assert.deepEqual(generateConnectedMap([plain],19),legacyGenerate([plain],19));
  add(source,{style:'shed',direction:-1});const block=JSON.parse(source.export());block.connections=structuredClone(plain.connections);block.slopedRoofs.metadata={paint:'fixed'};
  const before=JSON.stringify(block),first=generateConnectedMap([block],19),second=generateConnectedMap([block],19);
  assert.deepEqual(first,second);assert.equal(roofsOf(first).length,100);assert.equal(new Set(roofsOf(first).map(r=>r.id)).size,100);
  assert.ok(roofsOf(first).every(r=>r.direction===-1&&r.seed===27));assert.deepEqual(first.slopedRoofs.metadata,{paint:'fixed'});assert.equal(JSON.stringify(block),before);
  first.slopedRoofs.metadata.paint='local';assert.equal(block.slopedRoofs.metadata.paint,'fixed');
});

test('roof scene projects edge coordinates once, reuses unchanged models and releases obsolete previews',()=>{
  const disposed=[],created=[],factory=(T,spec)=>{
    const root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(2,.12,3),new T.MeshBasicMaterial());root.add(mesh);root.position.set(spec.x,spec.z*2.12,spec.y);
    const result={root,dispose(){disposed.push(result);mesh.geometry.dispose();mesh.material.dispose();}};created.push(result);return result;
  };
  const scene=new T.Scene(),layer=new RoofLayer(scene,{factory,preview:true}),spec={id:'test',x:8,y:9,width:8,depth:6,z:1,style:'gable',axis:'x',direction:1,pitch:30,overhang:.25,material:'slate',seed:27};
  const doc=roof=>({map:{slopedRoofs:{version:1,roofs:roof?[roof]:[]}}});
  layer.update(doc(spec));assert.deepEqual(created[0].root.position.toArray(),[7.5,2.12,8.5]);
  layer.update(doc(spec));assert.equal(created.length,1);assert.equal(disposed.length,0);
  layer.update(doc({...spec,pitch:45}),{showAllLevels:false,level:0});assert.equal(created.length,2);assert.equal(disposed.length,1);assert.equal(created[1].root.visible,false);
  layer.update(doc({...spec,pitch:45}),{showAllLevels:false,level:1});assert.equal(created[1].root.visible,true);
  layer.update(doc(null));assert.equal(disposed.length,2);assert.equal(scene.children.length,0);layer.dispose();layer.dispose();assert.equal(disposed.length,2);
});

test('the actual roof renderer retains physical metre bounds in the native map scene',()=>{
  const scene=new T.Scene(),layer=new RoofLayer(scene);
  try{
    for(const style of ['gable','hip','shed']){
      const doc=document(true),roof=add(doc,{style});layer.update(doc,{showAllLevels:true,roofs:true});
      scene.updateMatrixWorld(true);const model=layer.models.get(roof.id),box=new T.Box3().setFromObject(model.root),footprint=roofFootprint(roof);
      close(box.min.x,footprint.x-.5);close(box.min.z,footprint.y-.5);close(box.max.x,footprint.x+footprint.width-.5);close(box.max.z,footprint.y+footprint.depth-.5);
      assert.deepEqual(model.root.scale.toArray(),[1,1,1]);assert.ok(box.max.y>roof.z*2.12);
      layer.update(doc,{roofs:false});assert.equal(model.root.visible,false);
    }
  }finally{layer.dispose();}
  assert.equal(scene.children.length,0);
});

test('roof models borrow the shared paint atlas and repaint without retaining obsolete geometry',()=>{
  const doc=document(true);const roof=add(doc);const scene=new T.Scene(),layer=new RoofLayer(scene),atlas=new T.DataTexture(new Uint8Array(4*4*4),4,4);
  let atlasDisposed=0,geometryDisposed=0;atlas.addEventListener('dispose',()=>atlasDisposed++);
  try{
    layer.update(doc);const old=layer.models.get(roof.id);old.root.traverse(n=>{if(n.isMesh)n.geometry.addEventListener('dispose',()=>geometryDisposed++);});
    layer.setAtlas(atlas);assert.equal(geometryDisposed,1);assert.equal(scene.children.length,1);
    const current=layer.models.get(roof.id);assert.notEqual(current,old);
    current.root.traverse(n=>{if(n.isMesh)for(const material of n.material)assert.equal(material.map,atlas);});
    layer.setAtlas(atlas);assert.equal(layer.models.get(roof.id),current);assert.equal(atlasDisposed,0);
  }finally{layer.dispose();assert.equal(atlasDisposed,0);atlas.dispose();}
  assert.equal(atlasDisposed,1);assert.equal(scene.children.length,0);
});

// What a frame draws: every visible triangle, keyed by its slot material, its mesh's shadow
// flags and the exact world positions, normals, UVs and colours of its vertices.
const drawn=scene=>{
  scene.updateMatrixWorld(true);const out=[],v=new T.Vector3(),shown=node=>{for(let n=node;n;n=n.parent)if(!n.visible)return false;return true;};
  scene.traverse(mesh=>{
    if(!mesh.isMesh||!shown(mesh))return;const g=mesh.geometry,a=g.attributes,index=g.index.array;
    for(const group of Array.isArray(mesh.material)?g.groups:[{start:0,count:index.length,materialIndex:0}])for(let t=group.start;t<group.start+group.count;t+=3){
      const corner=k=>{const i=index[t+k];return [...v.fromBufferAttribute(a.position,i).applyMatrix4(mesh.matrixWorld).toArray(),a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i),a.uv.getX(i),a.uv.getY(i),a.color.getX(i),a.color.getY(i),a.color.getZ(i)].join(',');};
      out.push((Array.isArray(mesh.material)?mesh.material[group.materialIndex]:mesh.material).name+(mesh.castShadow?'+casts':'')+(mesh.receiveShadow?'+receives':'')+'|'+corner(0)+'|'+corner(1)+'|'+corner(2));
    }
  });
  return out.sort();
};
const draws=scene=>{let n=0;scene.traverse(mesh=>{if(mesh.isMesh&&mesh.visible&&mesh.parent?.visible!==false)n+=Array.isArray(mesh.material)?mesh.geometry.groups.length:1;});return n;};
const roofRow=(count,options={})=>Array.from({length:count},(_,i)=>({id:'roof-'+i,x:4+(i%12)*18,y:4+Math.floor(i/12)*14,width:10,depth:8,z:1+i%3,
  style:['gable','hip','shed'][i%3],axis:i%4<2?'x':'y',direction:i%2?1:-1,pitch:30+i%4*5,overhang:.25,material:['slate','clay','metal'][Math.floor(i/3)%3],seed:i,...options}));

test('the scene layer draws its roofs as one mesh: the same triangles, one draw per slot material',()=>{
  const doc={map:{slopedRoofs:{version:1,roofs:roofRow(9)}}},atlas=new T.DataTexture(new Uint8Array(4*4*4),4,4);
  const scene=new T.Scene(),plainScene=new T.Scene(),layer=new RoofLayer(scene,{atlas}),plain=new RoofLayer(plainScene,{atlas,merge:false});
  try{
    for(const options of [{showAllLevels:true,roofs:true},{showAllLevels:false,level:2},{showAllLevels:false,level:1},{showAllLevels:false,level:0},{roofs:false}]){
      layer.update(doc,options);plain.update(doc,options);
      assert.deepEqual(drawn(scene),drawn(plainScene),'merged triangles equal the per-roof triangles: '+JSON.stringify(options));
      const visible=roofsOf(doc.map).filter(roof=>options.roofs!==false&&(options.showAllLevels!==false||roof.z<=options.level));
      // Sorted by level, a cut is a prefix: one draw per material of the visible roofs.
      assert.equal(draws(scene),visible.length?new Set(visible.map(roof=>roof.material)).size+2:0,'draws: '+JSON.stringify(options));
      assert.equal(draws(plainScene),visible.length*3);
      for(const [id,model]of layer.models){assert.equal(model.root.visible,visible.some(roof=>roof.id===id),'roots keep their own visibility');assert.equal(model.root.children[0].visible,false,'shells draw through the merge');}
    }
    assert.ok(layer.merged.mesh.parent===scene,'the merge is in the scene');assert.equal(layer.merged.mesh.geometry.index.array.constructor,Uint16Array);
    // The merge is culled as one mesh: its sphere and box hold every vertex of every roof it draws.
    const merged=layer.merged.mesh;merged.updateMatrixWorld(true);const sphere=merged.geometry.boundingSphere.clone().applyMatrix4(merged.matrixWorld),box=merged.geometry.boundingBox.clone().applyMatrix4(merged.matrixWorld).expandByScalar(1e-9),point=new T.Vector3();let outside=0;
    for(const model of layer.models.values()){const shell=model.root.children[0];shell.updateMatrixWorld(true);const position=shell.geometry.attributes.position;for(let v=0;v<position.count;v++){point.fromBufferAttribute(position,v).applyMatrix4(shell.matrixWorld);if(sphere.distanceToPoint(point)>1e-9||!box.containsPoint(point))outside++;}}
    assert.equal(outside,0,'roof vertices outside the merged bounds');
    // Slot materials are the layer's: one per painted slot, named as the adapter names them,
    // shared by every roof, never the atlas's owner.
    assert.deepEqual([...layer.slots.materials].map(([id,material])=>material.name),Object.keys(PAINTED_ROOF_MATERIALS).map(id=>'roof:'+id));
    assert.equal(createRoofMaterial(T,'slate').name,'roof:slate');
    const shared=new Set(layer.slots.materials.values());
    for(const model of layer.models.values())assert.ok(model.root.children[0].material.every(material=>shared.has(material)&&material.map===atlas));
  }finally{layer.dispose();plain.dispose();}
  assert.equal(scene.children.length,0);atlas.dispose();
});

test('a merged layer rebuilds on edits, restores shells it no longer draws and releases what it owns once',()=>{
  const roofs=roofRow(6),doc=list=>({map:{slopedRoofs:{version:1,roofs:list}}}),atlas=new T.DataTexture(new Uint8Array(4*4*4),4,4),second=new T.DataTexture(new Uint8Array(4*4*4),4,4);
  const scene=new T.Scene(),layer=new RoofLayer(scene,{atlas}),count=(target,map=new Map())=>{map.set(target,0);target.addEventListener('dispose',()=>map.set(target,map.get(target)+1));return map;};
  let atlasDisposed=0;for(const texture of [atlas,second])texture.addEventListener('dispose',()=>atlasDisposed++);
  try{
    layer.update(doc(roofs));const first=layer.merged.mesh,firstGeometry=count(first.geometry);
    layer.update(doc(roofs));assert.equal(layer.merged.mesh,first,'an unchanged document keeps the merge');
    layer.update(doc([...roofs].reverse()));assert.notEqual(layer.merged.mesh,first,'document order breaks ties, so a reorder re-merges');
    assert.equal(firstGeometry.get(first.geometry),1);assert.ok(first.parent===null,'the replaced merge left the scene');
    const pitched=doc(roofs.map((roof,i)=>i===2?{...roof,pitch:45}:roof)),plainScene=new T.Scene(),plain=new RoofLayer(plainScene,{atlas,merge:false});
    try{layer.update(pitched);plain.update(pitched);assert.deepEqual(drawn(scene),drawn(plainScene),'an edited roof re-merges');}finally{plain.dispose();}
    const edited=layer.merged.mesh;
    // One roof left: it draws itself again, with the shared materials.
    layer.update(doc(roofs.slice(0,1)));assert.ok(layer.merged===null,'one roof is not merged');assert.ok(edited.parent===null,'the old merge left the scene');
    const [single]=layer.models.values();assert.equal(single.root.children[0].visible,true);assert.equal(scene.children.length,1);
    // A new atlas rebuilds every roof, then retires each old slot material once.
    layer.update(doc(roofs));const old=new Map();for(const material of layer.slots.materials.values())count(material,old);
    assert.equal(old.size,5);layer.setAtlas(second);assert.deepEqual([...old.values()],[1,1,1,1,1]);
    for(const model of layer.models.values())assert.ok(model.root.children[0].material.every(material=>material.map===second));
    const last=new Map();for(const material of layer.slots.materials.values())count(material,last);const merged=count(layer.merged.mesh.geometry);
    layer.dispose();layer.dispose();assert.deepEqual([...last.values()],[1,1,1,1,1]);assert.deepEqual([...merged.values()],[1]);
    assert.equal(scene.children.length,0);assert.equal(atlasDisposed,0,'the host atlas outlives the layer');
  }finally{layer.dispose();atlas.dispose();second.dispose();}
});

test('roofs the layer cannot merge draw themselves, and a large layer indexes with 32 bits',()=>{
  const factory=(T,spec)=>{const root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(2,.12,3),new T.MeshBasicMaterial());root.add(mesh);return {root,dispose(){mesh.geometry.dispose();mesh.material.dispose();}};};
  const custom=new RoofLayer(new T.Scene(),{factory});
  try{custom.update({map:{slopedRoofs:{version:1,roofs:roofRow(4)}}});assert.ok(custom.merged===null,'a custom factory is not merged');for(const model of custom.models.values())assert.equal(model.root.children[0].visible,true);}
  finally{custom.dispose();}
  // The adapter's own materials, or a root moved off the map offset, would draw wrongly from a merge.
  const own=(T,spec,options)=>createRoofGroup(T,spec,{atlas:options.atlas}),lifted=(T,spec,options)=>{const root=createRoofGroup(T,spec,options);root.position.y=1;return root;};
  const varied=(name,change)=>Object.defineProperty((T,spec,options)=>{const root=createRoofGroup(T,spec,options);change(root,root.children[0]);return root;},'name',{value:name});
  const guarded=[varied('drawRange',(root,shell)=>shell.geometry.setDrawRange(0,30)),varied('morphs',(root,shell)=>{shell.geometry.morphAttributes.position=[shell.geometry.attributes.position.clone()];}),
    varied('hidden',(root,shell)=>{shell.visible=false;}),varied('renderOrder',(root,shell)=>{shell.renderOrder=3;}),varied('rootOrder',root=>{root.renderOrder=3;}),varied('layers',(root,shell)=>shell.layers.set(2)),
    varied('openGroup',(root,shell)=>{shell.geometry.groups[0].count=Infinity;})];
  for(const factory of [own,lifted,...guarded.filter(f=>f.name!=='openGroup')]){
    const scene=new T.Scene(),plainScene=new T.Scene(),layer=new RoofLayer(scene,{factory}),plain=new RoofLayer(plainScene,{factory,merge:false}),doc={map:{slopedRoofs:{version:1,roofs:roofRow(4)}}};
    try{layer.update(doc);plain.update(doc);assert.ok(layer.merged===null,'not merged: '+factory.name);assert.deepEqual(drawn(scene),drawn(plainScene),'drawn as the plain layer draws it: '+factory.name);}finally{layer.dispose();plain.dispose();}
  }
  {const layer=new RoofLayer(new T.Scene(),{factory:guarded.find(f=>f.name==='openGroup')});try{layer.update({map:{slopedRoofs:{version:1,roofs:roofRow(4)}}});assert.ok(layer.merged===null,'not merged: an open-ended group');}finally{layer.dispose();}}
  const scene=new T.Scene(),plainScene=new T.Scene(),layer=new RoofLayer(scene),plain=new RoofLayer(plainScene,{merge:false}),doc={map:{slopedRoofs:{version:1,roofs:roofRow(2000,{x:4,y:4})}}};
  try{
    layer.update(doc);plain.update(doc);const geometry=layer.merged.mesh.geometry;
    assert.ok(geometry.attributes.position.count>65535,'enough vertices to need 32-bit indices: '+geometry.attributes.position.count);
    assert.equal(geometry.index.array.constructor,Uint32Array);const a=drawn(scene),b=drawn(plainScene);assert.equal(a.length,b.length,'triangle count');assert.ok(a.every((t,i)=>t===b[i]),'the 32-bit merge draws exactly the roofs\' triangles');
  }finally{layer.dispose();plain.dispose();}
});
