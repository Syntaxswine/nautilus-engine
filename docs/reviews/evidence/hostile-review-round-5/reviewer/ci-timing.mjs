// CI timing of review:integration from the browser-workflow job logs (gh run view --job <id> --log).
// For each job: seconds from the line "> node tools/review-engine-integration.mjs" to each capture and
// to the acceptance record. Run from artifacts/r5/ci: node ../ci-timing.mjs
import fs from 'node:fs';
const ts = line => {const m = line.match(/(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+)Z/); return m ? Date.parse(m[1].slice(0, 23) + 'Z') : NaN;};
const rows = [];
for (const file of fs.readdirSync('.').filter(name => /^job-\d+\.log$/.test(name)).sort()) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const start = lines.findIndex(line => line.includes('> node tools/review-engine-integration.mjs'));
  if (start < 0) {rows.push({job: file.slice(4, -4), error: 'no review step'}); continue;}
  const t0 = ts(lines[start]), after = lines.slice(start);
  const caps = after.filter(line => line.includes('Capturing '));
  const rec = after.find(line => line.includes('{"sourceCommit"'));
  const sourceCommit = rec ? rec.slice(rec.indexOf('{"sourceCommit"') + 16, rec.indexOf('{"sourceCommit"') + 23) : null;
  const buildStart = lines.findIndex(line => line.includes('> node tools/build.mjs'));
  rows.push({job: file.slice(4, -4), sourceCommit, firstCapture: +((ts(caps[0]) - t0) / 1000).toFixed(1),
    captures: caps.map(line => +((ts(line) - t0) / 1000).toFixed(1)), record: rec ? +((ts(rec) - t0) / 1000).toFixed(1) : null,
    buildSeconds: buildStart >= 0 ? +((ts(lines[start]) - ts(lines[buildStart])) / 1000).toFixed(1) : null});
}
console.log(JSON.stringify(rows, null, 1));
fs.writeFileSync('../ci-timing.json', JSON.stringify(rows, null, 1));
