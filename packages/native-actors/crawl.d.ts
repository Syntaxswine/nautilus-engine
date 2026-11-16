import type {ActorPoint} from './index.js';
export interface CrawlSurface {kind:'flat-plane';floorId:string;heightM:number}
export interface ConfirmedCrawlSample {kind:'nautilus-native-crawl-sample';version:1;actorId:string;revision:number;mode:'on-foot';position:ActorPoint;heading:number;stance:'standing'|'prone';action:'locomotion'|'other';travelM:number;floorId:string}
export interface NativeCrawlCheckpoint {kind:'nautilus-native-crawl-cursor';version:1;actorId:string;model:'goat';equipment:'hands'|'rifle';surface:CrawlSurface;signedDistanceM:number;walkDistanceM:number;blend:number;last:ConfirmedCrawlSample|null}
export const NATIVE_CRAWL_CONTRACT:Readonly<{id:'nautilus-native-goat-crawl-v1';version:1;models:readonly ['goat'];equipment:readonly ['hands','rifle'];units:string;heading:string;surface:string;owner:string}>;
export function crawlSurface(input:unknown):CrawlSurface;
export function confirmedCrawlSample(input:unknown,surface:CrawlSurface):ConfirmedCrawlSample;
export function createCrawlCursor(options:{actorId:string;model?:'goat';equipment?:'hands'|'rifle';surface:CrawlSurface;checkpoint?:NativeCrawlCheckpoint}):Readonly<{read():NativeCrawlCheckpoint;stage(input:ConfirmedCrawlSample):{next:NativeCrawlCheckpoint;restoring:boolean;repeat:boolean;commit():void}} >;
