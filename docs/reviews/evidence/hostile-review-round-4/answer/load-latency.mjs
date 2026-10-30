// The editor's load time as the acceptance waits for it: page.goto until networkidle, then the
// editor-ready condition. Five runs on a quiet machine, then five under 16 busy loops, which are
// killed by their own handles in a finally. Usage: node load-latency.mjs <checkout> <out.json>
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]);
const {withArtReview} = await import(pathToFileURL(path.join(root, 'tools/art-review-browser.mjs')).href);
const once = label => withArtReview('Round 4 answer: load latency (' + label + ')', async ({page, baseURL}) => {
  await page.setViewportSize({width: 1280, height: 900});
  const t0 = Date.now();
  await page.goto(baseURL + '/', {waitUntil: 'networkidle', timeout: 60000});
  const gotoMs = Date.now() - t0;
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading && !document.getElementById('nautilus-buildings').disabled, null, {timeout: 60000});
  return {gotoMs, readyMs: Date.now() - t0 - gotoMs};
}, {output: 'r5-load-latency', timeoutMs: 180000});
const out = {cores: os.cpus().length, quiet: [], stressed: []};
for (let i = 0; i < 5; i++) out.quiet.push(await once('quiet ' + i));
const spinners = Array.from({length: 16}, () => spawn(process.execPath, ['-e', 'for(;;){}'], {stdio: 'ignore'}));
try { for (let i = 0; i < 5; i++) out.stressed.push(await once('stressed ' + i)); }
finally { for (const child of spinners) child.kill(); }
const worst = list => Math.max(...list.map(run => run.gotoMs + run.readyMs));
out.worstQuietMs = worst(out.quiet); out.worstStressedMs = worst(out.stressed);
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
