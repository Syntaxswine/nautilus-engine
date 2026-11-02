// Optional registered headless ./windows/authoring entry. Runtime host and
// presentation adoption remain separate, explicit consumer responsibilities.
export {AUTHORING_LIMITS,WindowAuthoringError} from './data.js';
export {WINDOW_AUTHORING_CONTRACT,openWindowAuthoring,serializeWindowAuthoring,prepareWindowAuthoring,inspectWindowAuthoring,windowAuthoringGeometryProjection,windowAuthoringGeometry,windowAuthoringRequirements,windowAuthoringReadiness,windowAuthoringCompatibility,bindWindowAuthoringHandoff,clipWindowAuthoringLegacyWall,exportWindowAuthoringLegacy} from './prepare.js';
export {createWindowAuthoring,windowAuthoringDimensions,windowPlacementAtEdge} from './commands.js';
export {createWindowAuthoringDocument} from './document.js';

// Metadata describes the optional authoring entry, not a live host binding.
export function windowAuthoringUsageCard() {
  return {id:'window:authoring',version:1,status:'registered optional headless authoring candidate; editor chrome and live adoption are separate',entry:'./windows/authoring',schemaUri:'urn:nautilus:schema:window-authoring:1',guide:new URL('../../docs/window-authoring.md',import.meta.url).href,schema:new URL('./window-authoring-v1.schema.json',import.meta.url).href,registration:new URL('../../docs/reviews/window-authoring/registration-request.json',import.meta.url).href,ownership:'Authoring owns complete map underlay and authored placements/history. The retained host owns live pane epochs, complete queries, impacts and atomic persistence; a separate presenter owns visual resources.'};
}
