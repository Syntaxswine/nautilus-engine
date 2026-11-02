/** PRIVATE C2 ABI. New ephemeral DTO schema/profile, never persisted v3/Operation/Review.
 * Stage A pure implementation only; live Host/provider integration remains Root-owned.
 * Every DTO is untrusted data. Only Host-held live capabilities can authorize.
 */
import type {Command,Expected,ResourceRef,ImageBlob,CostBounds,AuthoringContext,
 WorkbenchDocument,StackConstraints,Bindings,AuthoringLimits} from '../../../../../packages/tile-authoring-core/index.js';
export type Id=string; // canonical <=96, same fixed432 ID grammar
export type Digest=string; // lower-case SHA256, 64 hex
export type Count=number; // nonnegative safe integer, existing governing caps apply
export type AllocationTotals=Pick<CostBounds,'declaredDecodedAllocationBytes'|
 'residentMarksAllViews'|'rootsAllViews'|'trianglesAllViews'|'cellsAllViews'|
 'ownedAppearanceMaterialsAllViews'|'contributorsPerBin'|'binReferencesAllViews'|
 'derivedBufferBytesAllViews'|'atlasPagesAllViews'>;
export interface EditOrigin {
 action:'edit';requestId:Id;commandDigest:Digest;expected:Expected;
 hostRequest:{id:Id;kind:'nautilus-tile-authoring-source-unchanged';version:1};
}
export interface HistoryOrigin {
 action:'undo'|'redo';requestId:Id;commandDigest:Digest;expected:Expected;
 hostRequest:{id:Id;kind:'smart-tile-history-restore';action:'undo'|'redo';targetDocumentDigest:Digest};
}
/** History expected is an ephemeral CURRENT source observation; command is null.
 * The existing persisted history request/action/target digest are unchanged. */
export type Origin=EditOrigin|HistoryOrigin;
export interface AuthorityObservation {
 hostAuthorityToken:Digest;authorityContextToken:Digest;presentationProfileDigest:Digest;
 floorId:Id;mode:'manual'|'character-follow'|'contact-inspection';floorEpoch:Count;
 providerTokenDigest:Digest;resourceContextEpoch:Count;geometryContextEpoch:Count;
 rendererContextId:Id;rendererContextEpoch:Count;
}
export interface VisualObservation {
 acceptedViewIdentityDigest:Digest;presentationStateDigest:Digest;retirementDebtDigest:Digest;
}
export interface PhysicalAllocation {
 allocationId:Id;contextId:Id;contextEpoch:Count;purpose:'base-image'|'artwork-image'|'encoded-blob'|'upload-staging'|
 'decoder-scratch'|'derived-uniforms'|'geometry-buffer';
 storage:'cpu'|'native'|'gpu'|'encoded-store';
 charge:'baseline-visible'|'encoded'|'decoded-additional'|'derived'|'geometry-governed';
 chargedBytes:Count;byteBasis:'exact'|'reserved-upper-bound';sampledAtlas:boolean;
 blobSha256:Digest|null;state:'live'|'acquiring'|'retiring-unverified'|'retired-verified';
 ownerRequestId:Id|null;referenceIds:Id[];retirementReceiptDigest:Digest|null;
}
export interface MaterialObservation {
 materialId:Id;state:'live'|'cache-idle'|'acquiring'|'retiring-unverified'|'retired-verified';
 ownerRequestId:Id|null;referenceIds:Id[];retirementReceiptDigest:Digest|null;
}
export interface GeometryViewObservation {
 viewId:Id;role:'accepted'|'candidate'|'retiring';
 state:'live'|'acquiring'|'retiring-unverified'|'retired-verified';
 identityBasis:'owned-reservation'|'actual-native';
 ownerRequestId:Id|null;geometryLeaseId:Id;geometryEpoch:Count;
 bundleDigest:Digest;geometrySourceDigest:Digest;geometryObjectsDigest:Digest|null;
 roots:Count;triangles:Count;cells:Count;visible:boolean;
 geometryAllocationIds:Id[];materialIds:Id[];retirementReceiptDigest:Digest|null;
}
export interface GeometryObservation {
 geometryLeaseSetDigest:Digest;geometryObjectsDigest:Digest;
 views:GeometryViewObservation[];
 rootsAllViews:Count;trianglesAllViews:Count;cellsAllViews:Count;
}
export interface OwnedCandidateBaseView extends GeometryViewObservation {
 role:'candidate';identityBasis:'actual-native';ownerRequestId:Id;
 geometryObjectsDigest:Digest;
 projectionProfile:'public-canonical-flat-tile-art-v1';projectionDigest:Digest;
 retirementOwnerRequestId:Id;
 retirementProfile:'owned-candidate-base-retirement-v1';
}
/** Capacity bound only. No operation, receipt, review, ticket or write permission. */
export interface CapacityBound {
 kind:'nautilus-tile-authoring-capacity-bound';version:1;committable:false;
 original:Origin;sourceCheckpointToken:Digest;targetHostDocumentDigest:Digest;
 sourceJournalDigest:Digest;sourceHistoryGeneration:Count;sourceHistoryStateDigest:Digest;
 governingLimitsDigest:Digest;
 limits:{checkpointBytes:16000000;historyBytes:16000000;checkpointNodes:1000000;
 checkpointDepth:40;receipts:128;historyEntries:64;coreInputBytes:6000000;
 coreOutputBytes:4000000;coreNodes:200000;coreDepth:32;plannerUnits:1000000};
 upperBounds:{walBytes:Count;historyBytes:Count;checkpointNodes:Count;
 checkpointDepth:Count;historyEntries:Count;receipts:Count};
 work:{chargedBefore:Count;chargeThisPhase:Count;chargedAfter:Count};
}
export interface LedgerObservation {
 sequence:Count;scopeDigest:Digest;preservedObjectsDigest:Digest;
 geometry:GeometryObservation;allocations:PhysicalAllocation[];materials:MaterialObservation[];
 residency:{viewId:Id;ownerId:Id;markIds:Id[]}[];
 bins:{contributorsPerBin:Count;binReferencesAllViews:Count};
 totals:AllocationTotals;
}
export interface C2Profiles {
 host:'nautilus-tile-authoring-c2-host-v1';
 appearance:'owner-local-rectangle-appearance-v1';ledger:'owned-appearance-transition-v1';
 decoder:'png-rgba8-srgb-straight-v1';sampler:'linear-premultiplied-bilinear-frame-v1';
 clip:'candidate.level-rectangle-top-v1';
}
export interface SourceCapture {
 kind:'nautilus-tile-authoring-appearance-source-capture';version:1;
 profiles:C2Profiles;original:Origin;authority:AuthorityObservation;
 sourceResourceRefs:ResourceRef[];resourceLeaseSetDigest:Digest;
 ledger:LedgerObservation;visual:VisualObservation;
 history:{journalDigest:Digest;generation:Count;stateDigest:Digest};
}
export interface EncodedNeed {blob:ImageBlob;consumers:ResourceRef[]}
export interface DecodeNeed {
 blobSha256:Digest;decoderProfile:'png-rgba8-srgb-straight-v1';
 consumers:ResourceRef[];
}
export interface ResourceRequirements {
 sourceResourceRefs:ResourceRef[];targetResourceRefs:ResourceRef[];
 introduced:ResourceRef[];retained:ResourceRef[];released:ResourceRef[];
 encodedNeeds:EncodedNeed[];decodeNeeds:DecodeNeed[];
 declaredEncodedRequirementBytes:Count;
}
export interface Fingerprints {geometry:Digest;appearance:Digest}
export interface AppearancePlan {
 kind:'nautilus-tile-authoring-plan';version:2;ok:true;committable:false;
 route:'appearance-only';tilePreparation:'source-unchanged';original:Origin;
 command:Command|null;limits:AuthoringLimits;context:AuthoringContext;sourceCapture:SourceCapture;sourceCaptureDigest:Digest;
 sourceHostDocumentDigest:Digest;targetHostDocumentDigest:Digest;
 fingerprints:{source:Fingerprints;target:Fingerprints};
 request:null;constraints:StackConstraints;targetDocument:WorkbenchDocument;
 resourceRequirements:ResourceRequirements;
 preparationNeed:'encoded-only-retain-appearance'|'prepare-overlay';
 costBounds:CostBounds;
}
export interface OwnedLedgerStep {
 eventId:Id;action:'acquire'|'admit'|'retire-verified'|'retire-unverified';
 ownerRequestId:Id;ledger:LedgerObservation;
}
export interface PreparedCapture {
 kind:'nautilus-tile-authoring-prepared-appearance-capture';version:1;
 profiles:C2Profiles;original:Origin;planDigest:Digest;sourceCaptureDigest:Digest;
 authority:AuthorityObservation;
 sourceResourceRefs:ResourceRef[];targetResourceRefs:ResourceRef[];
 resourceRequirements:ResourceRequirements;
 sourceResourceLeaseSetDigest:Digest;admittedResourceLeaseSetDigest:Digest;
 sourceGeometry:GeometryObservation;admittedGeometry:GeometryObservation;
 candidateBaseView:OwnedCandidateBaseView|null;capacityBound:CapacityBound;
 planningCarry:{sourceCharged:Count;afterCapacity:Count;afterPreparation:Count;finalBindUpperBound:Count};
 encodedAvailability:{blobSha256:Digest;blobDescriptorDigest:Digest;verificationDigest:Digest;encodedLeaseId:Id}[];
 decodedObservations:{blobSha256:Digest;decoderProfile:'png-rgba8-srgb-straight-v1';
  verificationDigest:Digest;imageInterpretationDigest:Digest;pixelDigest:Digest;resourceContextEpoch:Count;allocationIds:Id[]}[];
 appearance:{mode:'retain-existing'|'prepared-overlay';receiptDigest:Digest;
  presentedRequirementsDigest:Digest;sourceVisual:VisualObservation;candidateDigest:Digest|null};
 ledgerTrace:OwnedLedgerStep[];peakTotals:AllocationTotals;
 sampledSharing:{allocationId:Id;contextId:Id;contextEpoch:Count;
 sourceReferenceIds:Id[];admittedReferenceIds:Id[];providerObservationDigest:Digest}[];
 unresolvedAllocationIds:Id[];costBounds:CostBounds;
}
export interface RecoveryRetention {
 kind:'nautilus-tile-authoring-c2-recovery-retention';version:1;
 original:Origin;outcome:'unknown';committed:null;writesFrozen:true;
 recoveryRequestId:Id;sourceResourceRefs:ResourceRef[];targetResourceRefs:ResourceRef[];
 requiredUnion:ResourceRef[];historyRedoPendingRefsDigest:Digest;
 historyRedoPendingResourceRefs:ResourceRef[];exportResourceRefs:ResourceRef[];
 retainedEncodedLeaseIds:Id[];retainedAppearanceLeaseIds:Id[];retainedGeometryLeaseIds:Id[];
 candidateBaseView:OwnedCandidateBaseView|null;retainedLedger:LedgerObservation;unverifiedAllocationIds:Id[];
}
export interface CandidateRetirementObservation {
 kind:'nautilus-tile-authoring-candidate-retirement';version:1;original:Origin;
 failedAt:'final-pure-bind'|'final-wal-validation';sourceCheckpointUnchanged:true;
 durableWrites:0;historyTicketState:'not-created'|'rejected';
 sourceGeometry:GeometryObservation;candidateBaseView:OwnedCandidateBaseView;
 outcome:'verified'|'unverified';retirementReceiptDigest:Digest|null;
 restoredAcceptedViewIdentityDigest:Digest;retainedSourceDebtDigest:Digest;
 finalRetirementDebtDigest:Digest;finalLedger:LedgerObservation;
}
/** Reuse unchanged C0 Bindings; resourceLeaseSetDigest/allocationLedgerDigest name
 * the actually admitted preparation on C2. No new C0 binding fields.
 * C0 Review remains version1 with tilePreparation:'source-unchanged' here.
 * C1 source-unchanged plans remain version1 and require G+A+resource equality.
 */
export interface ProposedCoreC2EditArguments {
 document:WorkbenchDocument;command:Command;context:AuthoringContext;
 appearanceSource:SourceCapture;limits?:Partial<AuthoringLimits>;
}
export interface ProposedCoreC2HistoryArguments {
 document:WorkbenchDocument;command:null;context:AuthoringContext;
 appearanceSource:SourceCapture;limits?:Partial<AuthoringLimits>;
 history:{request:HistoryOrigin['hostRequest'];targetDocument:WorkbenchDocument};
}
export type ProposedCoreC2Arguments=ProposedCoreC2EditArguments|ProposedCoreC2HistoryArguments;
export interface ProposedCoreC2BindArguments {
 before:WorkbenchDocument;plan:AppearancePlan;prepared:null;appearanceCapture:PreparedCapture;
}
/** LIVE PROPOSED PORTS, not DTO schemas, not methods on remote JSONL service.
 * These are Host-to-owned-provider hooks, never persisted/serialized capabilities.
 * Final concrete interface is to be reconciled with Editor/Artist by Root.
 */
declare const liveBrand:unique symbol;
export interface OwnedSourceLease {readonly [liveBrand]:'source';readonly data:SourceCapture;
 isCurrentBefore():boolean}
export interface OwnedAppearancePreparation {readonly [liveBrand]:'appearance';
 readonly data:PreparedCapture;isCurrent():boolean;
 retireUnadopted():Promise<{candidateViewId:Id|null;retirementOwnerRequestId:Id;verified:boolean;receiptDigest:Digest|null;remainingCharges:AllocationTotals}>}
export interface ProposedBorrowedAppearancePorts {
 captureAppearanceSource(input:{document:WorkbenchDocument;original:Origin}):OwnedSourceLease;
 capacityOnly(input:{source:OwnedSourceLease;plan:AppearancePlan}):CapacityBound;
 prepareAppearance(input:{source:OwnedSourceLease;plan:AppearancePlan;capacity:CapacityBound;current:()=>boolean;
  signal:AbortSignal}):Promise<OwnedAppearancePreparation>;
 admitAppearance(input:{source:OwnedSourceLease;prepared:OwnedAppearancePreparation;
  plan:AppearancePlan;acceptedView:unknown}):PreparedCapture;
 validateAppearanceCommit(input:{source:OwnedSourceLease;prepared:OwnedAppearancePreparation;
  plan:AppearancePlan;capture:PreparedCapture}):boolean;
}
/** Core does not implement these live ports or call decoder/renderer/storage.
 * No import in this file is a proposed runtime provider dependency. */
