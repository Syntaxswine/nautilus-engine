// What N04 (the settings feedback re-installed on every refresh) does to the real page: count the
// feedback paragraphs at load, after a connect and a disconnect, and after one wall edit. Applies
// N04 to apps/editor/editor.js, builds, probes, restores in a finally, rebuilds, and checks the
// built app/editor.js matches the commit. Refuses a dirty tree. Usage: node n04-growth.mjs <root>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {MUTANTS, E} from './mutants.mjs';
const root = path.resolve(process.argv[2]);
const git = args => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'});
if (git(['status', '--short'])) { console.error('Refusing a dirty tree'); process.exit(2); }
const file = path.join(root, E), original = fs.readFileSync(file), [, [edit]] = MUTANTS.N04, text = original.toString('utf8');
if (text.split(edit.find).length !== 2) throw Error('needle');
const build = () => spawnSync(process.execPath, ['tools/build.mjs'], {cwd: root, encoding: 'utf8', windowsHide: true}).status;
const out = {head: git(['rev-parse', 'HEAD']).trim()};
try {
  fs.writeFileSync(file, text.replace(edit.find, edit.replace));
  out.build = build();
  const {withArtReview} = await import(pathToFileURL(path.join(root, 'tools/art-review-browser.mjs')).href + '?n04');
  await withArtReview('Round 4 reviewer: N04 growth', async ({page, baseURL}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(baseURL + '/', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading);
    const count = () => page.evaluate(() => document.querySelectorAll('[id="nautilus-settings-feedback"]').length);
    out.atLoad = await count();
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000))); out.after2s = await count();
    await page.evaluate(() => { const off = window.nautilus.connectGame({features: [], openMap() {}}); off(); }); await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
    out.afterConnectAndDisconnect = await count();
    out.wall = await page.evaluate(async () => { const r = await window.editor3d.apply({tool: 'wall-run', start: {x: 60, y: 60, z: 0}, end: {x: 66, y: 60, z: 0}, options: {exact: true, stories: 1, material: 'wood'}}); return r.ok; });
    await page.evaluate(() => new Promise(r => setTimeout(r, 500))); out.afterOneWallEdit = await count();
    out.idsInDocument = await page.evaluate(() => document.querySelectorAll('[id="nautilus-settings-feedback"]').length);
  }, {output: 'r4-n04', timeoutMs: 180000});
} finally {
  fs.writeFileSync(file, original);
}
out.restored = fs.readFileSync(file).equals(original);
out.rebuild = build();
out.distMatchesCommitted = fs.readFileSync(path.join(root, 'dist/app/editor.js'), 'utf8') === git(['show', 'HEAD:' + E]).replaceAll('../../vendor/', '../vendor/').replaceAll('../../packages/', '../packages/');
out.status = git(['status', '--short']);
console.log(JSON.stringify(out, null, 1));
