import fs from 'node:fs';
import {blankMap, edgeKey} from '../packages/map-core/maps.js';
import {cityProp} from '../packages/city-props/index.js';

const map = blankMap('Bell & Alder · Shops and rooms, c. 1885');
for (let y = 3; y <= 22; y++) for (let x = 2; x <= 27; x++) {
  map.terrain[y][x] = y >= 16 && y <= 21 ? 'ground-gravel' : y === 15 || y === 22 ? 'ground-concrete' : 'ground-dirt';
}
function room(x, w, door) {
  for (let y = 6; y <= 14; y++) {
    for (let xx = x; xx < x + w; xx++) map.terrain[y][xx] = 'ground-wood-planks';
    for (const xx of [x - 1, x + w - 1]) map.edges[edgeKey('e', xx, y, 0)] = 'wall-brick';
  }
  for (let xx = x; xx < x + w; xx++) {
    map.edges[edgeKey('s', xx, 5, 0)] = 'wall-brick';
    map.edges[edgeKey('s', xx, 14, 0)] = xx === door ? 'door' : xx === door - 1 || xx === door + 1 ? 'window-brick' : 'wall-brick';
  }
}
room(4, 8, 7);
room(12, 6, 15);
room(18, 8, 21);
for (let x = 18; x <= 25; x++) map.edges[edgeKey('s', x, 9, 0)] = x === 21 ? 'door' : 'wall-brick';
map.starts = [{x:9,y:18,z:0}, {x:10,y:18,z:0}, {x:9,y:19,z:0}, {x:10,y:19,z:0}];
map.exits = [{x:25,y:19,z:0}];

const layout = [
  ['reflector-sconce-lit',4,6], ['shelf-stocked',5,6], ['shelf-empty',6,6], ['shelf-stocked',7,6],
  ['scale-counter',5,9], ['counter',6,9], ['glass-case',7,9], ['corner-counter',8,9], ['counter',8,8,90],
  ['bolt-rack',10,7], ['dry-bin',10,11], ['shop-pendant-lit',7,11], ['entry-lantern-lit',9,15],
  ['reflector-sconce-unlit',12,6], ['apothecary',13,6], ['apothecary',14,6], ['shelf-stocked',15,6],
  ['glass-case',13,9], ['counter',14,9], ['scale-counter',15,9], ['shop-pendant-unlit',15,11],
  ['hand-lantern-lit',16,13], ['entry-lantern-unlit',16,15],
  ['bedstead',19,6], ['dresser',22,6], ['washstand',24,6], ['rocker',18,7,270],
  ['side-chair',23,8,270], ['table-lamp-unlit',24,8], ['settee',18,10],
  ['armchair',24,10,270], ['side-chair',19,12,90], ['dining-table',21,12],
  ['pedestal-table',24,13], ['table-lamp-lit',24,11], ['hand-lantern-unlit',18,13]
];
for (const [name, x, y, rotation = 0] of layout) {
  const {id: kind} = cityProp('city1880-' + name);
  map.props.push({kind, x, y, z: 0, rotation, rotated: rotation % 180 === 90});
}
const output = new URL('../assets/city-props/workshop-sample.json', import.meta.url);
const data = JSON.stringify(map) + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(output, 'utf8') !== data) throw new Error('The 1880s Workshop sample is stale.');
} else fs.writeFileSync(output, data);
console.log('Bell & Alder · ' + map.props.length + ' workshop placements.');
