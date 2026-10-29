import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {adaptWallEditor} from '../tools/editor-wall-adapter.mjs';
import {adaptEditorPrefabs} from '../tools/editor-prefab-adapter.mjs';
import {adaptEditorRoofs} from '../tools/editor-roof-adapter.mjs';
import {EditingDocument} from '../packages/map-core/roof-document.js';
import {blockCanvas,extractBlock} from '../packages/map-core/roof-blocks.js';

function toolbar(){
 const name='dist/tactics/editor-3d-tools.js',pin='781246a668c723d5a4c5463e70534cc04b6a5641';
 let source=fs.readFileSync(new URL('../vendor/aft/'+pin+'/'+name,import.meta.url),'utf8');
 const once=(text,needle,replacement,label)=>{assert(text.includes(needle),label);return text.replace(needle,replacement);};
 for(const adapt of [adaptWallEditor,adaptEditorPrefabs,adaptEditorRoofs])source=adapt(name,source,once);
 const declaration=source.split('\n').find(line=>line.trimStart().startsWith('const options=()=>'));
 assert(declaration,'Adapted editor has no options factory.');
 const values=new Map(),fallback={value:'1',checked:false,valueAsNumber:1},field=id=>values.get(id)||fallback;
 const set=(id,value)=>values.set(id,{value,checked:false,valueAsNumber:Number(value)});
 set('edit-tool','wall-run');set('wall-material','wood');set('roof-material','slate');
 let roofReads=0;
 const options=vm.runInNewContext(declaration+'\noptions',{
  $:field,document:{getElementById:field},isScenery:()=>false,prefabPlacementOptions:()=>({}),
  wallTools:{options:()=>({material:field('wall-material').value,stories:1,angleStep:0,step:0,endpointSnap:false})},
  roofTools:{options:()=>{roofReads++;return {material:field('roof-material').value,eaves:1,style:'gable',axis:'x',direction:1,pitch:30,overhang:.25,seed:27};}}
 });
 return {options,set,get roofReads(){return roofReads;}};
}
const document=()=>{
 const data=extractBlock(blockCanvas('Toolbar materials'));
 // Empty sidecars remain explicit through history; compare that stable contract.
 data.wallRuns={version:1,segments:[]};data.slopedRoofs={version:1,roofs:[]};
 return new EditingDocument().open(JSON.stringify(data));
};
const wall=options=>({tool:'wall-run',start:{x:4.5,y:4.5,z:0},end:{x:8.5,y:6.5,z:0},options});

test('built roof toolbar cannot replace the angled wall brush material',()=>{
 const ui=toolbar(),doc=document(),before=doc.export(),command=wall(ui.options());
 const result=doc.preview(command);
 assert.equal(result.ok,true,result.error);
 assert.equal(result.wallRun.material,'wood');
 assert.equal(ui.roofReads,0,'A wall brush read unrelated roof controls.');
 assert.equal(doc.export(),before,'Preview changed the document.');
 assert.equal(doc.editor.undo.length,0);
});
test('switching wall and roof materials preserves both brushes through edit, undo, redo and reload',()=>{
 const ui=toolbar();
 for(const wallMaterial of ['wood','brick','concrete'])for(const roofMaterial of ['slate','clay','metal']){
  const doc=document(),before=doc.export();
  ui.set('wall-material',wallMaterial);ui.set('roof-material',roofMaterial);ui.set('edit-tool','wall-run');
  const placed=doc.apply(wall(ui.options()));assert.equal(placed.ok,true,placed.error);assert.equal(placed.wallRun.material,wallMaterial);
  const afterWall=doc.export();assert(doc.undo());assert.equal(doc.export(),before);assert(doc.redo());assert.equal(doc.export(),afterWall);
  ui.set('edit-tool','sloped-roof');
  const roof=doc.apply({tool:'sloped-roof',start:{x:12,y:12,z:0},end:{x:17,y:16,z:0},options:ui.options()});
  assert.equal(roof.ok,true,roof.error);assert.equal(roof.roofPreview.material,roofMaterial);
  const both=doc.export();assert(doc.undo());assert.equal(doc.export(),afterWall);assert(doc.redo());assert.equal(doc.export(),both);
  assert.equal(new EditingDocument().open(both).export(),both);
  ui.set('edit-tool','wall-run');assert.equal(ui.options().material,wallMaterial);
 }
});
test('non-roof tools do not read inactive roof form values',()=>{
 const ui=toolbar();
 ui.set('roof-material','unsupported-inactive-value');
 for(const tool of ['wall-run','wall','floor','prop','texture','building-prefab','roof','roof-tile','erase-sloped-roof']){
  ui.set('edit-tool',tool);ui.options();
 }
 assert.equal(ui.roofReads,0);
 ui.set('edit-tool','sloped-roof');assert.equal(ui.options().material,'unsupported-inactive-value');assert.equal(ui.roofReads,1);
});
