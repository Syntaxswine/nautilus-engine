/** PROPOSAL ONLY. No runtime export, implementation, registration or permission. */
import type {Command,Operation,Expected,AuthoringContext,AuthoringLimits,WorkbenchDocument,StackConstraints,CostBounds,AuthoringTarget,Refusal} from '../../../../../packages/tile-authoring-core/index.js';
import type {SourceCapture,PreparedCapture,CapacityBound,Fingerprints,ResourceRequirements,C2Profiles} from '../abi/types.js';
export interface CombinedOrigin {action:'edit';requestId:string;commandDigest:string;expected:Expected}
export type CombinedProfiles=Omit<C2Profiles,'host'>&{host:'nautilus-tile-authoring-c2-combined-host-v1'};
export interface CombinedSourceCapture extends Omit<SourceCapture,'kind'|'profiles'|'original'> {kind:'nautilus-tile-authoring-combined-source-capture';profiles:CombinedProfiles;original:CombinedOrigin}
export type CombinedCommand=Omit<Command,'operations'>&{operations:(Extract<Operation,{kind:'preset.place'}>&{body:{defaults:'copy-explicit'}})[]};
/** Actual fixed public-v1 request subset. JSON schema references the existing
 * canonical recipe/layout definitions; R and B come from borrowed public core. */
export interface PublicRequestSubset<R=unknown> {version:1;id:string;expected:{revision:number;layoutDigest:string;catalogueDigest:string;contextToken:string};selection:{seed:number;policyVersion:number};replaceIds:[];removeIds:[];slots:{id:string;origin:[number,number,number];floorBindings:Record<string,string>;alternatives:[{recipeId:string;transform:{quarterTurns:0|1|2|3;mirrorX:boolean}}];locked:boolean;anchorIds:string[]}[];joins:unknown[];relations:unknown[];recipeUpdates:R[];maxSteps:number;maxClosure:number;maxSpatialTests:number;maxGeometryWork:number;neighbourRadiusM:0}
export interface StackBinding {sourceLayoutDigest:string;sourceCatalogueDigest:string;contextToken:string;sourceConstraintsDigest:string;nextConstraintsDigest:string;floorProfileDigest:string;requestDigest:string}
export interface CombinedPlan3<R=unknown,B=unknown> {kind:'nautilus-tile-authoring-plan';version:3;ok:true;committable:false;route:'geometry-and-appearance';tilePreparation:'public-v1-prepared';original:CombinedOrigin;command:CombinedCommand;limits:AuthoringLimits;context:AuthoringContext;sourceCapture:CombinedSourceCapture;sourceCaptureDigest:string;sourceHostDocumentDigest:string;targetHostDocumentDigest:string;fingerprints:{source:Fingerprints;target:Fingerprints};request:PublicRequestSubset<R>;constraints:StackConstraints;stackBinding:StackBinding;targetDocument:WorkbenchDocument<R,B>;resourceRequirements:ResourceRequirements;preparationNeed:'prepare-geometry-and-overlay';costBounds:CostBounds}
export interface PublicPreparationObservation<B=unknown> {requestId:string;requestDigest:string;expected:PublicRequestSubset['expected'];contextToken:string;nextBundle:B;actualResultDigest:string}
export interface CombinedCapacityBound extends Omit<CapacityBound,'kind'|'original'> {kind:'nautilus-tile-authoring-combined-capacity-bound';original:CombinedOrigin}
export interface CombinedPreparedCapture<B=unknown> extends Omit<PreparedCapture,'kind'|'profiles'|'original'|'capacityBound'> {kind:'nautilus-tile-authoring-prepared-combined-capture';profiles:CombinedProfiles;original:CombinedOrigin;capacityBound:CombinedCapacityBound;publicPreparation:PublicPreparationObservation<B>}
export interface CombinedEditInput {document:WorkbenchDocument;command:CombinedCommand;context:AuthoringContext;combinedSource:CombinedSourceCapture;limits?:Partial<AuthoringLimits>}
/** Proposed overloads only. The actual retained preparation remains Host-held;
 * a DTO or TypeScript brand cannot establish its ownership. */
export declare function planTileAuthoring(tiles:unknown,input:CombinedEditInput):CombinedPlan3|Refusal;
export declare function bindTileAuthoringTarget(tiles:unknown,input:{before:WorkbenchDocument;plan:CombinedPlan3;prepared:unknown;combinedCapture:CombinedPreparedCapture}):AuthoringTarget|Refusal;
