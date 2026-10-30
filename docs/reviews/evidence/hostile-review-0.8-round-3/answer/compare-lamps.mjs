// Are the committed lamp-lit maps' lamps where round 3's reviewer put them?
import fs from 'node:fs';
import path from 'node:path';
const [mine, theirs] = process.argv.slice(2);
for (const id of ['w1-32x-largest', 'w4-32-gross', 'w5b-walls-free-angle', 'w6-roofs-144', 'w7-mixed-13-gross-19-largest']) {
  const lamps = file => (JSON.parse(fs.readFileSync(file, 'utf8')).props || []).filter(p => p.kind === 'campfire' || p.kind === 'standing-torch').map(p => p.kind + '@' + p.x + ',' + p.y).join(' ');
  const a = lamps(path.join(mine, 'l' + id.slice(1) + '-lamps.json')), b = lamps(path.join(theirs, id, id + '.json'));
  const blank = lamps(path.join(mine, 'l' + id.split('-')[0].slice(1) + '-blank.json')) === lamps(path.join(theirs, id, 'w0-blank.json'));
  console.log(id.padEnd(30), a === b ? 'same lamps' : 'DIFFERENT\n  mine   ' + a + '\n  theirs ' + b, '| blank', blank ? 'same' : 'DIFFERENT');
}
