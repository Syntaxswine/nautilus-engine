import test from 'node:test';
import assert from 'node:assert/strict';
import {mountTitleScreen} from '../packages/game-ui/title.js';

// Queued close events only. Native dialog Escape/focus is tested in the browser.
class Node extends EventTarget{
  constructor(doc,tag){super();Object.assign(this,{ownerDocument:doc,tagName:tag.toUpperCase(),children:[],dataset:{},hidden:false,disabled:false,open:false,textContent:'',classList:{toggle(){}}});}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  setAttribute(){}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  get isConnected(){return this.ownerDocument.documentElement.contains(this);}
  focus(){this.ownerDocument.activeElement=this;}
  showModal(){this.open=true;}
  close(){if(!this.open)return;this.open=false;this.ownerDocument.pending.push(()=>this.dispatchEvent(new Event('close')));}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
  querySelectorAll(){return this.children.flatMap(child=>[...(child.tagName==='BUTTON'&&!child.disabled?[child]:[]),...child.querySelectorAll()]);}
}
const find=(node,predicate)=>predicate(node)?node:node.children.map(child=>find(child,predicate)).find(Boolean);
async function setup({saved=false}={}){
  const doc={baseURI:'https://example.invalid/',pending:[],createElement(tag){return new Node(this,tag);}};
  doc.documentElement=new Node(doc,'html');doc.body=new Node(doc,'body');doc.documentElement.append(doc.body);
  const external=new Node(doc,'input'),container=new Node(doc,'main');doc.body.append(external,container);external.focus();
  const handle=mountTitleScreen(container,{title:'Focus test',credits:['Credits'],checkSave:async()=>({available:saved}),onContinue:async()=>{},onStart:async()=>{},focusGame:()=>external.focus()});
  await handle.ready;const dialogs=handle.element.children.filter(node=>node.tagName==='DIALOG');
  const button=action=>find(handle.element,node=>node.dataset.action===action);
  return {doc,external,handle,confirm:dialogs[0],credits:dialogs[1],button,click:node=>node.dispatchEvent(new Event('click')),flush:()=>{while(doc.pending.length)doc.pending.shift()();}};
}
test('ordinary queued credits and confirmation closes restore their own openers',async()=>{
  const h=await setup({saved:true});try{
    h.click(h.button('credits'));h.credits.close();h.flush();assert.equal(h.doc.activeElement===h.button('credits'),true);
    h.click(h.button('start'));h.confirm.close();h.flush();assert.equal(h.doc.activeElement===h.button('start'),true);
  }finally{h.handle.dispose();}
});
test('late credits close never steals deliberate New game or external focus',async()=>{
  const h=await setup();try{
    for(const target of [h.button('start'),h.external]){
      h.click(h.button('credits'));h.credits.close();target.focus();h.flush();assert.equal(h.doc.activeElement===target,true);
    }
  }finally{h.handle.dispose();}
});
test('document fallback after close restores the ordinary opener',async()=>{
  const h=await setup();try{h.click(h.button('credits'));h.credits.close();h.doc.body.focus();h.flush();assert.equal(h.doc.activeElement===h.button('credits'),true);}finally{h.handle.dispose();}
});
test('late close cannot steal a newer dialog or a reopened dialog focus',async()=>{
  const h=await setup({saved:true});try{
    h.click(h.button('credits'));h.credits.close();h.click(h.button('start'));const confirmationFocus=h.doc.activeElement;h.flush();assert.equal(h.doc.activeElement===confirmationFocus,true);
    h.confirm.close();h.flush();h.click(h.button('credits'));h.credits.close();h.click(h.button('credits'));const reopenedFocus=h.doc.activeElement;h.flush();assert.equal(h.doc.activeElement===reopenedFocus,true);
  }finally{h.handle.dispose();}
});
test('queued close after hide or disposal preserves game/external focus',async()=>{
  for(const retire of ['hide','dispose']){
    const h=await setup();try{
      h.click(h.button('credits'));h.credits.close();h.handle[retire]();h.external.focus();h.flush();assert.equal(h.doc.activeElement===h.external,true);
    }finally{h.handle.dispose();}
  }
});
test('disabled opener is not refocused from document fallback',async()=>{
  const h=await setup();try{
    h.click(h.button('credits'));h.credits.close();h.button('credits').disabled=true;h.doc.body.focus();h.flush();assert.equal(h.doc.activeElement===h.doc.body,true);
  }finally{h.handle.dispose();}
});
