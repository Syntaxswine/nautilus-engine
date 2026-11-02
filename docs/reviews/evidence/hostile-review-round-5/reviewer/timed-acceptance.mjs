// The browser acceptance, timed. It writes a copy of tools/review-engine-integration.mjs into this
// folder with marks around its bounded waits, a long-task observer, and its own output folder, then runs
// it N times (quiet, or under busy loops killed by their own handles in a finally). The real script and
// tree are not touched. Usage: node timed-acceptance.mjs <checkout> <out.json> <runs> [--stress=16]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {pathToFileURL, fileURLToPath} from 'node:url';

const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]), runs = +process.argv[4] || 1;
const stress = +(process.argv.find(arg => arg.startsWith('--stress='))?.slice(9) || 0);
const here = path.dirname(fileURLToPath(import.meta.url));
let text = fs.readFileSync(path.join(root, 'tools/review-engine-integration.mjs'), 'utf8');
const swap = (needle, replacement) => {if (text.split(needle).length !== 2) throw Error('Needle not unique: ' + needle.slice(0, 60)); text = text.replace(needle, () => replacement);};
swap("from './art-review-browser.mjs';", "from '" + pathToFileURL(path.join(root, 'tools/art-review-browser.mjs')).href + "';");
swap("output:'engine-integration'", "output:'r5-timed'");
swap("page.on('dialog',dialog=>dialog.accept());", "page.on('dialog',dialog=>dialog.accept());const T0=Date.now(),mark=label=>console.log('MARK '+label+' '+((Date.now()-T0)/1000).toFixed(2));await page.addInitScript(()=>{window.__long=[];try{new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__long.push(Math.round(entry.duration));}).observe({type:'longtask',buffered:true});}catch{}});");
swap("await bounded('loading',page.goto(", "mark('goto-start');await bounded('loading',page.goto(");
swap("await bounded('loading',page.waitForFunction(", "mark('goto-done');await bounded('loading',page.waitForFunction(");
swap("await feedbacks('after loading');", "mark('ready');console.log('LONG load '+JSON.stringify(await page.evaluate(()=>window.__long.slice())));await feedbacks('after loading');");
swap("await page.locator('#settings-button').click();await page.locator('#save-map').click();", "await page.locator('#settings-button').click();mark('save-click');await page.locator('#save-map').click();");
swap("const savedId=await page.locator('#saved-designs').inputValue();", "mark('saved');const savedId=await page.locator('#saved-designs').inputValue();");
swap("const manual={working:await working(1)};", "mark('manual-start');const manual={working:await working(1)};");
swap("manual.refused=await handoff();", "mark('manual-done');manual.refused=await handoff();console.log('LONG all '+JSON.stringify(await page.evaluate(()=>{const l=window.__long;return {count:l.length,max:Math.max(0,...l),over1s:l.filter(d=>d>1000).length};})));");
const script = path.join(here, 'timed-integration.mjs');
fs.writeFileSync(script, text);

const once = () => new Promise(resolve => {
  const start = Date.now(), lines = [], child = spawn(process.execPath, [script], {cwd: root, windowsHide: true});
  const timer = setTimeout(() => child.kill(), 400000);
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {for (const line of chunk.toString().split('\n')) if (line.trim() && !line.startsWith('{')) lines.push({at: (Date.now() - start) / 1000, line: line.trim().slice(0, 300)});});
  child.on('close', status => {
    clearTimeout(timer);
    const marks = Object.fromEntries(lines.filter(l => l.line.startsWith('MARK ')).map(l => {const [, label, at] = l.line.split(' '); return [label, +at];}));
    const long = Object.fromEntries(lines.filter(l => l.line.startsWith('LONG ')).map(l => [l.line.split(' ')[1], JSON.parse(l.line.split(' ').slice(2).join(' '))]));
    const captures = lines.filter(l => l.line.startsWith('Capturing ')).map(l => l.at);
    resolve({status, seconds: (Date.now() - start) / 1000, firstCaptureFromProcessStart: captures[0] ?? null, captures: captures.length,
      gotoSeconds: +(marks['goto-done'] - marks['goto-start']).toFixed(2), readySeconds: +(marks.ready - marks['goto-done']).toFixed(2),
      loadSeconds: +(marks.ready - marks['goto-start']).toFixed(2), saveSeconds: +(marks.saved - marks['save-click']).toFixed(2),
      manualSeconds: +(marks['manual-done'] - marks['manual-start']).toFixed(2), longLoad: long.load, longAll: long.all,
      tail: status ? lines.slice(-6).map(l => l.at + 's ' + l.line) : undefined});
  });
});

const record = {cores: os.cpus().length, stress, runs: [], started: new Date().toISOString()};
const spinners = Array.from({length: stress}, () => spawn(process.execPath, ['-e', 'for(;;){}'], {stdio: 'ignore'}));
try { for (let i = 0; i < runs; i++) { const r = await once(); record.runs.push(r); console.log(JSON.stringify(r)); } }
finally { for (const child of spinners) child.kill(); }
record.finished = new Date().toISOString();
fs.writeFileSync(outFile, JSON.stringify(record, null, 1));
