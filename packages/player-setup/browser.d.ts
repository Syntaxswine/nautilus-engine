import type {SetupConfiguration,SetupContent,ContentIdentity,SetupProvider,SetupRegistration,SetupReceipt,SetupValidation,SetupConnection,OwnedWorldCheckpoint} from './index.js';
import type {ConfirmedActorPose,NativePoseCheckpoint} from '../native-actors/index.js';
import type {NativeActorRoot,SharedNativeRenderer} from '../native-actors/three.js';
import type {PlayerUI,PlayerIntent,CameraProvider,HudBounds} from '../player-ui/index.js';
import type {TrainConnector} from '../train-core/index.js';
export {createSetupConfiguration,bindSetupProvider,flatYardContent,validatePlayerSetup} from './index.js';
export interface FramePhase {phase:'before'|'after';seconds:number;blocked:boolean}
export interface RetainedFrameSource {subscribe(fn:(event:FramePhase)=>void):()=>void;beforeStep(seconds:number,blocked?:boolean):void;afterStep(seconds:number,blocked?:boolean):void}
export interface SetupSurface {
  renderer:SharedNativeRenderer;scene:{add(root:NativeActorRoot):unknown};camera:object;canvas:HTMLCanvasElement;element?:HTMLElement;
  resize?():unknown;draw?():void;
}
export interface RetainedTrainHost {connector:TrainConnector;walk(x:number,y:number,seconds:number):unknown;readonly actors:readonly {id:string;revision:number;health:number;ap:number}[]}
export function createRetainedFrameSource():RetainedFrameSource;
/** Borrows existing authority, time, rendering and saves. It does not own a host disposer. */
export function retainTrainYard(options:{host:RetainedTrainHost;content:ContentIdentity;surface:SetupSurface;clock:Pick<RetainedFrameSource,'subscribe'>;setUIPaused(blocked:boolean):void;camera?:CameraProvider;onHudBounds?:(bounds:HudBounds)=>void;id?:string}):SetupProvider;
export interface SetupCheckpoint {kind:'nautilus-player-setup-checkpoint';version:1;configuration:SetupConfiguration;ownedWorld:OwnedWorldCheckpoint|null;native:NativePoseCheckpoint;clock:{elapsedSeconds:number;blocked:boolean}|null}
export type SetupIntent=Exclude<PlayerIntent,{type:'configuration'}>|{version:1;type:'configuration';configuration:SetupConfiguration};
export interface PlayerSetup {
  readonly initialReceipt:Readonly<SetupReceipt>;readonly ui:PlayerUI;
  readConfiguration():SetupConfiguration;validate(input:unknown):SetupValidation;
  applyConfiguration(input:SetupConfiguration|string,options?:{signal?:AbortSignal}):Promise<SetupReceipt>;
  restoreCheckpoint(input:SetupCheckpoint|string,options?:{signal?:AbortSignal}):Promise<SetupReceipt>;
  connectionInspector():SetupConnection[];
  dispatch(intent:SetupIntent):SetupReceipt|Promise<SetupReceipt>;
  readActions():ReturnType<PlayerUI['readActions']>;readControls():ReturnType<PlayerUI['readControls']>;
  read():{configuration:SetupConfiguration;actor:ConfirmedActorPose;native:NativePoseCheckpoint;camera:{settings:{mode:'follow'|'overview';zoom:number};bounds:HudBounds|null}|null;screenPoint:{x:number;y:number};sharedOwnedProviders:number};
  /** Owned default clock only; a retained clock remains host-driven. */
  step(seconds:number):void;checkpoint():SetupCheckpoint;dispose():Promise<{ok:boolean;errors:unknown[]}>;
}
export interface SetupMountOptions {
  configuration?:SetupConfiguration;content:SetupContent|{identity:ContentIdentity;world?:{widthM:number;depthM:number}};
  providers?:readonly SetupProvider[];registry?:readonly SetupRegistration[];checkpoint?:SetupCheckpoint|string;signal?:AbortSignal;autoClock?:boolean;
  resourceURL?:(packageURL:string)=>string;onError?:(error:unknown,context:{phase:string})=>void;onConfigurationChange?:(configuration:SetupConfiguration)=>void;
  /** Reviewed runtime-core lifecycle factories; serialized metadata stays in registry. */
  factories?:Record<string,(context:unknown)=>{services:Record<string,unknown>;prepare?:(context:unknown)=>void|Promise<void>;start?:()=>void|Promise<void>;stop?:()=>void|Promise<void>;dispose?:()=>void|Promise<void>}>;
}
export function mountPlayerSetup(container:HTMLElement,options:SetupMountOptions):Promise<PlayerSetup>;
