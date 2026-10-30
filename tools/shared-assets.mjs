import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorAssets} from '../apps/editor/asset-catalog.js';
import {BUILDING_ASSETS, ORIGINAL_BUILDING_SOURCE} from '../packages/prefab-core/registry.js';
import {ROCK_ITEM, ROCK_PROFILE} from '../packages/items-core/index.js';
import {GRENADE_COMPONENT,FARMYARD_GRENADE_PROFILE,GRENADE_CONTRACT} from '../packages/grenades-core/profile.js';
import {TINDERBOX_ART_ASSETS} from '../packages/tinderbox-art/catalogue.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function sharedAssetCatalogueSource() {
  const upstream = JSON.parse(fs.readFileSync(path.join(root, 'upstream.json'), 'utf8'));
  const assets = editorAssets().map(item => ({id: item.category.toLowerCase() + ':' + item.id, name: item.name, category: item.category,
    dimensions: {width: item.w, depth: item.h, metresPerUnit: 1},
    source: {project: 'aft', commit: upstream.aft.commit},
    availability: item.disabled ? 'inspection-only' : 'content-binding-required',
    note: item.disabled || item.note || 'Bind this content ID to the consumer renderer and gameplay explicitly.'}));
  for (const item of BUILDING_ASSETS) assets.push({id: 'building:' + item.id, name: item.name, category: 'Buildings',
    source: {project: item.provider === 'gross' ? 'tinderbox' : 'nautilus', commit: item.provider === 'gross' ? upstream.tinderboxPrefabs.commit : ORIGINAL_BUILDING_SOURCE.commit,
      catalogue: item.provider === 'gross' ? 'gross' : 'original'}, availability: 'shared-building-renderer',
    note: 'Native visual assembly; consumer owns collision, doors, navigation, fire and persistence.'});
  assets.push({id:ROCK_ITEM.id,name:ROCK_ITEM.name,category:'Items',
    dimensions:{width:ROCK_PROFILE.radius*2,depth:ROCK_PROFILE.radius*2,height:ROCK_PROFILE.radius*2,metresPerUnit:1},
    source:{project:'nautilus',commit:'9029dc11f4611ca46ea886ec9c03cbb6c0cfe3c5'},availability:'shared-item-renderer',
    entry:'./items/three',factory:'createRockModel',
    note:'Original native-scale visual. Optional ./items stages pickup, throw and impact noise; consumer owns inventory, world collision, hearing and guard behavior.'});
  assets.push({id:GRENADE_COMPONENT.id,name:'Frag grenade',category:'Items',
    dimensions:{width:.08173276484,depth:.07494000345,height:.11100000143,metresPerUnit:1},
    source:{project:'aft',commit:upstream.aft.commit,reviewedFarmyardCommit:upstream.farmyardGrenades.commit},
    availability:'shared-item-renderer',entry:'./grenades/three',factory:'createGrenadeModel',logicEntry:'./grenades',
    guide:'docs/grenades.md',visualGuide:'docs/reviews/grenade-presentation/provider.md',profile:FARMYARD_GRENADE_PROFILE.id,
    capability:{id:GRENADE_CONTRACT.capability,version:1},requiredHostServices:[...GRENADE_COMPONENT.requiredHostServices],
    note:'Original painted prop; optional ordinary same-floor grenade transactions and native horse throw. Bind inventory, complete host context and supported consequences explicitly; reactive and multilevel scenes refuse before costs.'});
  assets.push(...TINDERBOX_ART_ASSETS);
  return '// Generated from reviewed registries; no editor or renderer runtime imports.\nexport const SHARED_ASSETS = ' + JSON.stringify(assets, null, 2) + ';\n';
}
export function checkSharedAssets() {
  if (fs.readFileSync(path.join(root, 'packages/assets/catalogue.js'), 'utf8') !== sharedAssetCatalogueSource()) throw Error('Shared asset catalogue is stale; run node tools/shared-assets.mjs --write.');
}
if (process.argv.includes('--write')) { fs.mkdirSync(path.join(root, 'packages/assets'), {recursive:true}); fs.writeFileSync(path.join(root, 'packages/assets/catalogue.js'), sharedAssetCatalogueSource()); }
