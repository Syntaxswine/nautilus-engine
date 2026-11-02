import type {BorrowedWorkbench} from '../c2-host-bridge/bridge.mjs';
import type {PairingRead} from '../c2-read-pairing/adapter.mjs';
export interface SurfaceCallbacks {readonly onView?:(view:PairingRead|null)=>void;readonly onPending?:(pending:boolean)=>void;readonly onError?:(error:unknown)=>void}
export type AttachmentOptions=SurfaceCallbacks&({readonly readAdditionalData?:never;readonly isAdditionalConnectionCurrent?:never;readonly strictCallbackReads?:never}|{readonly readAdditionalData:(view:PairingRead)=>unknown;readonly isAdditionalConnectionCurrent:()=>boolean;readonly strictCallbackReads:true});
export interface SharedAttachment {
 readonly view:PairingRead|null;readonly pending:boolean;
 stage(kind:string,build:(snapshot:PairingRead['snapshot'],view:PairingRead,actualRead:PairingRead)=>unknown):unknown;
 review():unknown;apply():unknown;cancel():unknown;recover():unknown;history(name:'undo'|'redo'|'save'|'open'|'retryPresentation',...args:unknown[]):unknown;
 refresh():PairingRead|null;dispose():void;
}
export interface SharedControllerHub {
 readonly pending:boolean;
 captureResourceDisplay(displayed:PairingRead):Readonly<{read():PairingRead}>;
 attach(binding:BorrowedWorkbench,options?:AttachmentOptions):SharedAttachment;
 isConnectionCurrent():boolean;refresh():PairingRead|null;
 /** UI invocation gate only. The returned one-shot end cannot clear Host debt. */
 beginResourceUI():()=>void;
 diagnostics():Readonly<{controllerCreations:number;liveControllers:0|1;attachments:number;attachmentRevision:number;resourceUIPending:boolean;broken:boolean;closed:boolean}>;
 dispose():void;
}
export function createSharedTileAuthoringController(binding:BorrowedWorkbench,options:{readonly isAdditionalConnectionCurrent:()=>boolean}):SharedControllerHub;
