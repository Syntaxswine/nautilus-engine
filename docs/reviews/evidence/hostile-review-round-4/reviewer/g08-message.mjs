// Which assertion kills G08 (a refused connect drops the current host)? Applies G08 to
// apps/editor/game-handoff.js, runs tests/game-handoff.test.mjs, restores in a finally, and prints
// node:test's failure detail. Refuses a dirty tree. Usage: node g08-message.mjs <root>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {MUTANTS, H} from './mutants.mjs';
const root = path.resolve(process.argv[2]);
if (execFileSync('git', ['-C', root, 'status', '--short'], {encoding: 'utf8'})) { console.error('Refusing a dirty tree'); process.exit(2); }
const file = path.join(root, H), original = fs.readFileSync(file), [, [edit]] = MUTANTS.G08;
let text;
try {
  fs.writeFileSync(file, original.toString('utf8').replace(edit.find, edit.replace));
  const r = spawnSync(process.execPath, ['--test', 'tests/game-handoff.test.mjs'], {cwd: root, encoding: 'utf8', windowsHide: true});
  text = (r.stdout || '') + (r.stderr || '');
} finally { fs.writeFileSync(file, original); }
const at = text.lastIndexOf('✖ failing tests:');
console.log(JSON.stringify({restored: fs.readFileSync(file).equals(original), detail: text.slice(at, at + 1400).split('\n').filter(l => l.trim()).slice(0, 18)}, null, 1));
