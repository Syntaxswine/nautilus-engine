import assert from 'node:assert/strict';
import {ROAD_VEHICLE_ASSETS} from '../packages/vehicle-visuals/catalogue.js';
import {roadVehicleBuildSource} from './editor-road-vehicles.mjs';
import {createHash} from 'node:crypto';

// Exact skin bytes reviewed on the finished bodies in Map Workshop. Keep this
// allowlist separate from the authoring tool's mutable provenance ledger.
const skinHashes = {
  "packages/vehicle-visuals/skins/hatchback.png": "c9cfd3635cbe41127d7da4372a7c52281b89c198972eefa485638511c49eaf40",
  "packages/vehicle-visuals/skins/sedan.png": "c71b2360f4ad22142253fef37750eea24f1ebc0308ad8afc06bbe1085f991190",
  "packages/vehicle-visuals/skins/pickup.png": "7608069824532607cd9ad0fe77e5ac25e675ed8d15e4d1784ce726ec70183022",
  "packages/vehicle-visuals/skins/crew-pickup.png": "c2e0bbbe2dcc3080aba8e65b270735ae398d61069d94af19b356f3bee672e710",
  "packages/vehicle-visuals/skins/cargo-van.png": "d5d4ca4c4b21fe7332105bd5cc59961960a81e07da6c7e8d980652bc63ebba5b",
  "packages/vehicle-visuals/skins/passenger-van.png": "ecdde4417a783532bffe32e2d2dcd1be2a543366e5635dc99381ae3b803199a2",
  "packages/vehicle-visuals/skins/utility-suv.png": "a153f3a76c3343861d134562611e3d919909e748123b8765fbf34ca7ee06206b",
  "packages/vehicle-visuals/skins/crossover.png": "cf83d93fc6ab72c1c220583f32b1f72d0ac65461bb6ecdc771faba4d0df3c95c",
  "packages/vehicle-visuals/skins/running-gear.png": "d04c45707f4b3a64a4c711d6789c49b880be3f8768e5b53c581c5503572668a7"
};
export function authenticatedRoadVehicleImages(profile,{read,indexed=()=>{}}){
  if(profile!=='renderer'&&profile!=='compatibility')return [];
  for(const [file,sha]of Object.entries(skinHashes)){
    const bytes=read(file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,'Unreviewed road vehicle skin: '+file);
    indexed(file,bytes);
  }
  return Object.keys(skinHashes);
}

const runtime = ['catalogue.js', 'sculpt.js', 'three.js', 'reduced.js', 'reduced-data.js', 'reduction.json',
  ...['hatchback','sedan','pickup','crew-pickup','cargo-van','passenger-van','utility-suv','crossover','running-gear'].map(id=>'skins/'+id+'.png')]
  .map(file => 'packages/vehicle-visuals/' + file);
export function roadVehiclePackageFiles(profile) {
  return ['docs/road-vehicles.md', 'vendor/meshoptimizer/7b2d4f4c817aea55d74dcd65d9763ac2ca608026/LICENSE.md',
    ...(profile === 'renderer' || profile === 'compatibility' ? runtime : [])];
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
  const provenance=JSON.parse(read('tools/vehicle-art/provenance.json'));
  for(const row of provenance.files){
    const bytes=read(row.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,'Vehicle artwork source hash: '+row.path);
    indexed(row.path,bytes);
  }
  indexed('tools/vehicle-art/provenance.json',read('tools/vehicle-art/provenance.json'));
}
