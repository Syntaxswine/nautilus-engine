// Optional public facade candidate. Production export/schema/package composition
// is deliberately left to Architect; this entry owns no mover history/runtime.
export {FARMYARD_DOOR_PROFILE,FARMYARD_DOOR_CONTRACT,FARMYARD_DOOR_COMPONENT,farmyardDoorUsageCard} from './doors/profile.js';
export {FarmyardDoorError} from './doors/data.js';
export {projectFarmyardDoorContext} from './doors/projection.js';
export {createFarmyardDoorState,openFarmyardDoorState,serializeFarmyardDoorState,validateFarmyardDoorState,farmyardDoorContext,farmyardDoorContextToken,matchesFarmyardDoorContext,previewFarmyardDoor,stageFarmyardDoor,adoptFarmyardDoorContext,farmyardDoorColliders,farmyardDoorGeometry,farmyardDoorRequirements,assertFarmyardDoorCompatible} from './doors/state.js';
export {farmyardDoorHostToken,stageFarmyardDoorHost,adoptFarmyardDoorHost,serializeFarmyardDoorHostSave,openFarmyardDoorHostSave,connectFarmyardDoors} from './doors/host.js';
