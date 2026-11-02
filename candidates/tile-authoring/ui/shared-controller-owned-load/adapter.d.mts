import type {BorrowedWorkbench} from '../c2-host-bridge/bridge.mjs';
import type {CompleteRead,ConstructorPorts} from '../c2-host-bridge/ports.js';
import type {Basis,C2Read,OverlayPorts,Pin,Diagnostic} from '../c2-host-bridge/vendor/ui057/projection.js';
declare const leaseIdentity:unique symbol;
export type SelectedLease={readonly[leaseIdentity]:true};
export type PairingRead<R=unknown,B=unknown>=C2Read<CompleteRead<R,B>>;
declare const resourceObservationIdentity:unique symbol;
declare const producerObservationIdentity:unique symbol;
export interface ResourceReadObservation {readonly[resourceObservationIdentity]:true}
export interface ProducerReadObservation {readonly[producerObservationIdentity]:true}
/** Actual producer-private source/context/lifetime facts for the original issued
 * read. The final visitor calls no getter, currentness predicate or source port. */
export interface ProducerFinalReadOwner<Source,Read> {
 capture(originalScope:Source,actualBaseRead:Read):ProducerReadObservation;
 visit<T>(ticket:ProducerReadObservation,originalScope:Source,actualBaseRead:Read,visit:(actualBaseRead:Read)=>T):T;
}
/** A single-use, same adapter/bridge/source observation. Runtime WeakMaps, not
 * copied DTO data, authenticate reads and tickets. This grants no editing work. */
export interface FinalReadOwner<Read> {
 capture(actualIssuedRead:Read):ResourceReadObservation;
 visit<T>(ticket:ResourceReadObservation,actualIssuedRead:Read,visit:(actualIssuedRead:Read)=>T):T;
}

export interface PairingOptions<Source,R=unknown,B=unknown> {
 readonly bridgePorts?:Omit<Partial<ConstructorPorts<PairingRead<R,B>,Source,SelectedLease,R,B>>,'selectedBytesBinding'|'sourceOwner'>&{readonly sourceOwner?:ConstructorPorts<PairingRead<R,B>,Source,SelectedLease,R,B>['sourceOwner']&{readonly finalReadOwner?:ProducerFinalReadOwner<Source,CompleteRead<R,B>>|null}};
 readonly reader?:{open(blob:Readonly<{sha256:string;byteLength:number}>,options:{signal:AbortSignal}):AsyncIterable<Uint8Array>}|null;
 readonly byteLimits?:Readonly<Record<string,number>>;
}
export interface PairingAdapter<R=unknown,B=unknown> {
 readonly binding:BorrowedWorkbench<R,B>&{readonly overlayPorts:OverlayPorts<CompleteRead<R,B>,unknown,unknown>;readonly resourceReadOwner?:FinalReadOwner<PairingRead<R,B>>|null};
 readonly resourceReadOwner:FinalReadOwner<PairingRead<R,B>>|null;
 getSnapshot():PairingRead<R,B>;
 readonly overlayPorts:OverlayPorts<CompleteRead<R,B>,unknown,unknown>;
 acquireSelected(actualIssuedRead:PairingRead<R,B>,options?:{readonly signal?:AbortSignal}):Promise<Readonly<{status:'verified';basis:Basis;artwork:Pin;bytes:SelectedLease}>|Readonly<{status:'refused';basis:Basis;diagnostics:readonly Diagnostic[]}>>;
 readonly leaseOwner:{isByteScopeCurrent(bytes:SelectedLease):boolean;observeByteScope(bytes:SelectedLease):Readonly<{basis:Basis;artwork:Pin;sourceDigest:string;editingWorkCredit:0}>;release(bytes:SelectedLease):Readonly<{releasedReference:true;physicalReclamation:'UNMEASURED'}>;diagnostics():Readonly<{native:false;browserWideMeter:'UNBOUND';leaseReferences:number}>};
 isConnectionCurrent():boolean;
 cancelPendingPreparation(read:PairingRead<R,B>):Readonly<{cancelled:boolean;code?:string;message?:string}>;
 dispose():void;
}
export function createC2ReadPairingAdapter<Source=object,R=unknown,B=unknown>(workbench:BorrowedWorkbench<R,B>,options?:PairingOptions<Source,R,B>):PairingAdapter<R,B>;
