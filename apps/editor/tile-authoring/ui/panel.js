import {createTileAuthoringCommands,finiteUIData,tileAuthoringExpected,tileAuthoringPin,tileAuthoringLabelMessage,TILE_AUTHORING_FORM_LIMITS} from './commands.js';

const serviceMethods = ['describe','snapshot','query','prepare','apply','cancel','recover'];
const issue = (code, message) => Object.assign(new TypeError(code + ': ' + message), {code});
const enabled = (view, name) => view?.presentation.actions[name]?.enabled === true;
const ownFunction = (object, key) => !!object && typeof Object.getOwnPropertyDescriptor(object, key)?.value === 'function';
const stringify = value => JSON.stringify(value);
const sameData = (a,b) => a===b || !!a && !!b && typeof a==='object' && typeof b==='object' && Array.isArray(a)===Array.isArray(b) && Object.keys(a).length===Object.keys(b).length && Object.keys(a).every(k=>Object.hasOwn(b,k)&&sameData(a[k],b[k]));
const bindingKey = view => [view.snapshot.document.id,view.snapshot.document.sourceJSON,view.snapshot.document.floorBinding,view.snapshot.document.finishBinding];
const actionKey = view => [view.snapshot.expected,view.presentation.command,view.presentation.review?.reviewToken??null,view.presentation.retainedApplyRequest,view.presentation.outcome,view.presentation.actions];
export function readTileAuthoringUIView(input) {
  const value = finiteUIData(input);
  tileAuthoringExpected(value.snapshot);
  const p = value.presentation;
  if (!p || !p.actions || !Array.isArray(p.targetOwnerIds) || !Array.isArray(p.selectedCaptureMarkIds) || p.includeSelectedDecorationDefaults !== false) throw issue('UI_PRESENTATION_REQUIRED','Supply the current EditorDraftView; C1 decoration capture is unavailable.');
  for (const entry of Object.values(p.actions)) if (!entry || typeof entry.enabled !== 'boolean' || !Array.isArray(entry.diagnostics)) throw issue('UI_ACTION_FLAGS_REQUIRED','Editor supplies explicit enabled flags and diagnostics.');
  if (p.command !== null && (p.command?.kind !== 'nautilus-tile-authoring-command' || p.command.version !== 1)) throw issue('UI_CANONICAL_COMMAND_REQUIRED','No UI-intent or historical packet aliases.');
  if (p.outcome !== null && (!p.outcome || !['committed','rejected','unknown'].includes(p.outcome.outcome) || p.outcome.committed !== ({committed:true,rejected:false,unknown:null})[p.outcome.outcome] || typeof p.outcome.requestId !== 'string')) throw issue('UI_OUTCOME_REQUIRED','Keep committed true, rejected false and unknown null distinct.');
  if (p.outcome?.outcome === 'committed' && !['ready','pending','failed'].includes(p.outcome.presentation)) throw issue('UI_PRESENTATION_REQUIRED','Committed work survives failed presentation.');
  if (p.outcome?.outcome === 'unknown' && (p.outcome.committed !== null || p.outcome.writesFrozen !== true || p.outcome.recoveryRequestId !== p.outcome.requestId)) throw issue('UI_RECOVERY_ID_REQUIRED','Freeze writes and reconcile the same original request.');
  if (p.retainedApplyRequest !== null) {
    const request = p.retainedApplyRequest;
    if (!request || Object.keys(request).sort().join(',') !== 'expectedTargetDigest,requestId,reviewToken' ||
        typeof request.requestId !== 'string' || !/^[a-f0-9]{64}$/.test(request.reviewToken) || !/^[a-f0-9]{64}$/.test(request.expectedTargetDigest) || !p.review || request.requestId !== p.review.requestId || request.reviewToken !== p.review.reviewToken) throw issue('UI_RETAINED_REQUEST_REQUIRED','Use the request retained by this Editor connection.');
  }
  if (value.commandJSON !== undefined && value.commandJSON !== null && (typeof value.commandJSON !== 'string' || !p.command || !sameData(finiteUIData(JSON.parse(value.commandJSON)),p.command))) throw issue('UI_COMMAND_BYTES_REQUIRED','The retained command bytes must describe the actual staged command.');
  return value;
}

// Protocol/presentation coordinator only. No journal, private prepared handle or
// authority is owned here; every action is forwarded to borrowed Editor ports.
export function createTileAuthoringUIController(binding,{onView=()=>{},onPending=()=>{},onError=()=>{}}={}) {
  const service=Object.getOwnPropertyDescriptor(binding??{},'service')?.value;
  if (!binding || !serviceMethods.every(name=>ownFunction(service,name)) ||
      !['getSnapshot','subscribe','collectCommand','discardDraft'].every(name=>ownFunction(binding,name))) throw issue('UI_BINDING_REQUIRED','Supply one actual HostService and the Editor draft/view ports.');
  const collectCommand=Object.getOwnPropertyDescriptor(binding,'collectCommand').value;
  const originalMethods=serviceMethods.map(name=>Object.getOwnPropertyDescriptor(service,name).value);
  const sameConnection=()=>Object.getOwnPropertyDescriptor(binding,'collectCommand')?.value===collectCommand&&Object.getOwnPropertyDescriptor(binding,'service')?.value===service&&serviceMethods.every((name,i)=>Object.getOwnPropertyDescriptor(service,name)?.value===originalMethods[i]);
  let disposed=false,broken=false,lastView=null,identity=null,epoch=0,ticket=0,pending=false,rendering=false,queued=null,stop=null;
  const notify = reason => {try{onError(reason);}catch{}};
  const invalidate = reason => {lastView=null;try{onView(null);}catch{}notify(reason);};
  const read = () => {if(!sameConnection()){broken=true;ticket++;pending=false;throw issue('UI_REBIND_REQUIRED','The borrowed HostService connection changed.');}const raw=binding.getSnapshot();return {raw,view:readTileAuthoringUIView(raw)};};
  function receive(raw) {
    if(disposed||broken)return;if(!sameConnection()){broken=true;ticket++;pending=false;invalidate(issue('UI_REBIND_REQUIRED','The borrowed HostService connection changed.'));return;}queued={raw};if(rendering)return;rendering=true;let visits=0;
    try {
      while(queued&&!disposed&&!broken){
        if(++visits>8){queued=null;invalidate(issue('UI_OBSERVER_BOUND','Editor observer reentry exceeded the UI bound.'));break;}
        const {raw}=queued;queued=null;lastView=null;epoch++;
        try {
          const view=readTileAuthoringUIView(raw),next=bindingKey(view);
          if(identity!==null&&!sameData(next,identity)){broken=true;ticket++;pending=false;onPending(false);throw issue('UI_REBIND_REQUIRED','Workspace/floor/finish identity changed. Mount a new explicit Editor connection.');}
          onView(view);
          if(!queued&&!disposed&&!broken){identity=next;lastView=view;onPending(pending);}
        }catch(reason){invalidate(reason);}
      }
    }finally{rendering=false;}
  }
  function refresh(){if(disposed||broken)return null;try{receive(binding.getSnapshot());return lastView;}catch(reason){invalidate(reason);return null;}}
  async function perform(name,invoke) {
    const displayed=lastView,stamp=epoch;
    if(disposed||broken||rendering||!displayed||!enabled(displayed,name)||(pending&&name!=='cancel'))return {ok:false,code:'UI_ACTION_UNAVAILABLE'};
    let current;
    try{current=read();}catch(reason){invalidate(reason);return {ok:false,code:reason.code??'UI_VIEW_UNAVAILABLE'};}
    if(disposed||broken||epoch!==stamp||!sameData(actionKey(current.view),actionKey(displayed))||!sameData(bindingKey(current.view),identity)){
      receive(current.raw);return {ok:false,code:'UI_DISPLAY_CHANGED'};
    }
    if(!enabled(current.view,name)||(current.view.presentation.outcome?.outcome==='unknown'&&name!=='recover'))return {ok:false,code:'UI_ACTION_UNAVAILABLE'};
    const operation=++ticket;pending=true;
    try {
      onPending(true);
      if(!sameConnection()){broken=true;ticket++;pending=false;invalidate(issue('UI_REBIND_REQUIRED','The borrowed HostService connection changed.'));onPending(false);return {ok:false,code:'UI_REBIND_REQUIRED'};}
      if(disposed||broken||operation!==ticket||epoch!==stamp||!lastView)return {ok:false,code:'UI_DISPLAY_CHANGED'};
      const canCollect=()=>{
        if(disposed||broken||rendering||operation!==ticket||epoch!==stamp||lastView!==displayed)return false;
        if(!sameConnection()){broken=true;ticket++;pending=false;invalidate(issue('UI_REBIND_REQUIRED','The borrowed Editor connection changed during construction.'));onPending(false);return false;}
        return enabled(lastView,name)&&lastView.presentation.outcome?.outcome!=='unknown';
      };
      const result=await invoke(current.raw,current.view,canCollect);
      if(!disposed&&!broken&&operation===ticket&&result?.code!=='UI_STAGE_INVALIDATED')refresh();
      return result;
    }catch(reason){if(!disposed&&!broken&&operation===ticket)notify(reason);return {ok:false,code:reason.code??'UI_ACTION_FAILED',message:reason.message};}
    finally{if(!disposed&&!broken&&operation===ticket){pending=false;onPending(false);}}
  }
  const api = {
    get pending(){return pending;},
    get view(){return lastView;},
    refresh,
    stage(kind,build){return perform(kind,(raw,view,canCollect)=>{
      const command=build(view.snapshot,view,raw);
      if(!canCollect())return {ok:false,code:'UI_STAGE_INVALIDATED',message:'Editor state changed during draft creation. Check the current editor state.'};
      return collectCommand.call(binding,command);
    });},
    review(){return perform('review',raw=>{if(!raw.presentation.command)throw issue('UI_COMMAND_REQUIRED','Stage a finite canonical command first.');return service.prepare(raw.presentation.command);});},
    apply(){return perform('apply',raw=>{if(!raw.presentation.retainedApplyRequest)throw issue('UI_RETAINED_REQUEST_REQUIRED','Review through this connection first.');return service.apply(raw.presentation.retainedApplyRequest);});},
    cancel(){return perform('cancel',raw=>raw.presentation.review?service.cancel(raw.presentation.review.reviewToken):binding.discardDraft());},
    recover(){return perform('recover',raw=>{const result=raw.presentation.outcome;if(result?.outcome!=='unknown')throw issue('UI_RECOVERY_ID_REQUIRED','Use the original unknown request.');return service.recover(result.recoveryRequestId);});},
    history(name,...args){return perform(name,()=>{if(!['undo','redo','save','open','retryPresentation'].includes(name)||!ownFunction(binding.history,name))throw issue('UI_HISTORY_UNBOUND','Use existing Editor history/save/presentation ports.');return binding.history[name](...args);});},
    dispose(){if(disposed)return;disposed=true;ticket++;pending=false;lastView=null;queued=null;const unsubscribe=stop;stop=null;unsubscribe?.();}
  };
  try{const unsubscribe=binding.subscribe(receive);if(typeof unsubscribe!=='function')throw issue('UI_SUBSCRIPTION_REQUIRED','Editor subscription must return its disposer.');if(disposed)unsubscribe();else stop=unsubscribe;refresh();}catch(reason){api.dispose();throw reason;}
  return Object.freeze(api);
}

let mountedCount = 0;
export function mountTileAuthoringUI(container,binding,{tiles,authoring,rectangleSpec,onError=()=>{}}={}) {
  const doc=container?.ownerDocument;
  if(!doc||typeof container.append!=='function'||typeof rectangleSpec!=='function'||!ownFunction(binding,'allocateIds')) throw issue('UI_MOUNT_BINDING_REQUIRED','Supply a DOM container, explicit ID port and mapping to the reviewed public rectangle constructor spec.');
  const commands=createTileAuthoringCommands({tiles,authoring}),events=new doc.defaultView.AbortController(),id='tile-authoring-'+(++mountedCount);
  const make=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const listen=(node,type,fn)=>node.addEventListener(type,fn,{signal:events.signal});
  const root=make('section',undefined,'tile-authoring-ui');root.setAttribute('aria-label','Rectangle tile library');
  const status=make('output','','ta-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  const fault=make('p','','ta-fault');fault.setAttribute('role','alert');fault.hidden=true;
  const hint=make('p','Library revisions are immutable. Placed copies change only when you select them for an upgrade.','ta-hint');
  const field=(parent,name,label,{value='',type='text',min=null,max=null,validate=null}={})=>{const wrap=make('label',label),input=make('input');input.id=id+'-'+name;input.name=name;input.type=type;input.value=value;input.required=true;if(type==='number')input.step='any';if(min!==null)input.min=min;if(max!==null)input.max=max;if(validate){const update=()=>input.setCustomValidity(validate(input.value));listen(input,'input',update);listen(input,'change',update);update();}wrap.htmlFor=input.id;wrap.append(input);parent.append(wrap);return input;};
  const select=(parent,name,label)=>{const wrap=make('label',label),node=make('select');node.id=id+'-'+name;node.name=name;node.setAttribute('aria-label',label);wrap.htmlFor=node.id;wrap.append(node);parent.append(wrap);return node;};
  const gates=[],button=(parent,label,action,run)=>{const node=make('button',label);node.type='button';node.dataset.action=action;gates.push({node,action});listen(node,'click',()=>{fault.hidden=true;void Promise.resolve(run()).then(showResult).catch(showError);});parent.append(node);return node;};
  const definitions=make('fieldset'),definitionLegend=make('legend','Definition revisions');definitions.append(definitionLegend);
  const definitionSelect=select(definitions,'definition','Definition revision'),definitionPin=make('p','','ta-pin');definitions.append(definitionPin);
  const rectangle=make('fieldset'),rectangleGrid=make('div',undefined,'ta-grid');rectangle.append(make('legend','Rectangle source'),rectangleGrid);
  const label=field(rectangleGrid,'label','Library label',{value:'Rectangle',validate:tileAuthoringLabelMessage}),width=field(rectangleGrid,'width','Width (m)',{value:'8',type:'number',min:String(TILE_AUTHORING_FORM_LIMITS.minimumM),max:String(TILE_AUTHORING_FORM_LIMITS.maximumM)}),depth=field(rectangleGrid,'depth','Depth (m)',{value:'4',type:'number',min:String(TILE_AUTHORING_FORM_LIMITS.minimumM),max:String(TILE_AUTHORING_FORM_LIMITS.maximumM)});
  const rectangleHint=make('p','New and cloned definitions start at revision 1. A revision keeps the selected definition ID and retains the old revision.','ta-hint');rectangle.append(rectangleHint);
  const rectangleActions=make('div',undefined,'ta-row');rectangle.append(rectangleActions);
  for(const [kind,text]of [['recipe.create','Stage new rectangle'],['recipe.clone','Stage clone'],['recipe.revise','Stage revision']])button(rectangleActions,text,kind,()=>controller.stage(kind,(snapshot)=>{
    label.setCustomValidity(tileAuthoringLabelMessage(label.value));
    if(!(kind==='recipe.clone'?[label]:[label,width,depth]).every(n=>n.reportValidity()))throw issue('UI_FIELDS_REQUIRED','Complete the rectangle fields.');
    const base=kind==='recipe.create'?null:selectedDefinition(),ids=identities(kind);
    const spec=rectangleSpec(kind==='recipe.clone'?{label:label.value}:{label:label.value,widthM:Number(width.value),depthM:Number(depth.value)},{kind,base,ids,snapshot});
    return commands.rectangle({snapshot,requestId:ids.requestId,opId:ids.opId,kind,base,spec});
  }));
  const presets=make('fieldset');presets.append(make('legend','Reusable presets'));
  const presetLabel=field(presets,'preset-label','Preset label',{value:'Rectangle preset',validate:tileAuthoringLabelMessage});
  presets.append(make('p','Decoration defaults: none. Saving a preset pins the selected definition revision and never updates existing copies.','ta-hint'));
  button(presets,'Stage preset from selected revision','preset.save',()=>controller.stage('preset.save',(snapshot)=>{
    presetLabel.setCustomValidity(tileAuthoringLabelMessage(presetLabel.value));
    if(!presetLabel.reportValidity())throw issue('UI_FIELDS_REQUIRED','Supply a preset label.');
    const base=selectedDefinition(),ids=identities('preset.save');
    return commands.preset({snapshot,requestId:ids.requestId,opId:ids.opId,input:{kind:'nautilus-tile-preset',version:1,id:ids.presetId,revision:1,body:{label:presetLabel.value,definition:tileAuthoringPin(base),defaultLayers:[],defaultMarks:[],requires:base.body.requires,notices:base.body.notices}}});
  }));
  const presetSelect=select(presets,'preset','Preset revision'),presetPin=make('p','','ta-pin');presets.append(presetPin);
  const placements=make('fieldset');placements.append(make('legend','Place independent copies'));
  const placementRows=[0,1].map(i=>{const row=make('div',undefined,'ta-grid');placements.append(make('h3','Copy '+(i+1)),row);return{x:field(row,'copy-'+i+'-x','Copy '+(i+1)+' origin X (m)',{type:'number',value:String(40+i*10)}),y:field(row,'copy-'+i+'-y','Copy '+(i+1)+' origin Y (m)',{type:'number',value:'0'})};});
  const placementFloor=make('p','','ta-hint');placements.append(placementFloor);
  button(placements,'Stage two copies','preset.place',()=>controller.stage('preset.place',(snapshot)=>{
    if(!placementRows.flatMap(r=>[r.x,r.y]).every(n=>n.reportValidity()))throw issue('UI_FIELDS_REQUIRED','Supply both finite native origins.');
    const preset=selectedPreset(),definition=definitionByPin(preset.body.definition),ids=identities('preset.place'),floor=actualFloor(snapshot);
    if(ids.ownerIds?.length!==2||ids.chunkIds?.length!==2)throw issue('UI_EXPLICIT_ID','Editor must reserve two owner and chunk IDs once.');
    return commands.place({snapshot,requestId:ids.requestId,opId:ids.opId,preset,placements:placementRows.map((row,i)=>({ownerId:ids.ownerIds[i],originM:[Number(row.x.value),Number(row.y.value),floor.elevationM],floorBindings:{base:floor.id},transform:{quarterTurns:0,mirrorX:false},locked:false,anchorIds:definition.body.recipe.anchors.map(a=>a.id),freshMarkIds:[],freshLayerIds:[],chunkId:ids.chunkIds[i]}))});
  }));
  const upgrade=make('fieldset');upgrade.append(make('legend','Upgrade one selected copy'));
  const ownerSelect=select(upgrade,'owner','Selected upgrade target'),ownerInfo=make('p','','ta-pin');upgrade.append(ownerInfo,make('p','The other copy and the reusable preset retain their exact pins. Locks and anchor requirements are checked by the host.','ta-hint'));
  button(upgrade,'Stage upgrade of selected copy only','placement.upgrade',()=>controller.stage('placement.upgrade',(snapshot)=>{
    const ownerId=ownerSelect.value,ownerPin=snapshot.document.authoring.ownerPins.find(p=>p.ownerId===ownerId);
    if(!ownerPin)throw issue('UI_OWNER_REQUIRED','Explicitly select one authored owner.');
    const target=selectedDefinition(),ids=identities('placement.upgrade');
    return commands.upgrade({snapshot,requestId:ids.requestId,opId:ids.opId,ownerId,from:ownerPin.definition,to:tileAuthoringPin(target),anchorIds:target.body.recipe.anchors.map(a=>a.id)});
  }));
  const summary=make('div',undefined,'ta-review'),diagnostics=make('ul',undefined,'ta-diagnostics'),readiness=make('dl',undefined,'ta-readiness');
  summary.append(make('h3','Review scope'),make('p','Stage collects the command. Review prepares it. Apply accepts the retained review.','ta-hint'));
  const scope=make('p'),preparation=make('p','','ta-hint');summary.append(scope,preparation,diagnostics);
  const details=make('details'),detailText=make('pre');details.append(make('summary','Immutable pins and retained command'),detailText);
  const checkpoint=make('fieldset');checkpoint.append(make('legend','Complete workspace checkpoint'));
  const checkpointText=make('textarea');checkpointText.setAttribute('aria-label','Complete v3 workspace checkpoint');checkpointText.spellcheck=false;checkpoint.append(checkpointText);
  const historyRow=make('div',undefined,'ta-row');checkpoint.append(historyRow);
  for(const [name,text]of [['undo','Undo'],['redo','Redo'],['save','Save checkpoint'],['open','Reopen checkpoint']])button(historyRow,text,name,async()=>{const result=await controller.history(name,...(name==='open'?[checkpointText.value]:[]));if(name==='save'&&result?.checkpointJSON)checkpointText.value=result.checkpointJSON;return result;});
  const actions=make('div',undefined,'ta-actions');
  for(const [action,text,run]of [['review','Review',()=>controller.review()],['apply','Apply',()=>controller.apply()],['cancel','Cancel draft',()=>controller.cancel()],['recover','Check edit result',()=>controller.recover()],['retryPresentation','Retry accepted view',()=>controller.history('retryPresentation')]])button(actions,text,action,run);
  root.append(make('h2','Rectangle tile library'),hint,status,fault,definitions,rectangle,presets,placements,upgrade,summary,make('h3','Separate readiness'),readiness,details,checkpoint,make('p','Paths, overlays, artwork import and decoration capture are unavailable in C1. Rendered rectangles do not establish support, navigation or gameplay.','ta-hint'),actions);
  container.append(root);
  let controller=null,current=null,definitionMap=new Map(),presetMap=new Map(),selectSignatures=new WeakMap();
  const pinKey=record=>stringify(tileAuthoringPin(record));
  function showError(reason){fault.hidden=false;fault.textContent=reason?.message??String(reason);try{onError(reason);}catch{}}
  function showResult(result){if(result?.diagnostics?.length){fault.hidden=false;fault.textContent=result.diagnostics.map(d=>d.code+': '+d.message+' '+d.action).join('\n');}else if(result?.ok===false&&result.code&&!['UI_ACTION_UNAVAILABLE','UI_DISPLAY_CHANGED'].includes(result.code))showError(issue(result.code,result.message??'The host refused this action.'));}
  function identities(kind){return finiteUIData(binding.allocateIds(kind));}
  function selectedDefinition(){const result=definitionMap.get(definitionSelect.value);if(!result)throw issue('UI_DEFINITION_REQUIRED','Select an exact immutable definition revision.');return result;}
  function definitionByPin(pin){const result=definitionMap.get(pinKey(pin));if(!result)throw issue('UI_DEFINITION_REQUIRED','The exact retained definition pin is unavailable.');return result;}
  function selectedPreset(){const result=presetMap.get(presetSelect.value);if(!result)throw issue('UI_PRESET_REQUIRED','Select an exact immutable preset revision.');return result;}
  function actualFloor(snapshot){const id=binding.borrowedFloorController?.state?.selectedId,floor=snapshot.document.floorBinding.floors.find(f=>f.id===id);if(!floor)throw issue('UI_FLOOR_UNBOUND','Borrow the current declared floor controller.');return floor;}
  function options(node,rows,placeholder){const signature=stringify(rows);if(selectSignatures.get(node)===signature)return;const selected=node.value;node.replaceChildren(new doc.defaultView.Option(placeholder,''),...rows.map(r=>new doc.defaultView.Option(r.label,r.key)));node.value=rows.some(r=>r.key===selected)?selected:'';selectSignatures.set(node,signature);}
  function selectionText(){definitionPin.textContent=definitionMap.get(definitionSelect.value)?'Definition '+definitionSelect.value:'Choose an exact definition revision.';presetPin.textContent=presetMap.get(presetSelect.value)?'Preset '+presetSelect.value:'Choose an exact preset revision.';const pin=current?.snapshot.document.authoring.ownerPins.find(p=>p.ownerId===ownerSelect.value),owner=current?.snapshot.document.tileBundle.layout.instances.find(o=>o.id===ownerSelect.value);ownerInfo.textContent=pin?'From '+stringify(pin.definition)+(owner?.locked?' · locked':''):'Select one placed owner; no target is selected automatically.';updateGates();}
  function updateGates(){for(const {node,action}of gates){let allowed=!!current&&!!controller?.view&&enabled(current,action)&&(!controller?.pending||action==='cancel');if(['recipe.clone','recipe.revise','preset.save','placement.upgrade'].includes(action)&&!definitionMap.has(definitionSelect.value))allowed=false;if(action==='preset.place'&&!presetMap.has(presetSelect.value))allowed=false;if(action==='placement.upgrade'&&(!ownerSelect.value||current?.snapshot.document.tileBundle.layout.instances.find(o=>o.id===ownerSelect.value)?.locked))allowed=false;if(current?.presentation.outcome?.outcome==='unknown'&&action!=='recover')allowed=false;node.disabled=!allowed;if(action==='recover')node.hidden=current?.presentation.outcome?.outcome!=='unknown';if(action==='retryPresentation')node.hidden=current?.presentation.outcome?.outcome!=='committed'||current.presentation.outcome.presentation==='ready';}
    for(const input of root.querySelectorAll('input,select,textarea'))input.disabled=!current||!!controller?.pending||current.presentation.outcome?.outcome==='unknown';
  }
  function render(view){
    current=view;if(!view){status.textContent='Editor connection unavailable';updateGates();return;}
    const {document}=view.snapshot,p=view.presentation;definitionMap=new Map(document.authoring.library.definitions.map(r=>[pinKey(r),r]));presetMap=new Map(document.authoring.library.presets.map(r=>[pinKey(r),r]));
    options(definitionSelect,[...definitionMap].map(([key,r])=>({key,label:r.body.label+' · '+r.id+' · r'+r.revision})),'Select a definition revision');
    options(presetSelect,[...presetMap].map(([key,r])=>({key,label:r.body.label+' · '+r.id+' · r'+r.revision})),'Select a preset revision');
    options(ownerSelect,document.authoring.ownerPins.map(p=>{const owner=document.tileBundle.layout.instances.find(o=>o.id===p.ownerId);return{key:p.ownerId,label:p.ownerId+(owner?.locked?' · locked':'')};}),'Select one upgrade target');
    status.textContent=p.outcome?.outcome==='unknown'?'Edit result unknown — recover the original request':p.review?'Review ready — inspect before Apply':p.command?'Draft — review required':p.outcome?.outcome==='committed'?'Saved; presentation '+p.outcome.presentation:p.outcome?.outcome==='rejected'?'Edit refused; accepted work retained':'Ready';
    scope.textContent='Scope: '+p.scope+' · Targets: '+(p.targetOwnerIds.join(', ')||'library only')+' · Content revision: '+document.contentRevision;
    preparation.textContent=p.review?.tilePreparation==='source-unchanged'?'Placed geometry is unchanged; no geometry preview is required.':p.review?.tilePreparation==='public-v1-prepared'?'The host prepared the native rectangle change.':'Review will report whether placed geometry changes.';
    const all=[...(p.outcome?.diagnostics??[]),...Object.values(p.actions).flatMap(a=>a.enabled?[]:a.diagnostics)];diagnostics.replaceChildren(...all.map(d=>make('li',d.code+': '+d.message+' '+d.action)));
    if(!all.length)diagnostics.append(make('li','No host diagnostics reported.'));
    readiness.replaceChildren(...Object.entries(view.readiness??{authoring:{state:'not-reported'},visual:{state:'not-reported'},game:{state:'unbound'}}).flatMap(([name,value])=>[make('dt',name),make('dd',typeof value==='string'?value:stringify(value))]));
    detailText.textContent=view.commandJSON??'No retained command bytes are reported by Editor.';
    let floor;try{floor=actualFloor(view.snapshot);}catch{}placementFloor.textContent=floor?'Copies use drawing floor '+floor.label+' · '+floor.elevationM+' m.':'Placement floor binding is unavailable.';
    selectionText();
  }
  for(const node of [definitionSelect,presetSelect,ownerSelect])listen(node,'change',selectionText);
  listen(root,'keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key)&&event.target.closest?.('button,form'))event.preventDefault();});
  try{controller=createTileAuthoringUIController(binding,{onView:render,onPending:updateGates,onError:showError});updateGates();}catch(reason){events.abort();root.remove();throw reason;}
  return Object.freeze({element:root,refresh:()=>controller.refresh(),dispose(){const errors=[];for(const cleanup of [()=>controller.dispose(),()=>events.abort(),()=>root.remove()])try{cleanup();}catch(reason){errors.push(reason);}return errors;}});
}
