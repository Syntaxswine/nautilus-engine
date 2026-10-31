// Turn gates/summary.txt and its logs into the review's table rows.
//   node gates-rows.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'gates');
const lines = fs.readFileSync(path.join(dir, 'summary.txt'), 'utf8').trim().split('\n');
const names = {build: '`npm run build`', 'check-tracked': '`npm run check -- --tracked`', test: '`npm test`', 'test-upstream': '`npm run test:upstream`', 'test-package': '`npm run test:package`', 'test-assets': '`npm run test:assets`', 'test-grenade-renderer': '`npm run test:grenade-renderer`', 'check-buildings': '`npm run check:buildings`', 'asset-draw-counts': '`node tools/asset-draw-counts.mjs`', 'review-integration': '`npm run review:integration`'};
for (const line of lines) {
  const m = line.match(/^(\S+) exit (\S+) (\d+)s$/); if (!m) continue;
  const [, name, exit, secs] = m, log = fs.existsSync(path.join(dir, name + '.log')) ? fs.readFileSync(path.join(dir, name + '.log'), 'utf8') : '';
  let result = '—';
  if (name === 'test') {const g = k => (log.match(new RegExp('\\u2139 ' + k + ' (\\d+)')) || [])[1]; result = `${g('pass')} / ${g('tests')} pass, ${g('fail')} fail, ${g('cancelled')} cancelled`;}
  else if (name === 'test-upstream') {const g = k => (log.match(new RegExp('\\u2139 ' + k + ' (\\d+)')) || [])[1]; result = g('tests') ? `${g('pass')} / ${g('tests')}` : (log.trim().split('\n').pop() || '').slice(0, 100);}
  else if (name === 'asset-draw-counts') result = (log.trim().split('\n').pop() || '').slice(0, 100);
  else if (name === 'review-integration') {const d = log.match(/"drawCalls":\{"frame":(\d+),"shadowPass":(\d+)/); result = d ? `drawCalls frame ${d[1]}, shadowPass ${d[2]}` : (log.trim().split('\n').pop() || '').slice(0, 100);}
  else if (name === 'test-grenade-renderer') result = /Installed renderer building facade/.test(log) ? 'includes the installed building proof ("Installed renderer building facade: …")' : 'building proof line not found';
  console.log(`| ${names[name] || name} | ${exit} | ${secs} s | ${result} |`);
}
console.log(lines.filter(l => /^(started|finished)/.test(l)).join('\n'));
