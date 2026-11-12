import type {NativeModel,NativeRole,NativeMotion,NativeActorSpec,NativePoseCheckpoint,ConfirmedActorPose} from './index.js';
export {nativeActor,nativeActorResources} from './index.js';
/** Runtime additionally requires an instance from Nautilus's shared Three entry. */
export interface SharedNativeRenderer {readonly isWebGLRenderer:boolean}
export interface NativeActorRoot {visible:boolean;readonly isObject3D:boolean;removeFromParent():unknown}
export interface NativeActorView {
  readonly root:NativeActorRoot;readonly spec:NativeActorSpec;
  updateConfirmed(pose:ConfirmedActorPose,options?:{settle?:boolean}):{actorId:string;distanceM:number;heading:number;role:'idle'|'walk';visible:boolean};
  checkpoint():NativePoseCheckpoint;
  /** Staging starts inactive. Activation does not issue a game command. */
  setActive(active:boolean):void;
  dispose():void;
}
export function prepareNativeActor(options:{renderer:SharedNativeRenderer;actorId:string;model?:NativeModel;roles?:readonly NativeRole[];motion?:NativeMotion;checkpoint?:NativePoseCheckpoint;signal?:AbortSignal;resourceURL?:(packageURL:string)=>string;fetchResource?:typeof fetch}):Promise<NativeActorView>;
