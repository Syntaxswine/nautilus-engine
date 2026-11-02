export {PARTS_CONTRACT,PARTS_LIMITS,PartsError,openPartDefinition,openPartsDocument,createPartsDocument,serializePartsDocument} from './data.js';
export {discoverPartDefinitions,compileParts,partsRequirements,assertPartsCompatible} from './compiler.js';
export {PART_IDENTITY,partIdentity,decodePartIdentity} from './identity.js';
export {pieceIdentity,decodePieceIdentity} from './geometry.js';
export {apertureReadiness} from './clearance.js';
export {PARTS_RUNTIME_PROFILE,partsActorReadiness,createPartsQueries,createPartsRuntime,previewPartsAction,applyPartsAction,pendingPartsEvents,claimPartsEvents,serializePartsRuntime,openPartsRuntime} from './runtime.js';
import {openPartsDocument,failParts} from './data.js';
export function exportPartsLegacy(input){const document=openPartsDocument(input);failParts('PARTS_LEGACY_EXPORT_REFUSED','/instances','Functional-part authoring cannot be exported as an unchanged legacy map/block.','Keep the complete functional-parts envelope and select an explicitly compatible compiler/consumer; no lossy automatic downgrade exists.',{instanceId:document.instances[0]?.id||null,status:'unsupported'});}
export function partsUsageCard(){return {id:'functional-parts',version:1,status:'candidate',entry:'./parts',guide:new URL('../../docs/functional-parts.md',import.meta.url).href,provides:['strict authored definitions/instances','deterministic native-quarter-turn compiler','matching static/dynamic/render bindings','content-bound runtime save and event claims'],requires:['exact definitions','measured maximum mover body','bound authoritative queries and atomic host commit','selected material/presentation provider'],decisions:['native actor/art choice','permissions and costs','host data schema/persistence','physical-device/UI acceptance']};}
