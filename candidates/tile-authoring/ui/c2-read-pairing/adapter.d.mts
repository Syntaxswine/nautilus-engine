import type {BorrowedWorkbench} from '../c2-host-bridge/bridge.mjs';
import type {CompleteRead,ConstructorPorts} from '../c2-host-bridge/ports.js';
import type {Basis,C2Read,OverlayPorts,Pin,Diagnostic} from '../c2-host-bridge/vendor/ui057/projection.js';
declare const leaseIdentity:unique symbol;
export type SelectedLease={readonly[leaseIdentity]:true};
export type PairingRead<R=unknown,B=unknown>=C2Read<CompleteRead<R,B>>;
export interface PairingOptions<Source,R=unknown,B=unknown> {
 readonly bridgePorts?:Omit<Partial<ConstructorPorts<PairingRead<R,B>,Source,SelectedLease,R,B>>,'selectedBytesBinding'>;
 readonly reader?:{open(blob:Readonly<{sha256:string;byteLength:number}>,options:{signal:AbortSignal}):AsyncIterable<Uint8Array>}|null;
 readonly byteLimits?:Readonly<Record<string,number>>;
}
export interface PairingAdapter<R=unknown,B=unknown> {
 readonly binding:BorrowedWorkbench<R,B>&{readonly overlayPorts:OverlayPorts<CompleteRead<R,B>,unknown,unknown>};
 getSnapshot():PairingRead<R,B>;
 readonly overlayPorts:OverlayPorts<CompleteRead<R,B>,unknown,unknown>;
 acquireSelected(actualIssuedRead:PairingRead<R,B>,options?:{readonly signal?:AbortSignal}):Promise<Readonly<{status:'verified';basis:Basis;artwork:Pin;bytes:SelectedLease}>|Readonly<{status:'refused';basis:Basis;diagnostics:readonly Diagnostic[]}>>;
 readonly leaseOwner:{isByteScopeCurrent(bytes:SelectedLease):boolean;observeByteScope(bytes:SelectedLease):Readonly<{basis:Basis;artwork:Pin;sourceDigest:string;editingWorkCredit:0}>;release(bytes:SelectedLease):Readonly<{releasedReference:true;physicalReclamation:'UNMEASURED'}>;diagnostics():Readonly<{native:false;browserWideMeter:'UNBOUND';leaseReferences:number}>};
 isConnectionCurrent():boolean;
 cancelPendingPreparation(read:PairingRead<R,B>):Readonly<{cancelled:boolean;code?:string;message?:string}>;
 dispose():void;
}
export function createC2ReadPairingAdapter<Source=object,R=unknown,B=unknown>(workbench:BorrowedWorkbench<R,B>,options?:PairingOptions<Source,R,B>):PairingAdapter<R,B>;
