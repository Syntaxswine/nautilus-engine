// Round 4's should-fix mutants, re-measured by the author with needles written from the code,
// independently of the reviewer's runner and mutant list. Every edit is restored in a finally.
// Usage: node verify.mjs <checkout> <out.json> [--browser]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]), browser = process.argv.includes('--browser');
const git = (...args) => spawnSync('git', ['-C', root, ...args], {encoding: 'utf8'}).stdout.trim();
const run = (command, timeout = 600000) => {
  const start = Date.now(), result = spawnSync(command, {cwd: root, shell: true, encoding: 'utf8', timeout, maxBuffer: 64 << 20});
  return {status: result.status, seconds: (Date.now() - start) / 1000, out: (result.stdout || '') + (result.stderr || '')};
};
const count = (out, word) => Number((out.match(new RegExp('^\\D*' + word + ' (\\d+)$', 'm')) || [])[1] ?? NaN);
const E = 'apps/editor/editor.js';
const MUTANTS = [
  ['N01 refresh writes disabled every time', E, 'if (button.disabled !== disabled) button.disabled = disabled;', 'button.disabled = disabled;'],
  ['N02 Send observer watches childList', E, "handoffState.observe(originalHandoff, {attributes: true, attributeFilter: ['disabled']});", 'handoffState.observe(originalHandoff, {childList: true});'],
  ['N03 status mirror observes characterData only', E, 'observe(source, {childList: true, subtree: true, characterData: true})', 'observe(source, {characterData: true})'],
  ['N04 feedback once-only guard dropped', E, "if (!heading || !source || document.getElementById('nautilus-settings-feedback')) return;", 'if (!heading || !source) return;'],
  ['N06 open() without await', E, 'await window.editor3d.open(document);', 'window.editor3d.open(document);'],
  ['F01 launchPlaytest drops return', 'tools/build.mjs', 'return window.nautilus.sendToGame(json);}', 'window.nautilus.sendToGame(json);}'],
  ['F02 click handler drops await', 'tools/editor-wall-adapter.mjs', 'await launchPlaytest(getDocument().export());', 'launchPlaytest(getDocument().export());'],
  ['C30 clearance tolerance 1 mm', 'packages/adapters/tinderbox/index.js', '< radius - 1e-10;', '< radius - 1e-3;'],
];

const record = {head: git('rev-parse', 'HEAD'), statusBefore: git('status', '--short'), started: new Date().toISOString(), headless: [], browser: null};
if (record.statusBefore) throw Error('Refusing a dirty tree:\n' + record.statusBefore);
const suite = () => { const r = run('node --test --test-reporter=tap tests/*.test.mjs'); return {status: r.status, pass: count(r.out, '# pass'), fail: count(r.out, '# fail'), seconds: r.seconds}; };
record.baseline = suite();
if (record.baseline.status !== 0) throw Error('The pristine suite fails');

function withMutant([id, file, find, replace], body) {
  const full = path.join(root, file), original = fs.readFileSync(full), text = original.toString('utf8');
  if (text.split(find).length !== 2) throw Error(id + ': the needle must occur exactly once');
  try { fs.writeFileSync(full, text.replace(find, replace)); return body(); }
  finally { fs.writeFileSync(full, original); if (!fs.readFileSync(full).equals(original)) throw Error(id + ': restore failed'); }
}

for (const mutant of MUTANTS) {
  const row = withMutant(mutant, () => {
    const result = {id: mutant[0], file: mutant[1], suite: suite(), check: run('npm run check -- --tracked').status};
    if (mutant[1].startsWith('tools/')) { result.build = run('npm run build').status; result.package = run('npm run test:package').status; }
    return result;
  });
  record.headless.push(row); console.log(JSON.stringify(row));
}

if (browser) {
  record.browser = withMutant(MUTANTS[0], () => {
    const build = run('npm run build'), acceptance = run('npm run review:integration', 300000);
    return {id: MUTANTS[0][0], build: build.status, status: acceptance.status, seconds: acceptance.seconds, tail: acceptance.out.trim().split('\n').slice(-12).join('\n')};
  });
  record.rebuild = run('npm run build').status;
  console.log(JSON.stringify(record.browser));
}
record.statusAfter = git('status', '--short');
record.finished = new Date().toISOString();
fs.writeFileSync(outFile, JSON.stringify(record, null, 1));
