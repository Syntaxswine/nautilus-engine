export * from './foliage.js';
import type {Point} from './foliage.js';
export type MovementMode='walk'|'run'|'sneak';
export type Stance='standing'|'kneeling'|'prone';
export interface PortableCharacter {version:1;id:string;name:string;stats:Record<'strength'|'endurance'|'dexterity'|'agility'|'intelligence'|'perception'|'mechanical'|'medical'|'firearms'|'heavyWeapons'|'explosives'|'leadership'|'sneak'|'climbing',number>;resources:{hp:number;ap:number;stamina:number};skillPoints:number}
export interface MovementSpecification {version:1;mode:MovementMode;stance:Stance;distanceM:number;terrainCost:number;injuryMultiplier:number;loadMultiplier:number;walkSpeedMps:number;chargeAP:boolean}
export interface MovementPreview {ok:boolean;code:string|null;profile:'aft-exposure-v1';speedMps:number;requestedCosts:{ap:number;stamina:number};costs:{ap:number;stamina:number};rawSneak:number;effectiveSneak:number;noiseRadiusM:number;staminaRequired:boolean}
export interface AwarenessArguments {distance:number;exposure:number;light:number;contrast?:number;perception?:number;stealth?:number;sneaking?:boolean;running?:boolean;moving?:boolean;stance?:Stance;alert?:boolean;concealment?:number}
export interface Observer {id:string;position:Point;heading:number;perception:number;alert:boolean;ap:number;maxAp:number;species?:'horse'|'donkey'|'goat'|'cow'|'sheep'|'hen'|'pig-foreman'|'pig-director'|'skunk';cone?:number}
export interface ExposureObservation {version:1;observer:Observer;target:{id:string;position:Point;mode:MovementMode;stance:Stance;rawSneak:number;moving:boolean;ap:number;maxAp:number};visibility:{zones:Array<'head'|'torso'|'legs'>;light:number;contrast:number;spotlit:boolean};concealment:number}
export interface AwarenessPreview {candidate:0|1|2;rate:number;exposure:number;light:number;rawSneak:number;effectiveSneak:number;concealment:number;distance:number;immediate:boolean;position:Point;observerId:string;targetId:string;signature:string;observerAP:number;observerMaxAP:number;targetAP:number;targetMaxAP:number}
export type AwarenessBoundary={kind:'time';seconds:number}|{kind:'action';round:number};
export interface Contact {observerId:string;targetId:string;score:number;lastKnown:Point|null;perceived:0|1|2;seconds:number;combat:boolean;round:number;spent:number;signature:string;observerAP:number;targetAP:number}
export interface StealthState {kind:'nautilus-stealth-state';version:1;profile:'aft-exposure-v1';revision:number;actors:Array<{actorId:string;mode:MovementMode;stance:Stance;travelM:number}>;contacts:Contact[];receipts:Array<{id:string;type:'posture'|'move'|'awareness';stream:string;sequence:number;fingerprint:string}>}
export interface Command {version:1;id:string;sequence:number;expectedRevision:number}
export interface Footstep {kind:'nautilus-stealth-footstep';version:1;id:string;actorId:string;position:Point;radiusM:number;worldId:string;worldRevision:number}
export interface StageResult {ok:boolean;code?:string;repeated:boolean;next:StealthState;events:unknown[]}
export interface StealthSave {kind:'nautilus-stealth-save';version:1;state:StealthState;characters:PortableCharacter[]}
export const STEALTH_PROFILE:'aft-exposure-v1';
export const FOLIAGE_CAPABILITY:'nautilus-foliage-queries-v1';
export const STEALTH_CONTRACT:Readonly<{id:'nautilus-shared-stealth';version:1;profile:typeof STEALTH_PROFILE;units:string;headings:string;clock:string;geometry:string;randomness:string;saves:string}>;
export const MOVEMENT_MODES:Readonly<Record<MovementMode,Readonly<{speed:number;apMultiplier:number}>>>;
export const STANCE_MOVE_AP:Readonly<Record<Stance,number>>;
export const AWARENESS:Readonly<{suspicious:25;identified:100;decay:2}>;
export function previewStealthMove(character:PortableCharacter,input:MovementSpecification):MovementPreview;
export function evaluateStealthNoise(event:Footstep,listeners:Array<{id:string;position:Point;hearingScale:number;hearingEnabled:boolean;audible:boolean;permitted:boolean;sourceSeen:boolean;incapacitated:boolean}>):Array<{eventId:string;listenerId:string;position:Point;distanceM:number}>;
export function awarenessRate(input:AwarenessArguments):number;
export function previewAwareness(input:ExposureObservation):AwarenessPreview;
export function awarenessBoundary(previous:Contact|null,boundary:AwarenessBoundary,observation:AwarenessPreview):{seconds:number;combat:boolean;round:number;spent:number};
export function createStealthState(actorIds:string[]):StealthState;
export function openStealthState(input:unknown):StealthState;
export function stageStealthPosture(state:StealthState,command:Command&{actorId:string;mode:MovementMode;stance:Stance;confirmed:true}):StageResult;
export function stageStealthMove(state:StealthState,character:PortableCharacter,command:Command&{actorId:string;specification:MovementSpecification;confirmation:{accepted:true;worldId:string;worldRevision:number;floorId:string;from:Point;to:Point}}):StageResult&{character:PortableCharacter;events:Footstep[]};
export function stageStealthAwareness(state:StealthState,command:Command&{observation:ExposureObservation;boundary:AwarenessBoundary;confirmed:true}):StageResult;
export function openStealthSave(input:unknown):StealthSave;
export function exportStealthSave(input:{state:StealthState;characters:PortableCharacter[]}):string;
