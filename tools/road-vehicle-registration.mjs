import assert from 'node:assert/strict';
import {ROAD_VEHICLE_ASSETS} from '../packages/vehicle-visuals/catalogue.js';
import {roadVehicleBuildSource} from './editor-road-vehicles.mjs';

const runtime = ['catalogue.js', 'sculpt.js', 'three.js'].map(file => 'packages/vehicle-visuals/' + file);
export function roadVehiclePackageFiles(profile) {
  return ['docs/road-vehicles.md', ...(profile === 'renderer' || profile === 'compatibility' ? runtime : [])];
}
function once(text, anchor, replacement, label = anchor) {
  assert.equal(text.split(anchor).length, 2, 'Expected one vehicle registration anchor: ' + label);
  return text.replace(anchor, replacement);
}
// Replay only these explicit additions after the authenticated railway additions.
export function roadVehicleRegisteredBytes(file, bytes) {
  if (file === 'tools/build.mjs') return Buffer.from(roadVehicleBuildSource(bytes.toString('utf8'), once));
  if (file === 'packages/assets/three.js') {
    return Buffer.from(once(bytes.toString('utf8'), '// Public visual asset facade. Hosts supply their existing Three and renderer.',
      "// Public visual asset facade. Hosts supply their existing Three and renderer.\nexport {createRoadVehicleKit} from '../vehicle-visuals/three.js';"));
  }
  if (file === 'packages/assets/catalogue.js') {
    const text = bytes.toString('utf8'), marker = 'export const SHARED_ASSETS = ';
    const start = text.indexOf(marker) + marker.length;
    const rows = JSON.parse(text.slice(start).replace(/;\r?\n$/, ''));
    return Buffer.from(text.slice(0, start) + JSON.stringify([...rows, ...ROAD_VEHICLE_ASSETS], null, 2) + ';\n');
  }
  if (file === 'tools/shared-assets.mjs') {
    let text = once(bytes.toString('utf8'), "import {RAIL_TRACK_ASSETS} from '../packages/railway-visuals/catalogue.js';",
      "import {RAIL_TRACK_ASSETS} from '../packages/railway-visuals/catalogue.js';\nimport {ROAD_VEHICLE_ASSETS} from '../packages/vehicle-visuals/catalogue.js';");
    text = once(text, '!item.railwayPiece', '!item.railwayPiece && !item.roadVehicle');
    return Buffer.from(once(text, '  assets.push(...RAIL_TRACK_ASSETS);',
      '  assets.push(...RAIL_TRACK_ASSETS);\n  assets.push(...ROAD_VEHICLE_ASSETS);'));
  }
  if (file === 'tools/distribution.mjs') {
    let text = once(bytes.toString('utf8'), "import {trainPackageFiles} from './train-registration.mjs';",
      "import {trainPackageFiles} from './train-registration.mjs';\nimport {roadVehiclePackageFiles} from './road-vehicle-registration.mjs';");
    return Buffer.from(once(text, '  extras.push(...trainPackageFiles(profile));',
      '  extras.push(...trainPackageFiles(profile));\n  extras.push(...roadVehiclePackageFiles(profile));'));
  }
  if (file === 'package.json') {
    const pkg = JSON.parse(bytes);
    pkg.files = [...new Set([...pkg.files, ...roadVehiclePackageFiles('compatibility')])].sort();
    return Buffer.from(JSON.stringify(pkg, null, 2) + '\n');
  }
  return bytes;
}
export function checkRoadVehicleRegistration({read, indexed}) {
  for (const file of [...roadVehiclePackageFiles('compatibility'), 'tools/road-vehicle-registration.mjs', 'tools/editor-road-vehicles.mjs']) {
    const bytes = read(file);
    assert.ok(bytes.length, 'Empty road vehicle registration file: ' + file);
    indexed(file, bytes);
  }
}