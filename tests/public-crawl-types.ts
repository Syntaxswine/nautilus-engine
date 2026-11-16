import {createCrawlSetupConfiguration,mountCrawlPlayerSetup,mountPlayerSetup,type CrawlSetupCheckpoint,type SetupCheckpoint} from '@nautilus-engine/map-core/player-setup/browser';
import {createSetupConfiguration} from '@nautilus-engine/map-core/player-setup';
import type {NativeCrawlCheckpoint} from '@nautilus-engine/map-core/native-actors/crawl';
const content={identity:{id:'crawl-types',version:1,sourcePin:'bbf4f8adfebfd80ae7afe3744b5fab52b8a78366'}};
const configuration=createCrawlSetupConfiguration({content:content.identity,equipment:'rifle'});
declare const saved:CrawlSetupCheckpoint;
const native:NativeCrawlCheckpoint=saved.native;
void native;
async function controls(){const view=await mountCrawlPlayerSetup(document.createElement('main'),{content,configuration,checkpoint:saved});const next:CrawlSetupCheckpoint=view.checkpoint();await view.restoreCheckpoint(next);
  // @ts-expect-error crawler checkpoints never masquerade as legacy native saves
  const old:SetupCheckpoint=next;
  // @ts-expect-error legacy restore refuses a crawl checkpoint at the type boundary
  const legacy=await mountPlayerSetup(document.createElement('main'),{content,checkpoint:next});
  // @ts-expect-error borrowed flat-plane crawl has no arbitrary foot support hook
  await mountCrawlPlayerSetup(document.createElement('main'),{content,configuration,footSupport:{}});
  // @ts-expect-error the optional profile uses the fixed setup lifecycle registry
  await mountCrawlPlayerSetup(document.createElement('main'),{content,configuration,registry:[]});
  // @ts-expect-error custom factories cannot replace the optional profile owners
  await mountCrawlPlayerSetup(document.createElement('main'),{content,configuration,factories:{}});
  void old;void legacy;
}
void controls;
// @ts-expect-error unsupported rig is not offered by the optional profile
createCrawlSetupConfiguration({content:content.identity,model:'donkey'});
// @ts-expect-error unsupported equipment is explicit
createCrawlSetupConfiguration({content:content.identity,equipment:'knife'});
// @ts-expect-error this native profile is on foot only
createCrawlSetupConfiguration({content:content.identity,vehicles:true});
// @ts-expect-error the accepted floor profile is at zero native metres
createCrawlSetupConfiguration({content:content.identity,surface:{kind:'flat-plane',floorId:'floor-0',heightM:2}});
// @ts-expect-error legacy recipe and version remain distinct
const legacyConfiguration:ReturnType<typeof createSetupConfiguration>=configuration;
void legacyConfiguration;
