// Where the settings feedback ends up, pristine and under R02 (heading.append -> document.body.append).
// For each: build, load the editor in the task-owned review browser, open Settings, and read the
// feedback's ancestry, box and visibility. The edit is restored byte for byte in a finally and the
// pristine build is rebuilt last. Refuses a dirty tree; records git status. Usage: node r02-place.mjs <checkout> <out.json>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]), outFile = path.resolve(process.argv[3]);
const git = (...args) => spawnSync('git', ['-C', root, ...args], {encoding: 'utf8'}).stdout.trim();
const build = () => spawnSync('npm run build', {cwd: root, shell: true, encoding: 'utf8', maxBuffer: 256 << 20}).status;
const {withArtReview} = await import(pathToFileURL(path.join(root, 'tools/art-review-browser.mjs')).href);
const E = path.join(root, 'apps/editor/editor.js'), find = 'heading.append(feedback);', replace = 'document.body.append(feedback);';
const look = label => withArtReview('Round 5: settings feedback placement (' + label + ')', async ({page, baseURL}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await page.goto(baseURL + '/', {waitUntil: 'networkidle', timeout: 60000});
  await page.waitForFunction(() => window.editor3d?.document && !window.editor3d.loading, null, {timeout: 60000});
  const read = () => page.evaluate(() => {const f = document.getElementById('nautilus-settings-feedback'); const r = f.getBoundingClientRect();
    return {inSettings: !!f.closest('#editor-settings'), parent: f.parentElement.tagName.toLowerCase() + (f.parentElement.className ? '.' + f.parentElement.className : ''), text: f.textContent, hidden: f.hidden,
      visible: f.checkVisibility(), box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], pageHeight: document.documentElement.scrollHeight, viewport: innerHeight};});
  const closed = await read(); await page.locator('#settings-button').click(); const open = await read();
  return {settingsClosed: closed, settingsOpen: open};
}, {output: 'r5-r02-place', timeoutMs: 180000});
const record = {head: git('rev-parse', 'HEAD'), statusBefore: git('status', '--short')};
if (record.statusBefore) throw Error('Refusing a dirty tree:\n' + record.statusBefore);
const original = fs.readFileSync(E), text = original.toString('utf8');
if (text.split(find).length !== 2) throw Error('The needle must occur once');
try { fs.writeFileSync(E, text.replace(find, () => replace)); if (build()) throw Error('R02 build failed'); record.R02 = await look('R02'); }
finally { fs.writeFileSync(E, original); if (!fs.readFileSync(E).equals(original)) throw Error('restore failed'); }
if (build()) throw Error('pristine build failed'); record.pristine = await look('pristine');
record.statusAfter = git('status', '--short');
fs.writeFileSync(outFile, JSON.stringify(record, null, 1)); console.log(JSON.stringify(record, null, 1));
