// Headless wind over Nautilus models: voxelize a site, solve the air around it and sample
// the result. Hosts supply triangles (meshes.js reads a host Three.js tree), clocks and
// rendering; nothing here touches the DOM, storage or a renderer.
export {VON_KARMAN,REFERENCE_HEIGHT,TERRAIN,terrainRoughness,frictionVelocity,profileSpeed,windDirection,bearingName} from './profile.js';
export {WIND_GRID_LIMITS,createWindGrid,voxelizeTriangles,fillEnclosed,solidFraction,windDomain} from './voxels.js';
export {WIND_SOLVER_VERSION,BOUNDARY_TYPES,windBoundaries,createWindSolver} from './solver.js';
export {SURFACE_LAYER_SIGMA,createInflowTurbulence,seededRandom} from './turbulence.js';
export {WIND_FIELD_KIND,WIND_FIELD_VERSION,bakeWindField,sampleWindField,encodeWindField,decodeWindField,advectTracers} from './field.js';
export {objectTriangles,triangleBounds} from './meshes.js';
