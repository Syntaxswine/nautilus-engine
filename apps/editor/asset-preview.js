import {blankMap, edgeKey, setTerrain} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {rampInfo} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/cliff-ramps.js';
import {paintFoliage} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-foliage-brush.js';
import {MAP_LEVELS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/map-layers.js';

// Disposable presentation data, never the user's document or an exported map.
export function assetPreview(asset, appearance = {}) {
  if(asset.preview==='furniture')return {
    document:{furniture:{id:asset.id,rotation:appearance.rotation||0,mode:appearance.mode||'painted',lowAngle:appearance.lowAngle===true}},
    view:{span:3,preset:'0'}
  };
  const map = blankMap('Asset preview');
  map.terrain = Array.from({length:24}, () => Array(24).fill('void'));
  map.levels = MAP_LEVELS; map.upper = Array.from({length:MAP_LEVELS-1}, () => ({}));
  map.props = []; map.guards = []; map.starts = []; map.exits = []; map.edges = {};
  const sample = ['Terrain','Foliage'].includes(asset.category);
  const w = sample ? (asset.category === 'Foliage' ? 8 : 4) : asset.category === 'Boundaries' ? 3 : asset.w;
  const h = sample ? w : asset.category === 'Boundaries' ? 2 : asset.h;
  const x = Math.floor((24-w)/2), y = Math.floor((24-h)/2), units = [];
  for (let dy=-1;dy<=h;dy++) for (let dx=-1;dx<=w;dx++) setTerrain(map,x+dx,y+dy,0,'ground-grass');
  if (asset.category === 'Terrain') {
    for (let dy=0;dy<h;dy++) for (let dx=0;dx<w;dx++) setTerrain(map,x+dx,y+dy,0,asset.id);
  } else if (asset.category === 'Boundaries') {
    for (let dx=0;dx<w;dx++) map.edges[edgeKey('s',x+dx,y)] = asset.id;
  } else if (asset.category === 'People') {
    const unit = {id:'guard-preview', x,y,z:0,species:asset.id,weapon:asset.id === 'hen' ? 'hands' : appearance.weapon || 'rifle',outfit:appearance.outfit || 'normal',heading:225,role:'Asset preview'};
    units.push(unit); map.guards.push(unit);
  } else if (asset.category === 'Foliage') {
    paintFoliage(map,{tool:'foliage-cover',start:{x,y,z:0},end:{x:x+w-1,y:y+h-1,z:0},options:{foliagePreset:asset.id,foliageDensity:65,foliageTreeCover:'brush-v1'}},24);
  } else {
    const prop = {kind:asset.id,x,y,z:0}; map.props.push(prop);
    if (asset.tool === 'ramp') {
      const r = rampInfo(prop); setTerrain(map,r.exit.x,r.exit.y,1,'ground-grass');
      if (!r.surface.startsWith('wood')) map.props.push({kind:'cliff-ledge',x:r.exit.x,y:r.exit.y,z:0,cliffMask:15});
    }
  }
  const span = Math.max(5,w+2,h+2) * 1.45;
  return {document:{map,size:24,units,block:true}, view:{x:x+(w-1)/2,y:y+(h-1)/2,span,preset:'0'}};
}
