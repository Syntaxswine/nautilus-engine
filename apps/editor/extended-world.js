import {openWorld,WORLD_CONTRACT} from '../../packages/world-core/index.js';
import {createFloorNavigation} from '../../packages/floor-navigation/index.js';
import {mountFloorNavigation} from '../../packages/floor-navigation/dom.js';
import {createExtendedWorldDocument} from './extended-world-document.js';
import {createExtendedWorldView} from './extended-world-view.js';

export const EXTENDED_WORLD_STORAGE_KEY='nautilus-engine:extended-world-editor:1';
const round=value=>Number(value.toFixed(6));
const errorText=error=>error.diagnostics?.[0]?.message||error.message||'The operation was rejected.';

export function mountExtendedWorldEditor(root,{initialWorld,fixture=initialWorld,initialSelectedId=null,storage}={}) {
  const owner=root.ownerDocument,document=createExtendedWorldDocument(initialWorld),events=new AbortController();
  let navigation,floorView,unsubscribe,selectedSurfaceId=null,previewToken=null,previewId=null,disposed=false,loadTicket=0,lastFloorId=null,savedJSON=null;
  let store=storage;
  if(store===undefined)try{store=owner.defaultView.localStorage;}catch{store=null;}
  root.innerHTML=`
    <div class="ew-intro"><p class="ew-eyebrow">EXTENDED WORLD · AUTHORING</p><h1 id="ew-title"></h1><p>Edit measured geometry at its native height. The opening fixture has fifteen occupied stories, a roof deck, and a lower neighbour.</p></div>
    <nav class="ew-toolbar" aria-label="World document actions">
      <button id="ew-new">Native fixture</button><button id="ew-import">Import world</button><button id="ew-export">Export world</button>
      <button id="ew-save">Save here</button><button id="ew-restore">Restore saved</button><button id="ew-undo">Undo</button><button id="ew-redo">Redo</button>
      <input id="ew-file" type="file" accept=".json,application/json" hidden>
    </nav>
    <div class="ew-save-line"><span id="ew-save-state"></span><span id="ew-history"></span></div>
    <div class="ew-layout"><section class="ew-workspace" aria-label="Native world geometry">
      <div class="ew-workspace-heading"><span>WORLD & WORKING FLOOR</span><span id="ew-working"></span></div>
      <div class="ew-views"><figure><figcaption>World overview <span>Height in metres</span></figcaption><svg id="ew-axon" role="img" aria-label="Measured world geometry, explicit floor datums and independent roofs"></svg></figure>
        <figure><figcaption>Working floor <span>Top view · X / Y metres</span></figcaption><svg id="ew-plan" role="img" tabindex="0" aria-label="Editable plan of the selected floor"></svg><p class="ew-plan-hint">Select a body to edit it, or drag a box and preview it.</p></figure></div>
      <div class="ew-workspace-bottom"><div id="ew-floor-control"></div><div class="ew-legend"><span>■ Working floor</span><span>■ Other floors</span><span>● Supported anchor</span><small>Gold dots mark declared stair landings.</small></div></div>
      <p id="ew-view-counts" class="ew-counts"></p>
    </section><aside>
      <section class="ew-panel"><p class="ew-eyebrow">GEOMETRY</p><h2>Edit a box</h2>
        <label>Plan tool<select id="ew-tool"><option value="select">Select geometry</option><option value="box">Draw a box preview</option></select></label>
        <label>Surface on this floor<select id="ew-surface"></select></label><label>Stable identity<input id="ew-id" readonly></label>
        <form id="ew-measurements"><div class="ew-numbers">
          <label>X from (m)<input id="ew-min-x" type="number" step="any" required></label><label>X to (m)<input id="ew-max-x" type="number" step="any" required></label>
          <label>Y from (m)<input id="ew-min-y" type="number" step="any" required></label><label>Y to (m)<input id="ew-max-y" type="number" step="any" required></label>
          <label>Bottom h (m)<input id="ew-min-h" type="number" step="any" required></label><label>Top h (m)<input id="ew-max-h" type="number" step="any" required></label>
        </div><div class="ew-action-pair"><button id="ew-preview" type="submit">Preview geometry</button><button id="ew-apply" type="button" class="ew-primary" disabled>Apply preview</button></div></form>
        <div class="ew-action-pair"><button id="ew-cancel" disabled>Cancel preview</button><button id="ew-delete" disabled>Remove surface</button></div>
        <output id="ew-edit-status" role="status" aria-live="polite">Ready. Select a floor or preview a measured box.</output>
        <p id="ew-surface-info" class="ew-hint"></p><p class="ew-hint">Preview is temporary. Changing floors cancels it. Drawn coordinates snap to 0.01 m; typed coordinates stay explicit.</p>
      </section>
      <section class="ew-panel"><p class="ew-eyebrow">STATIC GEOMETRY QUERIES</p><h2>Inspect a contact</h2><p class="ew-hint">Probe the committed world at X 12 / Y 10.5, or trace across the room at 0.8 m above this floor. Hidden floors stay in the queries.</p>
        <div class="ew-action-pair"><button id="ew-support">Check support</button><button id="ew-trace">Trace room</button></div><output id="ew-query">No query yet.</output>
      </section>
      <section class="ew-panel"><p class="ew-eyebrow">COMPATIBILITY</p><h2>Preserve the whole world</h2><label>Legacy target<select id="ew-legacy-target"><option value="aft-map-v2">AFT map v2</option><option value="aft-block-v1">AFT block v1</option></select></label><button id="ew-legacy">Check legacy export</button><output id="ew-legacy-result">Export world keeps every floor. Legacy formats require a reviewed conversion.</output></section>
    </aside></div>
    <output id="ew-status">Ready. Select a floor or preview a measured box.</output>
    <p class="ew-boundary">Authoring and static AABB queries. Stair links declare supported endpoints; they do not execute movement. Actor marks are spawn/query proxies. No character simulation, combat, fire, dynamic doors or consumer-game adoption is included.</p>`;
  const q=id=>root.querySelector('#ew-'+id),listen=(element,type,callback)=>element.addEventListener(type,callback,{signal:events.signal});
  const status=(message,error=false)=>{for(const id of ['status','edit-status']){q(id).textContent=message;q(id).dataset.error=String(error);}};
  const fail=error=>status(errorText(error),true);
  const view=createExtendedWorldView({axon:q('axon'),plan:q('plan'),counts:q('view-counts')},{onSelect:selectSurface,onDraw:drawBox});
  const currentFloor=()=>navigation.state.floors.find(floor=>floor.id===navigation.state.selectedId);
  function nextId() {
    const world=document.snapshot(),ids=new Set(['floors','surfaces','entities','links'].flatMap(key=>world[key].map(record=>record.id)));
    let index=1;while(ids.has('editor:box:'+index))index++;return 'editor:box:'+index;
  }
  function cancelPreview(message=null) {
    const existed=document.cancelPreview(),dragged=view.cancelGesture();previewToken=null;previewId=null;
    q('apply').disabled=true;q('cancel').disabled=true;
    if(message&&(existed||dragged))status(message);return existed||dragged;
  }
  function fillMeasurements() {
    const floor=currentFloor(),source=document.queries.recordsForFloor(floor.id).surfaces.find(surface=>surface.id===selectedSurfaceId);
    const bounds=source?.bounds||{min:{x:8,y:7,h:floor.elevationM},max:{x:11,y:7.16,h:round(floor.elevationM+2)}};
    q('id').value=source?.id||nextId();
    for(const side of ['min','max'])for(const axis of ['x','y','h'])q(side+'-'+axis).value=String(bounds[side][axis]);
    q('delete').disabled=!source;
    q('surface-info').textContent=source?source.role+' · '+(source.supports?'supporting top':'non-supporting box')+(source.supportFloorId?' · confirmed '+source.supportFloorId:''):'New solid box. Geometry alone does not create a playable floor.';
  }
  function surfaceList() {
    const surfaces=document.queries.recordsForFloor(currentFloor().id).surfaces;
    if(!surfaces.some(surface=>surface.id===selectedSurfaceId))selectedSurfaceId=null;
    q('surface').replaceChildren(new Option('New box', ''));
    for(const surface of surfaces)q('surface').append(new Option(surface.id,surface.id));
    q('surface').value=selectedSurfaceId||'';fillMeasurements();
  }
  function render() {
    if(disposed)return;
    const world=document.snapshot(),preview=document.previewState;
    view.render({world,floorId:currentFloor().id,preview:preview?.world,selectedSurfaceId:previewId||selectedSurfaceId,tool:q('tool').value});
    q('title').textContent=world.name;q('working').textContent=currentFloor().id+' · '+currentFloor().elevationM+' m';
    q('undo').disabled=!document.history.undo;q('redo').disabled=!document.history.redo;
    q('history').textContent=document.history.undo+' undo · '+document.history.redo+' redo';
    q('save-state').textContent=document.export()===savedJSON?'Saved in this browser':'World has not been saved here';
    q('save').disabled=!store;q('restore').disabled=!store;
  }
  function installNavigation(selectedId) {
    unsubscribe?.();floorView?.dispose();navigation?.dispose();lastFloorId=null;
    const floors=document.snapshot().floors;
    navigation=createFloorNavigation({floors,selectedId,cancelPreview:()=>{cancelPreview('Floor changed; uncommitted preview cancelled.');}});
    floorView=mountFloorNavigation(q('floor-control'),navigation,{showModes:false,label:'Working floor',onError:fail});
    unsubscribe=navigation.subscribe(state=>{
      if(state.selectedId!==lastFloorId){lastFloorId=state.selectedId;selectedSurfaceId=null;surfaceList();q('query').textContent='No query on this floor yet.';}
      render();
    });
  }
  function selectSurface(id) {
    cancelPreview();selectedSurfaceId=id;surfaceList();render();status('Selected '+id+'. Adjust its measured bounds, then preview.');
  }
  function commandFromForm() {
    const source=document.queries.recordsForFloor(currentFloor().id).surfaces.find(surface=>surface.id===selectedSurfaceId);
    const bounds={min:{},max:{}};
    for(const side of ['min','max'])for(const axis of ['x','y','h'])bounds[side][axis]=q(side+'-'+axis).valueAsNumber;
    return {type:'put-surface',surface:source?{...source,bounds}:{id:q('id').value,floorId:currentFloor().id,role:'solid',bounds,supports:false,supportFloorId:null}};
  }
  function previewGeometry() {
    if(!q('measurements').reportValidity())return false;
    const command=commandFromForm(),result=document.preview(command);
    previewToken=result.ok?result.token:null;previewId=result.ok?command.surface.id:null;
    q('apply').disabled=!result.ok;q('cancel').disabled=!result.ok;render();
    if(result.ok)status('Preview only · '+command.surface.id+'. Apply it to change the world.');else fail(result);
    return result;
  }
  function drawBox({from,to,floorId}) {
    if(disposed||navigation.state.selectedId!==floorId)return;
    const min={x:round(Math.round(Math.min(from.x,to.x)*100)/100),y:round(Math.round(Math.min(from.y,to.y)*100)/100)};
    const max={x:round(Math.round(Math.max(from.x,to.x)*100)/100),y:round(Math.round(Math.max(from.y,to.y)*100)/100)};
    if(max.x-min.x<.01||max.y-min.y<.01){status('Drag a rectangle with positive width and depth.');return;}
    cancelPreview();selectedSurfaceId=null;surfaceList();
    for(const [side,point]of [['min',min],['max',max]])for(const axis of ['x','y'])q(side+'-'+axis).value=String(point[axis]);
    previewGeometry();
  }
  function open(input,{selectedId=null}={}) {
    try {
      const world=openWorld(input),id=selectedId??world.floors[0].id;
      if(!world.floors.some(floor=>floor.id===id))throw Error('The saved working floor is unavailable. The current world was preserved.');
      const result=document.replace(world);if(!result.ok)return result;
      loadTicket++;previewToken=null;previewId=null;view.cancelGesture();installNavigation(id);q('apply').disabled=true;q('cancel').disabled=true;
      q('legacy-result').textContent='Export world keeps every floor. Legacy formats require a reviewed conversion.';
      return {ok:true};
    }catch(error){return {ok:false,code:error.code||'INVALID_IMPORT',message:errorText(error),diagnostics:error.diagnostics||[]};}
  }
  function save() {
    try {
      if(!store)throw Error('Browser storage is unavailable. Export the world as JSON.');
      const envelope={kind:'nautilus-extended-world-editor-save',version:1,selectedFloorId:navigation.state.selectedId,world:document.snapshot()};
      store.setItem(EXTENDED_WORLD_STORAGE_KEY,JSON.stringify(envelope));savedJSON=document.export();render();
      status('Saved the committed world and working-floor identity in this browser.');return {ok:true};
    }catch(error){fail(error);return {ok:false,message:error.message};}
  }
  function restore() {
    try {
      if(!store)throw Error('Browser storage is unavailable. Import an exported world instead.');
      const text=store.getItem(EXTENDED_WORLD_STORAGE_KEY);
      if(!text)throw Error('No extended world has been saved in this browser yet.');
      if(new TextEncoder().encode(text).length>WORLD_CONTRACT.limits.bytes+512)throw Error('Saved world exceeds the bounded storage budget.');
      const saved=JSON.parse(text);
      if(saved?.kind!=='nautilus-extended-world-editor-save'||saved.version!==1||Object.keys(saved).sort().join(',')!=='kind,selectedFloorId,version,world')throw Error('Unsupported editor save. The current world was preserved.');
      const result=open(saved.world,{selectedId:saved.selectedFloorId});if(!result.ok)throw result;
      savedJSON=document.export();render();status('Restored the complete saved world and working floor.');return {ok:true};
    }catch(error){fail(error);return {ok:false,message:errorText(error)};}
  }
  function download() {
    cancelPreview('Uncommitted preview cancelled before export.');render();
    const url=URL.createObjectURL(new Blob([document.export()+'\n'],{type:'application/json'})),link=owner.createElement('a');
    link.href=url;link.download='nautilus-extended-world.json';owner.body.append(link);link.click();link.remove();
    owner.defaultView.setTimeout(()=>URL.revokeObjectURL(url),1000);status('Exported the complete extended world.');
  }
  listen(q('measurements'),'submit',event=>{event.preventDefault();previewGeometry();});
  listen(q('measurements'),'input',()=>{cancelPreview('Measurements changed; preview again before applying.');render();});
  listen(q('surface'),'change',()=>{cancelPreview();selectedSurfaceId=q('surface').value||null;fillMeasurements();render();});
  listen(q('tool'),'change',()=>{cancelPreview();render();});
  listen(q('apply'),'click',()=>{
    const id=previewId,result=document.commitPreview(previewToken);previewToken=null;previewId=null;
    q('apply').disabled=true;q('cancel').disabled=true;
    if(result.ok){selectedSurfaceId=id;surfaceList();if(result.changed)q('query').textContent='World changed; query again.';status(result.changed?'Applied '+id+'. Undo is available.':'The measured bounds were unchanged.');}else fail(result);
    render();
  });
  listen(q('cancel'),'click',()=>{cancelPreview();render();status('Preview cancelled. The world is unchanged.');});
  listen(q('delete'),'click',()=>{
    cancelPreview();const id=selectedSurfaceId,result=document.apply({type:'remove-surface',id});
    if(result.ok){selectedSurfaceId=null;surfaceList();q('query').textContent='World changed; query again.';status('Removed '+id+'. Undo is available.');}else fail(result);render();
  });
  for(const action of ['undo','redo'])listen(q(action),'click',()=>{cancelPreview();if(document[action]()){surfaceList();q('query').textContent='World changed; query again.';status(action==='undo'?'Undid the last geometry edit.':'Redid the geometry edit.');}render();});
  listen(q('save'),'click',save);listen(q('restore'),'click',restore);listen(q('export'),'click',download);
  listen(q('new'),'click',()=>{const result=open(fixture);if(result.ok)status('Loaded the native fifteen-story fixture. The saved world remains available.');else fail(result);});
  listen(q('import'),'click',()=>{q('file').value='';q('file').click();});
  listen(q('file'),'change',async()=>{
    const file=q('file').files?.[0];if(!file)return;
    const ticket=++loadTicket,revision=document.revision;
    try {
      if(file.size>WORLD_CONTRACT.limits.bytes)throw Error('Choose an extended-world JSON file under 8 MB.');
      const text=await file.text();if(disposed||ticket!==loadTicket)return;
      if(revision!==document.revision){status('Import cancelled because the world changed while the file was loading.');return;}
      const result=open(text);if(result.ok)status('Imported the complete extended world.');else fail(result);
    }catch(error){if(!disposed&&ticket===loadTicket)fail(error);}
  });
  listen(q('support'),'click',()=>{
    const floor=currentFloor(),hit=document.queries.findSupport({position:{x:12,y:10.5,h:floor.elevationM+.05},maxDropM:1,requireFloor:true});
    q('query').textContent=hit?hit.surfaceId+' · '+hit.floorId+' · support at '+hit.point.h+' m':'No confirmed support within 1 m.';
  });
  listen(q('trace'),'click',()=>{
    const h=currentFloor().elevationM+.8,hit=document.queries.traceSegment({from:{x:8,y:10.5,h},to:{x:14,y:10.5,h}});
    q('query').textContent=hit?hit.surfaceId+' · anchor '+hit.anchorFloorId+' · contact at '+round(hit.point.h)+' m':'No static box contact across this room.';
  });
  listen(q('legacy'),'click',()=>{
    const report=document.legacyReport(q('legacy-target').value),floors=report.diagnostics.filter(item=>item.code==='UNREPRESENTABLE_FLOOR').length;
    q('legacy-result').textContent='Export refused. '+floors+' floor positions exceed the ordinary legacy range; surfaces, anchors and links require a semantic conversion. No legacy file was created. The extended world is preserved.';
    status('Legacy export refused; no geometry was truncated.');
  });
  const floors=document.snapshot().floors,selected=initialSelectedId??floors[0].id;
  installNavigation(selected);
  return Object.freeze({document,get navigation(){return navigation;},open,save,restore,export:()=>document.export(),
    dispose(){if(disposed)return;disposed=true;loadTicket++;events.abort();unsubscribe?.();floorView?.dispose();navigation?.dispose();document.cancelPreview();view.dispose();}
  });
}
