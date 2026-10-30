// Targeted check: a send that keeps the missing-host check but skips the capability checks
// (G07b) must now fail the handoff tests; the pristine module must pass them.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root = process.argv[2], file = path.join(root, 'apps/editor/game-handoff.js'), original = fs.readFileSync(file);
const find = '{ return sendMapToGame(json, host); }';
const replace = "{ if (!host) throw Error('Connect a game adapter first.'); return host.openMap({json: openDocument(json).export(), contract: MAP_CONTRACT}); }";
const run = () => { const r = spawnSync(process.execPath, ['--test', 'tests/game-handoff.test.mjs'], {cwd: root, encoding: 'utf8', timeout: 300000});
  const text = r.stdout + r.stderr; return {exit: r.status, pass: +(/ℹ pass (\d+)/.exec(text)?.[1]), fail: +(/ℹ fail (\d+)/.exec(text)?.[1]),
    failed: [...text.matchAll(/^✖ (.+?)(?: \(\d[\d.]*ms\))?$/gm)].map(m => m[1]).filter(n => n !== 'failing tests:')}; };
const out = {pristine: run()};
if (original.toString('utf8').split(find).length !== 2) throw Error('needle');
try { fs.writeFileSync(file, original.toString('utf8').replace(find, replace)); out.G07b = run(); } finally { fs.writeFileSync(file, original); }
out.restored = fs.readFileSync(file).equals(original);
console.log(JSON.stringify(out, null, 1));
