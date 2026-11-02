import type {TilesV1,WorkbenchDocument,Pin,Preset,AuthoringLimits,Pack} from '../../../../packages/tile-authoring-core/index.js';
import type {CostBounds} from '../../../../packages/tile-authoring-core/index.js';
export interface CaptureInput {document:WorkbenchDocument;identity:{id:string;revision:number;label:string};ownerId:string;layerRemaps:{surfaceId:string;layerId:string;templateLayerId:string}[];markRemaps:{markId:string;templateMarkId:string}[];limits?:Partial<AuthoringLimits>}
export interface ByteEntry {entry:string;bytes:Uint8Array}
export interface PortablePack {readonly pack:Pack;readonly entries:ReadonlyArray<Readonly<ByteEntry>>;readonly work:Readonly<CostBounds['planning']>}
export function captureTilePreset(tiles:TilesV1,input:CaptureInput):Readonly<{preset:Preset;pin:Pin;work:CostBounds['planning']}>;
export function exportTileContentPack(tiles:TilesV1,input:{document:WorkbenchDocument;query:{kind:'content.export';presetRefs:Pin[];includeAllDependencies:true};manifestId:string;entries:ByteEntry[];limits?:Partial<AuthoringLimits>}):PortablePack;
export function importTileContentPack(tiles:TilesV1,input:{pack:Pack;entries:ByteEntry[];limits?:Partial<AuthoringLimits>}):PortablePack;
