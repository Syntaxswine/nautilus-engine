import test from 'node:test';
import assert from 'node:assert/strict';
import {DESIGNS} from '../packages/building-catalog/index.js';
import {buildEditorBuilding,editorBuildingReachability} from '../packages/building-catalog/editor.js';
import {openDocument,createMapDocument} from '../packages/map-core/index.js';
import {edgeCells,terrainAt} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {EDGES} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/environment.js';

const buildings=DESIGNS.map(buildEditorBuilding);
test('all architecture becomes native editable maps with ordinary accessible interiors and roof hatches',()=>{
  assert.equal(buildings.length,48);
  for(const b of buildings){const doc=openDocument(b.map);assert.deepEqual(doc.validate(),[],b.report.id);assert.equal(b.map.version,2);assert.equal(b.report.metresPerTile,1);assert.equal(editorBuildingReachability(b.map,b.targets,b.report.bounds).unreached.length,0,b.report.id);assert.ok(b.commands.length>100);assert.ok(b.map.props.every(p=>p.kind.startsWith('roof-')));assert.ok(Object.values(b.map.edges).every(k=>Object.hasOwn(EDGES,k)));assert.ok(JSON.stringify(b.map).length<4000000);}
});
test('native buildings retain deterministic metre footprints, and conversion does not mutate the sculpt recipes',()=>{
  const source=JSON.stringify(DESIGNS);
  for(const id of ['bramble-ranch','greywell-chapel','northlight-works','dockside-warehouse']){const first=buildings.find(b=>b.report.id===id),second=buildEditorBuilding(id);assert.deepEqual(second.map,first.map);assert.deepEqual(second.commands,first.commands);const offset=first.report.offset,core=DESIGNS.find(d=>d.id===id).parts[0];for(let y=0;y<core.d;y++)for(let x=0;x<core.w;x++)assert.notEqual(terrainAt(first.map,x+offset.x,y+offset.y,0),'yard');}
  assert.equal(JSON.stringify(DESIGNS),source);
});
test('built walls, windows and floors use normal editor operations with exact undo, redo and JSON reload',()=>{
  const built=buildings.find(b=>b.report.id==='northlight-works'),doc=openDocument(built.map),before=doc.export(),edge=Object.keys(doc.map.edges).find(k=>doc.map.edges[k]==='wall-brick'),p=edgeCells(edge)[0];
  const edit=doc.apply({tool:'wall',start:{...p,edge},options:{edgeKind:'window-brick'}});assert.equal(edit.ok,true,edit.error);assert.equal(doc.map.edges[edge],'window-brick');const after=doc.export();assert.notEqual(after,before);assert.equal(doc.undo(),true);assert.equal(doc.export(),before);assert.equal(doc.redo(),true);assert.equal(doc.export(),after);assert.deepEqual(JSON.parse(openDocument(after).export()),JSON.parse(after));
  const tile=built.targets.find(p=>p.z===0);assert.equal(doc.apply({tool:'texture',start:tile,options:{groundKind:'ground-tiles'}}).ok,true);assert.equal(terrainAt(doc.map,tile.x,tile.y,0),'ground-tiles');assert.equal(doc.undo(),true);assert.equal(doc.export(),after);
});
test('reusable native blocks place into a game map without losing roofs, stairs or editable wall boundaries',()=>{
  const usable=buildings.filter(b=>b.block);assert.equal(usable.length,48);
  for(const b of usable){assert.equal(openDocument(b.block).block,true);}
  for(const id of ['bramble-ranch','greywell-chapel','red-crest-barn']){const b=usable.find(b=>b.report.id===id),doc=createMapDocument();doc.place(b.block,3,4);assert.equal(doc.map.stairs.length,b.block.stairs.length);assert.equal(doc.map.props.length,b.block.props.length);assert.equal(Object.keys(doc.map.edges).length,Object.keys(b.block.edges).length);assert.deepEqual(doc.validate(),[]);assert.equal(doc.undo(),true);assert.equal(doc.map.props.length,0);assert.equal(doc.redo(),true);assert.equal(doc.map.props.length,b.block.props.length);}
  const oversize=buildEditorBuilding({...DESIGNS[0],id:'oversize-native',layout:'open',porch:null,parts:[{x:0,z:0,w:28,d:16,stories:1,roof:'flat',use:'open',axis:'auto'}]});assert.equal(oversize.block,null);assert.match(oversize.report.blockReason,/exceeds/);assert.deepEqual(openDocument(oversize.map).validate(),[]);
});
