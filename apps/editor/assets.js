import {editorAssets, findAssets, ASSET_CATEGORIES} from './asset-catalog.js';
import {assetPreview} from './asset-preview.js';
import {InspectionScene} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-scene.js';
import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {DIMENSIONS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-world.js';
import {FurniturePreviewScene} from './furniture-preview.js';
import {furnitureAsset} from '../../packages/furniture-core/index.js';

export function installAssetLibrary() {
  const $ = id => document.getElementById(id), assets = editorAssets();
  const launch = document.createElement('button'); launch.id = 'nautilus-assets'; launch.textContent = 'Asset library';
  document.querySelector('.nautilus-header nav').prepend(launch);
  const dialog = document.createElement('dialog'); dialog.id = 'asset-library'; dialog.setAttribute('aria-labelledby','asset-library-title');
  dialog.innerHTML = `<div class="asset-heading"><div><p class="eyebrow">NAUTILUS WORKSHOP</p><h1 id="asset-library-title">Asset library</h1></div><button id="asset-close" aria-label="Close asset library">×</button></div>
    <div class="asset-filters"><label>Find an asset<input id="asset-search" type="search" placeholder="Chair, jungle, brick…"></label><label>Category<select id="asset-category"><option value="">All assets</option></select></label></div>
    <div id="asset-furniture-filters" class="asset-filters" hidden><label>Furniture form<select id="asset-furniture-form"></select></label><label>Finish<select id="asset-furniture-finish"></select></label><label>Contents<select id="asset-furniture-contents"></select></label></div>
    <p id="asset-count" role="status"></p><div class="asset-body"><div id="asset-results" aria-label="Asset results"></div><section id="asset-inspector" class="asset-inspector" aria-labelledby="asset-name"><div id="asset-furniture-options" class="asset-filters" hidden><label>Orientation<select id="asset-furniture-rotation"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label><label>Appearance<select id="asset-furniture-mode"><option value="painted">Painted</option><option value="clay">Clay</option></select></label><label>Camera<select id="asset-furniture-camera"><option value="raised">Raised</option><option value="low">Low angle</option></select></label></div><div class="asset-stage"><canvas id="asset-preview" aria-label="Selected asset preview"></canvas><span>1 tile = 1 metre</span></div><div class="asset-turns"><button id="asset-turn" aria-label="Turn preview">↻ Turn view</button><span>Preview only</span></div><h2 id="asset-name"></h2><p id="asset-footprint"></p><p id="asset-rendered-size" hidden></p><p id="asset-furniture-source" hidden></p><div id="asset-appearance" class="asset-filters" hidden><label>Preview weapon<select id="asset-weapon"></select></label><label>Preview outfit<select id="asset-outfit"></select></label></div><p id="asset-note"></p><p id="asset-preview-status" role="status"></p><button id="asset-retry" type="button" hidden>Retry preview</button><button id="asset-use">Use this asset</button></section></div>`;
  document.body.append(dialog);
  for (const name of ASSET_CATEGORIES) $('asset-category').add(new Option(name,name));
  const furniture=assets.filter(asset=>asset.category==='Furniture');
  const readable=value=>value.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase());
  for(const field of ['form','finish','contents']) {
    const control=$('asset-furniture-'+field);control.add(new Option({form:'All forms',finish:'All finishes',contents:'All contents'}[field],''));
    for(const value of new Set(furniture.map(asset=>asset.furniture[field]))) {
      const spec=furniture.find(asset=>asset.furniture[field]===value).furniture;
      const label=field==='form'?spec.name.split(' · ').slice(0,-2).join(' · '):field==='finish'?spec.finishName:value==='books'?'Books · stocked':'Empty';
      control.add(new Option(label||readable(value),value));
    }
    control.value='';
  }
  const metres=size=>size.map(value=>Number(value.toFixed(4))).join(' × ');
  let selected, scene, sceneKind, view, frame = 0, ticket = 0, loading = false;
  const failures = new Map();
  let canvas = $('asset-preview'); const use = $('asset-use');
  function fitPreview() {
    if (!scene?.document || !view) return;
    const bounds = new T.Box3().setFromObject(scene.scene);
    if (bounds.isEmpty()) return;
    const size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
    const width = (size.x+size.z) / Math.sqrt(2), height = (size.x+size.z) / Math.sqrt(8) + size.y*Math.sqrt(3)/2;
    const aspect = Math.max(1,canvas.clientWidth)/Math.max(1,canvas.clientHeight);
    view.x = center.x; view.y = center.z; view.span = Math.max(2.5,height,width/aspect)*1.18;
    // Only the preview camera uses a fractional height. No model is rescaled.
    scene.options.level = center.y / DIMENSIONS.floorSpacing;
  }
  function draw() {
    frame = 0; if (!dialog.open || !scene || !view) return;
    try {
      scene.draw(view,Math.max(1,canvas.clientWidth),Math.max(1,canvas.clientHeight));
      if (scene.lights?.animated || scene.sceneryAssets?.animated && !scene.reducedMotion?.matches) requestDraw();
    } catch (error) { previewFailed(error); }
  }
  function requestDraw() {if (dialog.open && !frame) frame = requestAnimationFrame(draw);}
  function diagnostics() {
    if (!scene) return;
    const issues = [...new Set(scene.diagnostics)];
    if (issues.length) {previewFailed(new Error(issues.join(' ')));return;}
    const failure = failures.get(selected);
    $('asset-preview-status').textContent = failure ? 'Preview unavailable: ' + failure : loading ? 'Loading preview…' : selected?.preview==='furniture' ? 'Authored furniture · native metres · workshop lighting' : 'Authored model and paint · workshop lighting';
    if(selected?.preview==='furniture'&&scene.bounds)$('asset-rendered-size').textContent='Overall size: '+metres(scene.bounds.getSize(new T.Vector3()).toArray())+' m (W × H × D)';
    use.disabled = loading || !!selected?.disabled || !!failure || !!window.editor3d?.loading || !window.editor3d?.document || !$('edit-tool')?.options.length;
    fitPreview();
    requestDraw();
  }
  async function select(asset, appearance = {}) {
    const current = ++ticket;
    const kind=asset.preview==='furniture'?'furniture':'legacy';
    dialog.dataset.preview=kind;dialog.dataset.previewFailed='false';$('asset-inspector').scrollTop=0;
    // Pending or failed loads own their renderer; never borrow it for a retry.
    if (scene && (loading || failures.size || sceneKind!==kind)) releaseScene();
    failures.clear(); selected = asset; loading = true; use.disabled = true;
    $('asset-retry').hidden=true;
    $('asset-name').textContent = asset.name;
    for(const id of ['asset-furniture-options','asset-furniture-source','asset-rendered-size'])$(id).hidden=kind!=='furniture';
    if(kind==='furniture') {
      appearance={rotation:Number($('asset-furniture-rotation').value)||0,mode:$('asset-furniture-mode').value||'painted',lowAngle:$('asset-furniture-camera').value==='low'};
      const spec=furnitureAsset(asset.id,{rotation:appearance.rotation});
      $('asset-footprint').textContent=`Body footprint: ${metres([spec.size[0],spec.size[2]])} m · Source tile reservation: ${spec.tiles.join(' × ')} tiles`;
      $('asset-rendered-size').textContent='Overall size: loading preview…';
      $('asset-furniture-source').textContent='Farmyard library collection · '+spec.source.commit.slice(0,7);
      $('asset-furniture-source').title='Source commit '+spec.source.commit;
    }else $('asset-footprint').textContent = `${asset.category} · ${asset.w} × ${asset.h} ${asset.category === 'Foliage' ? 'brush sample' : 'tile footprint'}`;
    $('asset-note').textContent = asset.disabled || asset.note || 'Choose this asset, then click or drag in the map to place it. Placement checks apply.';
    $('asset-appearance').hidden = asset.category !== 'People';
    if (asset.category === 'People') {
      for (const [id,source,value] of [['asset-weapon','unit-weapon',asset.id === 'hen' ? 'hands' : appearance.weapon || 'rifle'],['asset-outfit','unit-outfit',appearance.outfit || 'normal']]) {
        const choices=[...($(source)?.options||[])];if(!choices.length)choices.push(new Option(readable(value),value));
        $(id).replaceChildren(...choices.filter(o => id !== 'asset-outfit' || o.value !== 'blue-hawaiian' || asset.id === 'donkey').map(o => new Option(o.textContent,o.value)));
        $(id).value = value;
      }
      $('asset-weapon').disabled = asset.id === 'hen';
    }
    for (const button of $('asset-results').children) button.setAttribute('aria-pressed',String(button.dataset.asset === asset.category+':'+asset.id));
    try {
      if (!scene) {
        let owned;
        const changed=()=>{if (scene === owned) diagnostics();};
        owned = kind==='furniture'?new FurniturePreviewScene(T,canvas,changed):new InspectionScene(canvas,changed);
        scene = owned;sceneKind=kind;
      }
      const preview = assetPreview(asset,appearance); view = preview.view;
      const aspect = canvas.clientWidth / Math.max(1,canvas.clientHeight);
      view.span /= Math.min(1,aspect);
      const owned = scene;
      $('asset-preview-status').textContent = 'Loading preview…'; await owned.open(preview.document);
      if (current !== ticket || scene !== owned || !dialog.open) return;
      loading = false; diagnostics();
    } catch (error) {
      if (current !== ticket) return;
      previewFailed(error);
    }
  }
  function results() {
    const category=$('asset-category').value;const furnitureFilters=Object.fromEntries(['form','finish','contents'].map(field=>[field,$('asset-furniture-'+field).value]));
    const found = findAssets(assets,$('asset-search').value,category,category==='Furniture'?furnitureFilters:{});
    $('asset-furniture-filters').hidden=category!=='Furniture';
    const box = $('asset-results'); box.replaceChildren();
    $('asset-count').textContent = category==='Furniture'?`${found.length} of ${furniture.length} furniture variants · ${new Set(furniture.map(asset=>asset.furniture.form)).size} forms`:`${found.length} of ${assets.length} entries`;
    for (const asset of found) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.asset = asset.category+':'+asset.id;
      button.setAttribute('aria-pressed',String(selected === asset));
      const name = document.createElement('strong'); name.textContent = asset.name;
      const detail = document.createElement('span'); detail.textContent = `${asset.category} · ${asset.w} × ${asset.h}${asset.disabled ? ' · Preview only' : ''}`;
      button.append(name,detail); button.onclick = () => select(asset); box.append(button);
    }
    if (!found.length) {const message = document.createElement('p'); message.textContent = 'No matching assets. Try another name or category.'; box.append(message);}
    if(selected&&!found.includes(selected))clearSelection(found.length?'Choose a matching asset to inspect.':'No matching assets');
    return found;
  }
  launch.onclick = () => {
    if(dialog.open)return;
    if(!selected&&!window.editor3d?.document&&furniture.length)$('asset-category').value='Furniture';
    dialog.showModal();const found=results();if(selected||found.length)select(selected||found[0]);else clearSelection('No matching assets');$('asset-search').focus();
  };
  $('asset-search').oninput = results; $('asset-category').onchange = results;
  for(const field of ['form','finish','contents'])$('asset-furniture-'+field).onchange=results;
  for(const field of ['rotation','mode','camera'])$('asset-furniture-'+field).onchange=()=>{if(selected?.preview==='furniture')return select(selected);};
  $('asset-retry').onclick=()=>{if(selected)return select(selected);};
  for (const id of ['asset-weapon','asset-outfit']) $(id).onchange = () => select(selected,{weapon:$('asset-weapon').value,outfit:$('asset-outfit').value});
  $('asset-close').onclick = () => dialog.close();
  $('asset-turn').onclick = () => {if (view) {view.preset = String((Number(view.preset)+1)%4); requestDraw();}};
  use.onclick = () => {
    if (!selected || use.disabled || selected.preview==='furniture') return;
    if (window.editor3d?.loading) { $('asset-preview-status').textContent = 'Wait for the map to finish loading.'; return; }
    const tool = $('edit-tool'); tool.value = selected.tool; tool.dispatchEvent(new Event('change'));
    const bindings = {...selected.bindings};
    if (selected.category === 'People') {bindings['unit-weapon'] = $('asset-weapon').value; bindings['unit-outfit'] = $('asset-outfit').value;}
    for (const [id,value] of Object.entries(bindings)) {
      const control = $(id);
      if (!control || control.options && ![...control.options].some(option => option.value === value && !option.disabled)) {
        $('asset-preview-status').textContent = 'This asset is unavailable in the current tool catalog.'; return;
      }
      control.value = value;
      if (control.matches('input[type=range]')) control.dispatchEvent(new Event('input'));
      control.dispatchEvent(new Event('change'));
    }
    // Shapes that encode a cardinal direction must not inherit a stale 90°
    // prop toggle. Scenery keeps its explicit orientation in the normal tools.
    if (selected.category === 'Cliffs') { $('cliff-mask').value = '15'; $('cliff-mask').dispatchEvent(new Event('change')); }
    dialog.close();
    if (getComputedStyle($('nautilus-options')).display !== 'none') {
      document.body.classList.add('nautilus-options-open'); $('nautilus-options').setAttribute('aria-expanded','true');
    }
    $('status').textContent = `${selected.name} selected. Click or drag in the map to place.`;
    tool.focus();
  };
  function releaseScene() {
    cancelAnimationFrame(frame); frame = 0;
    const owned = scene; scene = null; sceneKind=null; view = null;
    try {owned?.dispose();}
    finally {
      try {if(!owned?.contextReleased)owned?.renderer.forceContextLoss();}
      finally {
        const fresh=canvas.cloneNode();resize.unobserve(canvas);canvas.replaceWith(fresh);canvas=fresh;resize.observe(canvas);
      }
    }
  }
  function previewFailed(error) {
    dialog.dataset.previewFailed='true';
    loading = false; use.disabled = true; failures.set(selected,error.message);
    $('asset-preview-status').textContent = 'Preview unavailable: ' + error.message;
    if(selected?.preview==='furniture')$('asset-rendered-size').textContent='Overall size: available when the 3D preview loads.';
    $('asset-retry').hidden=false;
    releaseScene();
  }
  function clearSelection(message) {
    dialog.dataset.preview='';dialog.dataset.previewFailed='false';
    ++ticket;loading=false;selected=null;failures.clear();use.disabled=true;releaseScene();
    $('asset-name').textContent=message;$('asset-footprint').textContent='';$('asset-note').textContent='';$('asset-preview-status').textContent='';$('asset-retry').hidden=true;
    for(const id of ['asset-furniture-options','asset-furniture-source','asset-rendered-size','asset-appearance'])$(id).hidden=true;
  }
  function disposePreview() {++ticket;loading=false;use.disabled=true;failures.clear();releaseScene();}
  dialog.addEventListener('close',()=>{if(!dialog.open)disposePreview();});
  window.addEventListener('pagehide',disposePreview,{once:true});
  const resize=new ResizeObserver(requestDraw);resize.observe(canvas);
  // The inherited editor and Nautilus adapters are separate module entries.
  // Enable once controls exist, without a long-lived polling helper.
  const ready = () => {
    if (!$('foliage-preset')?.options.length || !$('prop-kind')?.options.length) return;
    // The saved format already supports open bog. Include any supported
    // foliage presets omitted from the donor's hand-written select options.
    for (const asset of assets.filter(a => a.category === 'Foliage')) {
      if (![...$('foliage-preset').options].some(o => o.value === asset.id)) $('foliage-preset').add(new Option(asset.name,asset.id));
    }
    launch.disabled = false; observer.disconnect();
  };
  const observer = new MutationObserver(ready); observer.observe(document.body,{childList:true,subtree:true}); ready();
}
