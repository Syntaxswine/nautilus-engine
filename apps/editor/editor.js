import {ENGINE_VERSION, MAP_CONTRACT, openDocument, describeBlueprint, assertMapCapabilities, assertBlueprintCompatible, engineManifest} from '../../packages/map-core/index.js';
import {exampleYard} from '../../packages/map-core/example.js';
import {installAssetLibrary} from './assets.js';
import {installBuildingLibrary} from './buildings.js';
import {installEditorFloorNavigation} from './floor-navigation.js';

installAssetLibrary();
installBuildingLibrary();

let gameAdapter = null;
let floorBinding = null;
const status = text => {document.getElementById('status').textContent = text;};
window.nautilus = {
  version: ENGINE_VERSION, contract: MAP_CONTRACT, manifest: engineManifest(),
  get floorNavigation() { return floorBinding; },
  get document() { return window.editor3d?.document; },
  get hasGameAdapter() { return !!gameAdapter; },
  export() {if (!this.document) throw Error('The editor is still loading.');return this.document.export();},
  async open(input) {const document = openDocument(input);await window.editor3d.open(document);return describeBlueprint(document.export());},
  connectGame(adapter) {
    if (!adapter || typeof adapter.openMap !== 'function') throw new TypeError('A game adapter needs openMap({json, contract}).');
    gameAdapter = adapter; refreshHandoff(); return () => {if (gameAdapter === adapter) {gameAdapter = null;refreshHandoff();}};
  },
  sendToGame(json = this.export()) {
    if (!gameAdapter) throw Error('Connect a game adapter first.');
    const document = openDocument(json), errors = document.validate();
    if (document.block) throw Error('Place this block in a full map first.');
    if (errors.length) throw Error(errors.join(' '));
    if (gameAdapter.manifest) assertBlueprintCompatible(document.map, gameAdapter.manifest);
    else assertMapCapabilities(document.map,gameAdapter.features||[]);
    return gameAdapter.openMap({json: document.export(), contract: MAP_CONTRACT});
  }
};
function installSettingsFeedback() {
  const heading = document.querySelector('#editor-settings .settings-heading'), source = document.getElementById('status');
  if (!heading || !source || document.getElementById('nautilus-settings-feedback')) return;
  const feedback = document.createElement('p'); feedback.id = 'nautilus-settings-feedback';
  feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  heading.append(feedback);
  const reflect = () => {feedback.textContent = source.textContent;feedback.hidden = !feedback.textContent;};
  new MutationObserver(reflect).observe(source, {childList: true, subtree: true, characterData: true});
  reflect();
}
function installFloorControls() {
  if (floorBinding || !window.editor3d?.scene || !document.querySelector('#editor-bottom .altitude') || !document.getElementById('floor')) return;
  floorBinding = installEditorFloorNavigation({
    editor: window.editor3d,
    getLabel: option => String(Number(option.value) + 1),
    getHeight: id => Number(id) * 2.12
  });
}
function refreshHandoff() {
  installFloorControls();
  installSettingsFeedback();
  const button = document.getElementById('playtest');
  if (button) {const disabled = !gameAdapter || !!window.editor3d?.document?.block;if (button.disabled !== disabled) button.disabled = disabled;button.title = gameAdapter ? 'Send a validated copy; keep the blueprint here.' : 'Export JSON for a game, or connect a game adapter.';}
  const quick = document.getElementById('quick-playtest');if (quick && button) {quick.disabled = button.disabled;quick.title = button.title;}
}
// Observe the tools once they are installed, rather than keeping a polling
// timer or changing the imported model/controller implementation.
const observer = new MutationObserver(() => {refreshHandoff();if (document.getElementById('playtest') && floorBinding) observer.disconnect();});
observer.observe(document.body, {childList: true, subtree: true}); refreshHandoff();
document.querySelector('.properties').id = 'nautilus-properties';
const optionsButton = document.getElementById('nautilus-options');
const showOptions = show => {document.body.classList.toggle('nautilus-options-open', show);optionsButton.setAttribute('aria-expanded', String(show));};
optionsButton.onclick = () => showOptions(!document.body.classList.contains('nautilus-options-open'));
document.addEventListener('keydown', event => {if (event.key === 'Escape') showOptions(false);});
const handoffState = new MutationObserver(refreshHandoff);
const originalHandoff = document.getElementById('playtest');
if (originalHandoff) handoffState.observe(originalHandoff, {attributes: true, attributeFilter: ['disabled']});
document.getElementById('nautilus-example').onclick = async () => {
  if (window.editor3d?.loading) return status('Wait for the current map to finish loading.');
  if (window.editor3d?.document?.changed && !confirm('Replace this design with the example yard? Export or save first to keep your edits.')) return;
  try {await window.nautilus.open(exampleYard());status('Example yard · edit freely, save a copy, or export JSON.');} catch (error) {status(error.message);}
};
const help = document.createElement('dialog'); help.className = 'nautilus-about';
help.innerHTML = `<form method="dialog"><button class="close-about" aria-label="Close">×</button></form><p class="eyebrow">NAUTILUS ENGINE ${ENGINE_VERSION}</p><h1>One workshop.<br>Worlds to share.</h1><p>Build a map, capture reusable blocks, and connect them into new places. The workshop preserves the existing AFT map and block JSON formats.</p><dl><dt>Build</dt><dd>Choose a tool, drag its preview, then release to place.</dd><dt>Navigate</dt><dd>Right-drag or WASD / arrows to pan. Scroll to zoom. Q / E turn the camera.</dd><dt>Floors</dt><dd>Use five floor labels, the arrows or Page Up / Page Down. Scroll over the selector to change floor; scroll over the scene to zoom. Floor changes cancel unfinished previews.</dd><dt>Edit</dt><dd>R rotates a placement. Ctrl / ⌘ Z undoes. Ctrl / ⌘ Shift Z redoes. Escape cancels.</dd><dt>Share</dt><dd>Export JSON for a portable backup. Browser saves belong to Nautilus on this device.</dd><dt>Generate</dt><dd>Switch to Blocks, save designs with four connections, then generate a seeded map from the library.</dd></dl><p><a href="${new URL('../../examples/extended-world.html',import.meta.url).href}" target="_blank" rel="noopener">Open the native-height workshop ↗</a> for the separate fifteen-story authoring workflow. Your current map stays open here.</p><p class="about-note">The first release keeps the inherited 240 × 240 map, 24 × 24 blocks, and layer rules. Game-specific playtesting connects through a separate adapter.</p><form method="dialog"><button class="about-continue">Back to the workshop</button></form>`;
document.body.append(help);
document.getElementById('nautilus-help').onclick = () => help.showModal();
help.addEventListener('click', event => {if (event.target === help) {const rect = help.getBoundingClientRect();if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) help.close();}});
