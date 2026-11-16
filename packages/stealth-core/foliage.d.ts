export type HeightSpace='native-world'|'aft-simulation';
export interface Point {x:number;y:number;h:number}
export interface FoliageCell {x:number;y:number;level:number}
export interface FoliageRay {origin:Point;direction:Point;maxReach:number;purpose:'sight'|'shot';space:HeightSpace}
export interface FoliageHit {kind:'foliage';id:string;material:'wood'|'foliage';source:{x:number;y:number;z:number}|null;distance:number;point:Point}
export interface FoliageVolume {id:string;material:'wood'|'foliage';source:{x:number;y:number;z:number}|null;min:[number,number,number];max:[number,number,number];blocksSight:boolean;blocksShot:boolean;beam?:{a:number[];b:number[];radius:number};lobes?:Array<{center:number[];radius:number[]}>}
export const FOLIAGE_CONTRACT:Readonly<{id:'nautilus-foliage-queries-v1';version:1;presets:readonly string[];encodings:readonly number[];origin:string;nativeFloorIntervalM:2.12;tacticalFloorIntervalM:3;nativeBodyScale:number;queries:string;invalidation:string}>;
export interface FoliageSnapshot {readonly mapId:string;readonly revision:number;readonly contract:typeof FOLIAGE_CONTRACT;exportMap():unknown;cell(cell:FoliageCell):{cover:unknown;preset:string|null;density:number;blocked:boolean};depth(from:FoliageCell,to:FoliageCell):number;trace(ray:FoliageRay):FoliageHit|null;occluded(ray:FoliageRay):boolean;volumes(space:HeightSpace):FoliageVolume[];statistics():{mapId:string;revision:number;volumes:number;trees:number;screens:number;wood:number;buckets:number;worldBuckets:number}}
export function createFoliageSnapshot(input:{mapId:string;revision:number;map:unknown}):FoliageSnapshot;
export function createFoliageStore():Readonly<{read():FoliageSnapshot;replace(input:{mapId:string;revision:number;map:unknown}):FoliageSnapshot}>;
