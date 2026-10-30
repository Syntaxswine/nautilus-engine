// Compile/query only. This entry does not authorize impacts, costs or saves.
export {WINDOW_GEOMETRY_CONTRACT} from './contract.js';
export {WindowGeometryError} from './data.js';
export {compileWindowPlacements,inspectWindowGeometry,serializeWindowGeometry,openWindowGeometry} from './compiler.js';
export {queryWindowSegment,clipWindowLegacyWall} from './query.js';
