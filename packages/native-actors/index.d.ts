export type NativeModel='goat'|'donkey';
export type NativeRole='idle'|'walk';
export type NativeMotion='native-gait'|'neutral-only';
export interface ActorPoint {x:number;y:number;h:number}
/** Confirmed host state, never an input vector or a requested move. */
export interface ConfirmedActorPose {actorId:string;revision:number;position:ActorPoint;mode:'on-foot'|'driver'|'rider'}
export interface NativeResource {path:string;bytes:number;sha256:string}
export interface NativeActorSpec {
  id:NativeModel;label:string;version:1;roles:NativeRole[];outfits:['normal'];nativeScale:1;restForward:'+x';
  bounds:{min:[number,number,number];max:[number,number,number]};heightM:number;
  frame:{width:number;height:number;centerY:number;distance:number;near:number;far:number};
  data:NativeResource;paint:NativeResource;
  factory:{sourceId:string;repository:string;commit:string;path:string;gitBlob:string;bytes:number;sha256:string;export:string};
}
export interface NativePoseCheckpoint {
  kind:'nautilus-native-pose';version:1;model:NativeModel;actorId:string;motion:NativeMotion;
  distanceM:number;heading:number;blend:number;last:ConfirmedActorPose|null;
}
export const NATIVE_ACTOR_CONTRACT:Readonly<{id:'nautilus-native-actors';version:1;profile:'native-mammal-walk-v1';units:'metres';frame:'world-x-y-h';roles:readonly NativeRole[];animation:string;guide:string;usageCard:string}>;
export function listNativeActors():NativeActorSpec[];
export function nativeActor(model:NativeModel,roles?:readonly NativeRole[]):NativeActorSpec;
export function confirmedActorPose(input:unknown):ConfirmedActorPose;
export function nativeActorResources(model:NativeModel):Array<NativeResource&{url:string}>;
