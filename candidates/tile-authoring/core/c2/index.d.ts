import type {TilesV1,WorkbenchDocument,AuthoringContext,Command,AuthoringLimits,AuthoringPlan,AuthoringTarget,Refusal,Definition,Preset,Artwork,Pin,Source,Diagnostic,ResourceRef} from '../../../../packages/tile-authoring-core/index.js';
import type {ProposedCoreC2Arguments,ProposedCoreC2BindArguments,AppearancePlan} from './abi/types.js';
export type * from './abi/types.js';
export {createRectangleDefinition} from '../../../../packages/tile-authoring-core/index.js';
export function planTileAuthoring(tiles:TilesV1,input:ProposedCoreC2Arguments|{document:WorkbenchDocument;command:Command|string;context:AuthoringContext;limits?:Partial<AuthoringLimits>}):AppearancePlan|AuthoringPlan|Refusal;
export function bindTileAuthoringTarget(tiles:TilesV1,input:ProposedCoreC2BindArguments|{before:WorkbenchDocument;plan:AuthoringPlan;prepared:unknown|null}):AuthoringTarget|Refusal;
export function sealTileContentRecord(tiles:TilesV1,input:Definition|Preset|Artwork|Omit<Definition,'contentDigest'>|Omit<Preset,'contentDigest'>|Omit<Artwork,'contentDigest'>):Readonly<{record:Definition|Preset|Artwork;pin:Pin}>;
export function inspectTileAuthoringRequirements(tiles:TilesV1,input:{document:WorkbenchDocument;subject:Pin|Source}):Readonly<{kind:'nautilus-tile-authoring-requirements';version:1;subjectDigest:string;requiredProfiles:string[];requiredResources:Pin[];unavailable:Diagnostic[]}>;
export function tileAuthoringDiscovery():Readonly<object>;

export {captureTilePreset,exportTileContentPack,importTileContentPack} from './stage-b.js';
export type {CaptureInput,ByteEntry,PortablePack} from './stage-b.js';
