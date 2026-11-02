import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {editorAssets} from '../apps/editor/asset-catalog.js';
import {BIOME_GROUNDS, BIOME_TEXTURES} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/biome-foliage-data.js';
import {BIOME_TERRAIN} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/biome-gameplay-data.js';
import {ANIMAL_MOTION_CATALOG} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/animal-motion-catalog.js';
import {machinePaintPath} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/factory-machine-paint.js';
import {SCENERY_PROPS} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/scenery-catalog.js';

export function checkEditorAssets(root, sources, tracked = null) {
  const assets = editorAssets(), keys = new Set();
  const donorRoot = path.join(root,sources.aft.root);
  const manifest = JSON.parse(fs.readFileSync(path.join(donorRoot,'provenance.json')));
  const declared = new Set(manifest.files.map(entry => path.resolve(donorRoot,entry.path)));
  const supplementRoot = path.join(root,sources.aftAssets.root);
  const supplement = JSON.parse(fs.readFileSync(path.join(supplementRoot,'provenance.json')));
  for (const entry of supplement.files) declared.add(path.resolve(supplementRoot,entry.path));
  const prefabRoot=path.join(root,sources.tinderboxPrefabs.root),prefabs=JSON.parse(fs.readFileSync(path.join(prefabRoot,'provenance.json')));
  for(const entry of prefabs.files)declared.add(path.resolve(prefabRoot,entry.path));
  const requireDeclared = target => {if (!declared.has(target) || !fs.existsSync(target)) throw Error('Editor dependency is outside the reviewed source manifest: ' + target);};
  for (const asset of assets) {
    const key = asset.category + ':' + asset.id;
    if (keys.has(key) || !asset.tool || !asset.name || !asset.w || !asset.h) throw Error('Invalid editor asset: ' + key);
    keys.add(key);
  }
  for (const name of fs.readdirSync(path.join(root,'apps/editor')).filter(name => name.endsWith('.js'))) {
    const relative = 'apps/editor/' + name, file = path.join(root,relative), text = fs.readFileSync(file,'utf8');
    if (tracked && !tracked.has(relative)) throw Error('Editor adapter is not tracked by Git: ' + relative);
    for (const match of text.matchAll(/(?:\bfrom\s*|new URL\(\s*)['"]([^'"]*vendor\/[^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(file),match[1]), expected = path.join(root,sources.aft.root) + path.sep;
      if ((!target.startsWith(expected) && !target.startsWith(prefabRoot+path.sep)) || !fs.existsSync(target)) throw Error('Editor asset dependency does not match a reviewed source pin: ' + match[1]);
      requireDeclared(target);
    }
  }
  const biomeModule = path.join(root,sources.aft.root,'dist/tactics/biome-foliage-data.js');
  const atlas = fileURLToPath(new URL(BIOME_TEXTURES.ground,pathToFileURL(biomeModule)));
  requireDeclared(atlas);
  for (const family of Object.values(BIOME_TERRAIN)) if (!BIOME_GROUNDS[family]) throw Error('Missing biome swatch panel: ' + family);
  for (const profile of ANIMAL_MOTION_CATALOG) for (const dependency of [profile.file,profile.paint,profile.tailPaint].filter(Boolean)) requireDeclared(path.resolve(path.dirname(biomeModule),dependency));
  for (const rule of Object.values(SCENERY_PROPS).filter(rule => rule.model === 'machine')) {
    requireDeclared(path.join(donorRoot,'dist/tactics',`machine-${rule.form}-10k-data.json`));
    requireDeclared(path.resolve(supplementRoot,'dist/tactics',machinePaintPath(rule.form)));
  }
  return assets;
}
