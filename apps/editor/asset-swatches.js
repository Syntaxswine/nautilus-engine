import {BIOME_TERRAIN} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/biome-gameplay-data.js';
import {BIOME_GROUNDS, BIOME_TEXTURES} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/biome-foliage-data.js';
import {tilePreview} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-tool-previews.js';

export function terrainSwatch(kind) {
  const image = new Image(); image.alt = ''; image.loading = 'lazy';
  const panel = BIOME_GROUNDS[BIOME_TERRAIN[kind]];
  if (!panel) {image.src = tilePreview(kind); return image;}
  // Sample the existing atlas using its renderer metadata. No new artwork or
  // absent ground-tiles exports, and no asynchronous canvas copy per swatch.
  const [column,row,columns,rows] = panel;
  const frame = document.createElement('span'); frame.className = 'asset-terrain-swatch'; frame.setAttribute('aria-hidden','true');
  image.src = new URL(BIOME_TEXTURES.ground, new URL('../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/biome-foliage-data.js', import.meta.url)).href;
  image.style.cssText = `width:${columns*100}%;height:${rows*100}%;left:${-column*100}%;top:${-row*100}%`;
  frame.append(image); return frame;
}
