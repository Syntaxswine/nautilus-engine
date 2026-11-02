/** DESIGN ONLY. No factory, runtime implementation, registration or new saved fields.
 * The proposed property is supplied only on the existing private frozen profile.
 * Runtime capability ownership must use private owner maps, never these TS brands
 * or serialized DTO equality as authority. All named object arguments/results are
 * closed own-data records; exact keys are part of the proposal, beyond TS typing.
 */
import type {
  Command, Expected, Bindings, WorkbenchDocument, ResourceRef, AuthoringContext,
  AuthoringTarget, Diagnostic,
} from '../../../../packages/tile-authoring-core/index.js';
import type {
  AppearancePlan, SourceCapture, PreparedCapture, CapacityBound, RecoveryRetention,
  AllocationTotals, LedgerObservation, GeometryViewObservation,
} from './references/core-c2-types.js';
import type {AttemptWorkPort, AttemptWorkSnapshot} from './work.js';
export type * from './work.js';

export type Id = string;
export type Digest = string;
export type Count = number;
export type RO<T> = {readonly [K in keyof T]: T[K] extends (...a: never[]) => unknown
  ? T[K] : T[K] extends object ? RO<T[K]> : T[K]};

/** New proposed read-only method on the EXISTING journal, not another journal.
 * Bounded head/metadata only. No all-history text arrays or ticket/ordinal change.
 * generation is the existing private ordinal, not the document contentRevision.
 */
export interface LiveHistoryInspection {
  kind: 'nautilus-editor-live-history-inspection'; version: 1;
  generation: Count; revision: Count; contextKey: string;
  currentDocumentDigest: Digest; currentDocumentBytes: Count;
  undo: {entries:Count;encodedBytes:Count;head:HistoryHeadMetadata|null};
  redo: {entries:Count;encodedBytes:Count;head:HistoryHeadMetadata|null};
  stateDigest: Digest;
  pendingTicket: boolean;
  limits: {maxEntries: 64; maxBytes: 16000000; maxDocumentBytes: 16000000};
}
export interface ProposedJournalReadPort {
  inspectLive(input:{action:'edit'|'undo'|'redo'},work:AttemptWorkPort):OwnedHistoryHead;
}
export interface HistoryHeadMetadata {documentDigest:Digest;encodedBytes:Count}
declare const headBrand:unique symbol;
export interface OwnedHistoryHead {
  readonly [headBrand]:true;
  readonly data:RO<LiveHistoryInspection>;
  isCurrent(work:AttemptWorkPort):boolean;
  /** At most ONE selected target copied under the same pre-existing meter;
   * edit has no selected target. Never starts beginUndo/Redo or copies stacks.
   */
  copySelected(work:AttemptWorkPort):RO<HistorySelection>|null;
}
export interface HistorySelection {
  action: 'undo' | 'redo'; generation: Count; inspectionDigest: Digest;
  targetDocumentJSON: string; targetDocumentDigest: Digest;
}
export interface ResourceObligations {
  document: readonly ResourceRef[]; target: readonly ResourceRef[];
  persistedReceipts: readonly ResourceRef[]; pending: readonly ResourceRef[];
  liveUndoRedo: readonly ResourceRef[]; inFlightExports: readonly ResourceRef[];
}
export interface SourceState {
  checkpointJSON: string; checkpointToken: Digest; journalDigest: Digest;
  document: WorkbenchDocument; expected: Expected;
  history: LiveHistoryInspection & {pendingTicket: false};
  historyInspectionDigest: Digest; obligations: ResourceObligations;
}
/** First work-enabled Plan2 design route only. Canonical C0 grammar is unchanged.
 * Actual source comparison additionally requires ONLY opacity to change on one
 * existing unlocked ungrouped mark, with all pins/targets/resources unchanged.
 */
export type SmallOpacityCommand = Omit<Command,'operations'> & {
  operations:[Extract<Command['operations'][number],{kind:'decoration.update'}>];
};
export type HistoryPrepareInput<A extends 'undo' | 'redo'> = {
  kind: 'nautilus-editor-c2-phase-prepare'; version: 1;
  action: A; requestId: Id; source: SourceState;
  workAtEntry: AttemptWorkSnapshot;
  context: AuthoringContext; command: null;
  historySelection: HistorySelection & {action: A};
};
export type PrepareInput = {
  kind: 'nautilus-editor-c2-phase-prepare'; version: 1;
  action: 'edit'; requestId: Id; source: SourceState; context: AuthoringContext;
  workAtEntry: AttemptWorkSnapshot;
  command: SmallOpacityCommand; historySelection: null;
} | HistoryPrepareInput<'undo'> | HistoryPrepareInput<'redo'>;

/** Observable application-owned capacities. No numeric estimate of opaque storage.
 * Frozen Core DTOs are unchanged; this is an adjacent diagnostic/admission gate.
 */
export interface StorageCoverageBase {
  kind: 'nautilus-editor-c2-storage-coverage'; version: 1;
  scope: 'application-owned-allocations';
  observed: {
    cpuBackingStores: 'enumerated'; encodedStores: 'enumerated';
    textureRequests: 'context-identity-and-requested-capacity';
    geometryBuffers: 'context-identity-and-requested-capacity';
    applicationUploadStaging: 'enumerated' | 'unbound';
    materialsAndIdleCaches: 'enumerated' | 'unbound';
  };
  opaque: {
    browserDecodeInternals: 'unattested'; driverTextureInternals: 'unattested';
    driverUploadInternals: 'unattested';
  };
}
export type StorageCoverage = StorageCoverageBase & (
  {admission: 'unbound'; pairingDecisionDigest: null} |
  {admission: 'paired-application-scope'; pairingDecisionDigest: Digest;
    observed: StorageCoverageBase['observed'] & {
      applicationUploadStaging: 'enumerated'; materialsAndIdleCaches: 'enumerated';
    }}
);
export interface PhaseRefusalBase {
  kind: 'nautilus-editor-c2-phase-refusal'; version: 1; ok: false;
  target: null; realTicketsCreated: 0; realOperationsCreated: 0; durableWrites: 0;
  diagnostics: readonly Diagnostic[]; cleanup: CleanupObservation;
  work: AttemptWorkSnapshot;
}
export type WorkUnavailableRefusal = PhaseRefusalBase & {
  scope:'prepare';requestId:Id;resourceScopeId:null;pendingRequestId:null;stage:'work';
  diagnostics:readonly [Diagnostic & {code:'C2_ATTEMPT_COUNTER_UNAVAILABLE'|
    'C2_WORK_DOMAIN_MAPPING_UNAVAILABLE'|'C2_SMALL_PLAN2_ROUTE_UNAVAILABLE'},...Diagnostic[]];
};
export type PhaseRefusal = (PhaseRefusalBase & (
  {scope: 'prepare'; requestId: Id; resourceScopeId: null; pendingRequestId: null;
    stage: 'capture' | 'capacity' | 'native' | 'admit' | 'bind'} |
  {scope: 'restore'; requestId: null; resourceScopeId: Id; pendingRequestId: Id | null;
    stage: 'restore'}
)) | WorkUnavailableRefusal;
export interface CleanupObservation {
  kind: 'nautilus-editor-c2-phase-cleanup'; version: 1;
  /** Original request for preparation; resourceScopeId for restoration. */
  ownerId: Id; outcome: 'verified' | 'unverified' | 'nothing-acquired';
  receiptDigest: Digest | null; remainingLedgerDigest: Digest;
  remainingCharges: AllocationTotals; borrowedResourcesDisposed: false;
}
export interface PreparedPhaseData {
  kind: 'nautilus-editor-c2-phase-prepared'; version: 1; ok: true;
  requestId: Id; action: 'edit' | 'undo' | 'redo';
  sourceCheckpointToken: Digest; sourceHistoryInspectionDigest: Digest;
  sourceHistoryGeneration: Count; sourceCapture: SourceCapture;
  workAfterBind: AttemptWorkSnapshot;
  capacity: CapacityBound; plan: AppearancePlan; capture: PreparedCapture;
  bound: AuthoringTarget & {tilePreparation: 'source-unchanged'};
  coverage: StorageCoverage;
  realTicketsCreated: 0; realOperationsCreated: 0; durableWrites: 0;
}
export interface NativeRequest {
  /** Original request for prepare, resourceScopeId for restore; never an edit. */
  ownerId: Id; bundle: WorkbenchDocument['tileBundle'];
  projectionProfile: 'public-canonical-flat-tile-art-v1';
}
declare const nativeBrand: unique symbol;
export interface OwnedNativeCandidate {
  readonly [nativeBrand]: true;
  /** Borrowed private record already tracked by the one existing view manager.
   * Artist bridge must use THIS object, not construct an uncounted second root.
   */
  readonly record: object; readonly view: object;
  readonly observation: RO<GeometryViewObservation>;
}
export interface NativeReadiness {
  viewBridge: 'unbound' | 'paired'; finalCapture: 'unbound' | 'paired';
  uploadOwner: 'unbound' | 'paired'; coverage: RO<StorageCoverage>;
}
export interface PrepareScope {
  readonly signal: AbortSignal;
  /** Created by the coordinator BEFORE SourceState/history/DTO preparation. */
  readonly work: AttemptWorkPort;
  /** Source/authority-mutation-free predicate; payload checks are charged to
   * this same attempt (nested checks use the active counted call). Captures
   * original generation/context, live
   * authority/storage/source/history and provider/native/resource identities.
   * It cannot mint a new source, token, ticket or replacement request ID.
   * The coordinator alone may recognize its ONE exact real ticket and then
   * its exact pending WAL as owned transitions; original captured digests stay
   * unchanged. A foreign ticket/ordinal/pending change is never admitted.
   */
  isCurrent(): boolean;
  readonly native: {
    readiness(): RO<NativeReadiness>;
    /** Delegates the SINGLE existing views.acquire; no external record adoption.
     * Recheck currentness after attach/added observers and all awaits.
     */
    acquireCandidate(input: RO<NativeRequest>,work:AttemptWorkPort): Promise<OwnedNativeCandidate>;
  };
}
export interface CommitCheck {
  requestId: Id; sourceCheckpointToken: Digest; authorityContextToken: Digest;
  operationJSON: string; pendingCheckpointJSON: string;
  targetDocumentDigest: Digest; bindings: Bindings;
  workAtCommit: AttemptWorkSnapshot;
}
declare const outcomeBrand: unique symbol;
/** Created privately by the SAME coordinator after inspecting its actual
 * authority outcome. No JSONL/DTO can create this capability.
 */
export interface CoordinatorOutcome {
  readonly [outcomeBrand]: true;
  readonly requestId: Id;
  readonly outcome: 'committed' | 'not-committed' | 'unknown';
  readonly checkpointToken: Digest | null;
}
export interface OutcomeInput {
  requestId: Id; obligations: ResourceObligations;
  /** True only after this coordinator has accepted its actual history ticket.
   * Cold receipt inspection is false: it must not invent an old live ticket.
   */
  liveHistoryAccepted: boolean;
}
export interface OwnershipResult {
  requestId: Id; state: 'adopted' | 'retained-unknown' | 'unadopted';
  retention: RecoveryRetention | null;
  /** Only the coordinator promotes/cancels the actual manager record. Cleanup
   * ownership is transferred synchronously before callbacks; debt remains charged.
   */
  cleanup: Promise<RO<CleanupObservation>>;
}
declare const preparedBrand: unique symbol;
export interface OwnedPreparedPhase {
  readonly [preparedBrand]: true;
  readonly data: RO<PreparedPhaseData>;
  /** Exact same object as PrepareScope.work; kept through ticket and real WAL. */
  readonly work: AttemptWorkPort;
  readonly native: {kind: 'retain-existing'; candidate: null} |
    {kind: 'replace-owned'; candidate: OwnedNativeCandidate};
  isCurrent(): boolean;
  /** Synchronous, no callbacks, acquisition, writes, ticket creation or new
   * binding. Composes with the EXISTING final CAS/context/unchanged-source guards.
   */
  validateCommit(input: RO<CommitCheck>): boolean;
  /** Sync ownership transition; async retirement is represented by cleanup.
   * Unknown retains all obligations; only a later actual same-ID outcome settles.
   */
  onOutcome(input: RO<OutcomeInput>, actual: CoordinatorOutcome): OwnershipResult;
  /** Allowed only before staging, or after proved not-committed. Idempotent;
   * never retires a potentially adopted unknown candidate or durable blob.
   */
  retireUnadopted(input: {requestId: Id; reason: 'cancelled' | 'stale' | 'wal-refused' |
    'ticket-refused' | 'disposed-before-stage'}): Promise<RO<CleanupObservation>>;
}

/** No command, fake Origin, operation or history ticket is manufactured to load.
 * Actual checkpoint contains retained receipts/pending; they are never rewritten.
 */
export interface RestoreInput {
  kind: 'nautilus-editor-c2-phase-restore'; version: 1;
  reason: 'boot' | 'reopen' | 'retry-presentation' | 'recovery-settled';
  resourceScopeId: Id; checkpointJSON: string; checkpointToken: Digest;
  workAtEntry: AttemptWorkSnapshot;
  document: WorkbenchDocument; journalDigest: Digest;
  history: LiveHistoryInspection; obligations: ResourceObligations;
  pendingRequestId: Id | null;
}
export interface RestoreScope {
  readonly signal: AbortSignal;
  readonly work: AttemptWorkPort;
  isCurrent(): boolean;
  readonly native: PrepareScope['native'];
}
export interface RestoredPhaseData {
  kind: 'nautilus-editor-c2-phase-restored'; version: 1; ok: true;
  resourceScopeId: Id; checkpointToken: Digest; documentDigest: Digest;
  pendingRequestId: Id | null;
  authorityState: 'settled' | 'recovery-required';
  ledger: LedgerObservation; coverage: StorageCoverage;
  workAfterRestore: AttemptWorkSnapshot;
  realTicketsCreated: 0; realOperationsCreated: 0; durableWrites: 0;
}
declare const restoredBrand: unique symbol;
export interface OwnedRestoredPhase {
  readonly [restoredBrand]: true;
  readonly data: RO<RestoredPhaseData>;
  readonly work: AttemptWorkPort;
  readonly candidate: OwnedNativeCandidate;
  isCurrent(): boolean;
  /** Releases only this restoration scope. Persisted receipts/pending/export or
   * other live leases keep their independent bytes and unverified allocations.
   */
  release(input: {resourceScopeId: Id; reason: 'replaced' | 'cancelled' | 'disposed'}):
    Promise<RO<CleanupObservation>>;
}
export interface C2PhasePorts {
  readonly kind: 'nautilus-editor-c2-phase-ports'; readonly version: 1;
  prepare(input: RO<PrepareInput>, scope: PrepareScope):
    Promise<OwnedPreparedPhase | RO<PhaseRefusal>>;
  restore(input: RO<RestoreInput>, scope: RestoreScope):
    Promise<OwnedRestoredPhase | RO<PhaseRefusal>>;
}
/** Shape amendment only on the existing private profile argument. It is not a
 * new createSmartTileSession argument, factory, constructor default or export.
 */
export interface ProposedPrivateProfileExtension {
  readonly c2PhasePorts: Readonly<C2PhasePorts>;
}
