import {createStealthState,previewStealthMove,stageStealthMove,type PortableCharacter,type MovementSpecification} from '@nautilus-engine/map-core/stealth';
import {createFoliageStore,type FoliageRay} from '@nautilus-engine/map-core/stealth/foliage';
import {createCrawlCursor,type ConfirmedCrawlSample,type CrawlSurface} from '@nautilus-engine/map-core/native-actors/crawl';
declare const character:PortableCharacter,map:unknown;
const state=createStealthState(['goat']),spec:MovementSpecification={version:1,mode:'sneak',stance:'prone',distanceM:.1,terrainCost:1,injuryMultiplier:1,loadMultiplier:1,walkSpeedMps:.35,chargeAP:false};
previewStealthMove(character,spec);
stageStealthMove(state,character,{version:1,id:'move',sequence:1,expectedRevision:0,actorId:'goat',specification:spec,confirmation:{accepted:true,worldId:'yard',worldRevision:0,floorId:'ground',from:{x:1,y:1,h:0},to:{x:1.1,y:1,h:0}}});
const query=createFoliageStore().replace({mapId:'yard',revision:1,map}),ray:FoliageRay={origin:{x:1,y:1,h:1},direction:{x:1,y:0,h:0},maxReach:10,purpose:'shot',space:'native-world'};query.trace(ray);query.depth({x:1,y:1,level:0},{x:10,y:1,level:0});
const surface:CrawlSurface={kind:'flat-plane',floorId:'ground',heightM:0},cursor=createCrawlCursor({actorId:'goat',surface,equipment:'rifle'}),sample:ConfirmedCrawlSample={kind:'nautilus-native-crawl-sample',version:1,actorId:'goat',revision:0,mode:'on-foot',position:{x:1,y:1,h:0},heading:0,stance:'prone',action:'locomotion',travelM:0,floorId:'ground'};
cursor.stage(sample).commit();createCrawlCursor({actorId:'goat',surface,checkpoint:cursor.read()});
// @ts-expect-error source supports one native rig
createCrawlCursor({actorId:'goat',surface,model:'donkey'});
// @ts-expect-error unsupported slope profile
createCrawlCursor({actorId:'goat',surface:{kind:'slope',floorId:'ground',heightM:0}});
// @ts-expect-error select a declared height space
query.trace({...ray,space:'world'});
// @ts-expect-error ordinary pose checkpoints are a separate kind
createCrawlCursor({actorId:'goat',surface,checkpoint:{kind:'nautilus-native-pose',version:1}});
