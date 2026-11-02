/** PROPOSAL REVISION 2 ONLY. No runtime exports, authority, registration or permission. */
import type {Command,Operation,Expected,AuthoringContext,AuthoringLimits,WorkbenchDocument,StackConstraints,CostBounds,AuthoringTarget,Refusal,ResourceRef} from '../../../../../packages/tile-authoring-core/index.js';
import type {SourceCapture,PreparedCapture,CapacityBound,Fingerprints,ResourceRequirements,C2Profiles,HistoryOrigin,RecoveryRetention} from '../abi/types.js';
export interface CombinedEditOrigin {action:'edit';requestId:string;commandDigest:string;expected:Expected}
/** CURRENT Expected; null command digest; existing restore request unchanged. */
export type CombinedHistoryOrigin=HistoryOrigin;
export type CombinedOrigin=CombinedEditOrigin|CombinedHistoryOrigin;
export type CombinedProfiles=Omit<C2Profiles,'host'>&{host:'nautilus-tile-authoring-c2-combined-host-v1'};
export interface CombinedSourceCapture<O extends CombinedOrigin=CombinedOrigin> extends Omit<SourceCapture,'kind'|'profiles'|'original'> {kind:'nautilus-tile-authoring-combined-source-capture';profiles:CombinedProfiles;original:O}
export type CombinedCommand=Omit<Command,'operations'>&{operations:(Extract<Operation,{kind:'preset.place'}>&{body:{defaults:'copy-explicit'}})[]};
/** Exactly the bounded retained public-v1 subset. Effective zero refuses before
 * construction: the four actual public request limits each require >=1. */
export interface PublicRequestSubset<R=unknown> {version:1;id:string;expected:{revision:number;layoutDigest:string;catalogueDigest:string;contextToken:string};selection:{seed:number;policyVersion:number};replaceIds:[];removeIds:[];slots:{id:string;origin:[number,number,number];floorBindings:Record<string,string>;alternatives:[{recipeId:string;transform:{quarterTurns:0|1|2|3;mirrorX:boolean}}];locked:boolean;anchorIds:string[]}[];joins:unknown[];relations:unknown[];recipeUpdates:R[];maxSteps:number;maxClosure:number;maxSpatialTests:number;maxGeometryWork:number;neighbourRadiusM:0}
export interface StackBinding {sourceLayoutDigest:string;sourceCatalogueDigest:string;contextToken:string;sourceConstraintsDigest:string;nextConstraintsDigest:string;floorProfileDigest:string;requestDigest:string}
export interface PublicKernelWork {steps:number;spatialTests:number;geometryEvaluations:number}
export interface CombinedPlanProgress {sourceCharged:number;afterIntent:number;afterPublicPreparation:number;afterTarget:number}
/** Canonical staging is data, never a prospective bundle/evaluator/preparation. */
export interface CombinedEditIntent<R=unknown> {
 kind:'nautilus-tile-authoring-combined-intent';version:1;ok:true;committable:false;
 original:CombinedEditOrigin;command:CombinedCommand;limits:AuthoringLimits;context:AuthoringContext;
 sourceCapture:CombinedSourceCapture<CombinedEditOrigin>;sourceCaptureDigest:string;sourceHostDocumentDigest:string;
 request:PublicRequestSubset<R>;constraints:StackConstraints;stackBinding:StackBinding;
 staged:{authoring:WorkbenchDocument<R>['authoring'];resourceRefs:ResourceRef[];recipes:R[];owners:unknown[]};
 publicPreparationBudget:{reservedUnits:number;maxSteps:number;maxSpatialTests:number;maxGeometryWork:number};
 sourceCharged:number;costBounds:CostBounds;
}
export interface PublicPreparationObservation<B=unknown> {
 kind:'actual-public-v1-result';requestId:string;requestDigest:string;expected:PublicRequestSubset['expected'];
 expectedHostToken:string;contextToken:string;nextBundle:B;actualResultDigest:string;work:PublicKernelWork;
}
export interface HistoryTargetObservation<R=unknown,B=unknown> {
 kind:'nautilus-tile-authoring-history-target-observation';version:1;action:'undo'|'redo';requestId:string;
 sourceJournalDigest:string;generation:number;stateDigest:string;journalRevision:number;journalOrdinal:number;contextKeyDigest:string;
 sourceTextDigest:string;targetTextDigest:string;targetDocumentDigest:string;targetDocument:WorkbenchDocument<R,B>;
 history:{undo:number;redo:number;bytes:number;sourceTextBytes:number;targetTextBytes:number};
 historyResourceRefs:ResourceRef[];
}
export interface StoredHistoryGeometryObservation {
 kind:'stored-history-target';targetDocumentDigest:string;targetTextDigest:string;targetBundleDigest:string;
 validationProfile:'public-v1-resolved-exact-data';
}
export type CombinedGeometryObservation<B=unknown>=PublicPreparationObservation<B>|StoredHistoryGeometryObservation;
interface CombinedPlanBase<R=unknown,B=unknown> {
 kind:'nautilus-tile-authoring-plan';version:3;ok:true;committable:false;route:'geometry-and-appearance';
 tilePreparation:'public-v1-prepared';original:CombinedOrigin;command:CombinedCommand|null;
 limits:AuthoringLimits;context:AuthoringContext;sourceCapture:CombinedSourceCapture;sourceCaptureDigest:string;
 sourceHostDocumentDigest:string;targetHostDocumentDigest:string;fingerprints:{source:Fingerprints;target:Fingerprints};
 request:PublicRequestSubset<R>|CombinedHistoryOrigin['hostRequest'];constraints:StackConstraints;stackBinding:StackBinding|null;
 targetDocument:WorkbenchDocument<R,B>;resourceRequirements:ResourceRequirements;
 preparationNeed:'prepare-geometry-and-overlay';geometryPreparation:CombinedGeometryObservation<B>;
 historyObservation:HistoryTargetObservation<R,B>|null;workCarry:CombinedPlanProgress;costBounds:CostBounds;
}
export interface CombinedEditPlan3<R=unknown,B=unknown> extends CombinedPlanBase<R,B> {
 arm:'edit';original:CombinedEditOrigin;command:CombinedCommand;request:PublicRequestSubset<R>;
 stackBinding:StackBinding;geometryPreparation:PublicPreparationObservation<B>;historyObservation:null;
}
export interface CombinedHistoryPlan3<R=unknown,B=unknown> extends CombinedPlanBase<R,B> {
 arm:'history';original:CombinedHistoryOrigin;command:null;request:CombinedHistoryOrigin['hostRequest'];
 stackBinding:null;geometryPreparation:StoredHistoryGeometryObservation;historyObservation:HistoryTargetObservation<R,B>;
}
export type CombinedPlan3<R=unknown,B=unknown>=CombinedEditPlan3<R,B>|CombinedHistoryPlan3<R,B>;
export interface CombinedCapacityBound extends Omit<CapacityBound,'kind'|'original'> {
 kind:'nautilus-tile-authoring-combined-capacity-bound';original:CombinedOrigin;planDigest:string;
 geometryPreparationDigest:string;historyTargetObservationDigest:string|null;reservedFinalBindUnits:number;reservedWalUnits:number;
}
export interface CombinedPreparedCapture<B=unknown> extends Omit<PreparedCapture,'kind'|'profiles'|'original'|'capacityBound'|'planningCarry'|'candidateBaseView'|'appearance'> {
 kind:'nautilus-tile-authoring-prepared-combined-capture';profiles:CombinedProfiles;original:CombinedOrigin;
 capacityBound:CombinedCapacityBound;candidateBaseView:NonNullable<PreparedCapture['candidateBaseView']>;
 appearance:Omit<PreparedCapture['appearance'],'mode'|'candidateDigest'>&{mode:'prepared-overlay';candidateDigest:string};
 geometryPreparation:CombinedGeometryObservation<B>;
 planningCarry:CombinedPlanProgress&{afterCapacity:number;afterPreparation:number;finalBindUpperBound:number;walUpperBound:number};
}
export interface CombinedEditInput {document:WorkbenchDocument;command:CombinedCommand;context:AuthoringContext;combinedSource:CombinedSourceCapture<CombinedEditOrigin>;limits?:Partial<AuthoringLimits>}
export interface CombinedHistoryInput {document:WorkbenchDocument;command:null;context:AuthoringContext;combinedSource:CombinedSourceCapture<CombinedHistoryOrigin>;history:HistoryTargetObservation;limits?:Partial<AuthoringLimits>}
/** Warm retention is untrusted DTO observation, never the actual live ticket/leases. */
export interface CombinedWarmRecovery extends Omit<RecoveryRetention,'kind'|'original'> {
 kind:'nautilus-tile-authoring-combined-warm-recovery';original:CombinedOrigin;operationDigest:string;originalTicketDigest:string;
}
export interface CombinedColdRecovery {
 kind:'nautilus-tile-authoring-combined-cold-recovery';version:1;original:CombinedOrigin;operationDigest:string;
 outcome:'unknown';committed:null;writesFrozen:true;knownRequiredUnion:ResourceRef[];unresolvedObligationDigests:string[];
 oldLiveCapabilities:'invalid';historyTopology:'unavailable-session-local';replayAllowed:false;blobGcAllowed:false;
}
/** Proposed PURE calls. No implementation or registration in this checkpoint. */
export declare function planCombinedTileAuthoring(tiles:unknown,input:CombinedEditInput):CombinedEditIntent|Refusal;
/** Host supplies its ONE actual same-connection result. Completion cannot call prepare. */
export declare function completeCombinedTileAuthoringPlan(tiles:unknown,input:{before:WorkbenchDocument;intent:CombinedEditIntent;prepared:unknown}):CombinedEditPlan3|Refusal;
/** Exact stored target, CURRENT Expected, no repair request or Kernel call. */
export declare function planCombinedTileHistory(tiles:unknown,input:CombinedHistoryInput):CombinedHistoryPlan3|Refusal;
export declare function bindCombinedTileAuthoringTarget(tiles:unknown,input:{before:WorkbenchDocument;plan:CombinedEditPlan3;prepared:unknown;combinedCapture:CombinedPreparedCapture}|{before:WorkbenchDocument;plan:CombinedHistoryPlan3;prepared:null;combinedCapture:CombinedPreparedCapture}):AuthoringTarget|Refusal;
/** LIVE PROPOSED SAME-OWNER hook. This is not a DTO or second journal. The
 * implementation must validate owner identity; TypeScript brands are no proof. */
export interface ActualHistoryTicket {action:'undo'|'redo';targetText:string;baseRevision:number;contextKey:string;ordinal:number}
export interface ObservedHistoryHead {
 readonly data:HistoryTargetObservation;isCurrent():boolean;
 /** Check unchanged head/full state/no pending; beginUndo/Redo ONCE; verify real
  * ticket exactly, including observed ordinal+1. Never restamp Expected. */
 claimOnce():ActualHistoryTicket|null;
}
export interface ProposedCombinedHistoryPort {
 observeHead(input:{action:'undo'|'redo';requestId:string;expected:Expected}):ObservedHistoryHead|null;
}
/** History's nineteen returned bindings are EPHEMERAL guards/Review only.
 * Existing durable restore operation remains command:null, authoringBinding:null.
 * Cold settlement deliberately reopens volatile history once, never replays. */
