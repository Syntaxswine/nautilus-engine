/** PRIVATE DESIGN ONLY. No function bodies, exported registry or ready proof.
 * Actual implementation requires source-pinned constructor adapters and one
 * private WeakMap registry. Data/brands alone cannot construct capabilities.
 */
import type * as Data from '../types.js';
import type * as C0 from '../../../../../../packages/tile-authoring-core/index.js';
export type BindingState='UNBOUND'; // This packet implements no adapter.
export type Phase='ingress'|'source'|'history-head'|'history-target'|'obligations'|
 'planning'|'capacity'|'native'|'final-bind'|'final-guard'|'ticket-operation'|
 'pending-wal'|'committed-wal'|'not-committed-wal'|'apply-wal'|'cleanup'|
 'outcome-recovery'|'presentation-retry';
export type KernelSource='host'|'actual-codec'|'history'|'authority'|'session';
export type Movement='encodedStreamBytes'|'encodedSnapshotBytes'|'decodedMovementBytes'|
 'derivedWriteBytes'|'nativeUploadBytes'|'checkpointFlowBytes'|'historyFlowBytes';
export interface Amount {referenceUnits:number;raw:Data.WorkAmount}
export interface ReferenceState {charged:number;reserved:number;unresolved:number;conservativeCharged:number}
export interface Snapshot {readonly ownerId:string;readonly attemptId:string;readonly purpose:'authoring'|'bootstrap'|'presentation'|'outcome-recovery'|'presentation-retry';readonly phase:Phase;readonly state:'opening'|'open'|'failed'|'cancelled'|'unavailable'|'unknown'|'closed';readonly reference:ReferenceState;readonly raw:Data.WorkAmount;readonly reservedRaw:Data.WorkAmount;readonly unresolvedRaw:Data.WorkAmount;readonly movement:Readonly<Record<Movement,number>>}
declare const attemptBrand:unique symbol,leaseBrand:unique symbol,callBrand:unique symbol,opaqueBrand:unique symbol,coverageBrand:unique symbol;
export interface Attempt {readonly [attemptBrand]:true}
export interface PhaseLease {readonly [leaseBrand]:true}
export interface KernelCall {readonly [callBrand]:true}
export interface OpaqueClaim {readonly [opaqueBrand]:true}
/** Issued only by the actual source hook for THIS allocation/tick/copy event. */
export interface CoveredByteEvent {readonly [coverageBrand]:true}
export interface EscrowPlan {
 readonly source:Amount;readonly planning:Amount;readonly capacity:Amount;readonly native:Amount;
 readonly finalBind:Amount;readonly finalGuard:Amount;readonly ticketOperation:Amount;
 readonly pendingWal:Amount;readonly committedWal:Amount;readonly notCommittedWal:Amount;
 readonly applyWal:Amount;readonly cleanup:Amount;
}
/** Root-private coordinator. No report/perform(callback)/registerBackend method.
 * Begin before actual source/history work, using original opaque identity and
 * validated nonempty command control/request identity. No Expected restamp.
 */
export interface CoordinatorOwner {
 beginAuthoring(originalSource:object,originalRequestId:string,limits?:{referenceUnits?:number;raw?:Partial<Data.WorkAmount>}):Attempt;
 reserveCriticalPlan(attempt:Attempt,plan:EscrowPlan):void;
 claimPhase(attempt:Attempt,phase:Phase):PhaseLease;
 bindPaidSource(attempt:Attempt,sourceOwner:object,verifiedDigest:string):void;
 snapshot(attempt:Attempt):Readonly<Snapshot>;
 noteWarmUnknown(attempt:Attempt,originalPending:ActualPendingWal):void;
 finish(attempt:Attempt,outcome:'refused'|'cancelled'|'settled'):void;
 // Recovery starts a distinct non-authoring purpose and never issues edit credit.
 beginReadonly(originalSource:object,purpose:'bootstrap'|'presentation'|'outcome-recovery'|'presentation-retry',persistedOriginalId?:string):Attempt;
 beginColdOutcomeRecovery(originalSource:object,persistedOriginalId:string):Attempt;
 beginKnownCommitRetry(originalSource:object,committedOriginalId:string):Attempt;
}
/** Exact Kernel 4ade3ea protocol; actual same-owner backend remains UNBOUND.
 * Args/results are opaque until paid inspection. begin claims EXISTING lease;
 * nested parent is a private same-attempt member, never a fresh allowance.
 * Exact fixed entry/site allowlists must come from the reviewed source bodies.
 */
export interface KernelObservationBackend {
 begin(name:string,parent:KernelCall|null,args:readonly unknown[]):KernelCall;
 visit(call:KernelCall,path:string,level:number):void;
 text(call:KernelCall,value:string):void;
 key(call:KernelCall,value:string):void;
 beforeOpaque(call:KernelCall,site:string,input:unknown):OpaqueClaim;
 afterOpaque(call:KernelCall,claim:OpaqueClaim,result:unknown):void;
 failOpaque(call:KernelCall,claim:OpaqueClaim,error:unknown):void;
 complete(call:KernelCall,value:unknown):void;
 fail(call:KernelCall,error:unknown):void;
}
/** Internal Artist source hooks, minted at its constructor/source sites, NEVER
 * handed to a user/JSONL consumer. No returned snapshot is a settlement input.
 * take maps only to global normalized + raw artistPreparationTicks; the local
 * legacy authoringReferenceUnits alias does not enter the global Core raw field.
 */
export interface ArtistSourceWork {
 check():void;
 take(actualLocalDelta:number):void;
 bytes(actualByteWorkOctets:number):CoveredByteEvent;
 metadataCopy(actualMetadataOctets:number):void;
 metadataBoundary(kind:'inputBytes'|'outputBytes'|'hostNodeVisits',actual:number):void;
 decoderTick(actualTicks:number):CoveredByteEvent;
 coveredMovement(kind:'encodedSnapshotBytes'|'decodedMovementBytes'|'derivedWriteBytes',actualOctets:number,coverage:CoveredByteEvent):void;
 encodedStream(actualOctets:number):void;
 nativeUploadBefore(actualLogicalOctets:number):OpaqueClaim;
 nativeUploadAfter(claim:OpaqueClaim):void;
 nativeUploadFailed(claim:OpaqueClaim,error:unknown):void;
 complete():void;
 fail(error:unknown):void;
}
/** No numeric caller report/callback binding exists in the consumer surface.
 * Actual source modules construct these backend/work closures with the SAME
 * owner's private registry and already reserved phase/cleanup lease.
 */
export interface SourceAdapterFactoryPlan {
 readonly state:BindingState;
 readonly fixedCoreContinuationRequired:true;
 readonly fixedKernelAdapterPairingRequired:true;
 readonly fixedArtistPairedContinuationRequired:true;
 // Expected constructor shapes; not executable factories in this packet.
 kernel:{owner:CoordinatorOwner;phase:PhaseLease;source:KernelSource};
 artist:{owner:CoordinatorOwner;phase:PhaseLease;cleanup:PhaseLease;purpose:'authoring'};
}
declare const factBrand:unique symbol,headBrand:unique symbol,targetBrand:unique symbol,obligationsBrand:unique symbol,checkpointBrand:unique symbol,planBrand:unique symbol,capacityBrand:unique symbol,ticketBrand:unique symbol,walBrand:unique symbol;
export interface OwnedDocumentFact {
 readonly [factBrand]:true;
 readonly data:Readonly<{documentDigest:string;encodedBytes:number;nodes:number;depth:number;resourceRefsDigest:string}>;
 // Actual codec factory owns exact immutable record/text and full ResourceRefs.
}
export interface ActualCheckpoint {readonly [checkpointBrand]:true}
export interface OwnedSelectedTarget {readonly [targetBrand]:true;readonly data:Readonly<{action:'undo'|'redo';generation:number;inspectionDigest:string;targetDocumentJSON:string;targetDocumentDigest:string}>}
export interface OwnedResourceObligations {readonly [obligationsBrand]:true;readonly data:Readonly<{requiredUnion:readonly C0.ResourceRef[];unionDigest:string;historyRedoPendingDigest:string;exportDigest:string}>}
export interface HeadData {
 readonly kind:'nautilus-editor-live-history-inspection';readonly version:1;
 readonly generation:number;readonly revision:number;readonly contextKey:string;
 readonly currentDocumentDigest:string;readonly currentDocumentBytes:number;
 readonly undo:Readonly<{entries:number;encodedBytes:number;head:{documentDigest:string;encodedBytes:number}|null}>;
 readonly redo:Readonly<{entries:number;encodedBytes:number;head:{documentDigest:string;encodedBytes:number}|null}>;
 readonly pendingTicket:boolean;readonly limits:{maxEntries:number;maxBytes:number;maxDocumentBytes:number};readonly stateDigest:string;
}
export interface OwnedJournalHead {
 readonly [headBrand]:true;readonly data:Readonly<HeadData>;
 isCurrent(sameAttempt:Attempt):boolean;
 copySelected(sameAttempt:Attempt):OwnedSelectedTarget|null; // once; exact one actual target
 scanObligations(sameAttempt:Attempt):OwnedResourceObligations; // paid cache lookups/union or paid full miss scan
 matchesOwnedTicket(sameAttempt:Attempt,ticket:ActualTicket,exactTargetText:string):boolean;
}
/** Same actual journal instance; never a second journal or full-history DTO. */
export interface ActualJournalReadPort {
 inspectLive(input:{action:'edit'|'undo'|'redo'},sameAttempt:Attempt):OwnedJournalHead;
 noteAccepted(sameAttempt:Attempt):void;
}
export interface OwnedCorePlan {readonly [planBrand]:true;readonly data:Data.BrowserAppearancePlan}
export interface OwnedCapacity {readonly [capacityBrand]:true;readonly data:Data.BrowserCapacityBound}
export interface ActualTicket {readonly [ticketBrand]:true}
export interface ActualPendingWal {readonly [walBrand]:true}
/** New PRIVATE continuation of Core capacity entry; not ed66.capacity().
 * Each token must be an actual producer WeakMap member in the same owner.
 * The exposed counts/digests/refs never establish ownership by equality.
 */
export interface ActualCapacityAdapter {
 readonly state:BindingState;
 beforeNative(input:{plan:OwnedCorePlan;source:ActualCheckpoint;sourceFact:OwnedDocumentFact;head:OwnedJournalHead;selected:OwnedSelectedTarget|null;obligations:OwnedResourceObligations},phase:PhaseLease):OwnedCapacity;
 // Source-bound v3 upper envelope before acquisition; no future ticket or WAL.
 validateActualWal(input:{capacity:OwnedCapacity;head:OwnedJournalHead;ticket:ActualTicket;pending:ActualPendingWal},phase:{pending:PhaseLease;committed:PhaseLease;notCommitted:PhaseLease}):void;
 // The one actual ticket is original ordinal+1 and same exact pending operation.
}

/** Actual Kernel privateWork constructor entry. The actual observer bridge is
 * registered by the fixed source adapter in the SAME owner; it is not accepted
 * from a caller numeric work DTO. Readonly purposes never mint authoring plans.
 */
export interface ContinuedSourcePorts {
 readonly version:1;
 readonly observation:object; // exact registered Kernel bridge identity
 validateSource(deps:Readonly<{tiles:typeof import('../../../../../../packages/tiles-core/index.js')}>,input:{document:C0.WorkbenchDocument;subject:C0.Pin|C0.Source},scope:{observer:object}):Readonly<{kind:'nautilus-tile-authoring-requirements';version:1;subjectDigest:string;requiredProfiles:string[];requiredResources:C0.Pin[];unavailable:C0.Diagnostic[]}>;
 documentFacts:{
  read(document:C0.WorkbenchDocument,scope:{observer:object;documentDigest:string}):OwnedDocumentFact;
  verify(fact:OwnedDocumentFact,exactJournalDocumentText:string):boolean;
 };
}
// Implementation must distinguish purpose in its private registry: validateSource
// and paid documentFacts are available for bootstrap/presentation/recovery AND
// authoring; plan/capacity/bind remain authoring-only. No C1Budget/fallback, no
// provisional authoring IDs, no plan minted merely to validate a readonly source.
// A pre-command UI may use the accepted bounded standalone0597 readonly query
// with zero edit credit. Actual session.prepare uses its real ID and pays/reruns
// that exact surface derivation inside its actual authoring attempt.
