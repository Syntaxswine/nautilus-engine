// Optional headless extended-height contract. Public package export/promotion is
// an architect integration task; imports have no I/O, clocks or runtime startup.
export {WORLD_CONTRACT,createWorld,openWorld,validateWorld,serializeWorld,worldRequirements,assertWorldCompatible} from './state.js';
export {compileWorld} from './queries.js';
export {LEGACY_HEIGHT_PROFILES,reportLegacyMigration,reportLegacyRepresentability} from './legacy.js';
export {WorldError} from './validation.js';
