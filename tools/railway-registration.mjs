import assert from 'node:assert/strict';
import {RAIL_TRACK_ASSETS} from '../packages/railway-visuals/catalogue.js';
import {railwayRoutePackageFiles} from './railway-route-registration.mjs';
import {trainPackageFiles, trainPackageExports, checkTrainRegistration, trainBuildBytes} from './train-registration.mjs';

const guide = 'docs/railway-track-kit.md';
const modules = ['catalogue.js', 'paint.js', 'three.js', 'rolling-stock.js', 'miniature-stock.js', 'stock-profile.js', 'train-view.js', 'signal-view.js', 'entrances.js']
  .map(name => 'packages/railway-visuals/' + name);
const renderer = 'packages/assets/three.js';

export function railwayPackageFiles(profile) {
  const pieces = profile === 'renderer' || profile === 'compatibility' ? modules : [];
  return [guide, ...pieces, ...railwayRoutePackageFiles(profile), ...trainPackageFiles(profile)];
}

function insert(text, anchor, replacement) {
  assert.equal(text.split(anchor).length, 2, 'Expected one railway registration anchor: ' + anchor);
  return text.replace(anchor, replacement);
}

// Apply only the railway additions to the already authenticated artwork
// preimages. The historical checks still verify every prior row and file.
export function registeredRailwayBytes(file, before) {
  if (file === 'tools/build.mjs') return trainBuildBytes(before);
  if (file === 'packages/assets/catalogue.js') {
    const text = before.toString('utf8');
    const marker = 'export const SHARED_ASSETS = ';
    const end = text.indexOf(marker) + marker.length;
    const rows = JSON.parse(text.slice(end).replace(/;\n$/, ''));
    return Buffer.from(text.slice(0, end) + JSON.stringify([...rows, ...RAIL_TRACK_ASSETS], null, 2) + ';\n');
  }
  if (file === 'tools/shared-assets.mjs') {
    let text = before.toString('utf8');
    const importLine = "import {editorAssets} from '../apps/editor/asset-catalog.js';";
    const append = '  assets.push(...sharedArtworkDiscoveryRows());';
    text = insert(text, importLine, importLine + "\nimport {RAIL_TRACK_ASSETS} from '../packages/railway-visuals/catalogue.js';");
    text = insert(text, 'editorAssets().map(item', 'editorAssets().filter(item => !item.railwayPiece).map(item');
    return Buffer.from(insert(text, append, append + '\n  assets.push(...RAIL_TRACK_ASSETS);'));
  }
  if (file === 'tools/distribution.mjs') {
    let text = insert(before.toString('utf8'), "'docs/shared-artwork.md');", "'docs/shared-artwork.md','" + guide + "');");
    const anchor = "import {sharedArtworkPayloadPaths} from '../packages/assets/artwork.js';";
    text = insert(text, anchor, anchor + "\nimport {trainPackageFiles} from './train-registration.mjs';");
    text = insert(text, "'./grenades/view'].includes(id)", "'./grenades/view','./trains/ui','./trains/style.css'].includes(id)");
    return Buffer.from(insert(text, '  const files = [...new Set(', '  extras.push(...trainPackageFiles(profile));\n  const files = [...new Set('));
  }
  if (file === 'package.json') {
    const pkg = JSON.parse(before);
    Object.assign(pkg.exports, trainPackageExports());
    pkg.files = [...pkg.files, ...railwayPackageFiles('compatibility')].sort();
    return Buffer.from(JSON.stringify(pkg, null, 2) + '\n');
  }
  return before;
}

export function checkRailwayRenderer({baseFile, read, indexed}) {
  checkTrainRegistration({read, indexed});
  const anchor = "import {buildingAsset} from '../prefab-core/registry.js';";
  const expected = insert(baseFile(renderer).toString('utf8'), anchor,
    anchor + "\nexport {createRailwayKit} from '../railway-visuals/three.js';" +
    "\nexport {createRollingStockKit} from '../railway-visuals/rolling-stock.js';" +
    "\nexport {createRailwayTrainView} from '../railway-visuals/train-view.js';" +
    "\nexport {createRailwaySignalView} from '../railway-visuals/signal-view.js';");
  const actual = read(renderer);
  assert.ok(actual.equals(Buffer.from(expected)), 'Unreviewed railway renderer facade bytes.');
  indexed(renderer, actual);
  for (const file of [...railwayPackageFiles('renderer'), 'tools/railway-registration.mjs']) {
    const bytes = read(file);
    assert.ok(bytes.length, 'Empty railway registration file: ' + file);
    indexed(file, bytes);
  }
}
