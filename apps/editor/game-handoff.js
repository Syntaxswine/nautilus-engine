// The editor's game handoff without the page, so its capability checks and its
// connect/send state can be tested headlessly. A host must declare every authored
// feature, through a manifest or a feature list, before it is handed a validated copy.
import {MAP_CONTRACT, openDocument, assertMapCapabilities, assertBlueprintCompatible} from '../../packages/map-core/index.js';

export function checkGameAdapter(adapter) {
  if (!adapter || typeof adapter.openMap !== 'function') throw new TypeError('A game adapter needs openMap({json, contract}).');
  return adapter;
}
export function sendMapToGame(json, adapter) {
  if (!adapter) throw Error('Connect a game adapter first.');
  const document = openDocument(json), errors = document.validate();
  if (document.block) throw Error('Place this block in a full map first.');
  if (errors.length) throw Error(errors.join(' '));
  if (adapter.manifest) assertBlueprintCompatible(document.map, adapter.manifest);
  else assertMapCapabilities(document.map, adapter.features || []);
  return adapter.openMap({json: document.export(), contract: MAP_CONTRACT});
}
// The state behind window.nautilus: one connected host, sends that default to the
// current export, and a disconnect that clears only its own host. editor.js assigns
// these members as they are, so the page adds no handoff logic of its own.
export function createGameHandoff({exportMap, onChange = () => {}}) {
  let host = null;
  return {
    get hasGameAdapter() { return !!host; },
    connectGame(adapter) {
      host = checkGameAdapter(adapter); onChange();
      return () => {if (host === adapter) {host = null; onChange();}};
    },
    sendToGame(json = exportMap()) { return sendMapToGame(json, host); }
  };
}
