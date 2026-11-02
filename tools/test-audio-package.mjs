import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {audioDistribution, audioProjectRoot as root} from './audio-distribution.mjs';
const output = path.join(root, 'artifacts/audio-package');
fs.mkdirSync(output, {recursive: true});
const npmCli = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')].find(file => file && path.basename(file) === 'npm-cli.js' && fs.existsSync(file));
if (!npmCli) throw Error('Run using a Node installation containing npm.');
const scratch = fs.mkdtempSync(path.join(output, 'proof-')), stage = path.join(scratch, 'stage'), consumer = path.join(scratch, 'consumer');
fs.mkdirSync(stage); fs.mkdirSync(consumer);
const npm = (args, cwd) => execFileSync(process.execPath, [npmCli, ...args], {cwd, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024});
let result;
try {
  const plan = audioDistribution();
  for (const file of plan.files) {const target = path.join(stage, file); fs.mkdirSync(path.dirname(target), {recursive: true}); fs.copyFileSync(path.join(root, file), target);}
  fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify(plan, null, 2) + '\n');
  const packed = JSON.parse(npm(['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', output], stage))[0];
  const archive = path.join(output, packed.filename);
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({name: 'audio-installed-proof', type: 'module', private: true}));
  npm(['install', '--offline', '--ignore-scripts', '--package-lock=false', '--no-audit', '--no-fund', archive], consumer);
  const guide = fs.readFileSync(path.join(root, 'modules/audio/README.md'), 'utf8');
  const snippet = /```js\r?\n([\s\S]*?)\r?\n```/.exec(guide)?.[1];
  if (!snippet) throw Error('Missing audio guide example.');
  fs.writeFileSync(path.join(consumer, 'proof.mjs'), `import assert from 'node:assert/strict';
import fs from 'node:fs';
${snippet}
assert.ok(wav.length > 44); assert.ok(cues.mouth.length); assert.ok(cues.reveal.length);
assert.equal(globalThis.document, undefined); assert.equal(globalThis.window, undefined);
const {createSpeaker} = await import('@nautilus-engine/audio/runtime');
assert.equal(typeof createSpeaker, 'function'); assert.throws(() => createSpeaker(null), /needs an AudioContext/);
for(const file of ['modules/audio/README.md','modules/audio/NOTICE.md','docs/reviews/2026-11-02-babble-lab.md','vendor/babble-lab/0df4be4a05cfa7b636624e1911c5413a9fe844cd/README.md']) assert.ok(fs.existsSync('./node_modules/@nautilus-engine/audio/'+file));
console.log('Installed @nautilus-engine/audio: public imports, guide, notices and headless synthesis pass.');
`);
  const proof = execFileSync(process.execPath, ['proof.mjs'], {cwd: consumer, windowsHide: true, encoding: 'utf8', timeout: 30000});
  result = {name: plan.name, file: archive, integrity: packed.integrity, files: packed.entryCount, compressedBytes: packed.size, proof: proof.trim()};
} finally {
  const resolved = fs.realpathSync(scratch), base = fs.realpathSync(output);
  if (!resolved.startsWith(base + path.sep) || !path.basename(resolved).startsWith('proof-')) throw Error('Refusing cleanup outside the owned audio proof directory.');
  fs.rmSync(resolved, {recursive: true, force: true});
}
fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
