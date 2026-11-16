// The editor's game handoff without the page, so its capability checks and its
// connect/send state can be tested headlessly. A host must declare every authored
// feature, through a manifest or a feature list, before it is handed a validated copy.
import {MAP_CONTRACT, openDocument, assertMapCapabilities, assertBlueprintCompatible} from '../../packages/map-core/index.js';

export function checkGameAdapter(adapter) {
  if (!adapter || typeof adapter.openMap !== 'function') throw new TypeError('A game adapter needs openMap({json, contract}).');
  return adapter;
}
function validatedMap(json,adapter){
  if (!adapter) throw Error('Connect a game adapter first.');
  const document = openDocument(json), errors = document.validate();
  if (document.block) throw Error('Place this block in a full map first.');
  if (errors.length) throw Error(errors.join(' '));
  if (adapter.manifest) assertBlueprintCompatible(document.map, adapter.manifest);
  else assertMapCapabilities(document.map, adapter.features || []);
  return document;
}
function acceptedReply(result){if(result?.ok===false)throw Object.assign(Error(result.reason||'The game refused this map.'),{code:result.code});return result;}
export function preflightMapToGame(json,adapter){const doc=validatedMap(json,adapter);return adapter.preflight?adapter.preflight(doc.export()):{ok:true,scope:'portable features only; placement is checked by the connected host on Send'};}
export function sendMapToGame(json, adapter) {
  const document=validatedMap(json,adapter),result=adapter.openMap({json:document.export(),contract:MAP_CONTRACT});
  return result?.then?result.then(acceptedReply):acceptedReply(result);
}
// The state behind window.nautilus: one connected host, sends that default to the
// current export, and a disconnect that clears only its own host. editor.js supplies
// the export and the refresh, assigns connectGame and sendToGame to window.nautilus,
// and reads hasGameAdapter through a getter of its own.
export function createGameHandoff({exportMap, onChange = () => {}}) {
  let host = null;
  return {
    get hasGameAdapter() { return !!host; },
    template(){if(typeof host?.template!=='function')throw Error('Connect the Night Ledger foliage plot first.');return host.template();},
    preflight(json=exportMap()){return preflightMapToGame(json,host);},
    connectGame(adapter) {
      host = checkGameAdapter(adapter); onChange();
      return () => {if (host === adapter) {host = null; onChange();}};
    },
    sendToGame(json = exportMap()) { return sendMapToGame(json, host); }
  };
}
