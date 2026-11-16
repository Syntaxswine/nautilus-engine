import type {SharedNativeRenderer,NativeActorRoot} from './three.js';
import type {NativeActorSpec} from './index.js';
import type {CrawlSurface,ConfirmedCrawlSample,NativeCrawlCheckpoint} from './crawl.js';
export {NATIVE_CRAWL_CONTRACT} from './crawl.js';
export interface NativeCrawlResult {actorId:string;heading:number;role:'idle'|'walk'|'crawl'|'suspended';poseOwner:'native-locomotion'|'host-action';signedDistanceM:number;phase?:number;stride?:number;primary?:number;carry?:string;gripErrorM?:number|null;visible:boolean}
export interface NativeCrawlView {readonly root:NativeActorRoot;readonly spec:NativeActorSpec;updateConfirmed(sample:ConfirmedCrawlSample):NativeCrawlResult;checkpoint():NativeCrawlCheckpoint;setActive(active:boolean):void;dispose():void}
export function prepareNativeCrawler(options:{renderer:SharedNativeRenderer;actorId:string;model?:'goat';equipment?:'hands'|'rifle';surface:CrawlSurface;checkpoint?:NativeCrawlCheckpoint;signal?:AbortSignal;resourceURL?:(packageURL:string)=>string;fetchResource?:typeof fetch}):Promise<NativeCrawlView>;
/** Low-level geometry proof. Supply the original JSON identified by nativeActorResources('goat'). Browser preparation authenticates its SHA-256. */
export function createNativeCrawlBody(options:{model:'goat';actorId:string;data:unknown;crawl:{equipment:'hands'|'rifle';surface:CrawlSurface};checkpoint?:NativeCrawlCheckpoint}):{readonly root:NativeActorRoot;readonly worker:unknown;readonly spec:NativeActorSpec;update(sample:ConfirmedCrawlSample):NativeCrawlResult;checkpoint():NativeCrawlCheckpoint;dispose():void};
