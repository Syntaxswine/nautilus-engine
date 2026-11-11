import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {BABBLE_ROOT, babbleBrowserFiles, checkBabbleLab} from './check-babble-lab.mjs';
import {moduleReferenceGraph} from './module-references.mjs';
export const audioProjectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const AUDIO_ENTRIES = {'.': './modules/audio/index.js', './runtime': './modules/audio/runtime.js'};
const slash = file => path.relative(audioProjectRoot, file).replaceAll('\\', '/');
export function audioDistribution({browser = false} = {}) {
  const source = JSON.parse(fs.readFileSync(path.join(audioProjectRoot, 'modules/audio/package.json')));
  const runtime = moduleReferenceGraph(Object.values(AUDIO_ENTRIES).map(file => path.resolve(audioProjectRoot, file)), {root: audioProjectRoot}).map(record => slash(record.filename));
  const support = ['modules/audio/package.json', 'modules/audio/source.json', 'modules/audio/README.md', 'modules/audio/NOTICE.md',
    'docs/reviews/2026-11-02-babble-lab.md', ...['README.md', 'package.json', 'provenance.json'].map(file => BABBLE_ROOT + '/' + file)];
  if (browser) {
    const manifest = JSON.parse(fs.readFileSync(path.join(audioProjectRoot, BABBLE_ROOT, 'provenance.json')));
    support.push(...babbleBrowserFiles(manifest).map(file => BABBLE_ROOT + '/' + file));
  }
  const files = [...new Set([...runtime, ...support])].sort();
  if (files.some(file => !file.startsWith('modules/audio/') && !file.startsWith(BABBLE_ROOT + '/') && file !== 'docs/reviews/2026-11-02-babble-lab.md')) throw Error('Audio distribution escaped its declared scope.');
  return {name: source.name, version: source.version, private: true, type: 'module', engines: source.engines, exports: AUDIO_ENTRIES, files};
}
export function buildAudio() {
  const evidence = checkBabbleLab(audioProjectRoot), plan = audioDistribution({browser: true});
  const output = path.resolve(audioProjectRoot, 'artifacts/audio-dist');
  if (output !== path.join(audioProjectRoot, 'artifacts', 'audio-dist') || fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw Error('Invalid owned audio output directory.');
  fs.rmSync(output, {recursive: true, force: true}); fs.mkdirSync(output, {recursive: true});
  for (const file of plan.files) {
    const target = path.join(output, file); fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(audioProjectRoot, file), target);
  }
  fs.writeFileSync(path.join(output, 'package.json'), JSON.stringify(plan, null, 2) + '\n');
  const report = {schemaVersion: 1, package: plan.name, version: plan.version, source: evidence, files: plan.files.map(file => {
    const data = fs.readFileSync(path.join(output, file)); return {path: file, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex')};
  })};
  moduleReferenceGraph([path.join(output, 'modules/audio/index.js'), path.join(output, 'modules/audio/runtime.js'), path.join(output, BABBLE_ROOT, 'workbench/app.mjs')], {root: output});
  fs.writeFileSync(path.join(output, 'build-provenance.json'), JSON.stringify(report, null, 2) + '\n');
  return {output, files: plan.files.length, source: evidence};
}
