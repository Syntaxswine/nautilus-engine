// Root proof adapter: actual public modules only; no DTO/native/Kernel substitute.
export * as T from '../../../packages/tiles-core/index.js';
export * as M from '../../../packages/map-core/index.js';
export * as A from '../../../packages/tile-authoring-core/index.js';
export * as F from '../../../packages/tile-finishes/catalogue.js';
export const cp=value=>structuredClone(value);
