import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorAssets} from '../apps/editor/asset-catalog.js';
import {BUILDING_ASSETS, ORIGINAL_BUILDING_SOURCE} from '../packages/prefab-core/registry.js';
import {ROCK_ITEM, ROCK_PROFILE} from '../packages/items-core/index.js';
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
  return '// Generated from reviewed registries; no editor or renderer runtime imports.\nexport const SHARED_ASSETS = ' + JSON.stringify(assets, null, 2) + ';\n';
}
export function checkSharedAssets() {
  if (fs.readFileSync(path.join(root, 'packages/assets/catalogue.js'), 'utf8') !== sharedAssetCatalogueSource()) throw Error('Shared asset catalogue is stale; run node tools/shared-assets.mjs --write.');
}
if (process.argv.includes('--write')) { fs.mkdirSync(path.join(root, 'packages/assets'), {recursive:true}); fs.writeFileSync(path.join(root, 'packages/assets/catalogue.js'), sharedAssetCatalogueSource()); }
