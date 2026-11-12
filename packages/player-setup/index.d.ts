import type {NativeModel,ConfirmedActorPose} from '../native-actors/index.js';
export type JSONData=null|boolean|number|string|JSONData[]|{[key:string]:JSONData};
export interface ContentIdentity {id:string;version:number;sourcePin:string}
export interface SetupPort {id:string;service:{id:string;version:number};direction:'input'|'output';role:'request'|'confirmed-state'|'committed-event';schema:string;units:string;frame:string;cardinality:'one';ownership:string;lifetime:'composition';required:boolean}
export interface SetupSetting {id:string;label:string;type:'enum'|'boolean'|'number';default:string|number|boolean;change:'live'|'pause'|'restart';values?:readonly string[];min?:number;max?:number;step?:number;units?:string}
export interface SetupComponent {id:string;version:1;label:string;ports:readonly SetupPort[];settings:readonly SetupSetting[];guide:string;usageCard:string}
export type SetupComponentID='player.shell'|'player.walking'|'player.trains'|'player.vehicles'|'player.camera'|'player.title'|'setup.runtime'|'setup.actor';
export interface SetupConfiguration {
  kind:'nautilus-player-setup';version:1;engine:{package:string;version:string;sourcePin:string};content:ContentIdentity;actorId:string;
  components:Array<{id:SetupComponentID;version:1;settings:Record<string,string|number|boolean>}>;bindings:Record<string,string>;
}
export interface SetupProvider {descriptor:{id:string;version:number;ports:readonly SetupPort[]};services:Record<string,unknown>}
export interface SetupRegistration {id:string;version:number;provides:SetupPort[];requires:SetupPort[];ownership:string}
export interface SetupDiagnostic {code:string;path:string;message:string;action:string}
export interface SetupConnection {componentPort:SetupPort;providerId:string;providerPort:SetupPort;ownership:string}
export interface RuntimeConfiguration {
  version:1;selected:string[];bindings:Record<string,string>;
  modules:Array<{id:string;version:number;provides:Array<{id:string;version:number}>;requires:Array<{id:string;minVersion:number;maxVersion:number}>}>;
  hosts:Array<{id:string;version:number;provides:Array<{id:string;version:number}>}>;
}
export interface SetupValidation {ok:boolean;errors:SetupDiagnostic[];configuration:SetupConfiguration|null;compiled:RuntimeConfiguration|null;plan:{order:string[];hosts:Array<{id:string;[key:string]:unknown}>;[key:string]:unknown}|null;connections:SetupConnection[]}
export interface SetupContent {
  kind:'nautilus-player-content';version:1;identity:ContentIdentity;
  world:{id:string;name:string;widthM:number;depthM:number;floorCount:number;storyHeightM:number;groundHeightM:number;heightM:number};
  surfaces:JSONData[];interactions:{doors:JSONData[];stairs:JSONData[]};actors:JSONData[];
  resources:Record<string,Record<string,JSONData>>;appearance:{ground:number;sky:number};
}
export interface SetupReceipt {version:1;ok:boolean;committed:boolean;code:string|null;reason:string|null;observerErrors?:number;diagnostics?:SetupDiagnostic[]}
export interface OwnedWorldCheckpoint {kind:'nautilus-default-player-world';version:1;content:ContentIdentity;world:JSONData;interactions:JSONData;actors:JSONData[];resources:Record<string,Record<string,JSONData>>}
export interface DefaultPlayerWorld {
  readonly content:ContentIdentity;readonly actorIds:string[];
  read(actorId?:string):{actor:JSONData;resources:Record<string,JSONData>;world:JSONData;interactions:JSONData};
  readPose(actorId?:string):ConfirmedActorPose;
  readonly scene:{content:ContentIdentity;actorIds:string[];read(actorId:string):{version:1;actorId:string;mode:'on-foot';contextId:string;walkingAllowed:boolean;position:{x:number;y:number;h:number};status:Array<{id:string;label:string;value:string}>};subscribe(fn:()=>void):()=>void};
  readonly walking:{request(intent:{version:1;actorId:string;vector:{x:number;y:number};seconds:number}):SetupReceipt};
  readonly actions:{id:string;read():{context:string;actions:Array<{id:string;target:{id:string};verb:string;label:string;enabled:boolean;reason:string|null}>};request(targetId:string,offer:string):SetupReceipt};
  advance(seconds:number):void;checkpoint():OwnedWorldCheckpoint;dispose():void;
}
export const SETUP_PORTS:Readonly<Record<'world'|'pose'|'surface'|'clock'|'native'|'ui'|'runtime',SetupPort>>;
export const SETUP_COMPONENTS:readonly SetupComponent[];
export function createSetupConfiguration(options:{content:ContentIdentity;actorId?:string;model?:NativeModel;trains?:boolean;title?:boolean;vehicles?:boolean}):SetupConfiguration;
export function validatePlayerSetup(input:unknown,options?:{providers?:readonly SetupProvider[];registry?:readonly SetupRegistration[];content?:{identity:ContentIdentity}}):SetupValidation;
export function defaultSetupRegistry(config:SetupConfiguration):SetupRegistration[];
export function bindSetupProvider(config:SetupConfiguration,provider:SetupProvider):SetupConfiguration;
export function compatible(consumer:SetupPort,provider:SetupPort):boolean;
export function output(port:SetupPort):SetupPort;
/** Explicit existing UI presets preserve the complete setup recipe. */
export function setupPreset(config:SetupConfiguration,presetId:string):SetupConfiguration;
export function uiConfiguration(config:SetupConfiguration,bindings?:Record<string,string>):{kind:'nautilus-player-ui-configuration';version:1;engine:SetupConfiguration['engine'];content:ContentIdentity;actorId:string;components:SetupConfiguration['components'];bindings:Record<string,string>};
export function flatYardContent(options:{sourcePin:string}):SetupContent;
export function createDefaultWorld(content:SetupContent,options:{actorId:string;checkpoint?:OwnedWorldCheckpoint}):DefaultPlayerWorld;
