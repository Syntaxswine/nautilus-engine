/** DESIGN AMENDMENT ONLY. No meter/counter/codec implementation or public API.
 * Every brand requires its actual private owner map; DTO IDs/counts are not proof.
 */
import type {WorkbenchDocument,Expected} from '../../../../packages/tile-authoring-core/index.js';
export type WorkPhase = 'ingress' | 'source' | 'history-head' | 'history-target' |
  'obligations' | 'planning' | 'capacity' | 'native' | 'final-bind' |
  'ticket-operation' | 'actual-wal' | 'apply-wal' | 'final-guard' | 'cleanup';
export type CounterSource = 'host-reader' | 'history-reader' | 'authoring-kernel' |
  'public-kernel' | 'native-provider' | 'decoder' | 'actual-codec';
/** Independent domains. Never sum/convert these quantities into a scalar unit. */
export interface WorkAmount {
  authoringReferenceUnits:number; artistPreparationTicks:number; decoderTicks:number;
  publicSteps:number; publicSpatialTests:number; publicGeometryEvaluations:number;
  inputBytes:number; outputBytes:number; hostNodeVisits:number; copyBytes:number;
}
export interface WorkCeilings extends WorkAmount {}
export interface WorkSourceBinding {
  sourceCheckpointToken:string; authorityContextToken:string;
  historyGeneration:number; historyHeadDigest:string;
}
/** Each named domain tightens its own declared cap; there is no scalar sum or
 * exchange rate. Existing Core/Host/object and physical-resource caps also apply.
 */
export interface AttemptWorkSnapshot {
  kind:'nautilus-editor-c2-attempt-work'; version:1;
  domainProfile:'c2-separated-work-domains-v1';
  attemptId:string; ownerId:string; scope:'prepare'|'restore';
  route:'one-existing-mark-opacity-v1'|'restore-only-v1';
  effectiveLimitsDigest:string; limits:Readonly<WorkCeilings>;
  source:Readonly<WorkSourceBinding>|null;
  state:'opening'|'open'|'failed'|'cancelled'|'unavailable'|'unknown'|'closed';
  phase:WorkPhase; sequence:number;
  charged:Readonly<WorkAmount>; reserved:Readonly<WorkAmount>; unresolved:Readonly<WorkAmount>;
  unavailableCounter:CounterSource|null;
}
export interface WorkReservationRequest {
  phase:WorkPhase; counterSource:CounterSource;
  upper:WorkAmount; purpose:'call'|'escrow';
}
export interface ReservationData {
  domainProfile:'c2-separated-work-domains-v1';
  attemptId:string; reservationId:string; phase:WorkPhase;
  counterSource:CounterSource; upper:Readonly<WorkAmount>;
}
declare const reservationBrand:unique symbol;
export interface OwnedWorkReservation {
  readonly [reservationBrand]:true;
  readonly data:Readonly<ReservationData>;
}
export interface CounterObservation {
  kind:'nautilus-editor-c2-work-observation'; version:1;
  domainProfile:'c2-separated-work-domains-v1';
  attemptId:string; reservationId:string; callId:string;
  phase:WorkPhase; counterSource:CounterSource;
  before:Readonly<WorkAmount>; actual:Readonly<WorkAmount>; after:Readonly<WorkAmount>;
  outcome:'returned'|'refused'|'threw-with-report';
}
declare const counterBrand:unique symbol;
export interface OwnedCounterObservation {
  readonly [counterBrand]:true;
  readonly data:Readonly<CounterObservation>;
}
declare const operationBrand:unique symbol;
/** Minted ONLY by a paired counter backend for the actual invocation. It is not
 * an arbitrary callback, a predicted cost, or a second algorithm/codec.
 * Its live counter must claim bounds BEFORE reads/copies/allocations and report
 * actual incremental work, UTF-8 input and emitted bytes, including throw paths.
 */
export interface OwnedCountedOperation<T> {
  readonly [operationBrand]:T;
  readonly counterSource:CounterSource;
  readonly phase:WorkPhase;
  readonly execution:'sync';
}
declare const asyncOperationBrand:unique symbol;
export interface OwnedAsyncCountedOperation<T> {
  readonly [asyncOperationBrand]:T;
  readonly counterSource:CounterSource;
  readonly phase:WorkPhase;
  readonly execution:'async';
}
export interface CountedResult<T> {
  readonly value:T;
  /** Already consumed once by perform; reusing it does not issue editing credit. */
  readonly observation:OwnedCounterObservation;
  readonly after:Readonly<AttemptWorkSnapshot>;
}
declare const workBrand:unique symbol;
export interface AttemptWorkPort {
  readonly [workBrand]:true;
  readonly attemptId:string;
  snapshot():Readonly<AttemptWorkSnapshot>;
  /** Uses private entry-snapshot ownership, not equality to client counters. */
  verifyEntry(snapshot:Readonly<AttemptWorkSnapshot>):boolean;
  isCurrent():boolean;
  counterState(source:CounterSource):'bound'|'unbound';
  reserve(input:Readonly<WorkReservationRequest>):OwnedWorkReservation;
  /** Claims an already held critical continuation escrow for THIS intrinsic
   * phase/call. Transfer, not new credit; cannot be spent by a native call.
   */
  claimEscrow(operation:OwnedCountedOperation<unknown>|OwnedAsyncCountedOperation<unknown>):OwnedWorkReservation;
  /** Serial; validates ownership/attempt/source/phase, claims before allocation,
   * consumes one actual report, releases unused allowance. No report means
   * terminal unavailable + unresolved reservation, NEVER actual=upper or zero.
   */
  perform<T>(reservation:OwnedWorkReservation, operation:OwnedCountedOperation<T>):CountedResult<T>;
  performAsync<T>(reservation:OwnedWorkReservation, operation:OwnedAsyncCountedOperation<T>):Promise<CountedResult<T>>;
  /** Only an unused, never-started ordinary call reservation may be withdrawn;
   * coordinator-held critical escrows/claims remain pinned until use or finish.
   */
  withdrawUnused(reservation:OwnedWorkReservation):void;
}
declare const ownerBrand:unique symbol;
/** One private owner inside the SAME coordinator. No public factory/constructor
 * or profile/JSONL entry can mint it. Begin BEFORE any attempt source/history
 * inspection/hash/copy/parse/serialization or hook-DTO construction.
 */
export interface CoordinatorWorkOwner {
  readonly [ownerBrand]:true;
  begin(input:{ownerId:string;scope:'prepare'|'restore';effectiveLimitsDigest:string;
    route:'one-existing-mark-opacity-v1'|'restore-only-v1';
    limits:Readonly<WorkCeilings>}, originalSource:object):AttemptWorkPort;
  /** Once only, after counted capture; originalSource is the exact source object
   * retained before reading it. There is no rebind/limit-reset operation.
   */
  bindSource(work:AttemptWorkPort, source:Readonly<WorkSourceBinding>, originalSource:object):void;
  finish(work:AttemptWorkPort,input:{outcome:'refused'|'cancelled'|'unknown'|'settled'}):void;
}
declare const checkpointBrand:unique symbol;
declare const hostOperationBrand:unique symbol;
export interface ActualCheckpoint {readonly [checkpointBrand]:true}
export interface ActualHostOperation {readonly [hostOperationBrand]:true}
export interface CountedSourcePort {
  readonly profile:'actual-authority-source-counter-v1';
  counterState():'bound'|'unbound';
  /** Includes actual authority/codec reads and any parse/hash/copy/serialization
   * needed for this attempt. Cached facts require actual owned identity reuse;
   * they cannot be inferred merely from a matching client digest.
   */
  captureActualSource(input:{before:ActualCheckpoint},scope:{work:AttemptWorkPort;
    reservation:OwnedWorkReservation;signal:AbortSignal;isCurrent():boolean}):CountedResult<{
      checkpoint:ActualCheckpoint;checkpointJSON:string;checkpointToken:string;
      journalDigest:string;document:WorkbenchDocument;expected:Expected;
    }>;
}
/** Proposed observer over the ACTUAL existing codec, not a shadow validator.
 * Includes stage validation, strict reads/hash/copies/escaping/UTF-8 sizing and
 * serialization of the COMPLETE real prospective WAL. No writer is borrowed.
 */
export interface CountedCodecPort {
  readonly profile:'actual-shared-codec-counter-v1';
  counterState():'bound'|'unbound';
  validateActualWal(input:{before:ActualCheckpoint;operation:ActualHostOperation},
    scope:{work:AttemptWorkPort;reservation:OwnedWorkReservation;signal:AbortSignal;
      isCurrent():boolean}):CountedResult<{
        pending:{checkpoint:ActualCheckpoint;checkpointJSON:string};
        committed:{checkpoint:ActualCheckpoint;checkpointJSON:string};
        notCommitted:{checkpoint:ActualCheckpoint;checkpointJSON:string};
        operationDigest:string;
      }>;
}
/** Public preparation has no existing accepted counter capability here. A
 * proposed adapter may execute its ONE actual owned call only when paired.
 * Missing/overflowing/opaque reports terminate; there is no retry/reset method.
 */
export interface CountedPublicKernelPort {
  readonly profile:'actual-public-kernel-counter-v1';
  counterState():'bound'|'unbound';
  prepare<T>(actualCall:OwnedCountedOperation<T>,scope:{work:AttemptWorkPort;
    reservation:OwnedWorkReservation;signal:AbortSignal;isCurrent():boolean}):CountedResult<T>;
}
