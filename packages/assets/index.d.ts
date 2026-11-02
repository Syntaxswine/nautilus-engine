// Shared asset metadata and exact artwork discovery types.
import type {SharedArtworkDiscoveryRow} from './artwork.js';
export interface SharedAsset {id:string;name:string;category:string;dimensions?:{width:number;depth:number;height?:number;metresPerUnit:number};source:Record<string,unknown>;availability:string;note?:string;[key:string]:unknown;}
export const SHARED_ASSET_CONTRACT:Readonly<{version:1;metresPerUnit:1;status:string}>;
export function listSharedAssets(options:{category:'Artwork'}):SharedArtworkDiscoveryRow[];
export function listSharedAssets(options?:{category?:string}):SharedAsset[];
export function sharedAsset(id:string):SharedAsset;
export {listSharedArtwork,sharedArtwork,sharedArtworkDefaults,sharedArtworkImage} from './artwork.js';
export type {SharedArtworkLocation,SharedArtworkImageDelivery,SharedArtworkDiscoveryRow} from './artwork.js';
