// Falsifiers for the bench's two refusals, in one SwiftShader run (w0 + w1):
//  - isolation: the probe's asset set forgets prefab instances, so isolated frames
//    drop w1's instanced draws and must disagree with frame minus blank;
//  - expect: the pinned w1 exterior count is raised by one draw, so the candidate's
//    measured frame must disagree with it.
// The bench must exit 1 and name both. The built dist/ is not touched: the probe is
// injected from tools/bench at run time and the fixture is read from the tree.
// Restores both files in a finally.
// Usage: node falsify-isolation.mjs <baseline tree> <out dir>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const [baseline, outDir] = process.argv.slice(2);
const probe = 'tools/bench/editor-probe.js', fixture = 'tests/fixtures/asset-draw-counts.json';
const originals = new Map([probe, fixture].map(file => [file, fs.readFileSync(file, 'utf8')]));
let run;
try {
  const from = '    for (const {mesh} of s.prefabs?.instanced || []) roots.add(mesh);\n';
  if (originals.get(probe).split(from).length !== 2) throw Error('probe anchor not found once');
  fs.writeFileSync(probe, originals.get(probe).replace(from, () => ''));
  const pinned = JSON.parse(originals.get(fixture)); pinned.workloads['w1-32x-largest'].exterior.prefabs.main += 1;
  fs.writeFileSync(fixture, JSON.stringify(pinned, null, 1) + '\n');
  fs.mkdirSync(outDir, {recursive: true});
  run = spawnSync(process.execPath, ['tools/bench-asset-rendering.mjs', '--editor', '--a', baseline, '--runs', '2', '--backend', 'swiftshader', '--opens', '1', '--blocks', '1', '--assets-only', '--expect',
    '--scenes', 'w0-blank,w1-32x-largest', '--out', path.join(outDir, 'falsify.json')], {encoding: 'utf8', maxBuffer: 1 << 30});
} finally {
  for (const [file, text] of originals) fs.writeFileSync(file, text);
}
const refused = (run.stderr.match(/Refused:[\s\S]*/) || [''])[0];
console.log('bench exit', run.status);
console.log(refused.split('\n').slice(0, 12).join('\n'));
console.log('isolation refusal present:', /w1-32x-largest \w+ [ab] run \d: isolated/.test(refused));
console.log('expect refusal present:', /w1-32x-largest overview run \d: candidate drew/.test(refused));
console.log('restored:', [...originals].every(([file, text]) => fs.readFileSync(file, 'utf8') === text));
