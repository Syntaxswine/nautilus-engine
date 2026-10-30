// Round 5's mutants in the browser: the build, then review:integration under each mutant, timed from the
// last capture to the failure, with a pristine run first as the control. Capture digests are compared
// with the pristine run's. Each needle must occur once; each edit is restored byte for byte in a finally;
// afterwards the build must hash as it did before. The script refuses a dirty tree and records HEAD and
// `git status`. Usage: node bm-r5.mjs <checkout> <out.json> ID[,ID...]
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]), ids = (process.argv[4] || '').split(',').filter(Boolean);
const git = (...args) => spawnSync('git', ['-C', root, ...args], {encoding: 'utf8'}).stdout.trim();
const run = command => {const start = Date.now(), r = spawnSync(command, {cwd: root, shell: true, encoding: 'utf8', timeout: 900000, maxBuffer: 256 << 20}); return {status: r.status, seconds: (Date.now() - start) / 1000, out: (r.stdout || '') + (r.stderr || '')};};
const E = 'apps/editor/editor.js', H = 'tools/editor-game-handoff.mjs', W = 'tools/editor-wall-adapter.mjs';
const MUTANTS = {
  R01: [E, "attributeFilter: ['disabled']}", "attributeFilter: 'disabled'}"],
  R02: [E, 'heading.append(feedback);', 'document.body.append(feedback);'],
  R04: [E, "const status = text => {document.getElementById('status').textContent = text;};", "const status = text => {document.getElementById('status').innerHTML = text;};"],
  S01: [E, "document.querySelector('#editor-settings .settings-heading')", "document.querySelector('.settings-heading')"],
  S03: [E, "feedback.hidden = !feedback.textContent;", "feedback.toggleAttribute('hidden', !feedback.textContent);"],
  D01: [W, "SEND_CLICK, 'await game handoff result');", "SEND_CLICK, 'await game handoff result');\n    text = once(text, \"import {launchPlaytest} from './editor-playtest.js';\", \"const launchPlaytest=json=>{window.nautilus.sendToGame(json);};\", 'test');"],
  D02: [W, "SEND_CLICK, 'await game handoff result');", "SEND_CLICK, 'await game handoff result');\n    text = text.replace(SEND_CLICK, () => SEND_CLICK + \"$('playtest').onclick=()=>launchPlaytest(getDocument().export());\");"],
  W01: [H, "if(getDocument().block)return status('Place the block in a full map to send it to a game.');", ''],
};
const distDigest = () => {
  const dist = path.join(root, 'dist'), files = [];
  const walk = folder => {for (const entry of fs.readdirSync(folder, {withFileTypes: true})) {const file = path.join(folder, entry.name); if (entry.isDirectory()) walk(file); else files.push([path.relative(dist, file).split(path.sep).join('/'), createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);}};
  walk(dist); files.sort(([a], [b]) => a < b ? -1 : 1);
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(files))).digest('hex');
};
const out = path.join(root, 'artifacts/engine-integration');
const captureDigests = () => Object.fromEntries(fs.readdirSync(out).filter(n => n.endsWith('.png')).sort().map(n => [n, createHash('sha256').update(fs.readFileSync(path.join(out, n))).digest('hex').slice(0, 16)]));
const acceptance = () => new Promise(resolve => {
  for (const name of fs.existsSync(out) ? fs.readdirSync(out).filter(n => n.endsWith('.png') || n === 'browser-failure.json') : []) fs.rmSync(path.join(out, name), {force: true});
  const start = Date.now(), lines = [], child = spawn(process.execPath, ['tools/review-engine-integration.mjs'], {cwd: root, windowsHide: true});
  const timer = setTimeout(() => child.kill(), 400000);
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {for (const line of chunk.toString().split('\n')) if (line.trim() && !line.startsWith('{')) lines.push({at: (Date.now() - start) / 1000, line: line.trim().slice(0, 400)});});
  child.on('close', status => {
    clearTimeout(timer);
    const captures = lines.filter(item => item.line.startsWith('Capturing ')), last = captures.at(-1), end = (Date.now() - start) / 1000;
    let failure = null; try { failure = JSON.parse(fs.readFileSync(path.join(out, 'browser-failure.json'), 'utf8')).message.slice(0, 600); } catch {}
    const pageErrors = lines.filter(item => /PAGE ERROR|CONSOLE ERROR/.test(item.line)).map(item => item.at + 's ' + item.line);
    resolve({status, seconds: end, captures: captures.length, afterLastCapture: last ? +(end - last.at).toFixed(1) : null, failure: status ? failure : null, pageErrors, digests: captureDigests()});
  });
});
const record = {node: process.version, head: git('rev-parse', 'HEAD'), statusBefore: git('status', '--short'), started: new Date().toISOString(), runs: []};
if (record.statusBefore) throw Error('Refusing a dirty tree:\n' + record.statusBefore);
if (run('npm run build').status) throw Error('The pristine build fails');
record.distBefore = distDigest();
const pristine = await acceptance(); record.runs.push({id: 'pristine', ...pristine}); console.log(JSON.stringify({id: 'pristine', status: pristine.status, seconds: pristine.seconds}));
for (const id of ids) {
  const [file, find, replace] = MUTANTS[id], full = path.join(root, file), original = fs.readFileSync(full), text = original.toString('utf8');
  if (text.split(find).length !== 2) throw Error(id + ': the needle must occur exactly once');
  let row;
  try {
    fs.writeFileSync(full, text.replace(find, () => replace));
    const build = run('npm run build');
    row = {id, file, build: build.status, buildMessage: build.status ? build.out.split('\n').filter(l => /Error/.test(l)).slice(0, 2).join(' | ').slice(0, 300) : null};
    if (!build.status) { const a = await acceptance(); row = {...row, ...a, capturesIdenticalToPristine: JSON.stringify(a.digests) === JSON.stringify(pristine.digests)}; }
  } finally { fs.writeFileSync(full, original); if (!fs.readFileSync(full).equals(original)) throw Error(id + ': restore failed'); }
  record.runs.push(row); console.log(JSON.stringify({id, build: row.build, status: row.status, seconds: row.seconds, afterLastCapture: row.afterLastCapture, failure: row.failure?.slice(0, 200), pageErrors: row.pageErrors?.slice(0, 2), same: row.capturesIdenticalToPristine}));
}
record.rebuild = run('npm run build').status; record.distAfter = distDigest(); record.distRestored = record.distAfter === record.distBefore;
record.statusAfter = git('status', '--short'); record.finished = new Date().toISOString();
fs.writeFileSync(outFile, JSON.stringify(record, null, 1));
