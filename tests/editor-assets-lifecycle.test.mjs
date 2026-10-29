import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {characterAppearanceChoices} from '../apps/editor/asset-appearance.js';

// Exercise the real controller with explicit DOM/renderer doubles, never WebGL.
const source = (await readFile(new URL('../apps/editor/assets.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace('export function installAssetLibrary', 'function installAssetLibrary');
const loadController = new Function('dependencies', `const {editorAssets,findAssets,ASSET_CATEGORIES,assetPreview,characterAppearanceChoices,InspectionScene,T,DIMENSIONS,document,window,ResizeObserver,MutationObserver,requestAnimationFrame,cancelAnimationFrame,Option,Event,getComputedStyle}=dependencies;${source};return installAssetLibrary;`);
const turn = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {let resolve;const promise = new Promise(done => {resolve=done;});return {promise,resolve};};

function harness(behaviours = [],options={}) {
  const nodes = new Map(), frames = new Map(), scenes = [], windowEvents = new Map(),observers=[];let nextFrame=0,constructorError=options.constructorError;
  class Element {
    constructor(tag='div') {this.tagName=tag.toUpperCase();this.children=[];this.options=[];this.dataset={};this.attributes=new Map();this.listeners=new Map();this.value='';this.textContent='';this.clientWidth=240;this.clientHeight=240;this.open=false;this.disabled=false;this.classList={add(){}};}
    set innerHTML(value) {this.children=[];for(const match of value.matchAll(/<([a-z][\w-]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {const node=new Element(match[1]);node.id=match[2];nodes.set(node.id,node);}}
    append(...children) {for(const child of children){this.children.push(child);child.parent=this;if(child.id)nodes.set(child.id,child);}}
    prepend(child) {this.children.unshift(child);child.parent=this;if(child.id)nodes.set(child.id,child);}
    add(option) {this.options.push(option);}
    setAttribute(name,value) {this.attributes.set(name,String(value));}
    addEventListener(type,callback) {if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(callback);}
    dispatchEvent(event) {for(const callback of this.listeners.get(event.type)||[])callback(event);return this['on'+event.type]?.(event);}
    replaceChildren(...children) {this.children=[];if(this.tagName==='SELECT')this.options=children;this.append(...children);}
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
  const blueprint={unchanged:true},window={location:{href:'https://editor.example.test/workshop/index.html'},editor3d:{loading:options.loading??false,document:blueprint},addEventListener:(type,fn)=>windowEvents.set(type,fn)};
  class Observer {constructor(callback){this.callback=callback;observers.push(this);}observe(){}unobserve(){}disconnect(){}}
  class Scene {
    constructor(canvas,changed) {if(constructorError){const error=constructorError;constructorError=null;throw error;}this.canvas=canvas;this.changed=changed;this.diagnostics=[];this.options={};this.scene={};this.disposed=0;this.lost=0;this.renderer={forceContextLoss:()=>this.lost++};scenes.push(this);}
    async open(document) {this.document=document;this.diagnostics=[];const behaviour=behaviours.shift();if(behaviour instanceof Error)throw behaviour;if(behaviour)await behaviour(this);this.changed();}
    draw() {if(this.drawError)throw this.drawError;}
    dispose() {this.disposed++;}
  }
  class Box3 {setFromObject(){return this;}isEmpty(){return true;}}
  const assets = options.assets||['crate','barrel'].map(id=>({category:'Objects',id,name:id,w:1,h:1,tool:'prop',bindings:{'prop-kind':id}}));
  loadController({editorAssets:()=>assets,findAssets:list=>list,ASSET_CATEGORIES:['Objects','People'],assetPreview:asset=>({document:{map:{},asset:asset.id},view:{span:4}}),characterAppearanceChoices,InspectionScene:Scene,T:{Box3},DIMENSIONS:{floorSpacing:2.12},document,window,ResizeObserver:Observer,MutationObserver:Observer,
    requestAnimationFrame:fn=>{const id=++nextFrame;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),Option:class {constructor(label,value){this.textContent=label;this.value=value;}},Event:class {constructor(type){this.type=type;}},getComputedStyle:()=>({display:'none'})})();
  return {nodes,scenes,frames,blueprint,window,notifyObservers:()=>observers.forEach(observer=>observer.callback()),open:async()=>{nodes.get('nautilus-assets').onclick();await turn();},choose:async index=>{await nodes.get('asset-results').children[index].onclick();},close:()=>nodes.get('asset-library').close(),flushFrame:()=>{const entries=[...frames];frames.clear();for(const [,fn]of entries)fn();},pagehide:()=>windowEvents.get('pagehide')()};
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

const cow={id:'cow',name:'Cow worker',category:'People',w:1,h:1,tool:'guard',bindings:{'unit-species':'cow','unit-weapon':'rifle','unit-outfit':'normal'}};

test('character metadata and equipment are available while the main workshop is still loading',async()=>{
  const ui=harness([],{assets:[cow],loading:true});
  try {
    await ui.open();assert.equal(ui.nodes.get('asset-library').open,true);assert.equal(ui.nodes.get('asset-name').textContent,cow.name);
    assert.equal(ui.nodes.get('asset-guides').href,'https://editor.example.test/workshop/docs/components/index.md');
    assert.equal(ui.nodes.get('asset-weapon').options.length,13);assert.equal(ui.nodes.get('asset-outfit').options.length,2);
    assert.equal(ui.nodes.get('asset-weapon').value,'rifle');assert.equal(ui.nodes.get('asset-use').disabled,true);
    assert.match(ui.nodes.get('asset-preview-status').textContent,/placement waits/);
    ui.window.editor3d.loading=false;ui.notifyObservers();assert.equal(ui.nodes.get('asset-use').disabled,false);
    assert.deepEqual(ui.blueprint,{unchanged:true});
  }finally{ui.close();}
});

test('a renderer construction failure keeps character metadata and choices, and close/reopen recovers',async()=>{
  const ui=harness([],{assets:[cow],constructorError:Error('WebGL is unavailable')});
  try {
    await ui.open();assert.equal(ui.nodes.get('asset-library').open,true);
    assert.equal(ui.nodes.get('asset-name').textContent,cow.name);assert.equal(ui.nodes.get('asset-weapon').options.length,13);
    assert.equal(ui.nodes.get('asset-outfit').options.length,2);assert.equal(ui.nodes.get('asset-use').disabled,true);
    assert.match(ui.nodes.get('asset-preview-status').textContent,/WebGL is unavailable/);assert.deepEqual(ui.blueprint,{unchanged:true});
    ui.close();await ui.open();assert.equal(ui.nodes.get('asset-use').disabled,false);assert.equal(ui.scenes.length,1);
    assert.deepEqual(ui.blueprint,{unchanged:true});
  }finally{ui.close();}
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
