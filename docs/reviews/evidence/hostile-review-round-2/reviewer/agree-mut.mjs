// For each clearance mutant, apply it to the pristine copy's adapter, run witness.mjs in a fresh
// process, and restore in a finally. Shows which witness maps flip under which mutant.
// Usage: node witness-mut.mjs <pristine-root>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = path.resolve(process.argv[2]), here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, 'packages/adapters/tinderbox/index.js'), original = fs.readFileSync(file);
const M = {
  'C01 hypot -> max': [['return Math.hypot(Math.max(Math.abs(player.x', 'return Math.max(Math.max(Math.abs(player.x']],
  'C02 hypot -> sum': [['return Math.hypot(Math.max(Math.abs(player.x', 'return (Math.max(Math.abs(player.x'], ['/ 2, 0), Math.max(Math.abs(player.y', '/ 2, 0) + Math.max(Math.abs(player.y']],
  'C03 vertical length -> thickness': [['(swap ? m.width : m.depth) / 2, 0)) < radius', '(swap ? m.depth : m.depth) / 2, 0)) < radius']],
  'C04 horizontal length -> thickness': [['(swap ? m.depth : m.width) / 2, 0), Math.max(', '(swap ? m.depth : m.depth) / 2, 0), Math.max(']],
  'C06 swap % 4': [['Math.round(m.heading / (Math.PI / 2)) % 2;', 'Math.round(m.heading / (Math.PI / 2)) % 4;']],
  'C07 x clamp dropped': [['return Math.hypot(Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), ', 'return Math.hypot(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, ']],
  'C09 radius 0.60': [['playerRadius: 0.56,', 'playerRadius: 0.6,']],
  'C10 radius 0.53': [['playerRadius: 0.56,', 'playerRadius: 0.53,']],
  'C13 first module skipped': [['modules.some(m => {', 'modules.slice(1).some(m => {']],
  'C14 top edge dropped': [['player.y < radius || ', '']],
  'C15 right edge dropped': [['player.x > r.width - radius || ', '']],
  'C16 bottom edge dropped': [['player.y > r.height - radius || ', '']],
  'C17 bottom uses width': [['player.y > r.height - radius', 'player.y > r.width - radius']],
};
const witness = () => JSON.parse(spawnSync(process.execPath, [path.join(here, 'consumer-agree.mjs'), root], {encoding: 'utf8'}).stdout);
const base = witness(), out = {baseAgree: base.agree};
for (const [id, edits] of Object.entries(M)) {
  let text = original.toString('utf8');
  for (const [find, replace] of edits) { if (text.split(find).length !== 2) throw Error(id + ': needle'); text = text.replace(find, replace); }
  try { fs.writeFileSync(file, text); const now = witness(); out[id] = {agree: now.agree, disagreements: Object.entries(now.rows).filter(([, r]) => (r.adapter === 'accept') !== (r.consumer === 'accept')).map(([k]) => k)}; }
  finally { fs.writeFileSync(file, original); }
}
console.log(JSON.stringify({restored: fs.readFileSync(file).equals(original), flips: out}, null, 1));
