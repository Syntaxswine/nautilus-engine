// The answer to round 4's should-fixes, measured on a clean checkout. Each mutant is one exact edit
// whose needle must occur once, restored byte for byte in a finally. Every mutant runs the full suite
// and `check --tracked`; mutants in tools/ also run the build and `test:package`. With --browser, the
// page-visible mutants run the build and review:integration, timed from the last capture to the
// failure, with a pristine run first as the control; afterwards dist/ must hash as it did before.
// The script refuses a dirty tree and records HEAD and `git status`.
// Usage: node answer-proof.mjs <checkout> <out.json> [--browser] [--only=ID,ID]
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]), flags = process.argv.slice(4);
const browser = flags.includes('--browser'), only = flags.find(flag => flag.startsWith('--only='))?.slice(7).split(',');
const git = (...args) => spawnSync('git', ['-C', root, ...args], {encoding: 'utf8'}).stdout.trim();
const run = (command, timeout = 900000) => {
  const start = Date.now(), result = spawnSync(command, {cwd: root, shell: true, encoding: 'utf8', timeout, maxBuffer: 256 << 20});
  return {status: result.status, seconds: (Date.now() - start) / 1000, out: (result.stdout || '') + (result.stderr || '')};
};
const E = 'apps/editor/editor.js', H = 'tools/editor-game-handoff.mjs', A = 'packages/adapters/tinderbox/index.js', GUARD = '< radius - 1e-10;';
// [id, file, find, replace, what the answer expects]
const MUTANTS = [
  ['N01 refresh writes disabled every time', E, 'if (button.disabled !== disabled) button.disabled = disabled;', 'button.disabled = disabled;', 'killed'],
  ['N17 Send observer drops its attribute filter', E, "{attributes: true, attributeFilter: ['disabled']}", '{attributes: true}', 'killed'],
  ['N02 Send observer watches childList', E, "handoffState.observe(originalHandoff, {attributes: true, attributeFilter: ['disabled']});", 'handoffState.observe(originalHandoff, {childList: true});', 'killed'],
  ['N03 status mirror observes characterData only', E, 'observe(source, {childList: true, subtree: true, characterData: true})', 'observe(source, {characterData: true})', 'killed'],
  ['N04 feedback once-only guard dropped', E, "if (!heading || !source || document.getElementById('nautilus-settings-feedback')) return;", 'if (!heading || !source) return;', 'killed'],
  ['N11 quick Send ignores a block', E, 'quick.disabled = button.disabled;', 'quick.disabled = !handoff.hasGameAdapter;', 'killed'],
  ['N12 Send title follows disabled, not the host', E, "button.title = handoff.hasGameAdapter ?'Send", "button.title = !button.disabled ?'Send", 'killed'],
  ['N16 body observer never installed', E, 'observer.observe(document.body, {childList: true, subtree: true}); refreshHandoff();', 'refreshHandoff();', 'survives: equivalent while Send exists at load'],
  ['N06 open() without await', E, 'await window.editor3d.open(document);', 'window.editor3d.open(document);', 'killed'],
  ['N07 Example yard replaces edits when the user cancels', E, 'if (window.editor3d?.document?.changed && !confirm(', 'if (window.editor3d?.document?.changed && confirm(', 'killed'],
  ['N13 Example yard load failure reported as success', E, "try {await window.nautilus.open(exampleYard());status(", 'try {window.nautilus.open(exampleYard()).catch(() => {});status(', 'killed'],
  ['N14 Example yard ignores the loading guard', E, "if (window.editor3d?.loading) return status('Wait for the current map to finish loading.');", '', 'killed'],
  ['Z00 neutral control in editor.js', E, '// Observe the tools once they are installed', '// Observe the tools once they have been installed', 'survives: neutral'],
  ['F01 launchPlaytest drops return', H, 'return window.nautilus.sendToGame(json);}', 'window.nautilus.sendToGame(json);}', 'killed'],
  ['F02 click handler drops await', H, 'await launchPlaytest(getDocument().export());', 'launchPlaytest(getDocument().export());', 'killed'],
  ['F04 click handler never sets busy', H, "busy=true;status('Sending map", "status('Sending map", 'killed'],
  ['F05 launchPlaytest loses its host guard', H, "if(!window.nautilus?.hasGameAdapter)throw Error('Connect a game adapter, or export this map as JSON.');", '', 'killed'],
  ['F03 build deploys another playtest module', 'tools/build.mjs', 'text = LAUNCH_PLAYTEST;', "text = LAUNCH_PLAYTEST.replace('return ', '');", 'suite passes; the build refuses'],
  ['Z01 neutral control in editor-game-handoff.mjs', H, '// The two deployment patches that carry', '// The two deployment patches which carry', 'survives: neutral'],
  ['C30 clearance tolerance 1 mm', A, GUARD, '< radius - 1e-3;', 'killed'],
  ['C40 clearance tolerance 1 nm', A, GUARD, '< radius - 1e-9;', 'killed'],
  ['C41 clearance tolerance 0.3 nm', A, GUARD, '< radius - 3e-10;', 'killed'],
  ['C42 clearance tolerance 0.12 nm', A, GUARD, '< radius - 1.2e-10;', 'survives: inside the probes’ window'],
  ['C43 clearance tolerance 0.04 nm', A, GUARD, '< radius - 4e-11;', 'killed'],
  ['C18 clearance epsilon dropped', A, GUARD, '< radius;', 'killed'],
];
const BROWSER = ['N01', 'N17', 'N03', 'N04', 'F01', 'F02'];

const record = {node: process.version, head: git('rev-parse', 'HEAD'), statusBefore: git('status', '--short'), started: new Date().toISOString(), headless: [], browser: []};
if (record.statusBefore) throw Error('Refusing a dirty tree:\n' + record.statusBefore);
// node:test counts a test that runs out of time as cancelled, not failed, so both are counted.
const tap = out => ({tests: +(out.match(/^# tests (\d+)$/m)?.[1] ?? NaN), pass: +(out.match(/^# pass (\d+)$/m)?.[1] ?? NaN), fail: +(out.match(/^# fail (\d+)$/m)?.[1] ?? NaN),
  cancelled: +(out.match(/^# cancelled (\d+)$/m)?.[1] ?? NaN),
  failed: [...new Set([...out.matchAll(/^\s*not ok \d+ - (.*)$/gm)].map(match => match[1]).filter(name => !name.endsWith('.test.mjs')))]});
const suite = () => {const r = run('node --test --test-reporter=tap tests/*.test.mjs'); return {status: r.status, ...tap(r.out), seconds: r.seconds};};
function withMutant([id, file, find, replace], body) {
  const full = path.join(root, file), original = fs.readFileSync(full), text = original.toString('utf8');
  if (text.split(find).length !== 2) throw Error(id + ': the needle must occur exactly once');
  try { fs.writeFileSync(full, text.replace(find, replace)); return body(); }
  finally { fs.writeFileSync(full, original); if (!fs.readFileSync(full).equals(original)) throw Error(id + ': restore failed'); }
}
const distDigest = () => {
  const dist = path.join(root, 'dist'), files = [];
  const walk = folder => {for (const entry of fs.readdirSync(folder, {withFileTypes: true})) {const file = path.join(folder, entry.name); if (entry.isDirectory()) walk(file); else files.push([path.relative(dist, file).split(path.sep).join('/'), createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);}};
  walk(dist); files.sort(([a], [b]) => a < b ? -1 : 1);
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(files))).digest('hex');
};
// review:integration with a timestamp on each output line, so a failure is timed from the last capture.
const acceptance = () => new Promise(resolve => {
  fs.rmSync(path.join(root, 'artifacts/engine-integration/browser-failure.json'), {force: true});
  const start = Date.now(), lines = [], child = spawn(process.execPath, ['tools/review-engine-integration.mjs'], {cwd: root, windowsHide: true});
  const timer = setTimeout(() => child.kill(), 400000);
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {for (const line of chunk.toString().split('\n')) if (line.trim() && !line.startsWith('{')) lines.push({at: (Date.now() - start) / 1000, line: line.slice(0, 400)});});
  child.on('close', status => {
    clearTimeout(timer);
    const captures = lines.filter(item => item.line.startsWith('Capturing ')), last = captures.at(-1), end = (Date.now() - start) / 1000;
    let failure = null; try { failure = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/engine-integration/browser-failure.json'), 'utf8')).message.split('\n')[0]; } catch {}
    resolve({status, seconds: end, captures: captures.length, afterLastCapture: last ? +(end - last.at).toFixed(1) : null, failure: status ? failure : null, tail: lines.slice(-4).map(item => item.at + 's ' + item.line)});
  });
});

record.baseline = suite();
if (record.baseline.status !== 0) throw Error('The pristine suite fails');
for (const mutant of MUTANTS.filter(m => !only || only.includes(m[0].split(' ')[0]))) {
  const row = withMutant(mutant, () => {
    const result = {id: mutant[0], file: mutant[1], expected: mutant[4], suite: suite(), check: run('npm run check -- --tracked').status};
    if (mutant[1].startsWith('tools/')) { result.build = run('npm run build').status; result.package = run('npm run test:package').status; }
    return result;
  });
  row.verdict = row.suite.fail > 0 ? 'killed' : row.suite.cancelled > 0 ? 'killed: a test ran out of time' : row.build ? 'build refuses' : row.suite.status === 0 ? 'survives' : 'crash';
  record.headless.push(row); console.log(JSON.stringify({id: row.id, verdict: row.verdict, failed: row.suite.failed.slice(0, 3), seconds: row.suite.seconds}));
}
if (browser) {
  if (run('npm run build').status) throw Error('The pristine build fails');
  record.distBefore = distDigest();
  record.browser.push({id: 'pristine', ...(await acceptance())});
  console.log(JSON.stringify(record.browser.at(-1)));
  for (const id of BROWSER.filter(id => !only || only.includes(id))) {
    const mutant = MUTANTS.find(m => m[0].startsWith(id + ' '));
    const full = path.join(root, mutant[1]), original = fs.readFileSync(full), text = original.toString('utf8');
    if (text.split(mutant[2]).length !== 2) throw Error(id + ': the needle must occur exactly once');
    let row;
    try { fs.writeFileSync(full, text.replace(mutant[2], mutant[3])); const build = run('npm run build').status; row = {id: mutant[0], build, ...(build ? {} : await acceptance())}; }
    finally { fs.writeFileSync(full, original); if (!fs.readFileSync(full).equals(original)) throw Error(id + ': restore failed'); }
    record.browser.push(row); console.log(JSON.stringify(row));
  }
  record.rebuild = run('npm run build').status;
  record.distAfter = distDigest(); record.distRestored = record.distAfter === record.distBefore;
}
record.statusAfter = git('status', '--short');
record.finished = new Date().toISOString();
fs.writeFileSync(outFile, JSON.stringify(record, null, 1));
