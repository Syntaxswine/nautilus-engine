import type {SetupConfiguration,SetupContent,ContentIdentity,SetupProvider,SetupRegistration,SetupReceipt,SetupValidation,SetupConnection,OwnedWorldCheckpoint} from './index.js';
import type {ConfirmedActorPose,NativePoseCheckpoint} from '../native-actors/index.js';
import type {NativeActorRoot,SharedNativeRenderer,NativeFootSupport} from '../native-actors/three.js';
import type {PlayerUI,PlayerIntent,CameraProvider,HudBounds} from '../player-ui/index.js';
import type {TrainConnector} from '../train-core/index.js';
import type {VehicleYard} from '../vehicle-core/index.js';
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
/** Borrows one car authority/world, host frame source and renderer. */
export function retainVehicleYard(options:{host:VehicleYard;content:ContentIdentity;surface:SetupSurface;clock:Pick<RetainedFrameSource,'subscribe'>;setUIPaused(blocked:boolean):void;camera?:CameraProvider;onHudBounds?:(bounds:HudBounds)=>void;id?:string}):SetupProvider;
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
  /** Optional, borrowed, render-only authoritative foot-height binding. */
  footSupport?:NativeFootSupport;
  /** Reviewed runtime-core lifecycle factories; serialized metadata stays in registry. */
  factories?:Record<string,(context:unknown)=>{services:Record<string,unknown>;prepare?:(context:unknown)=>void|Promise<void>;start?:()=>void|Promise<void>;stop?:()=>void|Promise<void>;dispose?:()=>void|Promise<void>}>;
}
export function mountPlayerSetup(container:HTMLElement,options:SetupMountOptions):Promise<PlayerSetup>;

/** Explicit optional native profile. Legacy setup/configuration/checkpoints stay v1. */
export interface CrawlNativeProfile {id:'nautilus-native-goat-crawl-v1';version:1;equipment:'hands'|'rifle';surface:{kind:'flat-plane';floorId:'floor-0';heightM:0}}
export interface CrawlSetupConfiguration extends Omit<SetupConfiguration,'version'> {version:2;nativeProfile:CrawlNativeProfile}
export interface CrawlSetupCheckpoint {kind:'nautilus-crawl-player-setup-checkpoint';version:1;configuration:CrawlSetupConfiguration;ownedWorld:null;native:import('../native-actors/crawl.js').NativeCrawlCheckpoint;clock:{elapsedSeconds:number;blocked:boolean}|null}
export type CrawlSetupIntent=Exclude<PlayerIntent,{type:'configuration'}>|{version:1;type:'configuration';configuration:CrawlSetupConfiguration};
export interface CrawlSetupValidation extends Omit<SetupValidation,'configuration'> {configuration:CrawlSetupConfiguration|null}
export interface CrawlPlayerSetup extends Omit<PlayerSetup,'readConfiguration'|'validate'|'applyConfiguration'|'restoreCheckpoint'|'dispatch'|'read'|'checkpoint'> {
  readConfiguration():CrawlSetupConfiguration;validate(input:unknown):CrawlSetupValidation;
  applyConfiguration(input:CrawlSetupConfiguration|string,options?:{signal?:AbortSignal}):Promise<SetupReceipt>;
  restoreCheckpoint(input:CrawlSetupCheckpoint|string,options?:{signal?:AbortSignal}):Promise<SetupReceipt>;
  dispatch(intent:CrawlSetupIntent):SetupReceipt|Promise<SetupReceipt>;
  read():Omit<ReturnType<PlayerSetup['read']>,'configuration'|'actor'|'native'>&{configuration:CrawlSetupConfiguration;actor:import('../native-actors/crawl.js').ConfirmedCrawlSample;native:import('../native-actors/crawl.js').NativeCrawlCheckpoint};
  checkpoint():CrawlSetupCheckpoint;
}
export interface CrawlSetupMountOptions extends Omit<SetupMountOptions,'configuration'|'checkpoint'|'footSupport'|'factories'|'registry'> {configuration:CrawlSetupConfiguration;checkpoint?:CrawlSetupCheckpoint|string}
export const CRAWL_SETUP_PORTS:typeof import('./index.js').SETUP_PORTS;
export function createCrawlSetupConfiguration(options:{content:ContentIdentity;actorId?:string;model?:'goat';trains?:false;title?:boolean;vehicles?:false;equipment?:'hands'|'rifle';surface?:CrawlNativeProfile['surface']}):CrawlSetupConfiguration;
export function validateCrawlPlayerSetup(input:unknown,options?:{providers?:readonly SetupProvider[];content?:{identity:ContentIdentity}}):CrawlSetupValidation;
/** Owns crawler preparation/restore through the existing setup.actor lifecycle.
 * Host stages the matching complete world/pose before mounting; no borrowed
 * native provider, foot support or custom actor factory is accepted. */
export function mountCrawlPlayerSetup(container:HTMLElement,options:CrawlSetupMountOptions):Promise<CrawlPlayerSetup>;
