// Round 5's own one-line mutants, headless. Each mutant is one exact edit whose needle must occur
// exactly once, restored byte for byte in a finally. Each runs its target test file first; a mutant
// that passes it then runs the full suite and `check --tracked` (and, in tools/, the build and
// test:package). The script refuses a dirty tree and records HEAD and `git status` before and after.
// Usage: node sweep-r5.mjs <checkout> <out.json> [--only=ID,ID]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]);
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',');
const git = (...args) => spawnSync('git', ['-C', root, ...args], {encoding: 'utf8'}).stdout.trim();
const run = (command, timeout = 900000) => {
  const start = Date.now(), r = spawnSync(command, {cwd: root, shell: true, encoding: 'utf8', timeout, maxBuffer: 256 << 20});
  return {status: r.status, signal: r.signal, seconds: (Date.now() - start) / 1000, out: (r.stdout || '') + (r.stderr || '')};
};
const tap = out => ({tests: +(out.match(/^# tests (\d+)$/m)?.[1] ?? NaN), pass: +(out.match(/^# pass (\d+)$/m)?.[1] ?? NaN),
  fail: +(out.match(/^# fail (\d+)$/m)?.[1] ?? NaN), cancelled: +(out.match(/^# cancelled (\d+)$/m)?.[1] ?? NaN),
  failed: [...new Set([...out.matchAll(/^\s*not ok \d+ - (.*)$/gm)].map(m => m[1]).filter(n => !n.endsWith('.test.mjs')))],
  firstError: (out.match(/^\s+error: '(.*)'$/m) || out.match(/^\s+error: \|-?\n\s+(.*)$/m))?.[1]?.slice(0, 240) ?? null});
const E = 'apps/editor/editor.js', B = 'tests/editor-host-bridge.test.mjs', TB = 'tests/tinderbox-adapter.test.mjs', A = 'packages/adapters/tinderbox/index.js';
const H = 'tools/editor-game-handoff.mjs', W = 'tools/editor-wall-adapter.mjs', BUILD = 'tools/build.mjs';
// [id, file, find, replace, what it is, the test file to run first]
const MUTANTS = [
  // editor.js faults that the double should see
  ['R01', E, "attributeFilter: ['disabled']}", "attributeFilter: 'disabled'}", 'Send observer filter written as a string, not a list', B],
  ['R02', E, 'heading.append(feedback);', 'document.body.append(feedback);', 'settings feedback installed outside the settings heading', B],
  ['R03', E, "feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');", "feedback.setAttribute('aria-live', 'polite');", 'feedback loses role=status (NIT 7)', B],
  ['R04', E, "const status = text => {document.getElementById('status').textContent = text;};", "const status = text => {document.getElementById('status').innerHTML = text;};", 'the bridge status writer parses markup', B],
  ['R05', E, "observe(source, {childList: true, subtree: true, characterData: true})", "observe(source, {childList: true})", 'status mirror: childList only (equivalent while the editor writes textContent)', B],
  ['R06', E, "const observer = new MutationObserver(() => {refreshHandoff();if (document.getElementById('playtest')) observer.disconnect();});", "const observer = new MutationObserver(() => {if (document.getElementById('playtest')) observer.disconnect();});", 'body observer never refreshes (equivalent while Send exists at load)', B],
  ['R07', E, "observer.observe(document.body, {childList: true, subtree: true}); refreshHandoff();", "observer.observe(document.body, {childList: true, subtree: true});", 'no refresh at install; the first refresh waits for a body record', B],
  ['R08', E, "if (button.disabled !== disabled) button.disabled = disabled;", "if (button.disabled !== disabled) button.disabled = disabled; else button.title = button.title;", 'refresh rewrites the title twice (no loop: title is filtered out)', B],
  ['R09', E, "feedback.hidden = !feedback.textContent;", "feedback.hidden = !source.textContent;", 'feedback hidden from the source (equivalent)', B],
  ['R10', E, "new MutationObserver(reflect).observe(source,", "new MutationObserver(reflect).observe(document.body,", 'status mirror observes the whole body: it re-triggers itself', B],
  ['R11', E, "const quick = document.getElementById('quick-playtest');if (quick && button) {", "const quick = document.getElementById('quick-playtest');if (quick) {", 'quick mirror without its Send guard (equivalent)', B],
  ['R12', E, "if (window.editor3d?.document?.changed && !confirm(", "if (window.editor3d?.document?.changed && !window.confirm(", 'confirm read from window (equivalent in a page)', B],
  // stricter than the browser: equivalent refactors in the page
  ['S01', E, "document.querySelector('#editor-settings .settings-heading')", "document.querySelector('.settings-heading')", 'an equivalent selector (one .settings-heading in the page)', B],
  ['S02', E, "document.querySelector('.properties').id", "document.querySelector('aside.properties').id", 'an equivalent selector', B],
  ['S03', E, "feedback.hidden = !feedback.textContent;", "feedback.toggleAttribute('hidden', !feedback.textContent);", 'an equivalent toggleAttribute', B],
  ['S04', E, "feedback.id = 'nautilus-settings-feedback';", "feedback.id = 'nautilus-settings-feedback'; feedback.className = 'nautilus-feedback';", 'an added class (harmless)', B],
  // the deployed Send click: free bindings the build check does not pin
  ['D01', W, "SEND_CLICK, 'await game handoff result');", "SEND_CLICK, 'await game handoff result');\n    text = once(text, \"import {launchPlaytest} from './editor-playtest.js';\", \"const launchPlaytest=json=>{window.nautilus.sendToGame(json);};\", 'test');", 'the deployed click calls another launchPlaytest; both checked texts are unchanged', B],
  ['D02', W, "SEND_CLICK, 'await game handoff result');", "SEND_CLICK, 'await game handoff result');\n    text = text.replace(SEND_CLICK, () => SEND_CLICK + \"$('playtest').onclick=()=>launchPlaytest(getDocument().export());\");", 'a later assignment replaces the deployed click; SEND_CLICK still occurs once', B],
  // the author's three former hangs, timed on the bridge test file alone (claim: 3.3-3.5 s by assertion)
  ['N07', E, 'if (window.editor3d?.document?.changed && !confirm(', 'if (window.editor3d?.document?.changed && confirm(', 'author N07, re-timed', B],
  ['N14', E, "if (window.editor3d?.loading) return status('Wait for the current map to finish loading.');", '', 'author N14, re-timed', B],
  ['F04', H, "busy=true;status('Sending map", "status('Sending map", 'author F04, re-timed', B],
  // SF2/SF3: faults that leave a test awaiting a promise nobody releases
  ['W01', H, "if(getDocument().block)return status('Place the block in a full map to send it to a game.');", '', 'the deployed click ignores a block: the test awaits the host', B],
  ['W02', E, 'await window.editor3d.open(document);return', 'await window.editor3d.open(document);await window.editor3d.open(document);return', 'open() loads the document twice', B],
  ['W03', E, "try {await window.nautilus.open(exampleYard());status(", "try {await window.nautilus.open(exampleYard());await window.nautilus.open(exampleYard());status(", 'the Example yard is opened twice', B],
  // the deployed click's guards that the test stubs with constants
  ['W04', H, 'if(validate().length)return;', '', 'the deployed click skips the editor validation', B],
  ['W05', H, 'if(busy||isLoading())return', 'if(busy)return', 'the deployed click ignores a loading editor', B],
  // SF4 tolerance mutants
  ['T01', A, '< radius - 1e-10;', '<= radius - 1e-10;', 'strict comparison relaxed', TB],
  ['T02', A, '< radius - 1e-10;', '< radius - 6e-11;', 'tolerance 0.06 nm', TB],
  ['T03', A, '< radius - 1e-10;', '< radius - 1.49e-10;', 'tolerance 0.149 nm', TB],
  ['T04', A, '< radius - 1e-10;', '< radius - 5e-11;', 'tolerance 0.05 nm (the accepted probe sits on it)', TB],
  ['T05', A, '< radius - 1e-10;', '< radius - 1.5e-10;', 'tolerance 0.15 nm (the refused probe sits on it)', TB],
  ['T06', A, '< radius - 1e-10;', '< radius * (1 - 1e-10);', 'relative tolerance, 0.056 nm here', TB],
  ['T07', A, '< radius - 1e-10;', '< radius - 1e-10 - 1e-14;', 'tolerance + 1e-14', TB],
];

const record = {node: process.version, head: git('rev-parse', 'HEAD'), statusBefore: git('status', '--short'), started: new Date().toISOString(), rows: []};
if (record.statusBefore) throw Error('Refusing a dirty tree:\n' + record.statusBefore);
const baseline = {};
for (const file of new Set(MUTANTS.map(m => m[5]))) { const r = run('node --test --test-reporter=tap ' + file); baseline[file] = {status: r.status, ...tap(r.out), seconds: r.seconds}; if (r.status) throw Error('The pristine ' + file + ' fails'); }
record.baseline = baseline;
for (const [id, file, find, replace, what, first] of MUTANTS.filter(m => !only || only.includes(m[0]))) {
  const full = path.join(root, file), original = fs.readFileSync(full), text = original.toString('utf8');
  if (text.split(find).length !== 2) throw Error(id + ': the needle must occur exactly once');
  let row;
  try {
    fs.writeFileSync(full, text.replace(find, () => replace));
    const target = run('node --test --test-reporter=tap ' + first, 120000);
    row = {id, file, what, target: {status: target.status, signal: target.signal, ...tap(target.out), seconds: target.seconds}};
    if (target.status === 0) {
      const suite = run('node --test --test-reporter=tap tests/*.test.mjs');
      row.suite = {status: suite.status, ...tap(suite.out), seconds: suite.seconds};
      row.check = run('npm run check -- --tracked').status;
      if (file.startsWith('tools/')) { const build = run('npm run build'); row.build = build.status; row.buildMessage = build.status ? build.out.split('\n').find(l => /Error/.test(l))?.slice(0, 200) : null; row.package = run('npm run test:package').status; }
    }
  } finally { fs.writeFileSync(full, original); if (!fs.readFileSync(full).equals(original)) throw Error(id + ': restore failed'); }
  row.verdict = row.target.status !== 0 ? (row.target.fail > 0 ? 'killed' : row.target.cancelled > 0 ? 'killed: ran out of time' : 'killed: crash') : row.suite.status !== 0 ? 'killed by another file' : row.build ? 'build refuses' : 'survives every headless gate';
  record.rows.push(row); console.log(JSON.stringify({id, verdict: row.verdict, failed: row.target.failed.slice(0, 3), error: row.target.firstError}));
}
record.statusAfter = git('status', '--short'); record.finished = new Date().toISOString();
fs.writeFileSync(outFile, JSON.stringify(record, null, 1));
