/** PRIVATE candidate; no public export, Host/native/Editor adoption or authority. */
import type {ExistingC1Read,C2Read,Projection,OverlayPorts,ThumbnailPresentation,OverlayCommand} from '../../../../docs/reviews/tile-authoring/ui/c2/projection/projection.js';
export interface BorrowedWorkbench<C1View extends ExistingC1Read,Hit,Thumbnail> {
  readonly service: {readonly [K in 'describe'|'snapshot'|'query'|'prepare'|'apply'|'cancel'|'recover']: (...args:any[])=>unknown};
  readonly getSnapshot:()=>C2Read<C1View>;
  readonly subscribe:(listener:(read:C2Read<C1View>)=>void)=>()=>void;
  readonly collectCommand:(command:OverlayCommand)=>unknown;
  readonly discardDraft:()=>unknown;
  readonly overlayPorts:OverlayPorts<C1View,Hit,Thumbnail>;
}
export interface CoordinatorCallbacks<C1View extends ExistingC1Read> {
  readonly onView:(read:C2Read<C1View>|null)=>void;
  readonly onPending:(pending:boolean)=>void;
  readonly onError:(error:unknown)=>void;
  /** Added finite comparison; C1 action/source guards must all remain. */
  readonly readAdditionalData:(read:C2Read<C1View>)=>Projection;
  /** Retire on changes to existing workbench/service plus added port identities. */
  readonly isAdditionalConnectionCurrent:()=>boolean;
  /** Required behavior, not an attestation or capability flag. */
  readonly strictCallbackReads:true;
}
export interface BorrowedCoordinator<C1View extends ExistingC1Read> {
  readonly stage:(action:string,build:(snapshot:C1View['snapshot'],view:C2Read<C1View>,raw:C2Read<C1View>)=>OverlayCommand)=>Promise<unknown>;
  readonly review:()=>Promise<unknown>;
  readonly apply:()=>Promise<unknown>;
  readonly cancel:()=>Promise<unknown>;
  readonly recover:()=>Promise<unknown>;
  readonly refresh:()=>C2Read<C1View>|null;
  /** Detach this panel only; preserve the existing central coordinator/C1/service. */
  readonly dispose:()=>void;
}
export interface CanvasInput<Hit> {
  readonly subscribeSelection:(listener:(hit:Hit)=>void)=>()=>void;
  /** Existing gesture owner handles Escape/blur/invalidation/capture loss and all-up. */
  readonly cancelUntilAllUp:(reason:string)=>void;
}
export interface Options<C1View extends ExistingC1Read,Hit,Thumbnail> {
  /** Root-supplied existing coordinator with the reviewed opt-in seam; no fallback. */
  readonly attachCoordinator?:((binding:BorrowedWorkbench<C1View,Hit,Thumbnail>,callbacks:CoordinatorCallbacks<C1View>)=>BorrowedCoordinator<C1View>)|null;
  readonly thumbnailPresentation?:ThumbnailPresentation<Thumbnail>|null;
  readonly canvasInput?:CanvasInput<Hit>|null;
  readonly onError?:(error:unknown)=>void;
}
export interface C2OverlayUI<Hit> {
  readonly element:HTMLElement;
  readonly refresh:()=>unknown;
  readonly acceptCanvasSelection:(hit:Hit)=>unknown;
  /** Stops this mount's listeners/subscriptions/attachments, never borrowed owners. */
  readonly dispose:()=>void;
}
export declare function mountC2OverlayUI<C1View extends ExistingC1Read,Hit,Thumbnail>(container:HTMLElement,binding:BorrowedWorkbench<C1View,Hit,Thumbnail>,options?:Options<C1View,Hit,Thumbnail>):C2OverlayUI<Hit>;
