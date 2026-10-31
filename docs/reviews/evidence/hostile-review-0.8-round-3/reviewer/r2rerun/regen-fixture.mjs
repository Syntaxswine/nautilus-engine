// Mutation helper: re-record tests/fixtures/original-building-geometry.json with
// the tree's current renderer and digest function, keeping its recordedFrom
// block (what a developer "refreshing the fixture" would produce).
//   node regen-fixture.mjs <tree>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const tree = path.resolve(process.argv[2]);
const imp = p => import(pathToFileURL(path.join(tree, p)).href);
const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
const {DESIGNS} = await imp('packages/building-catalog/index.js');
const {createBuildingModel} = await imp('packages/building-catalog/three.js');
const {buildingDigests} = await imp('tools/building-geometry.mjs');
const file = path.join(tree, 'tests/fixtures/original-building-geometry.json');
const fixture = JSON.parse(fs.readFileSync(file, 'utf8'));
fixture.digests = buildingDigests(T, createBuildingModel, DESIGNS.map(d => d.id));
fs.writeFileSync(file, JSON.stringify(fixture, null, 1) + '\n');
console.log('re-recorded ' + Object.keys(fixture.digests).length + ' digests');
