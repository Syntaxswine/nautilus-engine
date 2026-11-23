import {prepareNativeCrawler,type NativeCrawlView} from '@nautilus-engine/map-core/native-actors/crawl/three';
import type {CrawlSurface,ConfirmedCrawlSample} from '@nautilus-engine/map-core/native-actors/crawl';
declare const renderer:{isWebGLRenderer:boolean},surface:CrawlSurface,sample:ConfirmedCrawlSample;
const view:NativeCrawlView=await prepareNativeCrawler({renderer,actorId:'goat',model:'goat',equipment:'rifle',surface});view.updateConfirmed(sample);await prepareNativeCrawler({renderer,actorId:'goat',surface,checkpoint:view.checkpoint()});
// @ts-expect-error no unsupported rifle fallback
await prepareNativeCrawler({renderer,actorId:'goat',surface,equipment:'pistol'});
// @ts-expect-error old upright pose is not a full crawl sample
view.updateConfirmed({actorId:'goat',revision:0,position:{x:0,y:0,h:0},mode:'on-foot'});
