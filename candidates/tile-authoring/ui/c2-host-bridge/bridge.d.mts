import type {CompleteRead,ConstructorPorts,SelectedArtworkOwner,DeepRead} from './ports.js';
import type {C2Read,OverlayPorts,Pin,Basis} from './vendor/ui057/projection.js';
export interface BorrowedWorkbench<R=unknown,B=unknown> {
 readonly service:Readonly<Record<'describe'|'snapshot'|'query'|'prepare'|'apply'|'cancel'|'recover',(...args:never[])=>unknown>>;
 getSnapshot():CompleteRead<R,B>; subscribe(fn:(read:CompleteRead<R,B>)=>void):()=>void;
 collectCommand(command:unknown):unknown;discardDraft():unknown;allocateIds(...args:never[]):unknown;
 readonly borrowedFloorController:unknown;readonly borrowedInputOwner:unknown;readonly borrowedResourcePorts:unknown;readonly history:unknown;
}
export interface Bridge<Source,Capability,Hit,Thumbnail,R=unknown,B=unknown> {
 getSnapshot():C2Read<CompleteRead<R,B>>;
 readonly overlayPorts:OverlayPorts<CompleteRead<R,B>,Hit,Thumbnail>;
 readonly sourceOwner:{resolve(read:C2Read<CompleteRead<R,B>>):object|null;observe(scope:object):Readonly<{basis:Basis;document:DeepRead<CompleteRead<R,B>['snapshot']['document']>;sourceGeneration:number;ownerLifetimeId:string;contextId:string;contextEpoch:number;mutationEpoch:number}>;isCurrent(scope:object):boolean};
 pairBuiltinOwner<Attempt>(owner:SelectedArtworkOwner<C2Read<CompleteRead<R,B>>,Attempt,Capability>):void;
 subscribe(fn:(read:C2Read<CompleteRead<R,B>>)=>void):()=>void;
 cancelPendingPreparation(read:C2Read<CompleteRead<R,B>>):Readonly<{cancelled:boolean;code?:string;message?:string}>;
 dispose():void;
}
export type BridgeOptions<Source,Capability,Hit,Thumbnail,R=unknown,B=unknown>=Partial<ConstructorPorts<C2Read<CompleteRead<R,B>>,Source,Capability,R,B>>&{
 input?:{resolve(actualBorrowedInput:unknown,hit:Hit,source:Source):{selection:import('./vendor/ui057/projection.js').SelectionChoice}}|null;
 thumbnail?:{resolve(read:C2Read<CompleteRead<R,B>>,pin:Pin):ReturnType<OverlayPorts<CompleteRead<R,B>,Hit,Thumbnail>['resolveVerifiedThumbnail']>}|null;
};
export function createC2HostBridge<Source=object,Capability=object,Hit=unknown,Thumbnail=unknown,R=unknown,B=unknown>(workbench:BorrowedWorkbench<R,B>,options?:BridgeOptions<Source,Capability,Hit,Thumbnail,R,B>):Bridge<Source,Capability,Hit,Thumbnail,R,B>;
