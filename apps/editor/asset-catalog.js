import {GROUNDS, PROPS, EDGES} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/environment.js';
import {SPECIES} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {SCENERY_PROPS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/scenery-catalog.js';
import {SITE_PROPS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/strategic-site-rules.js';
import {HEDGE_PROPS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hedge-data.js';
import {BIOME_TERRAIN_NAMES} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/biome-gameplay-data.js';
import {roadLabel} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/diagonal-roads.js';
import {roofLabel} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/climbable-roofs.js';
import {FOLIAGE_PRESETS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/foliage-presets.js';
import {MAP_LEVELS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/map-layers.js';
import {ANIMAL_MOTION_CATALOG} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/animal-motion-catalog.js';
import {WINDOW_BAYS, WINDOW_KIT} from '../../packages/window-kit/index.js';

export const ASSET_CATEGORIES = ['Terrain', 'Objects', 'Roofs', 'Boundaries', 'Windows', 'People', 'Foliage', 'Cliffs', 'Ramps'];
const readable = id => id.replaceAll('-', ' ').replace(/^./, c => c.toUpperCase());
const label = (id, name) => name && name !== id ? name : readable(id);

// Derive entries from the same registries as the placement tools. Adding a
// reviewed donor asset must not require maintaining a second list of IDs.
export function editorAssets() {
  const assets = GROUNDS.map(id => ({id, category:'Terrain', name:label(id, BIOME_TERRAIN_NAMES[id] || roadLabel(id)), tool:'texture', bindings:{'ground-kind':id}, w:1, h:1}));
  for (const id of ['floor', 'water', 'bridge']) assets.push({id, category:'Terrain', name:readable(id), tool:id, bindings:{}, w:1, h:1});
  for (const [id, rule] of Object.entries(PROPS)) {
    let category = id.startsWith('roof-') ? 'Roofs' : rule.cliff ? 'Cliffs' : rule.ramp || id.startsWith('rampbank-') ? 'Ramps' : 'Objects';
    let tool = category === 'Roofs' ? 'roof-tile' : category === 'Cliffs' ? 'cliff' : 'prop';
    let bindings = {[category === 'Cliffs' ? 'cliff-kind' : 'prop-kind']:id};
    if (rule.ramp) {
      const [,surface,direction] = id.split('-');
      tool = 'ramp'; bindings = {'ramp-surface':surface, 'ramp-placement':'manual', 'ramp-direction':direction};
    } else if (id.startsWith('rampbank-')) {
      const [,surface,direction,side,step] = id.split('-');
      tool = 'ramp-bank'; bindings = {'bank-surface':surface, 'bank-direction':direction, 'bank-side':side, 'bank-step':step};
    }
    assets.push({id, category, name:label(id, SCENERY_PROPS[id]?.name || SITE_PROPS[id]?.name || HEDGE_PROPS[id]?.name || roofLabel(id)), tool, bindings, w:rule.w, h:rule.h,
      disabled:(SCENERY_PROPS[id]?.rise || 0) >= MAP_LEVELS ? 'This arch needs a higher playable layer.' : '',
      note:rule.cliff ? 'Corner mask, contour and sand blend are set in Tool options.' : rule.ramp ? 'Place at the lower level with a clear approach and supported upper landing.' : ''});
  }
  for (const id of Object.keys(EDGES)) assets.push({id, category:'Boundaries', name:readable(id), tool:'wall', bindings:{'edge-kind':id}, w:1, h:1});
  for (const profile of WINDOW_BAYS) assets.push({id:profile.id,category:'Windows',name:profile.name,tool:'window-sculpture',bindings:{},preview:'window-bay',w:WINDOW_KIT.span,h:1,
    disabled:'Sculpture preview. Map placement and character traversal are the next step.',
    note:profile.description});
  for (const profile of ANIMAL_MOTION_CATALOG) {
    const id = profile.id;
    assets.push({id, category:'People', name:profile.label, tool:'guard', bindings:{'unit-species':id, 'unit-weapon':profile.unarmed ? 'hands' : 'rifle', 'unit-outfit':'normal'}, w:1, h:1,
      disabled:SPECIES.includes(id) ? '' : 'Preview only. The current portable map format does not support placing this character.',
      note:'Choose Guard or NPC and facing in Tool options.'});
  }
  // Movement's inherited change handler selects a generic preset. Apply the
  // authored preset last so wetland/bog identities survive that handler.
  for (const [id, rule] of Object.entries(FOLIAGE_PRESETS)) assets.push({id, category:'Foliage', name:rule.label, tool:'foliage-cover', bindings:{'foliage-mode':'paint', 'foliage-density':'65', 'foliage-tree-cover':'brush-v1', 'foliage-passability':rule.blocked ? 'blocked' : 'passable', 'foliage-preset':id}, w:8, h:8, note:rule.summary});
  return assets.sort((a,b) => ASSET_CATEGORIES.indexOf(a.category)-ASSET_CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));
}

export function findAssets(assets, query = '', category = '') {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return assets.filter(asset => (!category || asset.category === category) && words.every(word => `${asset.id} ${asset.name} ${asset.category}`.toLowerCase().includes(word)));
}
