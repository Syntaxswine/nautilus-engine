import {blankMap} from './index.js';

// A small authored yard inside the inherited full-sector format. This is a
// portable demonstration blueprint, not a mission or a generated campaign.
export function exampleYard() {
  const map = blankMap('Nautilus · Workshop yard');
  for (let y = 2; y < 23; y++) for (let x = 2; x < 26; x++) map.terrain[y][x] = 'ground-concrete';
  for (let y = 3; y < 14; y++) for (let x = 4; x < 15; x++) map.terrain[y][x] = 'floor';
  for (let x = 4; x < 15; x++) { map.edges['s:' + x + ':2'] = 'wall-brick'; map.edges['s:' + x + ':13'] = 'wall-brick'; }
  for (let y = 3; y < 14; y++) { map.edges['e:3:' + y] = 'wall-brick'; map.edges['e:14:' + y] = 'wall-brick'; }
  delete map.edges['s:9:13']; delete map.edges['s:10:13'];
  for (let y = 2; y < 25; y++) for (let x = 18; x < 22; x++) map.terrain[y][x] = 'ground-asphalt';
  map.starts = [{x:9,y:17},{x:10,y:17},{x:9,y:18},{x:10,y:18}];
  map.exits = [{x:19,y:23}];
  map.guards = [];
  map.props = [{x:5,y:4,kind:'crate-wood'}, {x:7,y:4,kind:'crate-wood'}, {x:12,y:7,kind:'barrel-single'}, {x:6,y:10,kind:'workbench-vise'}];
  return map;
}
