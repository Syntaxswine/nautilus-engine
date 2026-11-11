// The editor's game handoff without the page, so its capability checks and its
// connect/send state can be tested headlessly. A host must declare every authored
// feature, through a manifest or a feature list, before it is handed a validated copy.
import {MAP_CONTRACT, openDocument, assertMapCapabilities, assertBlueprintCompatible} from '../../packages/map-core/index.js';
import {ROAD_VEHICLES, ROAD_VEHICLE_FEATURE} from '../../packages/vehicle-visuals/catalogue.js';
const vehicleKinds = new Set(ROAD_VEHICLES.map(row => row.id));

export function checkGameAdapter(adapter) {
  if (!adapter || typeof adapter.openMap !== 'function') throw new TypeError('A game adapter needs openMap({json, contract}).');
  return adapter;
}
export function sendMapToGame(json, adapter) {
  if (!adapter) throw Error('Connect a game adapter first.');
  const document = openDocument(json), errors = document.validate();
  if (document.block) throw Error('Place this block in a full map first.');
  if (errors.length) throw Error(errors.join(' '));
  if (document.map.props?.some(prop => vehicleKinds.has(prop.kind))) {
    const supported = adapter.manifest
      ? adapter.manifest.capabilities?.some(row => row.id === ROAD_VEHICLE_FEATURE && row.versions?.includes(1))
      : Array.isArray(adapter.features) && adapter.features.includes(ROAD_VEHICLE_FEATURE);
    if (!supported) throw new Error('This game adapter needs the road vehicle scenery binding (' + ROAD_VEHICLE_FEATURE + ').');
  }
  if (adapter.manifest) assertBlueprintCompatible(document.map, adapter.manifest);
  else assertMapCapabilities(document.map, adapter.features || []);
  return adapter.openMap({json: document.export(), contract: MAP_CONTRACT});
}
// The state behind window.nautilus: one connected host, sends that default to the
// current export, and a disconnect that clears only its own host. editor.js supplies
// the export and the refresh, assigns connectGame and sendToGame to window.nautilus,
// and reads hasGameAdapter through a getter of its own.
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
