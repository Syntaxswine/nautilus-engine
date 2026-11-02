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
