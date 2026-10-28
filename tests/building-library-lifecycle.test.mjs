import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BUILDING_ASSETS,PREFAB_SOURCE_ROOT,catalogueForAssets} from '../packages/prefab-core/registry.js';
import {LIBRARY_BUILDINGS,BUILDING_POOLS,findBuildings,seedAssetIds,assertBuildingAuthoringSupport} from '../apps/editor/building-library-data.js';
import {buildingTransform} from '../packages/prefab-core/index.js';

// Execute the real modal controller with explicit DOM/renderer doubles. These
// timing/ownership tests exercise no WebGL and do not claim visual approval.
const source=(await readFile(new URL('../apps/editor/buildings.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace('export function installBuildingLibrary','function installBuildingLibrary').replaceAll('import.meta.url',JSON.stringify('https://nautilus.test/app/buildings.js'));
const loadController=new Function('d',`const {BUILDING_ASSETS,PREFAB_SOURCE_ROOT,catalogueForAssets,prefabFileURL,LIBRARY_BUILDINGS,BUILDING_POOLS,findBuildings,seedAssetIds,assertBuildingAuthoringSupport,buildingTransform,generateBuildingLayout,InspectionScene,BuildingPreviewScene,STRUCTURE_PRESETS,blankMap,stampRoom,setTerrain,T,DIMENSIONS,document,window,ResizeObserver,MutationObserver,requestAnimationFrame,cancelAnimationFrame,Option,Event}=d;${source};return installBuildingLibrary;`);
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function harness(behaviours=[]) {
  const nodes=new Map(),frames=new Map(),scenes=[],applied=[];let nextFrame=0;
  class Element {
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.listeners=new Map();this.value='';this.textContent='';this.open=false;this.disabled=false;this.clientWidth=this.clientHeight=240;this.classList={add(){}};}
    get options(){return this.children;}
    set innerHTML(value){this.children=[];for(const match of value.matchAll(/<([a-z][\w-]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const node=new Element(match[1]);node.id=match[2];node.value=match[0].match(/\bvalue="([^"]*)"/)?.[1]||'';nodes.set(node.id,node);this.append(node);}}
    append(...children){for(const child of children){this.children.push(child);child.parent=this;if(child.id)nodes.set(child.id,child);}}
    prepend(child){this.children.unshift(child);child.parent=this;if(child.id)nodes.set(child.id,child);}
    setAttribute(){}removeAttribute(){}focus(){}
    addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
    dispatchEvent(event){for(const fn of this.listeners.get(event.type)||[])fn(event);return this['on'+event.type]?.(event);}
    replaceChildren(...children){this.children=[];this.append(...children);if(this.tagName==='SELECT')this.value=children[0]?.value||'';}
    cloneNode(){const node=new Element(this.tagName);node.id=this.id;return node;}
    replaceWith(node){nodes.set(this.id,node);if(this.parent){const index=this.parent.children.indexOf(this);this.parent.children[index]=node;node.parent=this.parent;}}
    querySelector(selector){if(selector==='.building-generator')return generator;if(selector==='select')return this.children.find(n=>n.tagName==='SELECT');throw Error('Unexpected selector '+selector);}
    showModal(){this.open=true;}close(){if(this.open){this.open=false;this.dispatchEvent({type:'close'});}}
  }
  const nav=new Element(),body=new Element(),generator=new Element();
  const document={body,getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag),querySelector:()=>nav};
  for(const id of ['structure-preset','edit-tool','editing-tools','nautilus-options','status']){const node=new Element(id==='edit-tool'?'select':'div');node.id=id;node.append({value:'inspect'});nodes.set(id,node);}
  const blueprint={revision:0,map:{version:0},units:[]};
  const window={addEventListener(){},nautilus:{contract:{optionalFeatures:['nautilus-building-prefabs-v1','nautilus-original-buildings-v1']}},editor3d:{loading:false,document:blueprint,view:{},scene:{preview(){}},async apply(command){applied.push({version:this.document.map.version,command});return {ok:true};}}};
  class Observer{observe(){}unobserve(){}disconnect(){}}
  class Scene {
    constructor(canvas,changed){this.canvas=canvas;this.changed=changed;this.options={};this.prefabs={models:new Map(),setView(){}};this.scene={};this.diagnostics=[];this.disposed=0;scenes.push(this);}
    async open(document){this.document=document;this.diagnostics=[];const behaviour=behaviours.shift();if(behaviour instanceof Error)throw behaviour;if(behaviour)await behaviour(this);if(!this.disposed)this.changed();}
    draw(){if(this.drawError)throw this.drawError;}dispose(){this.disposed++;}
  }
  class PreviewScene extends Scene{}
  class Box3{setFromObject(){return this;}isEmpty(){return true;}}
  loadController({BUILDING_ASSETS,PREFAB_SOURCE_ROOT,catalogueForAssets,prefabFileURL:p=>'https://nautilus.test/'+p,LIBRARY_BUILDINGS,BUILDING_POOLS,findBuildings,seedAssetIds,assertBuildingAuthoringSupport,buildingTransform,
    generateBuildingLayout:map=>({map:{...map},instances:[{asset:'albany-cottage'}]}),InspectionScene:Scene,BuildingPreviewScene:PreviewScene,STRUCTURE_PRESETS:{},blankMap:()=>({}),stampRoom(){},setTerrain(){},T:{Box3},DIMENSIONS:{floorSpacing:2.12},document,window,ResizeObserver:Observer,MutationObserver:Observer,
    requestAnimationFrame:fn=>{const id=++nextFrame;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),Option:class{constructor(label,value){this.textContent=label;this.value=value;}},Event:class{constructor(type){this.type=type;}}})();
  return {nodes,scenes,frames,applied,window,blueprint,open:async()=>{nodes.get('nautilus-buildings').onclick();await turn();},plan:()=>nodes.get('building-plan').onclick(),choose:async id=>{await nodes.get('building-results').children.find(n=>n.dataset.asset===id).onclick();},close:()=>nodes.get('building-library').close(),flush:()=>{const pending=[...frames.values()];frames.clear();for(const fn of pending)fn();}};
}
test('layout preview rejects a host revision change during model loading',async()=>{
  const gate=deferred(),ui=harness([null,()=>gate.promise]);await ui.open();
  const pending=ui.plan();ui.blueprint.revision++;ui.blueprint.map.version++;gate.resolve();await pending;
  assert.equal(ui.nodes.get('building-generate').disabled,true);assert.match(ui.nodes.get('building-layout-status').textContent,/map changed while loading/i);
  await ui.nodes.get('building-generate').onclick();assert.equal(ui.applied.length,0);
  await ui.plan();await ui.nodes.get('building-generate').onclick();assert.equal(ui.applied[0].version,1);ui.close();
});
test('layout preview rejects a document replacement even at the same revision',async()=>{
  const gate=deferred(),ui=harness([null,()=>gate.promise]);await ui.open();const pending=ui.plan();
  ui.window.editor3d.document={revision:0,map:{version:5},units:[]};gate.resolve();await pending;
  assert.equal(ui.nodes.get('building-generate').disabled,true);await ui.nodes.get('building-generate').onclick();assert.equal(ui.applied.length,0);ui.close();
});
test('a late layout rejection cannot overwrite a newer selected model',async()=>{
  const gate=deferred(),ui=harness([null,()=>gate.promise]);await ui.open();const pending=ui.plan();await ui.choose('grossdale-hip');
  const status=ui.nodes.get('building-preview-status').textContent;gate.reject(Error('stale layout failure'));await pending;
  assert.equal(ui.nodes.get('building-preview-status').textContent,status);assert.equal(ui.nodes.get('building-use').disabled,false);assert.match(ui.nodes.get('building-name').textContent,/hipped/);ui.close();
});
test('closing and reopening ignores a late layout error',async()=>{
  const gate=deferred(),ui=harness([null,()=>gate.promise]);await ui.open();const pending=ui.plan();ui.close();await ui.open();
  const status=ui.nodes.get('building-preview-status').textContent;gate.reject(Error('retired layout failure'));await pending;
  assert.equal(ui.nodes.get('building-preview-status').textContent,status);assert.equal(ui.nodes.get('building-use').disabled,false);ui.close();
});
test('a building draw failure disables placement and disposes the owned scene',async()=>{
  const ui=harness();await ui.open();const scene=ui.scenes[0];scene.drawError=Error('draw unavailable');assert.doesNotThrow(()=>ui.flush());
  assert.equal(ui.nodes.get('building-use').disabled,true);assert.equal(ui.nodes.get('building-generate').disabled,true);assert.equal(scene.disposed,1);assert.match(ui.nodes.get('building-preview-status').textContent,/draw unavailable/);ui.close();
});
test('a native dialog closure is respected before its queued close event runs',async()=>{
  const gate=deferred(),ui=harness([null,()=>gate.promise]);await ui.open();const pending=ui.plan(),dialog=ui.nodes.get('building-library');
  dialog.open=false;const status=ui.nodes.get('building-preview-status').textContent;gate.reject(Error('closed dialog failure'));await pending;
  assert.equal(ui.nodes.get('building-preview-status').textContent,status);dialog.dispatchEvent({type:'close'});
});
test('an add operation cannot close a newer selection after its async scene update',async()=>{
  const gate=deferred(),ui=harness();await ui.open();await ui.plan();ui.window.editor3d.apply=()=>gate.promise;
  const pending=ui.nodes.get('building-generate').onclick();await ui.choose('grossdale-hip');gate.resolve({ok:true});await pending;
  assert.equal(ui.nodes.get('building-library').open,true);assert.match(ui.nodes.get('building-name').textContent,/hipped/);assert.equal(ui.nodes.get('building-use').disabled,false);ui.close();
});
