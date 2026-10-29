import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {listFurnitureAssets,furnitureAsset} from '../packages/furniture-core/index.js';
import {findAssets as searchAssets} from '../apps/editor/asset-catalog.js';

// Exercise the real controller with explicit DOM/renderer doubles, never WebGL.
const source = (await readFile(new URL('../apps/editor/assets.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace('export function installAssetLibrary', 'function installAssetLibrary');
const loadController = new Function('dependencies', `const {editorAssets,findAssets,ASSET_CATEGORIES,assetPreview,InspectionScene,FurniturePreviewScene,furnitureAsset,T,DIMENSIONS,document,window,ResizeObserver,MutationObserver,requestAnimationFrame,cancelAnimationFrame,Option,Event,getComputedStyle}=dependencies;${source};return installAssetLibrary;`);
const turn = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {let resolve,reject;const promise = new Promise((a,b) => {resolve=a;reject=b;});return {promise,resolve,reject};};

function harness(behaviours = [],{includeFurniture=false,cold=false}={}) {
  const nodes = new Map(), frames = new Map(), scenes = [], windowEvents = new Map();let nextFrame=0;
  class Element {
    constructor(tag='div') {this.tagName=tag.toUpperCase();this.children=[];this.options=[];this.dataset={};this.attributes=new Map();this.listeners=new Map();this.value='';this.textContent='';this.clientWidth=240;this.clientHeight=240;this.open=false;this.disabled=false;this.classList={add(){}};}
    set innerHTML(value) {this.children=[];for(const match of value.matchAll(/<([a-z][\w-]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {const node=new Element(match[1]);node.id=match[2];nodes.set(node.id,node);}}
    append(...children) {for(const child of children){this.children.push(child);child.parent=this;if(child.id)nodes.set(child.id,child);}}
    prepend(child) {this.children.unshift(child);child.parent=this;if(child.id)nodes.set(child.id,child);}
    add(option) {this.options.push(option);}
    setAttribute(name,value) {this.attributes.set(name,String(value));}
    addEventListener(type,callback) {if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(callback);}
    dispatchEvent(event) {for(const callback of this.listeners.get(event.type)||[])callback(event);return this['on'+event.type]?.(event);}
    replaceChildren(...children) {this.children=[];this.append(...children);}
    cloneNode() {const node=new Element(this.tagName);node.id=this.id;return node;}
    replaceWith(fresh) {nodes.set(this.id,fresh);if(this.parent){const i=this.parent.children.indexOf(this);this.parent.children[i]=fresh;fresh.parent=this.parent;}}
    showModal() {this.open=true;}
    close() {if(!this.open)return;this.open=false;this.dispatchEvent({type:'close'});}
    focus() {}
    matches() {return false;}
  }
  const nav = new Element('nav'), body = new Element('body');
  const document = {body,getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag),querySelector:selector=>{assert.equal(selector,'.nautilus-header nav');return nav;}};
  for(const id of ['foliage-preset','prop-kind','edit-tool','nautilus-options','status']) {const node=new Element(id.endsWith('kind')||id.endsWith('preset')?'select':'div');node.id=id;node.options=[{value:'crate',textContent:'Crate',disabled:false}];nodes.set(id,node);}
  const blueprint={unchanged:true},window={editor3d:cold?undefined:{loading:false,document:blueprint},addEventListener:(type,fn)=>windowEvents.set(type,fn)};
  if(cold)for(const id of ['foliage-preset','prop-kind','edit-tool'])nodes.delete(id);
  class Observer {observe(){}unobserve(){}disconnect(){}}
  class Scene {
    constructor(canvas,changed) {this.canvas=canvas;this.changed=changed;this.diagnostics=[];this.options={};this.scene={};this.disposed=0;this.lost=0;this.renderer={forceContextLoss:()=>this.lost++};scenes.push(this);}
    async open(document) {this.document=document;this.diagnostics=[];const behaviour=behaviours.shift();if(behaviour instanceof Error)throw behaviour;if(behaviour)await behaviour(this);this.changed();}
    draw() {if(this.drawError)throw this.drawError;}
    dispose() {this.disposed++;}
  }
  class Box3 {setFromObject(){return this;}isEmpty(){return true;}}
  class FurnitureScene extends Scene {constructor(T,canvas,changed){super(canvas,changed);}}
  const assets = ['crate','barrel'].map(id=>({category:'Objects',id,name:id,w:1,h:1,tool:'prop',bindings:{'prop-kind':id}}));
  if(includeFurniture)for(const furniture of listFurnitureAssets())assets.push({id:furniture.id,name:furniture.name,category:'Furniture',preview:'furniture',furniture,w:furniture.tiles[0],h:furniture.tiles[1],disabled:'Preview only · unavailable for map placement.',bindings:{}});
  if(includeFurniture)assets.push({id:'dog',name:'Dog',category:'People',w:1,h:1,tool:'guard',bindings:{},disabled:'Preview only'});
  loadController({editorAssets:()=>assets,findAssets:includeFurniture?searchAssets:list=>list,ASSET_CATEGORIES:['Objects','Furniture','People'],assetPreview:asset=>({document:asset.preview==='furniture'?{furniture:{id:asset.id}}:{map:{},asset:asset.id},view:{span:4}}),InspectionScene:Scene,FurniturePreviewScene:FurnitureScene,furnitureAsset,T:{Box3},DIMENSIONS:{floorSpacing:2.12},document,window,ResizeObserver:Observer,MutationObserver:Observer,
    requestAnimationFrame:fn=>{const id=++nextFrame;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),Option:class {constructor(label,value){this.textContent=label;this.value=value;}},Event:class {constructor(type){this.type=type;}},getComputedStyle:()=>({display:'none'})})();
  return {nodes,scenes,frames,blueprint,window,open:async()=>{nodes.get('nautilus-assets').onclick();await turn();},choose:async index=>{await nodes.get('asset-results').children[index].onclick();},filter:(field,value)=>{const node=nodes.get('asset-furniture-'+field);node.value=value;node.onchange();},close:()=>nodes.get('asset-library').close(),flushFrame:()=>{const entries=[...frames];frames.clear();for(const [,fn]of entries)fn();},pagehide:()=>windowEvents.get('pagehide')()};
}

test('a failed asset preview can be retried without a stale failure or renderer', async () => {
  const ui=harness([Error('temporary paint failure')]);
  try {
    await ui.open();assert.equal(ui.nodes.get('asset-use').disabled,true);assert.match(ui.nodes.get('asset-preview-status').textContent,/temporary paint failure/);
    await ui.choose(0);
    assert.equal(ui.nodes.get('asset-use').disabled,false,'A successful explicit retry must become usable');
    assert.match(ui.nodes.get('asset-preview-status').textContent,/Authored model/);
    assert.equal(ui.scenes[0].disposed,1);assert.equal(ui.scenes[0].lost,1);assert.equal(ui.scenes.length,2);
    assert.deepEqual(ui.blueprint,{unchanged:true});
  } finally {ui.close();}
});

test('a draw failure is visible inside the library and retires its preview', async () => {
  const ui=harness();
  try {
    await ui.open();ui.scenes[0].drawError=Error('context unavailable during draw');
    assert.doesNotThrow(()=>ui.flushFrame());
    assert.equal(ui.nodes.get('asset-use').disabled,true);assert.match(ui.nodes.get('asset-preview-status').textContent,/context unavailable during draw/);
    assert.equal(ui.scenes[0].disposed,1);assert.equal(ui.scenes[0].lost,1);assert.equal(ui.frames.size,0);
  } finally {ui.close();}
});

test('close and reopen replace the canvas and ignore a late selection completion', async () => {
  const gate=deferred(),ui=harness([()=>gate.promise]);
  try {
    await ui.open();const firstCanvas=ui.nodes.get('asset-preview'),first=ui.scenes[0];
    ui.close();assert.notEqual(ui.nodes.get('asset-preview'),firstCanvas);assert.equal(first.disposed,1);assert.equal(first.lost,1);assert.equal(ui.frames.size,0);
    await ui.open();const second=ui.scenes[1];assert.notEqual(second.canvas,firstCanvas);assert.equal(ui.nodes.get('asset-use').disabled,false);
    ui.flushFrame();gate.resolve();await turn();
    assert.equal(ui.nodes.get('asset-use').disabled,false);assert.equal(ui.frames.size,0,'A retired scene must not request a new frame');
    assert.equal(ui.nodes.get('asset-name').textContent,'crate');assert.equal(first.disposed,1);
  } finally {gate.resolve();ui.close();}
});

test('switching a pending selection keeps late work out of the active preview', async () => {
  const gate=deferred(),ui=harness([()=>gate.promise]);
  try {
    await ui.open();const old=ui.scenes[0];await ui.choose(1);ui.flushFrame();
    assert.equal(ui.nodes.get('asset-name').textContent,'barrel');assert.equal(ui.nodes.get('asset-use').disabled,false);
    gate.resolve();await turn();
    assert.equal(old.disposed,1);assert.equal(old.lost,1);assert.equal(ui.frames.size,0);assert.equal(ui.nodes.get('asset-name').textContent,'barrel');
  } finally {gate.resolve();ui.close();}
});

test('cold furniture discovery survives a preview failure without workshop controls',async()=>{
  const ui=harness([Error('WebGL unavailable')],{includeFurniture:true,cold:true});
  try {
    ui.window.editor3d={loading:true};
    assert.equal(ui.nodes.get('nautilus-assets').disabled,false);await ui.open();
    assert.equal(ui.nodes.get('asset-category').value,'Furniture');assert.equal(ui.nodes.get('asset-results').children.length,96);
    const name=ui.nodes.get('asset-name').textContent;assert.ok(name);assert.match(ui.nodes.get('asset-footprint').textContent,/Body footprint:.*Source tile reservation:/);
    assert.match(ui.nodes.get('asset-furniture-source').textContent,/fb6e20a/);assert.match(ui.nodes.get('asset-preview-status').textContent,/WebGL unavailable/);
    await ui.nodes.get('asset-retry').onclick();
    assert.equal(ui.nodes.get('asset-name').textContent,name);assert.equal(ui.nodes.get('asset-use').disabled,true);
    ui.filter('form','bookcase-tall');assert.equal(ui.nodes.get('asset-results').children.length,12);
    ui.filter('finish','sage');assert.equal(ui.nodes.get('asset-results').children.length,2);
    ui.filter('contents','books');assert.equal(ui.nodes.get('asset-results').children.length,1);
    assert.match(ui.nodes.get('asset-name').textContent,/Choose a matching/);
    await ui.choose(0);assert.equal(ui.nodes.get('asset-use').disabled,true);
    ui.nodes.get('asset-search').value='absent furniture';ui.nodes.get('asset-search').oninput();
    assert.equal(ui.nodes.get('asset-results').children[0].tagName,'P');assert.equal(ui.nodes.get('asset-name').textContent,'No matching assets');assert.equal(ui.frames.size,0);
    ui.nodes.get('asset-search').value='';ui.nodes.get('asset-category').value='People';ui.nodes.get('asset-category').onchange();await ui.choose(0);
    assert.equal(ui.nodes.get('asset-name').textContent,'Dog');assert.equal(ui.nodes.get('asset-use').disabled,true);
  }finally{ui.close();}
});

for(const completion of ['resolve','reject'])test(`late furniture ${completion} cannot replace a newer selection`,async()=>{
  const gate=deferred(),ui=harness([()=>gate.promise],{includeFurniture:true,cold:true});
  try {
    await ui.open();const first=ui.scenes[0];await ui.choose(1);ui.flushFrame();const name=ui.nodes.get('asset-name').textContent;
    gate[completion](completion==='reject'?Error('obsolete atlas'):undefined);await turn();
    assert.equal(ui.nodes.get('asset-name').textContent,name);assert.match(ui.nodes.get('asset-preview-status').textContent,/Authored furniture/);
    assert.equal(first.disposed,1);assert.equal(first.lost,1);assert.equal(ui.frames.size,0);assert.equal(ui.nodes.get('asset-use').disabled,true);
  }finally{gate.resolve();ui.close();}
});

test('a queued native close event cannot retire a reopened furniture preview',async()=>{
  const gate=deferred(),ui=harness([()=>gate.promise],{includeFurniture:true,cold:true});
  try {
    await ui.open();const dialog=ui.nodes.get('asset-library');dialog.open=false;await ui.open();const active=ui.scenes.at(-1);
    dialog.dispatchEvent({type:'close'});gate.resolve();await turn();assert.equal(active.disposed,0);assert.equal(dialog.open,true);
    ui.pagehide();assert.equal(active.disposed,1);assert.equal(active.lost,1);assert.equal(ui.frames.size,0);
  }finally{gate.resolve();ui.close();}
});
