import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSmartTilePanel} from '../apps/editor/smart-tile/panel.js';
import {createSmartTileUIFixture} from './fixtures/smart-tile-ui/adapter.mjs';

// Control-flow stand-in only; native input/layout remain real-browser checks.
class Control extends EventTarget{
  constructor(doc,tag){super();Object.assign(this,{ownerDocument:doc,tagName:tag.toUpperCase(),children:[],dataset:{},attributes:{},disabled:false,hidden:false,value:'',textContent:'',name:''});}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(key,value){this.attributes[key]=value;}
  querySelectorAll(tag){return this.children.flatMap(node=>[...(node.tagName?.toLowerCase()===tag?[node]:[]),...node.querySelectorAll(tag)]);}
  focus(){this.ownerDocument.activeElement=this;this.ownerDocument.onFocus?.(this);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
  reportValidity(){return true;}
}
function find(node,predicate){if(predicate(node))return node;for(const child of node.children){const found=find(child,predicate);if(found)return found;}return null;}
const turn=async()=>{await Promise.resolve();await Promise.resolve();};
function setup(observer=()=>{}){
  const doc={defaultView:{AbortController},activeElement:null,createElement(tag){return new Control(this,tag);}};
  const container=new Control(doc,'main'),fixture=createSmartTileUIFixture(),errors=[];
  const panel=mountSmartTilePanel(container,fixture.adapter,{onError(error){errors.push(error.message);observer(error,fixture);}});
  const action=name=>find(panel.element,node=>node.dataset.action===name);
  const review=(id='real-review')=>fixture.patch({phase:'review',reviewId:id,draft:{tool:'rectangle',ownerId:null,origin:[0,0],widthM:8,depthM:4,seed:0}});
  return {doc,container,fixture,panel,errors,action,review};
}
const cleanup=h=>{assert.deepEqual(h.panel.dispose(),[]);assert.equal(h.fixture.diagnostics().subscriptions,0);assert.equal(h.fixture.diagnostics().adapterDisposeCalls,0);};
test('enabled Apply refuses an otherwise valid snapshot whose owner data fails rendering',async()=>{
  const h=setup();try{
    h.review();assert.equal(h.action('apply').disabled,false);
    h.fixture.adapter.getSnapshot=()=>({...h.fixture.peek(),owners:[null]});
    h.action('apply').dispatchEvent(new Event('click'));await turn();
    assert.deepEqual(h.fixture.calls,[]);assert.ok(h.errors.some(message=>/null/.test(message)));assert.equal(h.action('apply').disabled,true);
  }finally{cleanup(h);}
});
test('a render failure cannot authorize the same click even when its error observer supplies a valid replacement',async()=>{
  let repaired=false;const h=setup((error,fixture)=>{if(!repaired){repaired=true;fixture.patch({reviewId:'repaired-review'});}});
  try{
    h.review();let nextBad=true;const read=h.fixture.adapter.getSnapshot;
    h.fixture.adapter.getSnapshot=()=>nextBad?(nextBad=false,{...h.fixture.peek(),owners:[null]}):read();
    h.action('apply').dispatchEvent(new Event('click'));await turn();assert.deepEqual(h.fixture.calls,[]);
    h.action('apply').dispatchEvent(new Event('click'));await turn();assert.deepEqual(h.fixture.calls,[{name:'apply',args:['repaired-review']}]);
  }finally{cleanup(h);}
});
test('a notification during getSnapshot supersedes that read; a later stable click uses the current review identity',async()=>{
  const h=setup();try{
    h.review('old-review');let once=true;const read=h.fixture.adapter.getSnapshot;
    h.fixture.adapter.getSnapshot=()=>{const value=read();if(once){once=false;h.fixture.patch({reviewId:'current-review'});}return value;};
    h.action('apply').dispatchEvent(new Event('click'));await turn();assert.deepEqual(h.fixture.calls,[]);
    h.action('apply').dispatchEvent(new Event('click'));await turn();assert.deepEqual(h.fixture.calls,[{name:'apply',args:['current-review']}]);
  }finally{cleanup(h);}
});
test('bounded reentry after a failed render leaves no action authority',async()=>{
  let callbacks=0;const h=setup((error,fixture)=>{callbacks++;fixture.patch({version:99});});
  try{
    h.review();h.fixture.adapter.getSnapshot=()=>({...h.fixture.peek(),owners:[null]});
    h.action('apply').dispatchEvent(new Event('click'));await turn();
    assert.deepEqual(h.fixture.calls,[]);assert.ok(callbacks>0&&callbacks<30);assert.equal(h.action('apply').disabled,true);
  }finally{cleanup(h);}
});
test('host inputs named x or widthM retain focus across panel field replacement',()=>{
  const h=setup();try{
    for(const name of ['x','widthM']){
      const outside=h.doc.createElement('input');outside.name=name;h.container.append(outside);outside.focus();
      h.fixture.patch({revision:h.fixture.peek().revision+1});assert.equal(h.doc.activeElement,outside);
    }
    assert.deepEqual(h.fixture.calls,[]);
  }finally{cleanup(h);}
});
test('the panel restores its own replaced field and coalesces reentrant focus updates before permitting a current action',async()=>{
  const h=setup();try{
    h.review();const original=find(h.panel.element,node=>node.name==='x');original.focus();let once=true;
    h.doc.onFocus=node=>{if(once&&node.name==='x'){once=false;h.fixture.patch({revision:2,reviewId:'focus-current-review'});h.action('apply').dispatchEvent(new Event('click'));}};
    h.fixture.patch({revision:1});await turn();
    assert.notEqual(h.doc.activeElement,original);assert.equal(h.doc.activeElement.name,'x');
    assert.equal(find(h.panel.element,node=>node===h.doc.activeElement),h.doc.activeElement);assert.deepEqual(h.fixture.calls,[]);
    h.action('apply').dispatchEvent(new Event('click'));await turn();
    assert.deepEqual(h.fixture.calls,[{name:'apply',args:['focus-current-review']}]);
  }finally{cleanup(h);}
});
test('disposal during a refresh cannot forward an enabled action or dispose borrowed authority',async()=>{
  const h=setup();try{
    h.review();const read=h.fixture.adapter.getSnapshot;
    h.fixture.adapter.getSnapshot=()=>{const value=read();h.panel.dispose();return value;};
    h.action('apply').dispatchEvent(new Event('click'));await turn();assert.deepEqual(h.fixture.calls,[]);assert.equal(h.container.children.length,0);
  }finally{cleanup(h);}
});
