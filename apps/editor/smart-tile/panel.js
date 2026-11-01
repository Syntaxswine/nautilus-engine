import {SMART_TILE_INTERFACE,assertSmartTileAdapter} from './contract.js';
import {smartTileFormValues,smartTileDraftFromFields} from './panel-fields.js';

let nextPanel=0;
const toolLabels={rectangle:'Rectangle',path:'Path',finish:'Finish whole surface'};
const statusLabels={idle:'Ready',draft:'Draft — review required',preparing:'Preparing preview',review:'Review — ready to apply',applying:'Applying edit','recovery-required':'Edit result unknown','presentation-error':'Accepted presentation needs attention',disposed:'Editor session closed'};
const actionKeys=['setTool','selectOwner','setDraft','review','apply','cancel','undo','redo','save','open','recover','retryPresentation','finish','exportLegacy','sendToGame'];
const human=key=>key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll(/[-_]/g,' ').replace(/^./,letter=>letter.toUpperCase());
const textValue=value=>{
  if(value===undefined||value===null)return 'Not reported';
  if(typeof value==='string')return value;
  if(typeof value==='boolean')return value?'Ready':'Not ready';
  if(typeof value==='number')return String(value);
  if(Array.isArray(value))return value.slice(0,16).map(textValue).join('; ');
  return Object.entries(value).slice(0,16).map(([key,item])=>human(key)+': '+textValue(item)).join(' · ');
};
function checkSnapshot(value){
  if(!value||value.version!==SMART_TILE_INTERFACE.version||!SMART_TILE_INTERFACE.phases.includes(value.phase)||!SMART_TILE_INTERFACE.tools.includes(value.tool))throw new TypeError('Unsupported Smart Tile snapshot version, phase or tool.');
  if(!value.actions||actionKeys.some(key=>typeof value.actions[key]!=='boolean'))throw new TypeError('Editor action flags are incomplete.');
  if(!Array.isArray(value.owners)||!Array.isArray(value.diagnostics)||!value.floor||!value.history||!value.readiness)throw new TypeError('Editor snapshot is incomplete.');
  return value;
}

// Borrows adapter and optional already-mounted floor element. Owns only this DOM,
// event subscriptions and transient form/output state. Installs no canvas/global router.
export function mountSmartTilePanel(container,adapter,{floorElement=null,onError=()=>{}}={}){
  assertSmartTileAdapter(adapter);
  if(!container?.ownerDocument)throw new TypeError('Mount into a DOM container.');
  if(typeof onError!=='function')throw new TypeError('onError must be a function.');
  const doc=container.ownerDocument,prefix='smart-tile-'+(++nextPanel),abort=new doc.defaultView.AbortController();
  let retired=false,unsubscribe=null,snapshot=null,inflight=false,generation=0,formKey='',lastNotice='',fault=null,reportingFault=false,rendering=false,queuedSnapshot=null,subscriptionBroken=false;
  const root=doc.createElement('section');root.className='smart-tile-panel';root.setAttribute('aria-label','Smart Tile construction');
  const make=(tag,text,className)=>{const element=doc.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
  const listen=(node,type,callback)=>node.addEventListener(type,callback,{signal:abort.signal});
  // Suppress native auto-repeat only; no shortcuts or canvas/gesture routing.
  listen(root,'keydown',event=>{if(event.repeat&&((event.target.closest?.('button')&&['Enter',' '].includes(event.key))||(event.key==='Enter'&&event.target.closest?.('form'))))event.preventDefault();});
  const title=make('h2','Smart Tile'),intro=make('p','Construct a region or level path. Review the complete change before applying it.','st-intro');
  const phase=make('output',undefined,'st-phase');phase.setAttribute('aria-live','polite');phase.setAttribute('aria-atomic','true');
  const notice=make('p','','st-notice');notice.setAttribute('role','status');
  const faultBox=make('p','','st-fault');faultBox.setAttribute('role','alert');faultBox.hidden=true;
  const floorReadout=make('p','','st-floor'),floorLink=make('button','Go to floor controls');floorLink.type='button';floorLink.hidden=!floorElement;
  listen(floorLink,'click',()=>{if(!retired)floorElement?.querySelector('button:not(:disabled):not([hidden]),select')?.focus();});
  const searchLabel=make('label','Find a construction tool'),search=make('input');search.type='search';search.id=prefix+'-search';search.placeholder='Region, curve, finish…';searchLabel.htmlFor=search.id;searchLabel.append(search);
  const tools=make('div',undefined,'st-tools');tools.setAttribute('role','group');tools.setAttribute('aria-label','Construction tool');
  const toolButtons=new Map(),gates=[];
  const gate=(button,action)=>{gates.push({button,action});return button;};
  const button=(label,action,invoke)=>{
    const node=gate(make('button',label),action);node.type='button';node.dataset.action=action;listen(node,'click',()=>invoke());return node;
  };
  for(const tool of SMART_TILE_INTERFACE.tools){
    const node=button(toolLabels[tool],'setTool',()=>run('setTool',[tool]));node.dataset.tool=tool;tools.append(node);toolButtons.set(tool,node);
  }
  const unavailable=make('details'),unavailableSummary=make('summary','Other construction capabilities');
  unavailable.append(unavailableSummary,make('p','Geometry Paint / Boolean union, overlap construction, variable-width or graded paths, ramps and stairs are unavailable in this v1 panel. Unsupported repair stays a named refusal.','st-hint'));
  const ownersLabel=make('label','Whole owner'),owners=make('select');owners.id=prefix+'-owner';owners.setAttribute('aria-label','Whole owner');ownersLabel.htmlFor=owners.id;ownersLabel.append(owners);
  listen(owners,'change',()=>run('selectOwner',[owners.value||null]));
  const ownerReadout=make('p','','st-hint'),form=make('form');form.noValidate=true;
  const fieldset=make('fieldset'),legend=make('legend','Draft controls'),fields=make('div',undefined,'st-fields');
  const scope=make('p','','st-hint'),formHint=make('p','','st-hint');
  const stage=gate(make('button','Update draft'),'setDraft');stage.type='submit';stage.dataset.action='setDraft';
  fieldset.append(legend,scope,fields,formHint,stage);form.append(fieldset);
  const inputMap=new Map();
  function field(name,label,{type='number',value='',min,max,step='any'}={}){
    const wrap=make('label',label),input=make('input');input.id=prefix+'-'+name;input.name=name;input.type=type;input.value=String(value);input.required=true;
    if(type==='number')input.step=step;if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);
    wrap.htmlFor=input.id;wrap.append(input);fields.append(wrap);inputMap.set(name,input);return input;
  }
  function buildFields(draft,tool){
    inputMap.clear();fields.replaceChildren();const values=smartTileFormValues(draft);if(tool==='path'&&!draft)values.widthM=2;
    scope.textContent=tool==='finish'?'Changes the selected whole owner; shared recipes and locks are handled by Editor.':draft?.ownerId?'Editing whole owner '+draft.ownerId:'New authored owner';
    legend.textContent=toolLabels[tool]+' controls';
    if(tool==='finish'){field('skinId','Finish ID',{type:'text',value:draft?.skinId??snapshot.owners.find(owner=>owner.id===snapshot.selectedOwnerId)?.skinId??''});formHint.textContent='Enter a registered cosmetic finish. Boundary material/profile and locked neighbours remain unchanged.';return;}
    field('x','Origin X (m)',{value:values.x});field('y','Origin Y (m)',{value:values.y});
    field('widthM','Native width (m)',{value:values.widthM,min:0});if(tool==='rectangle')field('depthM','Native depth (m)',{value:values.depthM,min:0});
    field('seed','Saved variation seed',{value:values.seed,min:0,max:4294967295,step:1});
    if(tool==='path'){
      const wrap=make('label','Original curve type'),select=make('select');select.name='curveKind';select.setAttribute('aria-label','Original curve type');select.id=prefix+'-curveKind';wrap.htmlFor=select.id;
      for(const kind of ['line','arc','cubic']){const option=make('option',human(kind));option.value=kind;select.append(option);}
      if(!['line','arc','cubic'].includes(values.curveKind)){const option=make('option','Unsupported: '+values.curveKind);option.value=values.curveKind;select.append(option);}
      select.value=values.curveKind;wrap.append(select);fields.append(wrap);inputMap.set('curveKind',select);
      const groups=[];
      const group=(kind,specs)=>{const start=fields.children.length;for(const [name,label]of specs)field(name,label,{value:values[name]});groups.push({kind,nodes:[...fields.children].slice(start)});};
      group('line',[['ax','Start X (m)'],['ay','Start Y (m)'],['bx','End X (m)'],['by','End Y (m)']]);
      group('arc',[['cx','Centre X (m)'],['cy','Centre Y (m)'],['radius','Centreline radius (m)'],['startRad','Start angle (rad)'],['sweepRad','Sweep angle (rad)']]);
      group('cubic',[0,1,2,3].flatMap(index=>[['p'+index+'x','Control '+index+' X (m)'],['p'+index+'y','Control '+index+' Y (m)']]));
      const show=()=>{for(const group of groups)for(const node of group.nodes){node.hidden=group.kind!==select.value;for(const input of node.querySelectorAll('input'))input.disabled=node.hidden;}};
      listen(select,'change',show);show();
    }
    formHint.textContent='Placed on the current floor. Dimensions, original curve controls and seed stay at the values you enter. Changing curve type is deliberate.';
  }
  listen(form,'submit',event=>{
    event.preventDefault();if(retired)return;
    try{
      const current=fresh();if(!current?.actions.setDraft||inflight)return;
      if(!form.reportValidity())return;
      const values=Object.fromEntries([...inputMap].map(([name,input])=>[name,input.value]));
      const draft=smartTileDraftFromFields(current.tool,values,current.draft,current.selectedOwnerId);
      run('setDraft',[draft]);
    }catch(error){showFault(error);}
  });
  const diagnostics=make('ol',undefined,'st-diagnostics'),diagnosticHeading=make('h3','Join and operation diagnostics');
  diagnostics.setAttribute('aria-label','Numbered diagnostics');
  const readiness=make('dl',undefined,'st-readiness'),readyHeading=make('h3','Separate readiness');
  const resources=make('p','','st-hint'),history=make('p','','st-hint');
  const actions=make('div',undefined,'st-actions');
  const review=button('Review','review',()=>run('review'));
  const apply=button('Apply','apply',()=>{const current=fresh();if(current?.reviewId)run('apply',[current.reviewId]);else showFault(new Error('The Editor has not supplied a current review identity.'));});
  const cancel=button('Cancel draft','cancel',()=>run('cancel',['panel-cancel']));
  const recover=button('Check edit result','recover',()=>{const current=fresh();if(current?.recoveryId)run('recover',[current.recoveryId]);else showFault(new Error('Recovery needs the original Editor request identity.'));});
  const retry=button('Retry accepted preview','retryPresentation',()=>run('retryPresentation'));
  actions.append(review,apply,cancel,recover,retry);
  const historyActions=make('div',undefined,'st-secondary');
  historyActions.append(button('Undo','undo',()=>run('undo')),button('Redo','redo',()=>run('redo')));
  const checkpoint=make('details'),checkpointSummary=make('summary','Save or open complete checkpoint'),checkpointLabel=make('label','Checkpoint JSON'),checkpointInput=make('textarea');
  checkpointInput.id=prefix+'-checkpoint';checkpointLabel.htmlFor=checkpointInput.id;checkpointInput.rows=5;checkpointInput.spellcheck=false;checkpointLabel.append(checkpointInput);
  const save=button('Save checkpoint','save',()=>run('save')),open=button('Open checkpoint','open',()=>run('open',[checkpointInput.value]));
  const saved=make('textarea');saved.readOnly=true;saved.rows=4;saved.hidden=true;saved.setAttribute('aria-label','Saved complete checkpoint JSON');
  checkpoint.append(checkpointSummary,make('p','History is session-only. Only the Editor reads, validates and saves complete source, floor bindings and tile authority.','st-hint'),save,checkpointLabel,open,saved);
  const unsupported=make('div',undefined,'st-secondary');
  const exportButton=make('button','Legacy export unavailable'),sendButton=make('button','Send to game unavailable');
  for(const node of [exportButton,sendButton]){node.type='button';node.disabled=true;}unsupported.append(exportButton,sendButton);
  const boundary=make('p','Legacy/block/game export needs a complete adapter. A visible surface does not establish collision, support, navigation, fire or water gameplay.','st-hint');
  root.append(title,intro,phase,notice,faultBox,floorReadout,floorLink,searchLabel,tools,unavailable,ownersLabel,ownerReadout,form,diagnosticHeading,diagnostics,readyHeading,readiness,resources,actions,history,historyActions,checkpoint,unsupported,boundary);
  container.append(root);
  listen(search,'input',()=>{const query=search.value.trim().toLowerCase();for(const [tool,node]of toolButtons)node.hidden=!(toolLabels[tool]+' '+({rectangle:'region paving floor',path:'curve road level',finish:'cosmetic material surface'}[tool])).toLowerCase().includes(query);});

  function showFault(error){
    if(retired)return;fault=error instanceof Error?error.message:String(error);faultBox.textContent=fault;faultBox.hidden=false;
    if(reportingFault)return;reportingFault=true;
    try{onError(error);}catch{/* Error observers cannot escape into Editor acceptance. */}finally{reportingFault=false;}
  }
  function fresh(){
    if(retired||subscriptionBroken)return null;
    try{const value=checkSnapshot(adapter.getSnapshot());receive(value);return value;}
    catch(error){snapshot=null;disable();showFault(error);return null;}
  }
  function disable(){for(const {button}of gates)button.disabled=true;owners.disabled=true;fieldset.disabled=true;checkpointInput.disabled=true;}
  function enable(){
    if(!snapshot||retired){disable();return;}
    for(const {button,action}of gates)button.disabled=snapshot.actions[action]!==true||(inflight&&action!=='cancel');
    owners.disabled=!snapshot.actions.selectOwner||inflight;fieldset.disabled=!snapshot.actions.setDraft||inflight;
    if(snapshot.tool==='finish')stage.disabled=stage.disabled||!snapshot.actions.finish;
    checkpointInput.disabled=!snapshot.actions.open||inflight;
  }
  function receive(value){
    if(retired||subscriptionBroken)return;queuedSnapshot={value};if(rendering)return;rendering=true;let turns=0;
    try{while(queuedSnapshot&&!retired){if(++turns>8){snapshot=null;disable();showFault(new Error('Editor observer reentry exceeded the UI update bound.'));queuedSnapshot=null;break;}const next=queuedSnapshot.value;queuedSnapshot=null;renderSnapshot(next);}}finally{rendering=false;}
  }
  function renderSnapshot(value){
    if(retired)return;
    try{
      value=checkSnapshot(value);snapshot=value;
      root.dataset.phase=value.phase;phase.textContent=statusLabels[value.phase];review.textContent=value.tool==='path'?'Finish path & review':'Review';
      if(!value.actions.save){saved.value='';saved.hidden=true;}
      floorReadout.textContent='Working floor: '+value.floor.label+' · '+value.floor.elevationM+' m · '+human(value.floor.mode);
      for(const [tool,node]of toolButtons)node.setAttribute('aria-pressed',String(tool===value.tool));
      const selected=doc.activeElement===owners;
      const ownerSignature=JSON.stringify([value.selectedOwnerId,value.owners]);
      if(owners.dataset.signature!==ownerSignature){
        const empty=make('option','No owner selected');empty.value='';
        owners.replaceChildren(empty,...value.owners.map(owner=>{const option=make('option',owner.id+(owner.locked?' · Owner locked':'')+' · '+owner.shapeKind+' · '+owner.floorId);option.value=owner.id;return option;}));
        owners.value=value.selectedOwnerId??'';owners.dataset.signature=ownerSignature;if(selected)owners.focus({preventScroll:true});
      }
      const owner=value.owners.find(item=>item.id===value.selectedOwnerId);
      ownerReadout.textContent=owner?(owner.locked?'Owner locked. ':'Whole owner. ')+owner.id+' · recipe '+owner.recipeId+' · finish '+owner.skinId:'Select a surface to inspect or finish. Each selection covers the complete shape.';
      const signature=JSON.stringify([value.tool,value.draft,value.selectedOwnerId,value.floor.id,value.floor.mode,value.revision,value.checkpointSerial]);
      if(signature!==formKey){const focused=doc.activeElement?.name;formKey=signature;buildFields(value.draft,value.tool);if(focused&&inputMap.has(focused))inputMap.get(focused).focus({preventScroll:true});}
      diagnostics.replaceChildren(...value.diagnostics.slice(0,128).map((item,index)=>{
        const li=make('li');li.dataset.code=item.code;
        li.append(make('strong',(index+1)+'. '+item.code),make('p',item.message));
        const refs=[item.path,item.ownerId,item.portId].filter(Boolean);if(refs.length)li.append(make('p',refs.join(' · '),'st-hint'));
        if(item.action)li.append(make('p',typeof item.action==='string'?item.action:textValue(item.action),'st-repair'));
        return li;
      }));
      if(!value.diagnostics.length)diagnostics.append(make('li','No diagnostics reported.'));
      if(value.diagnostics.length>128)diagnostics.append(make('li','Showing 128 of '+value.diagnostics.length+' diagnostics.'));
      const entries=new Map(Object.entries(value.readiness));
      for(const key of ['authoring','saveability','shape','visual','query','support','navigation','fire','water','game'])if(!entries.has(key))entries.set(key,undefined);
      readiness.replaceChildren(...[...entries].flatMap(([key,item])=>[make('dt',human(key)),make('dd',textValue(item))]));
      resources.textContent='View resources: '+textValue(value.resources);
      history.textContent='Session history: '+value.history.undo+' undo · '+value.history.redo+' redo · '+value.history.bytes+' / '+value.history.maxBytes+' bytes. Reopening starts empty history.';
      recover.hidden=value.phase!=='recovery-required';retry.hidden=value.phase!=='presentation-error';
      if(value.phase==='recovery-required')notice.textContent='Showing the last confirmed scene. Recover original request '+(value.recoveryId??'identity unavailable')+'. A new edit cannot settle it.';
      else if(value.phase==='presentation-error')notice.textContent='Use the Editor’s diagnostics to check acceptance. Retrying presentation rebuilds only the accepted view; it never repeats an edit.';
      else notice.textContent=lastNotice;
      enable();
    }catch(error){snapshot=null;disable();showFault(error);}
  }
  async function run(name,args=[]){
    const current=fresh();if(!current||!current.actions[name]||(inflight&&name!=='cancel'))return;
    if(name==='cancel'){generation++;inflight=false;}
    const owner=++generation;inflight=true;fault=null;faultBox.hidden=true;enable();
    try{
      const result=await adapter[name](...args);
      if(retired||owner!==generation)return;
      if(name==='save'){const latest=fresh();if(!latest?.actions.save||latest.revision!==current.revision||latest.checkpointSerial!==current.checkpointSerial)return;}
      if(result?.ok===false)showFault(new Error(result.code??'Editor refused this operation. See diagnostics.'));
      else if(name==='save'&&typeof result?.checkpointJSON==='string'){saved.value=result.checkpointJSON;saved.hidden=false;lastNotice='Complete checkpoint prepared by Editor. Copy it from the saved checkpoint field.';}
      else lastNotice=name==='apply'&&result?.committed===true?'Edit accepted. Checkpoint save status remains host-owned.':name==='retryPresentation'?'Accepted preview retry completed.':name==='setDraft'?'Draft updated. Review before Apply.':'';
    }catch(error){if(!retired&&owner===generation)showFault(error);}
    finally{if(!retired&&owner===generation){inflight=false;fresh();}}
  }
  let subscription;
  try{
    subscription=adapter.subscribe(receive);
    if(typeof subscription!=='function')throw new TypeError('Editor subscribe must return an unsubscribe function.');
    if(retired)subscription();else unsubscribe=subscription;
    fresh();
  }catch(error){subscriptionBroken=true;snapshot=null;disable();showFault(error);}
  return Object.freeze({
    element:root,refresh:fresh,
    dispose(){
      if(retired)return Object.freeze([]);retired=true;generation++;inflight=false;queuedSnapshot=null;
      const errors=[],stop=unsubscribe;unsubscribe=null;
      for(const cleanup of [()=>abort.abort(),()=>stop?.(),()=>root.remove()])try{cleanup();}catch(error){errors.push(error);}
      return Object.freeze(errors);
    }
  });
}
