import type {TrainConnector} from '../train-core/index.js';
import type {TrainUIOutcome,TrainUIControlIntent} from '../train-ui/index.js';
export interface ContentIdentity {id:string;version:number;sourcePin:string}
export interface PlayerPort {id:string;service:{id:string;version:1};direction:'input'|'output';role:'request'|'confirmed-state'|'committed-event';schema:string;units:string;frame:string;cardinality:'one';ownership:string;lifetime:'composition';required:boolean}
export interface ComponentSetting {id:string;label:string;type:'enum'|'boolean'|'number';default:string|number|boolean;change:'live'|'pause'|'restart';values?:readonly string[];min?:number;max?:number;step?:number;units?:string}
export interface PlayerComponent {id:string;version:1;label:string;ports:readonly PlayerPort[];settings:readonly ComponentSetting[];guide:string;usageCard:string}
export interface PlayerConfiguration {kind:'nautilus-player-ui-configuration';version:1;engine:{package:string;version:string;sourcePin:string};content:ContentIdentity;actorId:string;components:Array<{id:string;version:1;settings:Record<string,string|number|boolean>}>;bindings:Record<string,string>}
export interface PlayerDiagnostic {code:string;path:string;message:string;action:string}
export interface PlayerConnection {componentPort:PlayerPort;providerId:string;providerPort:PlayerPort}
export interface PlayerProvider {descriptor:{id:string;version:1;ports:readonly PlayerPort[]};services:Record<string,unknown>}
export interface PlayerValidation {ok:boolean;errors:PlayerDiagnostic[];configuration:PlayerConfiguration|null;compiled:object|null;plan:object|null;connections:PlayerConnection[]}
/** The menu carries bounded plain JSON; runtime callbacks never enter it. */
export type MenuJSON=null|boolean|number|string|MenuJSON[]|{[key:string]:MenuJSON};
export interface SetupMenuRecipe {components:Array<{id:string;version:number;settings:Record<string,string|number|boolean>}>;bindings:Record<string,string>;[key:string]:MenuJSON}
export interface SetupMenuAdapter {
  descriptors:readonly PlayerComponent[];
  read():SetupMenuRecipe;
  validate(recipe:unknown):{ok:boolean;errors:PlayerDiagnostic[];configuration:SetupMenuRecipe|null};
  /** A committed result remains accepted even when post-commit feedback fails. */
  apply(recipe:SetupMenuRecipe):TrainUIOutcome|Promise<TrainUIOutcome>;
  connections():MenuJSON;
  presets?:readonly {id:string;label:string}[];
  /** Required for custom presets; unknown full recipes are never interpreted as Stage 1. */
  preset?:(recipe:SetupMenuRecipe,presetId:string)=>SetupMenuRecipe;
}
export interface ControlContext {readonly version:1;readonly revision:number;readonly mode:'on-foot'|'driver'|'rider'|'menu'|'paused'|'unavailable';readonly actorId:string|null;readonly contextId:string|null;readonly token:string;readonly blocked:boolean}
export interface PlayerSceneState {version:1;actorId:string;mode:'on-foot'|'driver'|'rider';contextId:string;walkingAllowed:boolean;position:{x:number;y:number;h:number};status:Array<{id:string;label:string;value:string}>}
export interface PlayerScene {content:ContentIdentity;actorIds:readonly string[];inputElement?:HTMLElement;read(actorId:string):PlayerSceneState;subscribe(fn:()=>void):()=>void}
export interface HudRect {x:number;y:number;width:number;height:number}
export interface HudBounds {version:1;viewport:HudRect;occlusions:Array<HudRect&{id:string}>;safe:HudRect}
export interface CameraStage {
  /** Non-cancellable acceptance: atomically update, then notify. Settle refusals
   * in prepare. Errors after the update are committed observer errors. */
  commit():void;
  /** Retire staging only; never undo accepted camera state. */
  dispose():void;
}
export interface CameraProvider {prepare(settings:{mode:'follow'|'overview';zoom:number},options:{signal:AbortSignal}):Promise<CameraStage>|CameraStage}
export interface TitleOptions {title:string;onStart(options:{signal:AbortSignal;save:{available:boolean;summary:string}|null}):void|Promise<void>;onContinue?:(options:{signal:AbortSignal;save:{available:boolean;summary:string}|null})=>void|Promise<void>;checkSave?:(options:{signal:AbortSignal})=>{available:boolean;summary?:string}|Promise<{available:boolean;summary?:string}>;eyebrow?:string;tagline?:string;edition?:string;art?:{src:string;alt?:string;caption?:string};labels?:Record<string,string>;credits?:string[];newGameWarning?:string;menuLabel?:string}
export interface ActionIntent {version:1;type:'action';providerId:string;actionId:string;context:string;offer:string}
/** id is an opaque stable provider/action-pair key; use the separate identities. */
export interface PlayerAction {version:1;id:string;providerId:string;actionId:string;target:Record<string,unknown>;verb:string;label:string;icon:string|null;enabled:boolean;reason:string|null;intent:ActionIntent}
export interface ActionProvider {id:string;read():{context:string;actions:Array<{id:string;target:Record<string,unknown>;verb:string;label:string;icon?:string|null;enabled:boolean;reason?:string|null}>};request(actionId:string,offer:string,event?:Event):TrainUIOutcome}
export type PlayerIntent=ActionIntent|{version:1;type:'control';context:string;offer:string;control:TrainUIControlIntent}|{version:1;type:'walk';context:string;vector:{x:number;y:number};seconds:number}|{version:1;type:'menu';open:boolean}|{version:1;type:'pause';paused:boolean}|{version:1;type:'title';visible:boolean}|{version:1;type:'configuration';configuration:PlayerConfiguration};
export interface PlayerUI {
  readonly element:HTMLElement;
  /** Initial title metadata check; disposal is available while it is pending. */
  readonly ready:Promise<boolean>;
  readonly slots:Readonly<{map:HTMLElement;inventory:HTMLElement}>;
  dispatch(intent:PlayerIntent):TrainUIOutcome|Promise<TrainUIOutcome>;
  applyConfiguration(configuration:PlayerConfiguration|string,options?:{signal?:AbortSignal}):Promise<TrainUIOutcome&{diagnostics?:PlayerDiagnostic[]}>;
  openMenu():TrainUIOutcome;closeMenu():TrainUIOutcome;refresh():void;
  readConfiguration():PlayerConfiguration;readContext():ControlContext;
  readActions():{version:1;context:ControlContext;actions:PlayerAction[]};
  readControls():{version:1;context:ControlContext;train:Readonly<{version:1;actorId:string;context:string|null;mode:'on-foot'|'driver'|'rider'|null;compact:boolean;blocked:boolean}>|null};
  connectionInspector():PlayerConnection[];
  /** Called by the retained host clock; this shell creates no simulation loop. */
  advanceInput(seconds:number):void;
  dispose():Promise<{ok:boolean;errors:string[]}>;
}
export const PLAYER_UI_CONTRACT:Readonly<{id:'nautilus-player-ui';version:1;stage:1;configuration:string;action:string;controlContext:string;bootstrap:string}>;
export const PLAYER_ENGINE_BASE:Readonly<{package:string;version:string;sourcePin:string}>;
export const PLAYER_COMPONENTS:readonly PlayerComponent[];
export const PLAYER_PORTS:Readonly<Record<'scene'|'walking'|'pause'|'bounds'|'trains'|'camera'|'title',PlayerPort>>;
export const PLAYER_PRESETS:readonly {id:string;label:string;settings:Record<string,Record<string,string|number|boolean>>}[];
export const PLAYER_SKIN_RESOURCES:Readonly<Record<'farmyard'|'tinderbox',readonly string[]>>;
export function playerDescriptors():PlayerComponent[];
export function providerPort(port:PlayerPort):PlayerPort;
export function compatiblePort(consumer:PlayerPort,provider:PlayerPort):boolean;
export function createPlayerConfiguration(options:{content:ContentIdentity;actorId?:string;camera?:boolean;title?:boolean}):PlayerConfiguration;
export function validatePlayerConfiguration(configuration:unknown,options?:{providers?:readonly PlayerProvider[];descriptors?:readonly PlayerComponent[]}):PlayerValidation;
export function presetConfiguration(configuration:PlayerConfiguration,presetId:string):PlayerConfiguration;
export function createActionRouter(options:{providers:readonly ActionProvider[];readContext:()=>ControlContext}):Readonly<{read():{version:1;context:ControlContext;actions:PlayerAction[]};request(intent:ActionIntent,event?:Event):TrainUIOutcome;dispose():void}>;
export function trainActionProvider(readActuator:()=>import('../train-ui/index.js').TrainControls|null|undefined):ActionProvider;
export function createControlContext(options:{release(before:ControlContext,after:ControlContext):void;install(state:ControlContext,snapshot:PlayerSceneState|null):void}):Readonly<{readonly state:ControlContext;update(snapshot:PlayerSceneState|null,flags?:{menu?:boolean;paused?:boolean;hidden?:boolean;unavailable?:boolean;force?:boolean}):ControlContext;dispose():void}>;
export function createTrainPlayerProvider(options:{host:{connector:TrainConnector;walk(x:number,y:number,seconds:number):unknown;readonly actors:readonly {id:string;health:number;ap:number}[]};inputElement?:HTMLElement;content:ContentIdentity;id?:string;setUIPaused(blocked:boolean):void;onHudBounds(bounds:HudBounds):void;camera?:CameraProvider;title?:{options:TitleOptions}}):PlayerProvider;
export function mountPlayerUI(container:HTMLElement,options:{providers:readonly PlayerProvider[];configuration:PlayerConfiguration;actionProviders?:readonly ActionProvider[];resourceURL?:(packageURL:string)=>string;signal?:AbortSignal;onError?:(error:unknown,context:{phase:string})=>void;onConfigurationChange?:(configuration:PlayerConfiguration)=>void;setupMenu?:SetupMenuAdapter}):Promise<PlayerUI>;
