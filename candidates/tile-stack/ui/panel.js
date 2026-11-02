import {mountFloorNavigation} from '../../../packages/floor-navigation/dom.js';
import {assertSmartTileAdapter} from '../../../apps/editor/smart-tile/contract.js';
import {readTileStackUISnapshot,workspaceUIBinding,tileStackIntent,tileFinishIntent,phaseLabel} from './contract.js';

let serial=0;
const ownMethod=(adapter,name)=>{const slot=Object.getOwnPropertyDescriptor(adapter,name);return slot&&Object.hasOwn(slot,'value')&&typeof slot.value==='function';};
const words=value=>value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,letter=>letter.toUpperCase());
const describe=value=>value===null||value===undefined?'Not reported':typeof value==='object'?Object.entries(value).map(([key,item])=>words(key)+': '+String(item)).join(' · '):String(value);

// Presentation only. Explicit v2 snapshots, original fifteen methods, borrowed floors.
export function mountTileStackUI(container,adapter,{floorController,keyboardTarget=container,floorElement=null,onError=()=>{}}={}){
  assertSmartTileAdapter(adapter); // Same required own-method set; does not reinterpret v1 data.
  const doc=container?.ownerDocument;
  if(!doc||!floorController?.state||typeof floorController.subscribe!=='function'||keyboardTarget?.ownerDocument!==doc)throw new TypeError('Supply a DOM container, actual floor controller and owned keyboard element.');
  const id='tile-stack-ui-'+(++serial),events=new doc.defaultView.AbortController();
  let retired=false,snapshot=null,reading=false,rendering=false,queued=null,updates=0,failures=0,busy=false,operation=0,unsubscribe=null,unfloor=null,floorView=null,reporting=false,subscriptionBroken=false;
  let floorKey='',draftKey='',catalogueKey='',ownersKey='',noticeText='',binding=null;
  const make=(tag,text,css)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(css)node.className=css;return node;};
  const listen=(node,type,callback)=>node.addEventListener(type,callback,{signal:events.signal});
  const root=make('section',undefined,'tile-stack-ui');root.setAttribute('aria-label','Stack and finish candidate controls');
  const title=make('h2','Stack & finish'),intro=make('p','Choose declared floors and an explicit requested clearance. Review the complete change before applying it.','ts-intro');
  const status=make('output',undefined,'ts-status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  const fault=make('p','','ts-fault');fault.setAttribute('role','alert');fault.hidden=true;
  const notice=make('p','','ts-notice');notice.setAttribute('role','status');
  const floorMount=make('div',undefined,'ts-floor-mount'),current=make('p','','ts-current');
  const floorHeading=make('h3','Inspect a floor'),floorHint=make('p','Inspection changes only the working view. Stack members are chosen separately below.','ts-hint');
  const gates=[];
  const control=(label,action,callback)=>{const node=make('button',label);node.type='button';node.dataset.action=action;gates.push({node,action});listen(node,'click',callback);return node;};
  const viewGroup=make('div',undefined,'ts-row');viewGroup.setAttribute('role','group');viewGroup.setAttribute('aria-label','Surface inspection');
  const selectedView=control('Selected floor','setInspection',()=>act('setInspection',()=>[{mode:'selected-floor',cutawayFloorId:null}]));
  const overview=control('Overview','setInspection',()=>act('setInspection',()=>[{mode:'overview',cutawayFloorId:null}]));
  const cutaway=control('Cutaway here','setInspection',()=>act('setInspection',()=>[{mode:'cutaway',cutawayFloorId:floorController.state.selectedId}]));
  viewGroup.append(selectedView,overview,cutaway);const viewReason=make('p','','ts-hint');
  const sourceMode=control('Rectangle source mode','setTool',()=>act('setTool',()=>['rectangle']));
  const stackForm=make('form'),stackFieldset=make('fieldset'),stackLegend=make('legend','Stack members'),sourceReadout=make('p','','ts-hint');stackForm.noValidate=true;stackFieldset.append(stackLegend,sourceReadout);
  const membership=make('div',undefined,'ts-membership');membership.setAttribute('role','group');membership.setAttribute('aria-label','Floors included in stack');
  const selectedCount=make('output');selectedCount.setAttribute('aria-live','polite');
  const shortcuts=make('div',undefined,'ts-row'),all=make('button','Select all declared floors'),clear=make('button','Clear selection');all.type=clear.type='button';shortcuts.append(all,clear);
  const acceptedClearance=make('output',undefined,'ts-accepted-clearance');acceptedClearance.setAttribute('aria-label','Accepted saved minimum clearance');
  const clearanceLabel=make('label','Requested minimum clearance (m)'),clearance=make('input');clearance.type='number';clearance.step='any';clearance.min='0';clearance.required=true;clearance.value='2';clearance.name='minimumClearanceM';clearance.id=id+'-clearance';clearanceLabel.htmlFor=clearance.id;clearanceLabel.append(clearance);
  const stageStack=control('Update stack draft','stack',()=>{});stageStack.type='submit';
  const stackReason=make('p','The requested minimum is never lowered to make a review pass. Editor/planner owns feasibility and saved constraints.','ts-hint');
  const lockNote=make('p','Lower surfaces will be locked; the highest remains editable. Editor/planner owns the resulting IDs, locks and crossings.','ts-hint');
  stackFieldset.append(shortcuts,membership,selectedCount,acceptedClearance,clearanceLabel,lockNote,stageStack,stackReason);stackForm.append(stackFieldset);
  const memberInputs=new Map();
  const updateCount=()=>{selectedCount.textContent=[...memberInputs.values()].filter(node=>node.checked).length+' of '+floorController.state.floors.length+' declared floors selected';};
  listen(all,'click',()=>{for(const node of memberInputs.values())node.checked=true;updateCount();});
  listen(clear,'click',()=>{for(const node of memberInputs.values())node.checked=false;updateCount();});
  listen(stackForm,'submit',event=>{event.preventDefault();if(!stackForm.reportValidity())return;act('stack',value=>[tileStackIntent({rectangle:value.draft,floorIds:[...memberInputs].filter(([,node])=>node.checked).map(([key])=>key),minimumClearanceM:clearance.value},floorController.state.floors)]);});
  const finishForm=make('form'),finishFieldset=make('fieldset'),finishLegend=make('legend','Finish whole surface');
  const ownerLabel=make('label','Authored owner'),owner=make('select');owner.id=id+'-owner';owner.setAttribute('aria-label','Authored owner');ownerLabel.htmlFor=owner.id;ownerLabel.append(owner);listen(owner,'change',()=>act('selectOwner',()=>[owner.value||null]));
  const finishLabel=make('label','Cosmetic finish'),finish=make('select');finish.id=id+'-finish';finish.setAttribute('aria-label','Cosmetic finish');finishLabel.htmlFor=finish.id;finishLabel.append(finish);
  const finishReason=make('p','','ts-hint'),finishIdentity=make('p','','ts-hint'),stageFinish=control('Update finish draft','finish',()=>{});stageFinish.type='submit';
  finishFieldset.append(finishLegend,ownerLabel,finishLabel,finishIdentity,finishReason,stageFinish,make('p','One active version per stable finish ID is bound for this workspace. The host validates cosmetic compatibility and unchanged physical boundaries.','ts-hint'));finishForm.append(finishFieldset);finishForm.noValidate=true;
  listen(finish,'change',()=>showFinish(snapshot));listen(finishForm,'submit',event=>{event.preventDefault();act('finish',value=>[tileFinishIntent({ownerId:value.selectedOwnerId,finishId:finish.value},value.finishCatalogue)]);});
  const unavailable=make('section'),unavailableList=make('ul');unavailable.append(make('h3','Unavailable capabilities'),unavailableList);
  for(const [label,reason]of [['Character follow','No follow action is bound in this authoring proof.'],['Contact / eye','No contact/detection action is bound in this authoring proof.'],['Geometry Paint / Boolean union','This tranche binds no Boolean construction provider.'],['Ramps / stairs / grade','Only level rectangle stacks are proposed.']]){const li=make('li'),button=make('button',label);button.type='button';button.disabled=true;li.append(button,make('p',reason));unavailableList.append(li);}
  const diagnostics=make('ol',undefined,'ts-diagnostics'),readiness=make('dl',undefined,'ts-readiness'),resources=make('p','','ts-hint');
  const actionBar=make('div',undefined,'ts-actions');actionBar.append(control('Review','review',()=>act('review')),control('Apply','apply',()=>act('apply',value=>[value.reviewId])),control('Cancel draft','cancel',()=>act('cancel',()=>['tile-stack-ui-cancel'])),control('Check edit result','recover',()=>act('recover',value=>[value.recoveryId])),control('Retry accepted view','retryPresentation',()=>act('retryPresentation')));
  root.append(title,intro,status,fault,notice,floorHeading,floorHint,floorMount,current,viewGroup,viewReason,sourceMode,stackForm,finishForm,make('h3','Review diagnostics'),diagnostics,make('h3','Separate readiness'),readiness,resources,unavailable,actionBar,make('p','Flat surfaces and authoring clearance do not establish slabs, support, navigation or gameplay. Visibility never changes source, contacts or allocation budgets.','ts-hint'));container.append(root);
  listen(root,'keydown',event=>{if(event.repeat&&((event.target.closest?.('button')&&['Enter',' '].includes(event.key))||(event.key==='Enter'&&event.target.closest?.('form'))))event.preventDefault();});
  function error(reason){if(retired)return;fault.textContent=reason instanceof Error?reason.message:String(reason);fault.hidden=false;if(reporting)return;reporting=true;try{onError(reason);}catch{}finally{reporting=false;}}
  function permitted(value,action){
    if(!value)return false;
    if(action==='stack')return value.actions.stack===true&&value.actions.setDraft===true&&['rectangle','stack'].includes(value.draft?.tool);
    if(action==='finish')return value.actions.finish===true&&value.actions.setDraft===true;
    if(action==='setInspection')return value.actions.setInspection===true&&ownMethod(adapter,'setInspection');
    return value.actions[action]===true;
  }
  function disable(){for(const {node}of gates)node.disabled=true;stackFieldset.disabled=true;finishFieldset.disabled=true;}
  function enable(){
    if(retired||!snapshot){disable();return;}
    for(const {node,action}of gates)node.disabled=!permitted(snapshot,action)||(busy&&action!=='cancel');
    stackFieldset.disabled=!permitted(snapshot,'stack')||busy;finishFieldset.disabled=busy||(!permitted(snapshot,'selectOwner')&&!permitted(snapshot,'finish'));
    owner.disabled=!permitted(snapshot,'selectOwner')||busy;finish.disabled=!permitted(snapshot,'finish')||busy;
    const choice=snapshot.finishCatalogue.entries.find(entry=>entry.id===finish.value);stageFinish.disabled=!permitted(snapshot,'finish')||busy||!choice?.available;
  }
  function showFinish(value){
    const entry=value?.finishCatalogue.entries.find(item=>item.id===finish.value);
    finishIdentity.textContent=entry?'Captured finish: '+entry.label+' · '+entry.id+' · v'+entry.version:'Choose a finish from the captured catalogue.';
    finishReason.textContent=entry?(entry.available?'Available for the host-selected source.':entry.reason):'No finish is selected. The UI never infers finishId from an owner’s skinId.';enable();
  }
  function receive(value){
    if(retired||subscriptionBroken)return;updates++;snapshot=null;queued={value};if(rendering)return;rendering=true;let iterations=0;
    try{while(queued&&!retired){if(++iterations>8){failures++;snapshot=null;disable();error(new Error('UI observer reentry exceeded the candidate bound.'));queued=null;break;}const next=queued.value;queued=null;try{render(readTileStackUISnapshot(next,floorController.state));}catch(reason){failures++;snapshot=null;disable();error(reason);}}}finally{rendering=false;}
  }
  function refresh(){
    if(retired||subscriptionBroken||reading||rendering)return null;reading=true;const epoch=updates,failed=failures;
    try{const value=adapter.getSnapshot();if(retired||updates!==epoch)return null;receive(value);return !retired&&!subscriptionBroken&&failures===failed?snapshot:null;}catch(reason){snapshot=null;disable();error(reason);return null;}finally{reading=false;}
  }
  function render(value){
    const identity=workspaceUIBinding(value);if(binding!==null&&identity!==binding){
      // Retire this presentation binding and every outstanding UI reply. Only an
      // explicit new mount may borrow a different workspace; no host mutation.
      subscriptionBroken=true;operation++;busy=false;queued=null;
      throw new TypeError('Workspace/floor/catalogue identity changed. Rebind through a new host session; no local catalogue upgrade.');
    }
    const state=floorController.state,floors=state.floors,active=floors.find(item=>item.id===state.selectedId),draft=value.draft;
    status.textContent=phaseLabel(value.phase);root.dataset.phase=value.phase;current.textContent='Current floor '+active.label+' · '+active.elevationM+' m · '+state.mode;
    acceptedClearance.textContent='Accepted saved minimum: '+(value.acceptedMinimumClearanceM===undefined?'Not reported by the host.':value.acceptedMinimumClearanceM===null?'No accepted constraint is bound.':value.acceptedMinimumClearanceM+' m');
    sourceReadout.textContent=['rectangle','stack'].includes(draft?.tool)?'Current rectangle: '+draft.widthM+' × '+draft.depthM+' m · seed '+draft.seed+' · finish '+draft.finishId:'Choose Rectangle source mode before defining stack members.';
    const table=JSON.stringify(floors);if(floorKey!==table){floorKey=table;memberInputs.clear();membership.replaceChildren();for(const floor of floors){const label=make('label'),input=make('input');input.type='checkbox';input.value=floor.id;input.checked=true;input.setAttribute('aria-label','Stack floor '+floor.label+' · '+floor.elevationM+' m');label.append(input,make('span',floor.label+' · '+floor.elevationM+' m'));membership.append(label);memberInputs.set(floor.id,input);listen(input,'change',updateCount);}updateCount();}
    const signature=draft?.tool==='stack'?JSON.stringify([draft.floorIds,draft.minimumClearanceM]):'';
    if(signature&&signature!==draftKey){draftKey=signature;const ids=new Set(draft.floorIds);for(const [key,input]of memberInputs)input.checked=ids.has(key);clearance.value=String(draft.minimumClearanceM);updateCount();}
    const previous=doc.activeElement,ownedField=[...memberInputs.values(),clearance,owner,finish].includes(previous),ownerSignature=JSON.stringify([value.selectedOwnerId,value.owners]);
    if(ownersKey!==ownerSignature){ownersKey=ownerSignature;owner.replaceChildren(new doc.defaultView.Option('Select a whole owner',''),...value.owners.map(item=>new doc.defaultView.Option(item.id+(item.locked?' · locked':''),item.id)));owner.value=value.selectedOwnerId??'';if(previous===owner)owner.focus({preventScroll:true});}
    const catalogueSignature=JSON.stringify([value.finishCatalogue.entries,value.selectedOwnerId,draft?.finishId]);
    if(catalogueKey!==catalogueSignature){
      const oldId=finish.value,ownerChanged=catalogueKey&&JSON.parse(catalogueKey)[1]!==value.selectedOwnerId;catalogueKey=catalogueSignature;finish.replaceChildren(new doc.defaultView.Option('Choose a cosmetic finish',''));
      for(const entry of value.finishCatalogue.entries){const option=new doc.defaultView.Option(entry.label+' · v'+entry.version+(entry.available?'':' — unavailable'),entry.id);option.disabled=!entry.available;finish.append(option);}
      finish.value=ownerChanged?(draft?.tool==='finish'?draft.finishId:''):(oldId||draft?.finishId||'');if(previous===finish)finish.focus({preventScroll:true});
    }
    if(ownedField&&doc.activeElement!==previous&&previous.isConnected)previous.focus({preventScroll:true});
    selectedView.setAttribute('aria-pressed',String(value.inspection.mode==='selected-floor'));overview.setAttribute('aria-pressed',String(value.inspection.mode==='overview'));cutaway.setAttribute('aria-pressed',String(value.inspection.mode==='cutaway'));
    viewReason.textContent=permitted(value,'setInspection')?'Native-height visibility is presented by the host; source and budgets are unchanged.':'Native-height inspection is not bound by this host. No debug-box or fake floor view is substituted.';
    diagnostics.replaceChildren(...value.diagnostics.slice(0,128).map((item,index)=>{const li=make('li');li.append(make('strong',(index+1)+'. '+item.code),make('p',item.message));const refs=[item.path,item.ownerId,...(Array.isArray(item.ownerIds)?item.ownerIds:[]),item.portId,...(Array.isArray(item.reservationIds)?item.reservationIds:[]),item.requiredCapability].filter(part=>typeof part==='string').slice(0,32);if(refs.length)li.append(make('p',refs.join(' · '),'ts-hint'));li.append(make('p',item.action||''));return li;}));if(!value.diagnostics.length)diagnostics.append(make('li','No diagnostics reported.'));
    readiness.replaceChildren(...Object.entries(value.readiness||{}).flatMap(([key,item])=>[make('dt',words(key)),make('dd',describe(item))]));resources.textContent='All charged view allocations: '+describe(value.resources);
    notice.textContent=value.phase==='recovery-required'?'Last confirmed work remains. Recover original request '+(value.recoveryId||'identity unavailable')+' before another edit.':value.phase==='presentation-error'?'Retry rebuilds only accepted presentation; it never repeats the edit.':noticeText;
    for(const {node,action}of gates){if(action==='recover')node.hidden=value.phase!=='recovery-required';if(action==='retryPresentation')node.hidden=value.phase!=='presentation-error';}
    if(!retired&&!queued){binding=identity;snapshot=value;showFinish(value);enable();}
  }
  async function act(name,argsFor=()=>[]){
    const current=refresh();if(!current||!permitted(current,name)||(busy&&name!=='cancel'))return;
    let args;try{args=argsFor(current);if(['apply','recover'].includes(name)&&(typeof args[0]!=='string'||!args[0]))throw new TypeError('Editor must supply the original current action identity.');}catch(reason){error(reason);return;}
    if(name==='cancel'){operation++;busy=false;}const ticket=++operation;busy=true;fault.hidden=true;enable();
    try{const method=name==='stack'||name==='finish'?'setDraft':name,result=await adapter[method](...args);if(retired||ticket!==operation)return;if(result?.ok===false)error(new Error(result.code||'The host refused this operation.'));else noticeText=name==='apply'&&result?.committed===true?'Edit accepted by the host.':name==='stack'||name==='finish'?'Draft updated. Review before Apply.':'';}
    catch(reason){if(!retired&&ticket===operation)error(reason);}finally{if(!retired&&ticket===operation){busy=false;refresh();}}
  }
  try{
    if(!floorElement)floorView=mountFloorNavigation(floorMount,floorController,{keyboardTarget,showModes:false,label:'Inspect declared floor',onError:error});
    else{floorMount.append(make('p','Use the host’s existing floor control.','ts-hint'));const go=make('button','Go to floor control');go.type='button';floorMount.append(go);listen(go,'click',()=>floorElement.querySelector('button:not(:disabled):not([hidden])')?.focus());}
    unfloor=floorController.subscribe(()=>{if(snapshot)refresh();});const stop=adapter.subscribe(receive);if(typeof stop!=='function')throw new TypeError('Adapter must return an unsubscribe function.');if(retired)stop();else unsubscribe=stop;refresh();
  }catch(reason){subscriptionBroken=true;snapshot=null;disable();error(reason);}
  return Object.freeze({element:root,refresh,dispose(){if(retired)return [];retired=true;operation++;snapshot=null;queued=null;const errors=[];for(const cleanup of [()=>events.abort(),()=>unsubscribe?.(),()=>unfloor?.(),()=>floorView?.dispose(),()=>root.remove()])try{cleanup();}catch(reason){errors.push(reason);}unsubscribe=null;unfloor=null;return errors;}});
}
