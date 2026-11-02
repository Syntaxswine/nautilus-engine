import {buildingTransform,generateBuildingLayout} from '../../packages/prefab-core/index.js';
import {BUILDING_ASSETS,PREFAB_SOURCE_ROOT,catalogueForAssets} from '../../packages/prefab-core/registry.js';
import {prefabFileURL} from '../../packages/prefab-core/asset-urls.js';
import {LIBRARY_BUILDINGS,BUILDING_POOLS,findBuildings,seedAssetIds,assertBuildingAuthoringSupport} from './building-library-data.js';
import {InspectionScene} from './prefab-scene.js';
import {BuildingPreviewScene} from './prefab-preview.js';
import {STRUCTURE_PRESETS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-structure-presets.js';
import {blankMap,stampRoom,setTerrain} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {DIMENSIONS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-world.js';

const assets=LIBRARY_BUILDINGS;
export function installBuildingLibrary() {
  const $=id=>document.getElementById(id),launch=document.createElement('button');launch.id='nautilus-buildings';launch.textContent='Building library';launch.disabled=true;
  document.querySelector('.nautilus-header nav').prepend(launch);
  const dialog=document.createElement('dialog');dialog.id='building-library';dialog.setAttribute('aria-labelledby','building-library-title');
  dialog.innerHTML=`<div class="asset-heading"><div><p class="eyebrow">NAUTILUS WORKSHOP</p><h1 id="building-library-title">Building library</h1></div><button id="building-close" aria-label="Close building library">×</button></div>
  <div class="asset-filters"><label>Find a building<input id="building-search" type="search" placeholder="Cottage, school, barn, workshop…"></label><label>Collection<select id="building-collection"><option value="">All buildings</option><option value="gross">Gross catalogue · c.1891</option><option value="original">Original architecture · 48 buildings</option><option value="aft">AFT structures</option></select></label></div>
  <p id="building-count" role="status"></p><div class="asset-body"><div id="building-results" aria-label="Building results"></div><section class="asset-inspector" aria-labelledby="building-name"><div class="asset-stage"><canvas id="building-preview" aria-label="Selected building preview"></canvas><span>1 metre units · native geometry</span></div>
  <div class="asset-turns"><button id="building-turn">↻ Turn view</button><label>Inspect<select id="building-floor"><option value="exterior">Exterior</option></select></label></div><h2 id="building-name"></h2><p id="building-size"></p><p id="building-description"></p><details id="building-source"><summary id="building-source-summary">Sources & authored plan</summary><p><a id="building-plan-link" target="_blank" rel="noopener">Authored plan JSON</a> · <a id="building-gallery-link" target="_blank" rel="noopener">Detailed architecture gallery & downloads</a></p><a id="building-source-link" target="_blank" rel="noopener">View original source</a><ul id="building-reference-list"></ul><img id="building-plate" loading="lazy" alt="Gross catalogue elevation and floor plan"></details><p id="building-preview-status" role="status"></p><button id="building-use">Place this building</button></section></div>
  <details class="building-generator"><summary>Generate building lots in this map</summary><p>Add a seeded layout on clear, flat ground. Existing work is protected; the completed layout is one undo step.</p><div class="building-grid"><label>Seed<input id="building-seed" maxlength="80" value="Nautilus neighbourhood"></label><label>Buildings<input id="building-number" type="number" min="1" max="32" value="6"></label><label>Collection<select id="building-pool"></select></label><label>Clearance (metres)<input id="building-gap" type="number" min="1" max="8" value="2"></label><label>Left (X)<input id="building-area-x" type="number" min="0" max="239" value="24"></label><label>Top (Y)<input id="building-area-y" type="number" min="0" max="239" value="24"></label><label>Width (metres)<input id="building-area-w" type="number" min="1" max="240" value="96"></label><label>Depth (metres)<input id="building-area-d" type="number" min="1" max="240" value="96"></label></div><p id="building-layout-status" role="status"></p><div class="row"><button id="building-plan">Preview layout</button><button id="building-generate" disabled>Add previewed layout</button></div></details>`;
  document.body.append(dialog);
  $('building-pool').replaceChildren(...BUILDING_POOLS.map(pool=>new Option(pool.label,pool.id)));
  let selected=assets[0],scene,view,frame=0,ticket=0,busy=false,ready=false,plan=null,layoutPreview=false;
  let canvas=$('building-preview');
  function disposeScene(){cancelAnimationFrame(frame);frame=0;scene?.dispose();scene=null;const fresh=canvas.cloneNode();resize.unobserve(canvas);canvas.replaceWith(fresh);canvas=fresh;resize.observe(canvas);}
  function ensureScene(portable=false){if(scene&&(scene instanceof BuildingPreviewScene)===!portable)return;disposeScene();scene=portable?new InspectionScene(canvas,requestDraw):new BuildingPreviewScene(canvas,requestDraw);}
  function draw(){frame=0;if(!dialog.open||!scene||!view)return;try{scene.draw(view,Math.max(1,canvas.clientWidth),Math.max(1,canvas.clientHeight));}catch(error){++ticket;ready=false;plan=null;$('building-use').disabled=$('building-generate').disabled=true;disposeScene();$('building-preview-status').textContent='Preview unavailable: '+error.message;}}
  function requestDraw(){if(dialog.open&&!frame)frame=requestAnimationFrame(draw);}
  function fit(){if(!scene)return;const box=new T.Box3();for(const model of scene.prefabs.models.values())box.expandByObject(model.root);
    if(box.isEmpty())box.setFromObject(scene.scene);if(box.isEmpty())return;
    const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),aspect=Math.max(1,canvas.clientWidth)/Math.max(1,canvas.clientHeight);
    view.x=center.x;view.y=center.z;view.span=Math.max(3,(size.x+size.z)/Math.sqrt(2)/aspect,(size.x+size.z)/Math.sqrt(8)+size.y*Math.sqrt(3)/2)*1.14;
    const floor=selected.levels?.find(l=>String(l.index)===$('building-floor').value);
    scene.options.level=(floor&&!layoutPreview?floor.y+.6:center.y)/DIMENSIONS.floorSpacing;
  }
  function previewDocument(asset) {
    const map=blankMap('Building preview');map.terrain=Array.from({length:24},()=>Array(24).fill('void'));map.starts=[];map.exits=[];map.guards=[];map.props=[];map.edges={};
    if(asset.portable){const x=8,y=8;for(let j=-1;j<=asset.depth;j++)for(let i=-1;i<=asset.width;i++)setTerrain(map,x+i,y+j,0,'ground-grass');stampRoom(map,x,y,asset.width,asset.depth,0);map.props=STRUCTURE_PRESETS[asset.id].objects.map(p=>({...p,x:x+p.x,y:y+p.y,z:0}));}
    else map.buildingPrefabs={version:1,catalogue:catalogueForAssets([asset.id]),instances:[{id:'preview',asset:asset.id,x:4,y:4,turns:0,clearance:2}]};
    return {map,size:24,units:[],block:true};
  }
  async function select(asset) {
    const current=++ticket;selected=asset;ready=false;layoutPreview=false;plan=null;$('building-generate').disabled=true;$('building-use').disabled=true;
    $('building-name').textContent=asset.name;
    const t=asset.portable?{width:asset.width,depth:asset.depth}:buildingTransform({asset:asset.id,turns:0,x:0,y:0});
    $('building-size').textContent=`${asset.collection} · ${t.width} × ${t.depth} metre placement lot${asset.portable?'':` · ${asset.levels.length} levels`}`;
    $('building-description').textContent=asset.portable?'A compact, editable structure using the existing map geometry and objects.':asset.description||'Gross catalogue-inspired exterior and furnished interior. Dimensions, colours and some details are interpreted. Gameplay collision, doors, stairs and fire require a game adapter.';
    $('building-source').hidden=asset.portable;
    $('building-plate').removeAttribute('src');$('building-reference-list').replaceChildren();
    if(!asset.portable){
      const gross=asset.provider==='gross';$('building-source-summary').textContent=gross?'Gross catalogue plate & authored plan':'References & original authored plan';
      $('building-plate').hidden=$('building-source-link').hidden=!gross;$('building-gallery-link').hidden=gross;
      $('building-plan-link').href=prefabFileURL((gross?PREFAB_SOURCE_ROOT+'/':'')+asset.plan);
      if(gross){$('building-plate').src=prefabFileURL(PREFAB_SOURCE_ROOT+'/'+asset.plate);$('building-source-link').href=asset.source.url;}
      else {$('building-gallery-link').href=new URL('../buildings/index.html#'+asset.id,import.meta.url).href;for(const reference of asset.sources){const item=document.createElement('li'),link=document.createElement('a');link.href=reference.url;link.target='_blank';link.rel='noopener';link.textContent=reference.title;item.append(link);$('building-reference-list').append(item);}}
    }
    $('building-floor').replaceChildren(new Option('Exterior','exterior'),...(asset.levels||[]).map(l=>new Option(l.label,String(l.index))));$('building-floor').disabled=asset.portable;
    for(const b of $('building-results').children)b.setAttribute('aria-pressed',String(b.dataset.asset===asset.id));
    $('building-preview-status').textContent='Loading original assembly and paint…';
    try {
      ensureScene(asset.portable);
      scene.prefabs.override=null;view={x:11.5,y:11.5,span:26,preset:'0'};
      await scene.open(previewDocument(asset));if(current!==ticket)return;
      if(scene.diagnostics.length)throw Error([...new Set(scene.diagnostics)].join(' '));
      ready=true;$('building-use').disabled=false;$('building-preview-status').textContent=asset.portable?'Portable structure · editable after placement':asset.provider==='gross'?'Gross assembly · source plate and room plans retained':'Original game mesh · unfurnished rooms · detailed source available in the gallery';fit();requestDraw();
    } catch(error){if(current===ticket)$('building-preview-status').textContent='Preview unavailable: '+error.message;}
  }
  function results() {
    const found=findBuildings($('building-search').value,$('building-collection').value);
    $('building-count').textContent=`${found.length} of ${assets.length} buildings`;$('building-results').replaceChildren();
    for(const asset of found){const button=document.createElement('button');button.type='button';button.dataset.asset=asset.id;button.setAttribute('aria-pressed',String(selected===asset));
      const name=document.createElement('strong');name.textContent=asset.name;const detail=document.createElement('span');detail.textContent=asset.portable?'AFT · portable structure':asset.provider==='gross'?`${asset.levels.length} levels · Gross plate ${asset.source.printedPage}`:`${asset.group} · ${asset.levels.length} floors`;button.append(name,detail);button.onclick=()=>select(asset);$('building-results').append(button);}
    if(!found.length)$('building-results').textContent='No matching buildings.';
  }
  launch.onclick=()=>{if(window.editor3d?.loading)return;dialog.showModal();results();select(selected);$('building-search').focus();};
  $('building-close').onclick=()=>dialog.close();$('building-search').oninput=results;$('building-collection').onchange=results;
  $('building-turn').onclick=()=>{if(view){view.preset=String((Number(view.preset)+1)%4);requestDraw();}};
  $('building-floor').onchange=()=>{if(!ready)return;const value=$('building-floor').value;scene.prefabs.setView({view:value==='exterior'?'exterior':'cutaway',level:Number(value)||0,showFurniture:true});fit();requestDraw();};
  $('building-use').onclick=()=>{
    if(!ready||window.editor3d.loading)return;
    try {if(!selected.portable)assertBuildingAuthoringSupport([selected.id],window.nautilus?.contract);}catch(error){$('building-preview-status').textContent=error.message;return;}
    if(!selected.portable&&window.editor3d.document.block){$('building-preview-status').textContent='Switch to the full map workspace to place this building.';return;}
    const tool=$('edit-tool');tool.value=selected.portable?'prefab':'building-prefab';tool.dispatchEvent(new Event('change'));
    if(selected.portable){$('structure-preset').value=selected.id;$('structure-preset').dispatchEvent(new Event('change'));}
    else {$('building-asset').value=selected.id;$('floor').value='0';$('floor').dispatchEvent(new Event('change'));}
    dialog.close();document.body.classList.add('nautilus-options-open');$('nautilus-options').setAttribute('aria-expanded','true');$('status').textContent=selected.name+' selected. Click on clear ground to place. R turns the building.';
  };
  const parameters=()=>({seed:$('building-seed').value,count:Number($('building-number').value),clearance:Number($('building-gap').value),
    assets:seedAssetIds($('building-pool').value,selected.id),area:{x:Number($('building-area-x').value),y:Number($('building-area-y').value),width:Number($('building-area-w').value),depth:Number($('building-area-d').value)}});
  function clearPlan(restore=true){plan=null;$('building-generate').disabled=true;window.editor3d?.scene.preview(null);if(restore&&layoutPreview&&dialog.open)select(selected);}
  $('building-plan').onclick=async()=>{
    clearPlan(false);if(window.editor3d?.loading||busy)return;
    const current=++ticket;ready=false;$('building-use').disabled=true;
    try {const doc=window.editor3d.document,revision=doc.revision,options=parameters();assertBuildingAuthoringSupport(options.assets,window.nautilus?.contract);const result=generateBuildingLayout(doc.map,options);layoutPreview=true;
      $('building-name').textContent='Seeded building layout';$('building-size').textContent=result.instances.length+' buildings · '+options.area.width+' × '+options.area.depth+' metres';
      $('building-description').textContent='The preview uses the original models. Adding this layout preserves existing work and creates one undo step.';$('building-source').hidden=true;$('building-floor').disabled=true;
      $('building-preview-status').textContent='Loading layout preview…';
      const area=options.area;view={x:area.x+area.width/2,y:area.y+area.depth/2,span:Math.max(area.width,area.depth)*1.5,preset:'0'};
      ensureScene();scene.prefabs.override=null;scene.options.level=0;await scene.open({map:result.map,size:240,units:[],block:false});if(current!==ticket||!dialog.open)return;
      if(window.editor3d.document!==doc||doc.revision!==revision){disposeScene();$('building-layout-status').textContent='The map changed while loading. Preview the layout again.';$('building-preview-status').textContent='Layout preview is out of date.';return;}
      if(scene.diagnostics.length)throw Error([...new Set(scene.diagnostics)].join(' '));
      plan={document:doc,revision,options};$('building-generate').disabled=false;
      $('building-layout-status').textContent=result.instances.length+' buildings fit. Lots include overhangs, access clearance and four metre lanes. Review the 3D preview, then add the layout.';
      $('building-preview-status').textContent='Seed: '+options.seed+' · candidate layout · map unchanged';requestDraw();
    } catch(error){if(current!==ticket||!dialog.open)return;$('building-layout-status').textContent=error.message;$('building-preview-status').textContent='Layout preview unavailable.';}
  };
  $('building-generate').onclick=async()=>{
    if(!plan||busy)return;
    if(window.editor3d.loading){$('building-layout-status').textContent='Wait for the map update to finish.';return;}
    if(plan.document!==window.editor3d.document||plan.revision!==plan.document.revision){clearPlan();$('building-layout-status').textContent='The map changed. Preview the layout again.';return;}
    const current=++ticket,submission=plan;busy=true;$('building-layout-status').textContent='Adding buildings…';disposeScene();
    try {const options=submission.options,result=await window.editor3d.apply({tool:'building-generate',options});if(!result.ok)throw Error(result.error);if(current!==ticket||!dialog.open)return;
      if(window.editor3d.document!==submission.document){$('building-layout-status').textContent='The layout was added to the previous document; the active map changed.';return;}
      const area=options.area;Object.assign(window.editor3d.view,{x:area.x+area.width/2,y:area.y+area.depth/2,span:Math.max(area.width,area.depth)*1.4});
      dialog.close();$('status').textContent='Building layout added. Undo restores the previous map.';}
    catch(error){if(current===ticket&&dialog.open)$('building-layout-status').textContent=error.message;}finally{busy=false;}
  };
  dialog.querySelector('.building-generator').addEventListener('input',clearPlan);
  function close(){++ticket;disposeScene();ready=false;layoutPreview=false;clearPlan(false);}
  dialog.addEventListener('close',close);window.addEventListener('pagehide',close,{once:true});const resize=new ResizeObserver(()=>{if(view)fit();requestDraw();});resize.observe(canvas);
  function installControls(){
    if(!$('structure-preset')||!$('edit-tool')?.options.length)return;
    const panel=document.createElement('section');panel.id='building-tool-options';panel.hidden=true;
    panel.innerHTML=`<h2>Building placement</h2><label>Building<select id="building-asset"></select></label><label>Facing<select id="building-turns"><option value="0">0°</option><option value="1">90°</option><option value="2">180°</option><option value="3">270°</option></select></label><label>Access clearance (metres)<input id="building-clearance" type="number" min="1" max="8" value="2"></label><p class="muted">Click clear, flat ground on layer 1. The lot includes the full model and overhangs. Use Select / pan to select, rotate or delete a whole building. Turn off Roofs to inspect the floor selected above.</p>`;
    for(const asset of BUILDING_ASSETS){const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name;panel.querySelector('select').append(option);}
    $('editing-tools').append(panel);const sync=()=>{panel.hidden=$('edit-tool').value!=='building-prefab';for(const option of $('building-asset').options){option.disabled=false;try{assertBuildingAuthoringSupport([option.value],window.nautilus?.contract);}catch{option.disabled=true;}}};$('edit-tool').addEventListener('change',sync);sync();queueMicrotask(sync);
    launch.disabled=false;observer.disconnect();
  }
  const observer=new MutationObserver(installControls);observer.observe(document.body,{childList:true,subtree:true});installControls();
}
