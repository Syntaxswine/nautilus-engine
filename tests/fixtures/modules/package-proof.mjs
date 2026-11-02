// Appended to the offline installed-package proof; fixtures are copied separately.
import modularAssert from 'node:assert/strict';
import {planModules as modularPlan,startModules as modularStart,MODULE_CONTRACT as modularContract} from '@nautilus-engine/core/runtime';
import {deriveFarmyardStats as modularDerive,withFarmyardDerivedStats as modularProject,farmyardWeaponAccuracy as modularAccuracy} from '@nautilus-engine/core/adapters/farmyard/rules';
import {createWorld as modularCreateWorld,serializeWorld as modularSerializeWorld,openWorld as modularOpenWorld,compileWorld as modularCompileWorld,worldRequirements as modularRequirements,WORLD_CONTRACT as modularWorldContract} from '@nautilus-engine/core/world';
import {engineManifest as modularManifest} from '@nautilus-engine/core/contracts';
import {negotiateCapabilities as modularNegotiate} from '@nautilus-engine/core/capabilities';
import {createFloorNavigation as modularFloors} from '@nautilus-engine/core/floors';
import * as modularFarmyard from './farmyard-proof/character-stats.js';
import {QUICKPLAY_PRESETS as modularPresets} from './farmyard-proof/quickplay-presets.js';
import {WEAPONS as modularWeapons} from './farmyard-proof/solo-weapon-data.js';

for(const preset of modularPresets)for(const weapon of Object.keys(modularWeapons)){
  const host={id:7,name:preset.name,species:preset.species,weapon,inventory:{items:['retained']}};
  modularFarmyard.initializeStats(host,preset.stats);host.hp-=7;host.ap-=.375;host.stamina=0;
  const expected={...host,stats:{...host.stats}};modularFarmyard.refreshStats(expected);
  const projection=modularDerive(host);
  for(const key of ['maxHp','maxAp','maxStamina','damageResistance','accuracy','medical','stealth','perception'])modularAssert.equal(projection[key],expected[key]);
  modularAssert.equal(modularAccuracy(host),modularFarmyard.weaponAccuracy(host));
  host.ap=-1e-12;
  const candidate=modularProject(host);modularAssert.equal(candidate.ap,-1e-12);modularAssert.equal(candidate.hp,host.hp);modularAssert.equal(candidate.stamina,0);
  modularAssert.equal(candidate.inventory,host.inventory);modularAssert.equal(candidate.id,7);
}

const modularActor={weapon:'rifle',inventory:{kept:true}};modularFarmyard.initializeStats(modularActor,modularPresets[0].stats);modularActor.ap=-1e-12;
const modularHost={actor:modularActor,disposals:0,dispose(){this.disposals++;}};
const modularConfig={version:1,modules:[{id:'game.stats',version:1,provides:[{id:'game.stats',version:1}],requires:[{id:'host.actors',minVersion:1,maxVersion:1}]}],selected:['game.stats'],hosts:[{id:'game.existing-actors',version:1,provides:[{id:'host.actors',version:1}]}],bindings:{'host.actors':'game.existing-actors'}};
modularAssert.equal(modularPlan(modularConfig).ok,true);
const modularRuntime=await modularStart(modularConfig,{hostServices:{'game.existing-actors':{'host.actors':modularHost}},factories:{'game.stats':({services})=>({services:{'game.stats':()=>modularDerive(services['host.actors'].actor)}})}});
modularAssert.deepEqual(modularRuntime.service('game.stats','game.stats')(),modularDerive(modularActor));
const modularStop=modularRuntime.stop();modularAssert.equal(modularStop,modularRuntime.stop());modularAssert.equal((await modularStop).ok,true);modularAssert.equal(modularHost.disposals,0);modularAssert.equal(modularActor.ap,-1e-12);
modularAssert.ok(modularManifest().capabilities.some(item=>item.id===modularContract.capability));

const modularTower=modularCreateWorld({id:'installed-tower',name:'Installed native-height proof',widthM:24,depthM:24,minHeightM:-.12,heightM:40,floorCount:16,storyHeightM:2.12,groundHeightM:0});
const modularFloor=modularTower.floors[10],modularFloorHeight=modularFloor.elevationM;
modularTower.surfaces.push({id:'high-floor',floorId:modularFloor.id,role:'floor',bounds:{min:{x:1,y:1,h:modularFloorHeight},max:{x:8,y:8,h:modularFloorHeight}},supports:true,supportFloorId:modularFloor.id});
const modularRestored=modularOpenWorld(modularSerializeWorld(modularTower)),modularQueries=modularCompileWorld(modularRestored);
modularAssert.deepEqual(modularRestored,modularTower);modularAssert.equal(modularQueries.stats().denseCells,0);
modularAssert.equal(modularQueries.findSupport({position:{x:3,y:3,h:modularFloorHeight+.5},maxDropM:1,requireFloor:true}).floorId,modularFloor.id);
modularAssert.equal(modularQueries.traceSegment({from:{x:3,y:3,h:modularFloorHeight+.5},to:{x:3,y:3,h:modularFloorHeight-.5}}).surfaceId,'high-floor');
modularAssert.equal(modularWorldContract.standardStoryHeightM,2.12);
modularAssert.equal(modularNegotiate(modularRequirements(modularTower),modularManifest()).ok,true);
const modularNavigation=modularFloors({floors:modularTower.floors,selectedId:modularTower.floors[9].id});
modularAssert.equal(modularNavigation.visibleFloors.length,5);
modularAssert.equal(modularNavigation.step(1),true);modularAssert.equal(modularNavigation.state.selectedId,modularFloor.id);
modularNavigation.dispose();
modularAssert.throws(()=>import.meta.resolve('@nautilus-engine/core/floors/ui'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
modularAssert.equal(typeof globalThis.window,'undefined');
console.log('Installed optional composition, retained Farmyard actors, native-height worlds and headless floor controls pass.');
