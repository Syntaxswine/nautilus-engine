/** TEST DOUBLE ONLY. Not an actual Host/Core/Artist/Editor/native/WAL provider.
 * Fixture digests/targets are copied metadata, never verified live authority.
 * This file is deliberately outside component imports and production usage.
 */
import {readC2UI,finiteUIData,sameData,sourceKey,failure} from '../contract.js';
const clone=structuredClone;
export function syntheticWorkbench(data,scenario='painted'){
  const original=scenario==='painted'?data.painted:data.pristine;
  let document=clone(original.input.document),projection=clone(scenario==='painted'?data.projections.painted:data.projections.prospective);
  if(scenario==='retained-unpainted'){
    // An explicit SYNTHETIC retained-library source, never called fresh C1.
    document.authoring.library.artwork=clone(data.painted.input.document.authoring.library.artwork);
    document.resourceRefs=clone(data.painted.input.document.resourceRefs);
    projection.palette=clone(data.projections.painted.palette);projection.chosenArtwork=clone(data.projections.painted.chosenArtwork);
  }
  if(scenario==='fresh')projection=clone(data.projections.fresh);
  projection.message='SYNTHETIC component fixture. Actual Core/Artist/Editor providers are NOT paired.';
  projection.current.message=projection.message;
  if(scenario!=='fresh'){
    projection.availability='editable';for(const gate of Object.values(projection.gates)){gate.enabled=true;gate.reason=null;}
    for(const a of projection.palette){a.availability='retained';a.thumbnail='unavailable';a.reason=null;}
  }
  const actions=Object.fromEntries(Object.keys(projection.gates).filter(k=>!['selection','firstMark'].includes(k)).map(k=>[k,{enabled:true,diagnostics:[]}])) ;
  let view={snapshot:{document,expected:clone(original.input.command.expected)},presentation:{command:null,scope:'synthetic-appearance-only',targetOwnerIds:['owner.one'],includeSelectedDecorationDefaults:false,selectedCaptureMarkIds:[],review:null,retainedApplyRequest:null,outcome:null,actions},commandJSON:null,overlay:projection};
  const calls={construct:[],select:[],canvas:[],collect:[],prepare:[],apply:[],cancel:[],discard:[],recover:[],thumbnail:[],disposeBorrowed:0},observers=new Set();
  const hooks={};let id=0;
  const emit=()=>{for(const observer of [...observers])observer(view);};
  const update=(change,publish=true)=>{const next=clone(view);change(next);view=next;if(publish)emit();return view;};
  const refused=code=>({status:'refused',basis:clone(view.overlay.basis),diagnostics:[{code,path:'/synthetic',message:code,action:'Preserve all source; bind an accepted owner.',ownerIds:[]}]});
  function selection(choice){
    if(choice.kind==='surface'&&(choice.ownerId!=='owner.one'||choice.surfaceId!=='top'))return refused('SYNTHETIC_OTHER_OWNER_RESOLVER_UNBOUND');
    update(v=>{const s=v.overlay.selection;if(choice.kind==='layer'){if(!s.layers.some(l=>l.value.id===choice.layerId))throw failure('SYNTHETIC_LAYER','Foreign layer');s.selectedLayerId=choice.layerId;}
      if(choice.kind==='mark'){const mark=v.snapshot.document.authoring.decorations.chunks.flatMap(c=>c.marks).find(m=>m.id===choice.markId);if(!mark)throw failure('SYNTHETIC_MARK','Foreign mark');s.selectedMarkId=mark.id;s.selectedMark=clone(mark);s.selectedLayerId=mark.layerId;v.overlay.chosenArtwork=clone(mark.graphic.artwork);}
      if(choice.kind==='artwork'){if(!v.overlay.palette.some(a=>sameData(a.artwork,choice.artwork)))throw failure('SYNTHETIC_ART','Foreign artwork');v.overlay.chosenArtwork=clone(choice.artwork);}});
    return{status:'selected',basis:clone(view.overlay.basis),selection:clone(view.overlay.selection),localPointM:null};
  }
  // A fixed mask response only: this is not a canonical-mask implementation.
  const maskResponse=(draft,read)=>draft.kind==='all-surface'?clone(draft):{kind:'grid-spans',grid:clone(read.overlay.selection.grid),rows:[{j:0,spans:[{i0:0,count:1}]}]};
  function construction(read,form){
    if(form.kind==='first-mark'&&form.dependency==='builtin-import')return refused('BUILTIN_DEPENDENCY_PREFIX_UNBOUND');
    const n=++id,s=read.overlay.selection,target=clone(s.target),layerId='fixture.layer.'+n;
    const graphic=d=>({...clone(d),artwork:clone(form.artwork),wrap:d.form==='stamp'?'clamp':'repeat',mask:maskResponse(d.mask,read)});
    const op=(kind,body,i=0)=>({opId:'fixture.op.'+n+'.'+i,kind,body});let operations;
    if(form.kind==='first-mark')operations=[op('surface.layers',{target,layers:[{id:layerId,order:0,label:form.layer.label,opacity:form.layer.opacity,blendProfile:'source-over-linear-premultiplied-v1'}],removedLayerMarkIds:[]}),op('decoration.add',{chunkId:'fixture.chunk.'+n,mark:{id:'fixture.mark.'+n,revision:1,target,layerId,ordinal:0,graphic:graphic(form.graphic),groupId:null}},1)];
    if(form.kind==='decoration.add')operations=[op(form.kind,{chunkId:'fixture.chunk.'+n,mark:{id:'fixture.mark.'+n,revision:1,target,layerId:form.layerId,ordinal:1,graphic:graphic(form.graphic),groupId:null}})];
    if(form.kind==='decoration.remove')operations=[op(form.kind,{markIds:clone(form.markIds),groupPolicy:'preserve-whole-group'})];
    if(form.kind==='surface.layers')operations=[op(form.kind,{target,layers:form.layers.map((l,i)=>l.kind==='existing'?clone(l.value):{id:'fixture.layer.'+n+'.'+i,order:l.order,label:l.label,opacity:l.opacity,blendProfile:'source-over-linear-premultiplied-v1'}),removedLayerMarkIds:clone(form.removedLayerMarkIds)})];
    if(form.kind==='decoration.update'){
      const replacement=clone(s.selectedMark);replacement.revision++;
      for(const c of form.changes){if(c.field==='layerId')replacement.layerId=c.value;else if(['positionM','sizeM','rotationRad','mirrorU','pivotUV'].includes(c.field))replacement.graphic.transform[c.field]=clone(c.value);else replacement.graphic[c.field]=c.field==='mask'?maskResponse(c.value,read):clone(c.value);}
      replacement.graphic.wrap=replacement.graphic.form==='stamp'?'clamp':'repeat';operations=[op(form.kind,{markId:form.markId,expectedRevision:form.expectedRevision,replacement,groupPolicy:'preserve-whole-group'})];
    }
    return{status:'constructed',basis:clone(read.overlay.basis),route:form.kind==='first-mark'?'retained-first-mark':'appearance-edit',command:{kind:'nautilus-tile-authoring-command',version:1,requestId:'fixture.request.'+n,expected:clone(read.snapshot.expected),operations,budgetProfile:'authoring-reference-proposal-v1'}};
  }
  const service={
    describe(){return{synthetic:true};},snapshot(){return view.snapshot;},query(){return{synthetic:true};},
    async prepare(command){calls.prepare.push(command);if(hooks.prepare)return hooks.prepare(command);const token='e'.repeat(64),request={requestId:command.requestId,reviewToken:token,expectedTargetDigest:'f'.repeat(64)};update(v=>{v.presentation.review={requestId:command.requestId,reviewToken:token};v.presentation.retainedApplyRequest=request;v.overlay.current.state='review-ready';});return{ok:true};},
    async apply(request){calls.apply.push(request);if(hooks.apply)return hooks.apply(request);update(v=>{v.presentation.outcome={outcome:'committed',committed:true,requestId:request.requestId,presentation:'ready'};v.overlay.current.state='committed';v.overlay.current.presentation='ready';});return{ok:true,outcome:'committed',committed:true};},
    async cancel(token){calls.cancel.push(token);if(hooks.cancel)return hooks.cancel(token);update(v=>{v.presentation.review=null;v.presentation.retainedApplyRequest=null;v.presentation.command=null;v.commandJSON=null;v.overlay.current.state='idle';});return{ok:true};},
    async recover(requestId){calls.recover.push(requestId);if(hooks.recover)return hooks.recover(requestId);return{ok:true,outcome:'unknown',committed:null};}
  };
  const overlayPorts={selectExisting(read,choice){calls.select.push(choice);return hooks.select?hooks.select(read,choice):selection(choice);},acceptCanvasSelection(read,hit){calls.canvas.push(hit);return hooks.canvas?hooks.canvas(read,hit):selection({kind:'surface',ownerId:'owner.one',surfaceId:'top'});},constructOverlayCommand(read,form){calls.construct.push(form);return hooks.construct?hooks.construct(read,form):construction(read,form);},resolveVerifiedThumbnail(read,art){calls.thumbnail.push(art);return hooks.thumbnail?hooks.thumbnail(read,art):{status:'unavailable',diagnostics:[]};}};
  const binding={service,overlayPorts,getSnapshot(){if(hooks.read)hooks.read();return view;},subscribe(observer){observers.add(observer);return()=>observers.delete(observer);},collectCommand(command){calls.collect.push(command);if(hooks.collect)return hooks.collect(command);update(v=>{v.presentation.command=command;v.commandJSON=JSON.stringify(command);v.overlay.current.state='draft';});return{ok:true};},discardDraft(){calls.discard.push(true);update(v=>{v.presentation.command=null;v.commandJSON=null;});return{ok:true};}};
  return{binding,calls,hooks,update,emit,construction,get view(){return view;},get observers(){return observers.size;},unknown(){update(v=>{const requestId=v.presentation.command?.requestId??'fixture.unknown';v.presentation.outcome={outcome:'unknown',committed:null,requestId,recoveryRequestId:requestId,writesFrozen:true};v.overlay.current.state='unknown';v.overlay.current.requestId=requestId;v.overlay.current.recoveryRequestId=requestId;});}};
}

/** Synthetic proposed coordinator seam. Not the production C1 coordinator.
 * No WAL, journal, budget, resource, capability or authority exists here.
 */
export function syntheticCoordinator(binding,options){
  let displayed=null,pending=false,disposed=false,epoch=0,ticket=0;const listeners=[];
  const notify=raw=>{if(disposed)return;epoch++;displayed=readC2UI(raw);options.onView(raw);options.onPending(pending);};
  const unsubscribe=binding.subscribe(notify);
  const refresh=()=>{if(!disposed)notify(binding.getSnapshot());return displayed;};
  const fence=(read,stamp)=>{if(disposed||epoch!==stamp||!options.isAdditionalConnectionCurrent())throw failure('SYNTHETIC_INVALIDATED','Connection/subscription changed.');const current=readC2UI(binding.getSnapshot());if(epoch!==stamp||!sameData(sourceKey(current),sourceKey(read))||!sameData(options.readAdditionalData(current),options.readAdditionalData(read)))throw failure('SYNTHETIC_DISPLAY_CHANGED','Additional projection/source changed.');};
  async function perform(name,invoke){const read=displayed,stamp=epoch;if(disposed||!read||(pending&&name!=='cancel')||read.presentation.actions[name]?.enabled!==true)return{ok:false,code:'SYNTHETIC_ACTION_UNAVAILABLE'};const op=++ticket;try{fence(read,stamp);pending=true;options.onPending(true);fence(read,stamp);const value=await invoke(binding.getSnapshot(),()=>fence(read,stamp));if(!disposed&&ticket===op)refresh();return value;}catch(error){return{ok:false,code:error.code??'SYNTHETIC_REFUSED',message:error.message};}finally{if(!disposed&&ticket===op){pending=false;options.onPending(false);}}}
  const api={get pending(){return pending;},get view(){return displayed;},refresh,stage(name,build){return perform(name,(raw,guard)=>{const command=build(raw.snapshot,readC2UI(raw),raw);guard();return binding.collectCommand(command);});},review(){return perform('review',raw=>binding.service.prepare(raw.presentation.command));},apply(){return perform('apply',raw=>binding.service.apply(raw.presentation.retainedApplyRequest));},cancel(){return perform('cancel',raw=>raw.presentation.review?binding.service.cancel(raw.presentation.review.reviewToken):binding.discardDraft());},recover(){return perform('recover',raw=>binding.service.recover(raw.presentation.outcome.recoveryRequestId));},dispose(){disposed=true;ticket++;pending=false;unsubscribe();listeners.length=0;}};
  refresh();return Object.freeze(api);
}
