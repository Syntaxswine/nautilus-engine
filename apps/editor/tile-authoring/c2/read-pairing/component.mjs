// Explicit private continuation of 5a7; original bytes and adaptations in vendor/source.json.
// PRIVATE candidate. All commands and ownership come from the borrowed Host.
// No coordinator fallback: C1 has no approved C2 comparison/callback seam yet.
import {failure,finiteUIData,validateUIShape,readC2UI,sameData,sourceKey,isUnknown,selectedArtwork,assertAvailable,checkConstruction} from '../ui/contract.js';
import {fieldDefaults,valuesForMark,formFromFields,layersFromDraft,layerFields} from './form-producer.mjs';
const serviceNames=['describe','snapshot','query','prepare','apply','cancel','recover'];
const portNames=['selectExisting','acceptCanvasSelection','constructOverlayCommand','resolveVerifiedThumbnail'];
const own=(o,k)=>Object.getOwnPropertyDescriptor(o??{},k)?.value;
let mounts=0;

export function mountC2OverlayUI(container,binding,{attachCoordinator=null,thumbnailPresentation=null,canvasInput=null,onError=()=>{}}={}){
  const doc=container?.ownerDocument;if(!doc||typeof container.append!=='function')throw failure('C2_DOM_REQUIRED','Supply a DOM container.');
  const events=new doc.defaultView.AbortController(),prefix='c2-overlay-'+(++mounts);
  let controller=null,view=null,pending=false,disposed=false,broken=false,formVersion=0,renderEpoch=0,contextKey=null,dirty=new Set(),localEdited=false,rows=[],draftIndex=-1,detachThumbnail=null,stopCanvas=null,thumbnailKey=null,composition=false,rendering=false,queued=null;
  const ports=own(binding,'overlayPorts'),service=own(binding,'service');
  const captured=[['service',service],...['getSnapshot','subscribe','collectCommand','discardDraft'].map(k=>[k,own(binding,k)])];
  const serviceFunctions=serviceNames.map(k=>own(service,k)),portFunctions=portNames.map(k=>own(ports,k));
  const attach=thumbnailPresentation?own(thumbnailPresentation,'attach'):null;
  const canvasSubscribe=canvasInput?own(canvasInput,'subscribeSelection'):null,canvasCancel=canvasInput?own(canvasInput,'cancelUntilAllUp'):null;
  const connectionCurrent=()=>!disposed&&!broken&&captured.every(([k,v])=>own(binding,k)===v)&&own(binding,'overlayPorts')===ports&&serviceNames.every((k,i)=>own(service,k)===serviceFunctions[i])&&portNames.every((k,i)=>own(ports,k)===portFunctions[i])&&(!thumbnailPresentation||own(thumbnailPresentation,'attach')===attach)&&(!canvasInput||own(canvasInput,'subscribeSelection')===canvasSubscribe&&own(canvasInput,'cancelUntilAllUp')===canvasCancel);
  const make=(tag,text,cls)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  const listen=(node,type,fn)=>node.addEventListener(type,fn,{signal:events.signal});
  const root=make('section',undefined,'c2-overlay-ui');root.setAttribute('aria-label','Surface artwork');root.dataset.component='private-c2-overlay-candidate';
  root.append(make('h2','Surface artwork'),make('p','Place appearance marks on an authored surface. World behavior stays with the game.','c2-hint'));
  const status=make('output','','c2-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  const fault=make('p','','c2-fault');fault.setAttribute('role','alert');fault.hidden=true;root.append(status,fault);
  const unavailable=make('p','','c2-hint');root.append(unavailable);
  const fieldset=(title,parent=root)=>{const f=make('fieldset');f.append(make('legend',title));parent.append(f);return f;};
  const controls=[],buttons=[];
  const select=(parent,name,label,items=[])=>{const wrap=make('label',label),node=make('select');node.id=prefix+'-'+name;node.name=name;node.setAttribute('aria-label',label);wrap.htmlFor=node.id;wrap.append(node);parent.append(wrap);controls.push(node);for(const [value,text]of items){const o=make('option',text);o.value=value;node.append(o);}return node;};
  const field=(parent,name,label,value,type='number')=>{const wrap=make('label',label),node=make('input');node.id=prefix+'-'+name;node.name=name;node.type=type;if(type==='checkbox')node.checked=value;else node.value=value;if(type==='number')node.step='any';wrap.htmlFor=node.id;wrap.append(node);parent.append(wrap);controls.push(node);return node;};
  const button=(parent,label,action,run)=>{const node=make('button',label);node.type='button';node.dataset.action=action;buttons.push({node,action});parent.append(node);listen(node,'click',event=>{if(composition||event.isComposing)return;fault.hidden=true;try{void Promise.resolve(run()).catch(showError);}catch(error){showError(error);}});return node;};
  const selectionSet=fieldset('Selected surface');
  const surfaceSelect=select(selectionSet,'surface','Authored copy and surface'),scope=make('p','','c2-scope');selectionSet.append(scope);
  const layerSelect=select(selectionSet,'layer','Retained layer'),markSelect=select(selectionSet,'mark','Retained mark');
  const artSet=fieldset('Artwork revision'),artSelect=select(artSet,'artwork','Artwork revision');artSelect.size=5;artSelect.className='c2-palette';
  const artReason=make('p','','c2-hint'),thumbnail=make('div',undefined,'c2-thumbnail');thumbnail.setAttribute('aria-label','Borrowed artwork preview');artSet.append(artReason,thumbnail);
  const numeric=fieldset('Placement and appearance'),grid=make('div',undefined,'c2-grid');numeric.append(grid);
  const inputs={};
  for(const [key,label]of [['u','U position (m)'],['v','V position (m)'],['width','Width (m)'],['height','Height (m)'],['rotation','Rotation (rad)'],['pivotU','Image pivot U'],['pivotV','Image pivot V'],['red','Linear red'],['green','Linear green'],['blue','Linear blue'],['opacity','Mark opacity']])inputs[key]=field(grid,key,label,fieldDefaults[key]);
  inputs.mirror=field(grid,'mirror','Mirror artwork U',false,'checkbox');
  inputs.form=select(numeric,'form','Artwork form',[['stamp','Stamp · clamped frame'],['detail','Detail · repeated frame']]);
  numeric.append(make('p','U points right and V points up on this surface. Image pivot uses the top-left convention. Values stay in native metres and radians.','c2-hint'));
  inputs.mask=select(numeric,'mask','Mask alternative',[['all-surface','All surface'],['grid-cells','Explicit authored grid cells'],['unchanged','Keep existing mask unchanged']]);
  const cellWrap=make('label','Grid cells: one i,j pair per line'),cells=make('textarea');cells.id=prefix+'-cells';cells.name='cells';cells.value=fieldDefaults.cells;cells.rows=4;cellWrap.htmlFor=cells.id;cellWrap.append(cells);numeric.append(cellWrap);inputs.cells=cells;controls.push(cells);
  const firstLayer=make('div',undefined,'c2-grid');numeric.append(firstLayer);inputs.firstLayerLabel=field(firstLayer,'firstLayerLabel','First layer label',fieldDefaults.firstLayerLabel,'text');inputs.firstLayerOpacity=field(firstLayer,'firstLayerOpacity','First layer opacity',fieldDefaults.firstLayerOpacity);
  const numericActions=make('div',undefined,'c2-actions');numeric.append(numericActions);
  button(numericActions,'Stage first mark','firstMark',()=>stage('first-mark'));
  button(numericActions,'Stage add to retained layer','decoration.add',()=>stage('decoration.add'));
  button(numericActions,'Stage selected mark edits','decoration.update',()=>stage('decoration.update'));
  button(numericActions,'Stage erase selected mark','decoration.remove',()=>stage('decoration.remove'));
  const layerSet=fieldset('Layer list draft'),draftSelect=select(layerSet,'layerDraft','Layer draft'),layerGrid=make('div',undefined,'c2-grid');layerSet.append(layerGrid);
  const layerLabel=field(layerGrid,'layerLabel','Draft layer label','','text'),layerOpacity=field(layerGrid,'layerOpacity','Draft layer opacity','1');
  const layerActions=make('div',undefined,'c2-actions');layerSet.append(layerActions);
  button(layerActions,'Update layer draft','layer-edit',()=>editLayer());
  button(layerActions,'New layer draft','layer-new',()=>{if(rows.length>=8)throw failure('C2_LAYER_BOUND','This profile supports at most eight layers.');rows.push({kind:'new',label:'Paint',opacity:1});draftIndex=rows.length-1;changed();renderDraft();});
  button(layerActions,'Move layer up','layer-up',()=>moveLayer(-1));button(layerActions,'Move layer down','layer-down',()=>moveLayer(1));
  button(layerActions,'Remove layer draft','layer-remove',()=>{if(draftIndex<0)throw failure('C2_LAYER_REQUIRED','Select a layer draft.');rows.splice(draftIndex,1);draftIndex=Math.min(draftIndex,rows.length-1);changed();renderDraft();});
  const eraseConfirm=field(layerSet,'confirmLayerErase','Confirm erasing marks in removed layers',false,'checkbox'),removedInfo=make('p','','c2-hint');layerSet.append(removedInfo);
  button(layerSet,'Stage complete layer list','surface.layers',()=>stage('surface.layers'));
  const reviewSet=fieldset('Stage, review and apply'),reviewText=make('p','','c2-scope'),reviewActions=make('div',undefined,'c2-actions');reviewSet.append(reviewText,reviewActions);
  for(const [action,label]of [['review','Review staged command'],['apply','Apply reviewed command'],['cancel','Cancel staged or reviewed command'],['recover','Reconcile unknown request']])button(reviewActions,label,action,()=>perform(action));
  root.append(make('p','User artwork upload/export, selected decoration defaults and combined placement are unavailable in this component.','c2-hint'));
  const details=make('details');details.append(make('summary','Technical details'));const technical=make('pre');details.append(technical);root.append(details);container.append(root);

  function showError(error){if(disposed)return;fault.textContent=error?.message??'The action was refused.';fault.hidden=false;try{onError(error);}catch{}if(!connectionCurrent())retire('The borrowed connection changed. Mount a new explicit connection.');}
  function cancelCanvas(reason){if(!canvasInput||disposed)return;try{canvasCancel.call(canvasInput,reason);}catch(error){fault.textContent=error.message;fault.hidden=false;}}
  function detach(report=true){const owned=detachThumbnail;detachThumbnail=null;thumbnailKey=null;let error=null;if(owned)try{owned();}catch(e){error=e;}thumbnail.replaceChildren();if(error){if(report)showError(error);else throw error;}}
  function retire(message){if(broken||disposed)return;broken=true;formVersion++;renderEpoch++;detach();status.textContent=message;cancelCanvas('connection-retired');renderGates();}
  function requireConnection(){if(!connectionCurrent()){retire('The borrowed connection changed. Mount a new explicit connection.');throw failure('C2_CONNECTION_RETIRED','The borrowed connection changed.');}}
  function fresh(){requireConnection();const raw=captured.find(([k])=>k==='getSnapshot')[1].call(binding);requireConnection();return{raw,read:readC2UI(raw)};}
  function assertDisplayed(expected,stamp,version){const current=fresh();if(disposed||broken||queued||renderEpoch!==stamp||formVersion!==version||!sameData(sourceKey(current.read),sourceKey(expected)))throw failure('C2_DISPLAY_CHANGED','The source, form or displayed overlay changed; inspect it before staging again.');return current;}
  function changed(key){formVersion++;localEdited=true;if(key)dirty.add(key);renderGates();}
  const inputValues=()=>Object.fromEntries(Object.entries(inputs).map(([key,node])=>[key,node.type==='checkbox'?node.checked:node.value]));
  function writeFields(mark){const values=valuesForMark(mark,view?.overlay.chosenArtwork??null);for(const [key,node]of Object.entries(inputs)){if(node.type==='checkbox')node.checked=values[key];else node.value=values[key];}dirty=new Set();cellWrap.hidden=inputs.mask.value!=='grid-cells';}
  function options(node,entries,value,empty){const current=node.value,fragment=doc.createDocumentFragment();if(empty!==null){const o=make('option',empty);o.value='';fragment.append(o);}for(const row of entries){const o=make('option',row.label);o.value=row.value;if(row.title)o.title=row.title;fragment.append(o);}node.replaceChildren(fragment);node.value=value??current;if(![...node.options].some(o=>o.value===node.value))node.value='';}
  function renderDraft(){options(draftSelect,rows.map((r,i)=>({value:String(i),label:(i+1)+'. '+(r.kind==='existing'?r.value.label:r.label)+(r.kind==='new'?' · new':'')})),draftIndex<0?'':String(draftIndex),'Choose layer draft');const row=rows[draftIndex];layerLabel.value=row?(row.kind==='existing'?row.value.label:row.label):'';layerOpacity.value=row?String(row.kind==='existing'?row.value.opacity:row.opacity):'1';const kept=new Set(rows.filter(r=>r.kind==='existing').map(r=>r.value.id)),removed=view?.overlay.selection?.layers.filter(l=>!kept.has(l.value.id)).flatMap(l=>l.markIds)??[];removedInfo.textContent=removed.length?removed.length+' retained mark(s) will be erased with removed layers. Confirm explicitly before staging.':'No retained marks will be erased by this draft.';renderGates();}
  function editLayer(){const row=rows[draftIndex];if(!row)throw failure('C2_LAYER_REQUIRED','Select a layer draft.');const value=layerFields(layerLabel.value,layerOpacity.value);rows[draftIndex]=row.kind==='existing'?{kind:'existing',value:{...row.value,...value}}:{kind:'new',...value};changed();renderDraft();}
  function moveLayer(delta){const next=draftIndex+delta;if(draftIndex<0||next<0||next>=rows.length)throw failure('C2_LAYER_ORDER','Choose an adjacent layer in this draft.');[rows[draftIndex],rows[next]]=[rows[next],rows[draftIndex]];draftIndex=next;changed();renderDraft();}
  function mutable(){const p=view?.overlay,s=p?.selection;return!!controller&&!disposed&&!broken&&p?.availability==='editable'&&!isUnknown(view)&&!!s?.target&&!s.pose.locked&&!p.groupsPresent&&!s.groups.length&&['bound','prospective'].includes(s.bindingState);}
  function artworkReady(first=false){const a=view&&selectedArtwork(view);if(!a||!['retained','preparable'].includes(a.availability)||a.dependency.missingPort!==null)return false;const retained=view.snapshot.document.authoring.library.artwork.some(r=>sameData({id:r.id,revision:r.revision,contentDigest:r.contentDigest},a.artwork))&&view.snapshot.document.resourceRefs.some(r=>sameData(r,a.resourceRef));if(a.origin==='workspace')return retained&&a.dependency.state==='source-exact';return first&&!retained&&a.dependency.state==='prefix-validated'&&view.overlay.gates['content.import'].enabled&&view.presentation.actions['content.import']?.enabled;}
  function actionEnabled(action){
    if(!view||!controller||broken||disposed)return false;const p=view.overlay,s=p.selection;
    if(action==='recover')return view.presentation.outcome?.outcome==='unknown'&&p.gates.recover.enabled&&view.presentation.actions.recover?.enabled&&!pending;
    if(isUnknown(view))return false;
    if(action==='cancel')return!!(pending||view.presentation.command||view.presentation.review)&&p.gates.cancel.enabled&&view.presentation.actions.cancel?.enabled;
    if(action==='review'||action==='apply')return!pending&&!localEdited&&p.gates[action].enabled&&view.presentation.actions[action]?.enabled&&(action==='review'?!!view.presentation.command&&!view.presentation.review:!!view.presentation.retainedApplyRequest);
    if(!mutable()||pending)return false;
    if(action.startsWith('layer-')){if(!p.gates['surface.layers'].enabled||!view.presentation.actions['surface.layers']?.enabled)return false;if(action==='layer-new')return rows.length<8;if(draftIndex<0)return false;if(action==='layer-up')return draftIndex>0;if(action==='layer-down')return draftIndex<rows.length-1;return true;}
    if(!p.gates[action]?.enabled||action!=='firstMark'&&!view.presentation.actions[action]?.enabled)return false;
    if(action==='firstMark')return!s.layers.length&&!s.marks.length&&p.gates['surface.layers'].enabled&&p.gates['decoration.add'].enabled&&view.presentation.actions['surface.layers']?.enabled&&view.presentation.actions['decoration.add']?.enabled&&artworkReady(true);
    if(action==='decoration.add')return!!s.selectedLayerId&&inputs.mask.value!=='unchanged'&&artworkReady();
    if(action==='decoration.update')return!!s.selectedMark&&dirty.size>0&&(!dirty.has('artwork')||artworkReady());
    if(action==='decoration.remove')return!!s.selectedMark;return true;
  }
  function renderStatus(){if(!view||broken||disposed)return;const outcome=view.presentation.outcome;status.textContent=isUnknown(view)?(pending?'Reconciling the original unknown request; writes remain frozen.':'Unknown result. Writes are frozen; reconcile the original request.'):outcome?.outcome==='committed'?'Committed · presentation '+outcome.presentation:outcome?.outcome==='rejected'?'Rejected · command refused.':pending?'Waiting for the borrowed workbench action.':view.overlay.current.message||view.overlay.message;reviewText.textContent=localEdited?'Current edits are unstaged. Stage them before Review and Apply.':view.presentation.retainedApplyRequest?'Reviewed command retained by this connection. Apply uses that exact request.':view.presentation.command?'Canonical command staged. Review through the same service before Apply.':'No staged command. Numeric edits do not change the world.';}
  function renderGates(){root.setAttribute('aria-busy',String(pending));renderStatus();for(const {node,action}of buttons){node.disabled=!actionEnabled(action);node.title=node.disabled?(view?.overlay.gates[action]?.reason?.message??(localEdited&&['review','apply'].includes(action)?'Stage current edits or cancel the retained draft.':'The required owner/profile/action is unavailable.')):'';}for(const node of controls){const selectionControl=[surfaceSelect,layerSelect,markSelect,artSelect].includes(node);node.disabled=!controller||disposed||broken||pending||isUnknown(view)||(selectionControl?view?.overlay.gates.selection.enabled!==true:!mutable());}draftSelect.disabled=layerLabel.disabled=layerOpacity.disabled=eraseConfirm.disabled=!mutable()||pending;cells.disabled||=inputs.mask.value!=='grid-cells';}
  function renderThumbnail(read,stamp){
    const art=selectedArtwork(read),key=art?JSON.stringify([art.artwork,art.resourceRef,art.thumbnail,read.overlay.observation]):null;
    if(key===thumbnailKey)return;detach();if(!art||!thumbnailPresentation||art.thumbnail!=='verified')return;
    const original=formVersion;try{const current=assertDisplayed(read,stamp,original),live=ports.resolveVerifiedThumbnail(current.raw,art.artwork);assertDisplayed(read,stamp,original);if(live?.status!=='verified')return;if(!sameData(live.artwork,art.artwork)||!sameData(live.resourceRef,art.resourceRef))throw failure('C2_THUMBNAIL_SCOPE','The borrowed thumbnail must match the exact selected Pin/ref.');const cleanup=attach.call(thumbnailPresentation,live.handle,thumbnail);if(typeof cleanup!=='function')throw failure('C2_THUMBNAIL_CLEANUP','The owner adapter must return attachment-only cleanup.');try{assertDisplayed(read,stamp,original);}catch(error){cleanup();throw error;}detachThumbnail=cleanup;thumbnailKey=key;}catch(error){thumbnail.replaceChildren();showError(error);}
  }
  function renderRead(raw){
    if(disposed||broken)return;try{requireConnection();const next=readC2UI(raw),old=view;view=next;const stamp=++renderEpoch;if(old&&!sameData(sourceKey(old),sourceKey(next))){detach();cancelCanvas('source-or-selection-invalidated');}if(!connectionCurrent())throw failure('C2_CONNECTION_RETIRED','Connection changed during invalidation.');
      const p=next.overlay,s=p.selection,key=[p.basis,s?.ownerId??null,s?.surfaceId??null,s?.selectedMark??null,s?.pose??null,s?.frame??null,s?.grid??null];
      if(!sameData(contextKey,key)){contextKey=finiteUIData(key);formVersion++;localEdited=false;writeFields(s?.selectedMark??null);rows=(s?.layers??[]).map(l=>({kind:'existing',value:{...l.value}}));draftIndex=rows.length?0:-1;eraseConfirm.checked=false;renderDraft();}
      options(surfaceSelect,p.choices.map(c=>({value:JSON.stringify([c.ownerId,c.surfaceId]),label:c.ownerLabel+' · '+c.surfaceLabel+' · '+c.floorLabel+(c.locked?' · locked':''),title:JSON.stringify(c.definition)})),s?JSON.stringify([s.ownerId,s.surfaceId]):'','Choose an authored surface');
      options(layerSelect,(s?.layers??[]).map(l=>({value:l.value.id,label:(l.value.order+1)+'. '+l.value.label+' · '+l.opacityStatus})),s?.selectedLayerId??'','Choose retained layer');
      options(markSelect,(s?.marks??[]).map((m,i)=>({value:m.id,label:'Mark '+(i+1)+' · r'+m.revision+(m.groupId?' · grouped':'')})),s?.selectedMarkId??'','Choose retained mark');
      options(artSelect,p.palette.map(a=>({value:JSON.stringify(a.artwork),label:a.label+' · r'+a.artwork.revision+(a.origin==='builtin-offer'?' · built-in':'')+' · '+a.availability,title:JSON.stringify(a.artwork)})),p.chosenArtwork?JSON.stringify(p.chosenArtwork):'','Choose exact artwork revision');
      firstLayer.hidden=!!s?.layers.length;const art=selectedArtwork(next);artReason.textContent=art?(art.reason?.message??(art.origin==='builtin-offer'?'Built-in selection adopts nothing. A validated dependency prefix and verified byte owner are required.':'Exact retained revision; actual owner readiness still applies.')):'Choose an explicit artwork revision. No latest revision is selected automatically.';
      scope.textContent=s?p.choices.find(c=>c.ownerId===s.ownerId&&c.surfaceId===s.surfaceId).ownerLabel+' · '+p.choices.find(c=>c.ownerId===s.ownerId&&c.surfaceId===s.surfaceId).surfaceLabel+' · '+s.message:'No surface selected.';
      status.textContent=isUnknown(next)?'Unknown result. Writes are frozen; reconcile the original request.':next.presentation.outcome?.outcome==='committed'?'Committed · presentation '+next.presentation.outcome.presentation:p.current.message||p.message;
      unavailable.textContent=p.availability!=='editable'||p.groupsPresent?p.message+(p.groupsPresent?' Group data is inspection only.':''):'';
      reviewText.textContent=next.presentation.retainedApplyRequest?'Reviewed command retained by this connection. Apply uses that exact request.':next.presentation.command?'Canonical command staged. Review through the same service before Apply.':'No staged command. Numeric edits do not change the world.';
      technical.textContent=JSON.stringify({privateCandidate:true,overlay:p,canonicalCommand:next.presentation.command,retainedApplyRequest:next.presentation.retainedApplyRequest,connection:'Borrowed; actual Core/Artist/Editor pairing requires Root acceptance.'},null,2);renderGates();renderThumbnail(next,stamp);
    }catch(error){view=null;status.textContent='The overlay read is unavailable. Preserve the current source.';renderGates();showError(error);}
  }
  function receive(raw){
    if(disposed||broken)return;queued={raw};if(rendering)return;rendering=true;let visits=0;
    try{while(queued&&!disposed&&!broken){if(++visits>8){queued=null;retire('UI observer reentry exceeded the bound. Preserve the current source.');showError(failure('C2_OBSERVER_BOUND','UI observer reentry exceeded eight render visits.'));break;}const next=queued;queued=null;renderRead(next.raw);}}
    finally{rendering=false;}
  }
  function requireInteraction(){requireConnection();if(rendering||queued)throw failure('C2_RENDER_IN_PROGRESS','Wait for the current atomic view to finish rendering.');}
  async function stage(kind){
    requireInteraction();if(!view)throw failure('C2_VIEW_REQUIRED','Wait for a valid atomic read.');const displayed=view,stamp=renderEpoch,version=formVersion;
    const form=kind==='surface.layers'?layersFromDraft(displayed,rows,eraseConfirm.checked):formFromFields(displayed,inputValues(),dirty,kind);assertAvailable(displayed,form);assertDisplayed(displayed,stamp,version);
    const result=await controller.stage(kind==='first-mark'?'decoration.add':kind,(_snapshot,_view,raw)=>{
      assertDisplayed(displayed,stamp,version);const current=readC2UI(raw);if(!sameData(sourceKey(current),sourceKey(displayed)))throw failure('C2_DISPLAY_CHANGED','Do not rebuild under a different source.');
      const made=ports.constructOverlayCommand(raw,form);assertDisplayed(displayed,stamp,version);return checkConstruction(displayed,form,made);
    });
    if(result?.ok===false)throw failure(result.code??'C2_STAGE_REFUSED',result.message??'Staging was refused.');
    if(!disposed&&!broken&&formVersion===version){localEdited=false;dirty.clear();renderGates();}return result;
  }
  async function perform(action){requireInteraction();if(!actionEnabled(action))throw failure('C2_ACTION_UNAVAILABLE','This action is unavailable in the displayed state.');assertDisplayed(view,renderEpoch,formVersion);const result=await controller[action]();if(result?.ok===false)throw failure(result.code??'C2_ACTION_REFUSED',result.message??'The action was refused.');if(action==='cancel'&&!isUnknown(view)){localEdited=false;dirty.clear();renderGates();}return result;}
  function choose(choice){requireInteraction();if(!view||view.overlay.gates.selection.enabled!==true||isUnknown(view)||pending)throw failure('C2_SELECTION_UNAVAILABLE','Selection is unavailable in this state.');const current=assertDisplayed(view,renderEpoch,formVersion),source=finiteUIData([current.read.snapshot,current.read.overlay.basis]);const result=validateUIShape('Selection',ports.selectExisting(current.raw,choice));requireConnection();const after=fresh();if(!sameData(source,[after.read.snapshot,after.read.overlay.basis])||!sameData(result.basis,current.read.overlay.basis))throw failure('C2_SELECTION_STALE','Selection must preserve the original complete source.');if(result.status==='refused')throw failure(result.diagnostics[0]?.code??'C2_SELECTION_REFUSED',result.diagnostics[0]?.message??'Selection was refused.',result.diagnostics);controller.refresh();}
  function acceptCanvasSelection(hit){requireInteraction();if(!view||view.overlay.gates.selection.enabled!==true||pending||isUnknown(view))throw failure('C2_SELECTION_UNAVAILABLE','Canvas selection is unavailable.');const original=view,stamp=renderEpoch,current=assertDisplayed(original,stamp,formVersion),source=finiteUIData([original.snapshot,original.overlay.basis]);const result=validateUIShape('Selection',ports.acceptCanvasSelection(current.raw,hit));requireConnection();const after=fresh().read;if(!sameData(source,[after.snapshot,after.overlay.basis])||!sameData(result.basis,original.overlay.basis))throw failure('C2_SELECTION_STALE','The existing input owner must resolve the current source.');if(result.status==='refused')throw failure(result.diagnostics[0]?.code??'C2_SELECTION_REFUSED',result.diagnostics[0]?.message??'Canvas selection was refused.');controller.refresh();return result;}
  function selectionError(error){if(connectionCurrent())try{controller.refresh();}catch{}showError(error);}

  for(const [key,node]of Object.entries(inputs))for(const type of ['input','change'])listen(node,type,()=>{changed(key);if(key==='mask')cellWrap.hidden=node.value!=='grid-cells';});
  for(const node of [layerLabel,layerOpacity,eraseConfirm])listen(node,'input',()=>changed());
  listen(surfaceSelect,'change',()=>{try{const c=view?.overlay.choices.find(c=>JSON.stringify([c.ownerId,c.surfaceId])===surfaceSelect.value);if(!c)throw failure('C2_CHOICE_REQUIRED','Choose a listed authored copy and surface.');choose({kind:'surface',ownerId:c.ownerId,surfaceId:c.surfaceId});}catch(e){selectionError(e);}});
  listen(layerSelect,'change',()=>{try{if(!layerSelect.value)throw failure('C2_CHOICE_REQUIRED','Choose a listed retained layer.');choose({kind:'layer',layerId:layerSelect.value});changed('layerId');}catch(e){selectionError(e);}});
  listen(markSelect,'change',()=>{try{if(!markSelect.value)throw failure('C2_CHOICE_REQUIRED','Choose a listed retained mark.');choose({kind:'mark',markId:markSelect.value});}catch(e){selectionError(e);}});
  listen(artSelect,'change',()=>{try{const a=view?.overlay.palette.find(a=>JSON.stringify(a.artwork)===artSelect.value);if(!a)throw failure('C2_CHOICE_REQUIRED','Choose a listed exact artwork revision.');choose({kind:'artwork',artwork:a.artwork});changed('artwork');}catch(e){selectionError(e);}});
  listen(draftSelect,'change',()=>{draftIndex=draftSelect.value===''?-1:Number(draftSelect.value);renderDraft();});
  listen(root,'compositionstart',()=>{composition=true;});listen(root,'compositionend',()=>{composition=false;});
  listen(root,'keydown',event=>{if((event.repeat||event.isComposing||composition||event.keyCode===229)&&event.target?.tagName==='BUTTON')event.preventDefault();if(event.key==='Escape'&&!event.isComposing){cancelCanvas('escape');event.stopPropagation();}});
  listen(root,'focusout',event=>{if(!root.contains(event.relatedTarget))cancelCanvas('focus-left-component');});listen(doc.defaultView,'blur',()=>cancelCanvas('window-blur'));
  const api=Object.freeze({element:root,refresh(){requireConnection();return controller?.refresh()??null;},acceptCanvasSelection,dispose(){if(disposed)return;disposed=true;formVersion++;renderEpoch++;events.abort();const failures=[];for(const cleanup of [()=>controller?.dispose(),()=>{if(canvasInput)canvasCancel.call(canvasInput,'component-disposed');},()=>{stopCanvas?.();stopCanvas=null;},()=>detach(false),()=>root.remove()])try{cleanup();}catch(e){failures.push(e);}if(failures.length)try{onError(failure('C2_CLEANUP_FAILED','UI cleanup completed with '+failures.length+' attachment/subscription error(s).'));}catch{}}});
  try{
    if(captured.slice(1).some(([,v])=>typeof v!=='function')||serviceFunctions.some(v=>typeof v!=='function')||portFunctions.some(v=>typeof v!=='function'))throw failure('C2_BINDING_REQUIRED','Supply the same borrowed workbench/service and every explicit overlay port.');
    if(thumbnailPresentation&&typeof attach!=='function'||canvasInput&&(typeof canvasSubscribe!=='function'||typeof canvasCancel!=='function'))throw failure('C2_OPTIONAL_OWNER_REQUIRED','Supply complete existing-owner adapters or omit them.');
    if(typeof attachCoordinator!=='function'){status.textContent='C2 comparison/callback coordinator is unbound. Inspection and editing are unavailable.';unavailable.textContent='Root must supply the approved opt-in coordinator seam. C1 is unchanged.';renderGates();return api;}
    controller=attachCoordinator(binding,{onView:receive,onPending(value){pending=value;renderGates();},onError:showError,readAdditionalData:read=>read.overlay,isAdditionalConnectionCurrent:connectionCurrent,strictCallbackReads:true});
    if(!controller||['stage','review','apply','cancel','recover','refresh','dispose'].some(k=>typeof own(controller,k)!=='function'))throw failure('C2_COORDINATOR_REQUIRED','The explicit borrowed coordinator factory must supply the existing controller API.');
    requireConnection();controller.refresh();if(canvasInput){stopCanvas=canvasSubscribe.call(canvasInput,hit=>{try{acceptCanvasSelection(hit);}catch(e){showError(e);}});if(typeof stopCanvas!=='function')throw failure('C2_CANVAS_CLEANUP','The existing input owner must return subscription cleanup.');requireConnection();}renderGates();return api;
  }catch(error){showError(error);api.dispose();throw error;}
}
