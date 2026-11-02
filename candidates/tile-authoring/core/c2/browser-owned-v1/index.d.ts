/** PRIVATE headless candidate. All observation DTOs are data, not authority. */
import type * as C0 from '../../../../../packages/tile-authoring-core/index.js';
import type * as Tiles from '../../../../../packages/tiles-core/index.js';
import type * as Strict from '../abi/types.js';
import type * as Surface from '../surface-target.js';
import type {BrowserSourceCapture,BrowserAppearancePlan,BrowserCapacityBound,BrowserPreparedCapture,BrowserAuthoringTarget,BrowserLedger,WorkAmount} from './types.js';
export * from './types.js';
declare const attemptBrand:unique symbol,reservationBrand:unique symbol,ownerBrand:unique symbol;
export type Attempt=Readonly<{[attemptBrand]:true}>;
export type Reservation=Readonly<{[reservationBrand]:true}>;
export type Phase='source'|'planning'|'capacity'|'prepared-data'|'final-bind'|'final-guard'|'cleanup'|'actual-wal';
export type Purpose='authoring'|'outcome-recovery'|'presentation-retry';
export interface WorkSnapshot {kind:'nautilus-browser-attempt-work';version:1;accountingScope:'engine-owned-and-api-logical-only';profileDigest:string;ownerId:string;attemptId:string;requestId:string;purpose:Purpose;phase:string;state:string;sequence:number;sourceDigest:string|null;referenceLimit:number;reference:{charged:number;reserved:number;unresolved:number;conservativeCharged:number};raw:WorkAmount;reservedRaw:WorkAmount;unresolvedRaw:WorkAmount;rawLimits:WorkAmount}
export interface AttemptOwner {
 readonly [ownerBrand]:true;
 begin(input:{source:object;requestId:string;purpose?:Purpose;referenceLimit?:number;rawLimits?:Partial<WorkAmount>}):Attempt;
 reserve(attempt:Attempt,input:{phase:Phase;referenceUnits?:number;raw?:Partial<WorkAmount>;purpose?:'call'|'escrow'}):Reservation;
 reserveRemaining(attempt:Attempt,phase:Phase):Reservation;
 withdrawUnused(attempt:Attempt,reservation:Reservation):void;
 snapshot(attempt:Attempt):Readonly<WorkSnapshot>;
 cancel(attempt:Attempt):void;
 finish(attempt:Attempt,outcome:'refused'|'cancelled'|'unknown'|'settled'):void;
 counterState(source:string):'BOUND'|'UNBOUND';
}
export interface Scope {attempt:Attempt;reservation:Reservation;source:C0.WorkbenchDocument}
export type SourceObservation=Pick<BrowserSourceCapture,'authority'|'sourceResourceRefs'|'resourceLeaseSetDigest'|'ledger'|'visual'|'history'>;
export interface SourceInput {document:C0.WorkbenchDocument;command:C0.Command|null;context:C0.AuthoringContext;observation:SourceObservation;limits?:Partial<C0.AuthoringLimits>;history?:{request:Strict.HistoryOrigin['hostRequest'];targetDocument:C0.WorkbenchDocument;expected:C0.Expected}}
export interface CapacityDataInput {
 checkpoint:{kind:'nautilus-tile-authoring-editor-checkpoint';version:3;document:C0.WorkbenchDocument;journal:{kind:'nautilus-tile-authoring-editor-journal';version:3;serial:number;receipts:unknown[];pending:null}};
 history:{generation:number;stateDigest:string;undo:string[];redo:string[]};
}
export interface BrowserCoreCandidate {
 readonly presentationProfileDigest:string;
 liveBindings():Readonly<{CoreReferenceSink:'BOUND';Host:'UNBOUND';Native:'UNBOUND';Artist:'UNBOUND';Decoder:'UNBOUND';actualCodec:'UNBOUND';publicRepair:'UNBOUND'}>;
 flowBindings():Readonly<Record<'encodedStreamBytes'|'decodedMovementBytes'|'nativeUploadBytes'|'checkpointFlowBytes'|'historyFlowBytes',{unit:'octets';counterBinding:'UNBOUND';observation:null;ceiling:string;mustNotMapTo:string[];sourceCommit:string}>>;
 deriveSurfaceTarget(input:Surface.SurfaceTargetInput,scope:Scope):Surface.SurfaceTargetResult;
 captureSourceData(input:SourceInput,scope:Scope):BrowserSourceCapture;
 plan(source:BrowserSourceCapture,scope:Scope):BrowserAppearancePlan;
 capacity(plan:BrowserAppearancePlan,input:CapacityDataInput,scope:Scope):BrowserCapacityBound;
 validatePreparedData(plan:BrowserAppearancePlan,capacity:BrowserCapacityBound,observations:Omit<BrowserPreparedCapture,'attemptBudget'>,scope:Scope):BrowserPreparedCapture;
 bind(plan:BrowserAppearancePlan,capacity:BrowserCapacityBound,capture:BrowserPreparedCapture,scope:Scope):BrowserAuthoringTarget;
 validateLedgerData(input:{ledger:BrowserLedger;documents:C0.WorkbenchDocument[]},scope:Scope):Readonly<{valid:true;liveAuthority:false}>;
 validateTransitionData(input:{before:BrowserLedger;after:BrowserLedger;requestId:string;documents:C0.WorkbenchDocument[]},scope:Scope):Readonly<{valid:true;liveAuthority:false}>;
 requireLiveBindings():never;
}
export declare function createBrowserAttemptOwner():AttemptOwner;
export declare function createBrowserCoreCandidate(input:{tiles:typeof Tiles;attemptOwner:AttemptOwner;presentationProfile:{id:string;version:number;sourceCommit:string}}):BrowserCoreCandidate;
export declare const PROFILE_DIGEST:string,SCOPE:'engine-owned-and-api-logical-only';
export declare const PROFILES:Readonly<Record<'host'|'appearance'|'ledger'|'accounting'|'decoder'|'sampler'|'clip',string>>;
