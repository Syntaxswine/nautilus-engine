// NIT 3 of round 4: G08 (a refused connect drops the host) must now die on the line that is
// labelled for it, tests/game-handoff.test.mjs:97, and not two lines later on the send's throw.
// Pristine control first; the mutation is restored in a finally.
// Usage: node g08-label.mjs <checkout> <out.json>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]);
const git = (...args) => spawnSync('git', ['-C', root, ...args], {encoding: 'utf8'}).stdout.trim();
const prefix = pathToFileURL(root).href + '/';
const runTest = () => {
  const result = spawnSync('node --test --test-reporter=tap tests/game-handoff.test.mjs', {cwd: root, shell: true, encoding: 'utf8'});
  const out = (result.stdout + result.stderr).replaceAll(prefix, 'file:///<checkout>/');
  return {status: result.status, pass: Number(out.match(/^# pass (\d+)$/m)?.[1]), fail: Number(out.match(/^# fail (\d+)$/m)?.[1]),
    error: out.match(/^\s+error: (?:\|-\r?\n\s+)?(.*)$/m)?.[1] ?? null, actual: out.match(/^\s+actual: (.*)$/m)?.[1] ?? null,
    at: out.match(/tests\/game-handoff\.test\.mjs:\d+:\d+/)?.[0] ?? null};
};
const record = {head: git('rev-parse', 'HEAD'), statusBefore: git('status', '--short')};
if (record.statusBefore) throw Error('Refusing a dirty tree:\n' + record.statusBefore);
record.pristine = runTest();
const file = path.join(root, 'apps/editor/game-handoff.js'), original = fs.readFileSync(file), text = original.toString('utf8');
const find = 'host = checkGameAdapter(adapter); onChange();', replace = 'host = null; host = checkGameAdapter(adapter); onChange();';
if (text.split(find).length !== 2) throw Error('G08: the needle must occur exactly once');
try { fs.writeFileSync(file, text.replace(find, replace)); record.G08 = runTest(); }
finally { fs.writeFileSync(file, original); }
record.restored = fs.readFileSync(file).equals(original);
record.statusAfter = git('status', '--short');
fs.writeFileSync(outFile, JSON.stringify(record, null, 1));
console.log(JSON.stringify(record, null, 1));
