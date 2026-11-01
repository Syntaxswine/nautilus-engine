import {bindSmartTileInput} from '../../../apps/editor/smart-tile/input.js';
const mounted=new URL(location.href).searchParams.get('mounted')==='1',records=[];
let input=null,clicks=0;const state={tool:'rectangle',draft:null,floor:{id:'0',mode:'manual'},actions:{setDraft:true,selectOwner:true,review:true,undo:true,redo:true}};
const session={getSnapshot:()=>structuredClone(state),setDraft(d){state.draft=d;input?.retire('draft-updated');},selectOwner(){},review(){clicks++;},undo(){},redo(){},cancel(reason){state.draft=null;input?.retire(reason);}};
for(const type of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture','touchstart','touchend','click'])document.addEventListener(type,event=>{
  if(records.length>=96)return;const row={type,pointerId:event.pointerId??null,pointerType:event.pointerType??null,primary:event.isPrimary??null,trusted:event.isTrusted,target:event.target.tagName,atMs:event.timeStamp,preventedBefore:event.defaultPrevented,inputBefore:input?.snapshot()??null};records.push(row);
  setTimeout(()=>{row.preventedAfter=event.defaultPrevented;row.inputAfter=input?.snapshot()??null;},0);
},{capture:true,passive:true});
if(mounted)input=bindSmartTileInput({canvas:document.querySelector('canvas'),session,screenToWorld:e=>[e.clientX/10,e.clientY/10],hitOwner:()=>null,readDraft:()=>({seed:0})});
document.querySelector('button').onclick=()=>session.review();
window.inputCompatibilityDiagnostic=Object.freeze({ready:true,snapshot:()=>structuredClone({mounted,clicks,records,state,input:input?.snapshot()??null,viewport:{width:innerWidth,height:innerHeight,scale:visualViewport.scale,touchPoints:navigator.maxTouchPoints},touchAction:getComputedStyle(document.querySelector('canvas')).touchAction}),dispose(){input?.dispose();}});
