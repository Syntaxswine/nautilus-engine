import {editorAssets, findAssets, ASSET_CATEGORIES} from './asset-catalog.js';
import {assetPreview} from './asset-preview.js';
import {InspectionScene} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-3d-scene.js';
import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {DIMENSIONS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-world.js';
import {WindowPreviewScene} from './window-preview.js';
import {compileWindowBay} from '../../packages/window-kit/index.js';

export function installAssetLibrary() {
  const $ = id => document.getElementById(id), assets = editorAssets();
  const launch = document.createElement('button'); launch.id = 'nautilus-assets'; launch.textContent = 'Asset library'; launch.disabled = true;
  document.querySelector('.nautilus-header nav').prepend(launch);
  const dialog = document.createElement('dialog'); dialog.id = 'asset-library'; dialog.setAttribute('aria-labelledby','asset-library-title');
  dialog.innerHTML = `<div class="asset-heading"><div><p class="eyebrow">NAUTILUS WORKSHOP</p><h1 id="asset-library-title">Asset library</h1></div><button id="asset-close" aria-label="Close asset library">×</button></div>
    <div class="asset-filters"><label>Find an asset<input id="asset-search" type="search" placeholder="Chair, jungle, brick…"></label><label>Category<select id="asset-category"><option value="">All assets</option></select></label></div>
    <p id="asset-count" role="status"></p><div class="asset-body"><div id="asset-results" aria-label="Asset results"></div><section class="asset-inspector" aria-labelledby="asset-name"><div class="asset-stage"><canvas id="asset-preview" aria-label="Selected asset preview"></canvas><span>1 tile = 1 metre</span></div><div class="asset-turns"><button id="asset-turn" aria-label="Turn preview">↻ Turn view</button><span>Preview only</span></div><h2 id="asset-name"></h2><p id="asset-footprint"></p><div id="asset-appearance" class="asset-filters" hidden><label>Preview weapon<select id="asset-weapon"></select></label><label>Preview outfit<select id="asset-outfit"></select></label></div><p id="asset-note"></p><p id="asset-preview-status" role="status"></p><button id="asset-use">Use this asset</button></section></div>`;
  document.body.append(dialog);
  const windowOptions=document.createElement('div');windowOptions.id='asset-window-options';windowOptions.className='asset-filters';windowOptions.hidden=true;
  windowOptions.innerHTML=`<label>Wall material<select id="asset-window-wall"><option value="wood">Wood</option><option value="brick">Brick</option><option value="concrete">Concrete</option></select></label><label>Sculpture view<select id="asset-window-finish"><option value="painted">Painted</option><option value="clay">Clay</option></select></label><label>Sashes<select id="asset-window-sashes"><option value="installed">Installed</option><option value="removed">Removed · inspect opening</option></select></label><button id="asset-window-download" type="button">Download sculpture JSON</button>`;
  $('asset-note').before(windowOptions);
  for (const name of ASSET_CATEGORIES) $('asset-category').add(new Option(name,name));
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
    scene.draw(view,Math.max(1,canvas.clientWidth),Math.max(1,canvas.clientHeight));
    if (scene.lights?.animated || scene.sceneryAssets?.animated && !scene.reducedMotion?.matches) requestDraw();
  }
  function requestDraw() {if (dialog.open && !frame) frame = requestAnimationFrame(draw);}
  function diagnostics() {
    if (!scene) return;
    const issues = [...new Set(scene.diagnostics)];
    if (issues.length) failures.set(selected,issues.join(' '));
    const failure = failures.get(selected);
    $('asset-preview-status').textContent = failure ? 'Preview unavailable: ' + failure : loading ? 'Loading preview…' : selected?.preview==='window-bay' ? 'Window sculpture · native metres · workshop lighting' : 'Authored model and paint · workshop lighting';
    use.disabled = loading || !!selected?.disabled || !!failure;
    fitPreview();
    requestDraw();
  }
  async function select(asset, appearance = {}) {
    const kind=asset.preview==='window-bay'?'window':'legacy';
    if(scene && sceneKind!==kind) disposePreview();
    const current = ++ticket; selected = asset; loading = true; use.disabled = true;
    $('asset-name').textContent = asset.name;
    const sculpture=kind==='window'?compileWindowBay(asset.id):null;
    $('asset-footprint').textContent = sculpture ? `${sculpture.wall.width} m bay · ${sculpture.opening.width} m centered opening · sill ${sculpture.opening.bottom} m · head ${sculpture.opening.top} m` : `${asset.category} · ${asset.w} × ${asset.h} ${asset.category === 'Foliage' ? 'brush sample' : 'tile footprint'}`;
    $('asset-note').textContent = sculpture ? `${asset.note} ${asset.disabled}` : asset.disabled || asset.note || 'Choose this asset, then click or drag in the map to place it. Placement checks apply.';
    windowOptions.hidden=kind!=='window';
    if(sculpture) appearance={wall:$('asset-window-wall').value,finish:$('asset-window-finish').value,sashes:$('asset-window-sashes').value==='installed'};
    $('asset-appearance').hidden = asset.category !== 'People';
    if (asset.category === 'People') {
      for (const [id,source,value] of [['asset-weapon','unit-weapon',asset.id === 'hen' ? 'hands' : appearance.weapon || 'rifle'],['asset-outfit','unit-outfit',appearance.outfit || 'normal']]) {
        $(id).replaceChildren(...[...$(source).options].filter(o => id !== 'asset-outfit' || o.value !== 'blue-hawaiian' || asset.id === 'donkey').map(o => new Option(o.textContent,o.value)));
        $(id).value = value;
      }
      $('asset-weapon').disabled = asset.id === 'hen';
    }
    for (const button of $('asset-results').children) button.setAttribute('aria-pressed',String(button.dataset.asset === asset.category+':'+asset.id));
    try {
      if (!scene) {sceneKind=kind;scene=kind==='window'?new WindowPreviewScene(canvas,diagnostics):new InspectionScene(canvas,diagnostics);}
      const preview = assetPreview(asset,appearance); view = preview.view;
      const aspect = canvas.clientWidth / Math.max(1,canvas.clientHeight);
      view.span /= Math.min(1,aspect);
      $('asset-preview-status').textContent = 'Loading preview…'; await scene.open(preview.document);
      if (current !== ticket) return;
      loading = false; diagnostics();
    } catch (error) {
      if (current !== ticket) return;
      loading = false; use.disabled = true;
      failures.set(asset,error.message);
      $('asset-preview-status').textContent = 'Preview unavailable: ' + error.message;
    }
  }
  function results() {
    const found = findAssets(assets,$('asset-search').value,$('asset-category').value);
    const box = $('asset-results'); box.replaceChildren();
    $('asset-count').textContent = `${found.length} of ${assets.length} assets`;
    for (const asset of found) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.asset = asset.category+':'+asset.id;
      button.setAttribute('aria-pressed',String(selected === asset));
      const name = document.createElement('strong'); name.textContent = asset.name;
      const detail = document.createElement('span'); detail.textContent = `${asset.category} · ${asset.w} × ${asset.h}${asset.disabled ? ' · Preview only' : ''}`;
      button.append(name,detail); button.onclick = () => select(asset); box.append(button);
    }
    if (!found.length) {const message = document.createElement('p'); message.textContent = 'No matching assets. Try another name or category.'; box.append(message);}
  }
  launch.onclick = () => {
    if (window.editor3d?.loading) { $('status').textContent = 'Wait for the map to finish loading.'; return; }
    dialog.showModal(); results(); select(selected || assets[0]); $('asset-search').focus();
  };
  $('asset-search').oninput = results; $('asset-category').onchange = results;
  for (const id of ['asset-weapon','asset-outfit']) $(id).onchange = () => select(selected,{weapon:$('asset-weapon').value,outfit:$('asset-outfit').value});
  for(const id of ['asset-window-wall','asset-window-finish','asset-window-sashes']) $(id).onchange=()=>select(selected);
  $('asset-window-download').onclick=()=>{
    if(selected?.preview!=='window-bay')return;
    const data=compileWindowBay(selected.id);data.preview={wall:$('asset-window-wall').value,finish:$('asset-window-finish').value,sashes:$('asset-window-sashes').value==='installed'};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');
    link.href=url;link.download=selected.id+'.window.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
  };
  $('asset-close').onclick = () => dialog.close();
  $('asset-turn').onclick = () => {if (view) {view.preset = String((Number(view.preset)+1)%4); requestDraw();}};
  use.onclick = () => {
    if (!selected || use.disabled) return;
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
  function disposePreview() {++ticket; cancelAnimationFrame(frame); frame = 0; scene?.dispose();if(sceneKind==='legacy')scene?.renderer.forceContextLoss();scene=null;sceneKind=null;view=null;failures.clear();
    const fresh=canvas.cloneNode();resize.unobserve(canvas);canvas.replaceWith(fresh);canvas=fresh;resize.observe(canvas);
  }
  dialog.addEventListener('close',disposePreview);
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
