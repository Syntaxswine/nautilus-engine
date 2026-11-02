// Compares round 5's re-run of answer-proof.mjs with the committed record, verdict by verdict, failing
// test by failing test, and browser row by browser row. Usage: node compare-proof.mjs <committed> <rerun> <out.json>
import fs from 'node:fs';
const [committedFile, rerunFile, outFile] = process.argv.slice(2);
const a = JSON.parse(fs.readFileSync(committedFile, 'utf8')), b = JSON.parse(fs.readFileSync(rerunFile, 'utf8'));
const byId = list => Object.fromEntries(list.map(row => [row.id, row]));
const ha = byId(a.headless), hb = byId(b.headless), ba = byId(a.browser), bb = byId(b.browser);
const headless = Object.keys(ha).map(id => ({id, committed: ha[id].verdict, rerun: hb[id]?.verdict,
  sameVerdict: ha[id].verdict === hb[id]?.verdict, sameFailingTests: JSON.stringify([...ha[id].suite.failed].sort()) === JSON.stringify([...(hb[id]?.suite.failed || [])].sort()),
  check: [ha[id].check, hb[id]?.check], build: [ha[id].build, hb[id]?.build], package: [ha[id].package, hb[id]?.package]}));
const browser = Object.keys(ba).map(id => ({id, committed: {status: ba[id].status, seconds: ba[id].seconds, afterLastCapture: ba[id].afterLastCapture, captures: ba[id].captures, failure: ba[id].failure},
  rerun: {status: bb[id]?.status, seconds: bb[id]?.seconds, afterLastCapture: bb[id]?.afterLastCapture, captures: bb[id]?.captures, failure: bb[id]?.failure},
  sameMessage: ba[id].failure === bb[id]?.failure, secondsDelta: bb[id] ? +(bb[id].seconds - ba[id].seconds).toFixed(1) : null}));
const out = {committed: {head: a.head, statusBefore: a.statusBefore, statusAfter: a.statusAfter, baseline: a.baseline.tests + '/' + a.baseline.pass, distBefore: a.distBefore, distAfter: a.distAfter},
  rerun: {head: b.head, statusBefore: b.statusBefore, statusAfter: b.statusAfter, baseline: b.baseline.tests + '/' + b.baseline.pass, distBefore: b.distBefore, distAfter: b.distAfter, distRestored: b.distRestored},
  headlessAllSameVerdict: headless.every(row => row.sameVerdict), headlessAllSameFailingTests: headless.every(row => row.sameFailingTests), headless, browser};
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(JSON.stringify({committed: out.committed, rerun: out.rerun, headlessAllSameVerdict: out.headlessAllSameVerdict, headlessAllSameFailingTests: out.headlessAllSameFailingTests}, null, 1));
for (const row of headless.filter(row => !row.sameVerdict || !row.sameFailingTests)) console.log('HEADLESS DIFF', JSON.stringify(row));
for (const row of browser) console.log(row.id.slice(0, 40).padEnd(42), 'committed', row.committed.seconds, row.committed.afterLastCapture, '| rerun', row.rerun.seconds, row.rerun.afterLastCapture, '| same message', row.sameMessage);
