import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {InspectionDocument} from '../packages/map-core/inspection.js';
import {EditingDocument} from '../packages/map-core/editing-document.js';
import {InspectionDocument as DonorInspection,PREVIEW_FOOTPRINTS as donorFootprints} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-model.js';
import {EditingDocument as DonorEditing} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-controller.js';
import {blankMap,generateRiverMap} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {extractBlock} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js';
import {ensureCharacterIdentities} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/character-properties.js';
import {STRUCTURE_PRESETS} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-structure-presets.js';
import {PREVIEW_FOOTPRINTS} from '../apps/editor/inspection-visuals.js';
import {adaptWallEditor} from '../tools/editor-wall-adapter.mjs';

const donor=new URL('../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/',import.meta.url);
const state=doc=>({json:doc.export(),map:doc.map,units:doc.units,size:doc.size,block:doc.block,undo:doc.editor.undo,redo:doc.editor.redo,changed:doc.changed,revision:doc.revision});
function editingPair(input){
  // Block canvases create disposable hidden squad identities. Give both opens
  // the same identity source so parity compares behavior rather than new UUIDs.
  const original=crypto.randomUUID;let sequence=0;
  crypto.randomUUID=()=>`00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`;
  try{const current=new EditingDocument().open(input);sequence=0;return [current,new DonorEditing().open(input)];}finally{crypto.randomUUID=original;}
}

test('plain inspection preserves factory metadata and returns the same logical selections on every layer',()=>{
  const raw=JSON.parse(fs.readFileSync(new URL('default-factory.json',donor)));raw.extension={future:['keep',17]};
  const current=new InspectionDocument().open(JSON.stringify(raw)),original=new DonorInspection().open(JSON.stringify(raw));
  assert.equal(current.export(),original.export());assert.deepEqual(current.units,original.units);
  const points=[...raw.starts,...raw.guards,...raw.props.slice(0,15),...raw.stairs,{x:5.49,y:5,z:0},{x:150,y:150,z:5},{x:-1,y:5,z:0},{x:Infinity,y:5,z:0}];
  for(const point of points)for(const mode of ['auto','tile','prop','edge','unit','access'])for(const walls of [true,false]){
    const options={mode,walls,roofs:false},a=current.inspect(point.x,point.y,point.z||0,options),b=original.inspect(point.x,point.y,point.z||0,options);
    assert.deepEqual(a,b);if(a)assert.deepEqual(structuredClone(a),a);
  }
  assert.deepEqual(JSON.parse(current.export()),raw);
});

test('plain inspection retains river/block/recipe formats and failed opens preserve the previous document',()=>{
  const river=generateRiverMap(42,'Pure data inspection',0),block=extractBlock(river,0,0),recipe={kind:'sector-placeholder',version:1,id:'headless-recipe',config:{roads:[],feature:null},allowedTransforms:[{turns:0,mirror:false}]};
  for(const raw of [river,block,recipe]){
    const current=new InspectionDocument().open(JSON.stringify(raw)),original=new DonorInspection().open(JSON.stringify(raw)),before=current.export();
    assert.equal(before,original.export());assert.deepEqual(current.map,original.map);assert.deepEqual(current.units,original.units);
    for(const invalid of ['{broken',JSON.stringify({...raw,version:99})]){assert.throws(()=>current.open(invalid));assert.equal(current.export(),before);}
    if(raw===block){assert.equal(current.size,24);assert.deepEqual(current.map.starts,[]);assert.deepEqual(current.map.exits,[]);}
  }
});

test('extracted editing retains command previews, high layers, rejection and complete history behavior',()=>{
  const input=JSON.stringify(ensureCharacterIdentities(blankMap('Data editing'))),current=new EditingDocument().open(input),original=new DonorEditing().open(input);
  const commands=[
    {tool:'floor',start:{x:20,y:20,z:0},end:{x:22,y:22,z:0}},
    {tool:'room',start:{x:30,y:30,z:0},options:{width:6,height:5}},
    {tool:'prop',start:{x:12,y:12,z:0},options:{propKind:'barrel-row'}},
    {tool:'stairs',start:{x:20,y:25,z:0}},
    {tool:'floor',start:{x:70,y:70,z:5},end:{x:72,y:72,z:5}},
    {tool:'prop',start:{x:10,y:10,z:0},options:{propKind:'missing-object'}}
  ];
  for(const command of commands){const before=current.export();assert.deepEqual(current.preview(command),original.preview(command));assert.equal(current.export(),before);assert.deepEqual(current.apply(command),original.apply(command));assert.deepEqual(state(current),state(original));}
  assert.equal(current.map.levels,6);assert.equal(current.rename('Renamed').ok,true);original.rename('Renamed');assert.deepEqual(state(current),state(original));
  for(let i=0;i<3;i++){assert.equal(current.undo(),original.undo());assert.deepEqual(state(current),state(original));}
  for(let i=0;i<3;i++){assert.equal(current.redo(),original.redo());assert.deepEqual(state(current),state(original));}
});

test('every inherited structure stamp keeps its dimensions, objects and rotation in maps and blocks',()=>{
  for(const preset of Object.keys(STRUCTURE_PRESETS))for(const rotated of [false,true])for(const block of [false,true]){
    const map=blankMap('Stamp comparison'),input=JSON.stringify(block?extractBlock(map):ensureCharacterIdentities(map));
    const [current,original]=editingPair(input),command={tool:'prefab',start:{x:block?5:40,y:block?5:40,z:0},options:{preset,rotated}};
    const a=current.apply(command),b=original.apply(command);assert.equal(a.ok,true,preset);assert.deepEqual(a,b);assert.deepEqual(state(current),state(original));
    current.undo();original.undo();assert.deepEqual(state(current),state(original));current.redo();original.redo();assert.deepEqual(state(current),state(original));
  }
});

test('the explicit editor adapter retains cargo hints and guarded imports select plain brush data',()=>{
  assert.deepEqual(PREVIEW_FOOTPRINTS,donorFootprints);assert.equal(PREVIEW_FOOTPRINTS.length,13);
  const once=(text,needle,replacement)=>{assert.ok(text.includes(needle),needle);return text.replace(needle,replacement);};
  const entry=adaptWallEditor('/editor-3d.js',fs.readFileSync(new URL('editor-3d.js',donor),'utf8'),once);
  const tools=adaptWallEditor('/editor-3d-tools.js',fs.readFileSync(new URL('editor-3d-tools.js',donor),'utf8'),once);
  assert.match(entry,/app\/inspection-visuals\.js/);assert.doesNotMatch(entry,/from '\.\/editor-3d-model\.js'/);
  assert.match(tools,/map-core\/editing-document\.js/);assert.doesNotMatch(tools,/from '\.\/editor-3d-controller\.js'/);
});

test('public core imports and document inspection work with browser globals sealed off',()=>{
  const urls=['../packages/map-core/index.js','../packages/rules-core/index.js','../packages/rules-core/dialogue.js','../packages/rules-core/aft-compat.js'].map(file=>new URL(file,import.meta.url).href);
  const source=`for(const key of ['window','document','navigator','localStorage','sessionStorage','indexedDB','fetch','XMLHttpRequest','Image','OffscreenCanvas','WebGLRenderingContext','WebGL2RenderingContext'])Object.defineProperty(globalThis,key,{configurable:true,get(){throw Error('Browser dependency read: '+key);}});const [core,rules]=await Promise.all(${JSON.stringify(urls)}.map(url=>import(url)));const doc=core.createMapDocument('Sealed runtime');if(!doc.apply({tool:'floor',start:{x:20,y:20,z:0}}).ok)throw Error('Edit failed');doc.inspect(20,20,0);doc.undo();doc.redo();const block=core.createBlockDocument();core.openDocument(block.export());const actor=rules.createCharacter({id:'headless'});rules.characterSheet(actor);process.stdout.write(JSON.stringify({map:doc.size,block:block.size}));`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',windowsHide:true,cwd:fileURLToPath(new URL('../',import.meta.url))});
  assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{map:240,block:24});
});
