import test from 'node:test';import assert from 'node:assert/strict';
import {createSetupConfiguration,validatePlayerSetup,bindSetupProvider,SETUP_PORTS,output} from '../packages/player-setup/index.js';
import {createCrawlSetupConfiguration,validateCrawlPlayerSetup,CRAWL_SETUP_PORTS} from '../packages/player-setup/browser.js';
import {PLAYER_PORTS} from '../packages/player-ui/index.js';
const content={identity:{id:'crawl-test',version:1,sourcePin:'bbf4f8adfebfd80ae7afe3744b5fab52b8a78366'}};
const provider=(ports=CRAWL_SETUP_PORTS)=>({descriptor:{id:'crawl.host',version:1,ports:[ports.pose,SETUP_PORTS.world,SETUP_PORTS.surface,PLAYER_PORTS.scene,PLAYER_PORTS.walking].map(output)},services:{}});
const options=p=>({content,providers:[p]});
test('explicit crawl setup negotiates distinct pose/native schemas and an owned native lifecycle',()=>{
  const p=provider(),c=bindSetupProvider(createCrawlSetupConfiguration({content:content.identity}),p),v=validateCrawlPlayerSetup(c,options(p));assert(v.ok,JSON.stringify(v.errors));assert(v.plan.order.includes('setup.actor'));assert(!v.plan.order.includes('setup.world'));assert.equal(v.connections.find(c=>c.componentPort.id===SETUP_PORTS.pose.id).componentPort.schema,'urn:nautilus:confirmed-native-crawl-sample:1');
  assert(!validatePlayerSetup(c,options(p)).ok);assert(!validateCrawlPlayerSetup(createSetupConfiguration({content:content.identity}),options(p)).ok);
});
test('legacy recipes and schemas remain accepted; crossing a legacy pose provider refuses',()=>{
  const p=provider(SETUP_PORTS),legacy=bindSetupProvider(createSetupConfiguration({content:content.identity}),p);assert(validatePlayerSetup(legacy,options(p)).ok);
  const c=bindSetupProvider(createCrawlSetupConfiguration({content:content.identity}),p);assert(!validateCrawlPlayerSetup(c,options(p)).ok);
});
test('unsupported crawl rigs/motions/surfaces/profiles and borrowed native ownership refuse',()=>{
  const p=provider(),c=bindSetupProvider(createCrawlSetupConfiguration({content:content.identity,equipment:'rifle'}),p);
  for(const change of [n=>n.components.find(c=>c.id==='setup.actor').settings.model='donkey',n=>n.components.find(c=>c.id==='setup.actor').settings.motion='native-gait',n=>n.nativeProfile.equipment='knife',n=>n.nativeProfile.surface.heightM=1,n=>n.nativeProfile.surface.kind='slope',n=>n.nativeProfile.id='unregistered']){const n=structuredClone(c);change(n);assert(!validateCrawlPlayerSetup(n,options(p)).ok);}
  const n=structuredClone(p);n.descriptor.ports.push(output(CRAWL_SETUP_PORTS.native));assert(!validateCrawlPlayerSetup(c,options(n)).ok);
  assert(!validateCrawlPlayerSetup(c,{...options(p),registry:[]}).ok);
  for(const id of ['player.vehicles','player.trains']){const n=structuredClone(c);n.components.push({id,version:1,settings:{}});assert(!validateCrawlPlayerSetup(n,options(p)).ok);}
  assert.throws(()=>createCrawlSetupConfiguration({content:content.identity,vehicles:true}),/on foot only/);
  assert(!validateCrawlPlayerSetup(createCrawlSetupConfiguration({content:content.identity})).ok);
});
