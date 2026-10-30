// Is N01's page frozen, or only slow? Applies N01 (refreshHandoff writes `disabled` on every
// refresh) to apps/editor/editor.js, builds, opens the page without waiting for load, and asks the
// page's main thread for `document.readyState` at 1, 5 and 15 s, each answer bounded to 5 s. A
// main thread stuck in an observer loop never answers. Then the same probe on the pristine build as
// the control. Restores in a finally, rebuilds, and checks dist/app/editor.js against the commit.
// Refuses a dirty tree. Usage: node n01-liveness.mjs <root>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {MUTANTS, E} from './mutants.mjs';
const root = path.resolve(process.argv[2]);
const git = args => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'});
if (git(['status', '--short'])) { console.error('Refusing a dirty tree'); process.exit(2); }
const file = path.join(root, E), original = fs.readFileSync(file), [, [edit]] = MUTANTS.N01, text = original.toString('utf8');
if (text.split(edit.find).length !== 2) throw Error('needle');
const build = () => spawnSync(process.execPath, ['tools/build.mjs'], {cwd: root, encoding: 'utf8', windowsHide: true}).status;
const {withArtReview} = await import(pathToFileURL(path.join(root, 'tools/art-review-browser.mjs')).href);
const probe = label => withArtReview('Round 4 reviewer: N01 liveness (' + label + ')', async ({page, baseURL}) => {
  const answers = {}, t0 = Date.now();
  await page.goto(baseURL + '/', {waitUntil: 'commit', timeout: 15000});
  for (const at of [1000, 5000, 15000]) {
    const wait = at - (Date.now() - t0); if (wait > 0) await new Promise(r => setTimeout(r, wait));
    answers['at' + at / 1000 + 's'] = await Promise.race([page.evaluate(() => document.readyState + (window.nautilus ? ' · bridge ran' : '')), new Promise(r => setTimeout(() => r('NO ANSWER in 5 s'), 5000))]);
  }
  return answers;
}, {output: 'r4-n01-' + label, timeoutMs: 120000}).catch(error => ({error: error.message.split('\n')[0]}));
const out = {head: git(['rev-parse', 'HEAD']).trim()};
try {
  fs.writeFileSync(file, text.replace(edit.find, edit.replace));
  out.mutantBuild = build();
  out.N01 = await probe('mutant');
} finally {
  fs.writeFileSync(file, original);
}
out.restored = fs.readFileSync(file).equals(original);
out.rebuild = build();
out.pristine = await probe('pristine');
out.distMatchesCommitted = fs.readFileSync(path.join(root, 'dist/app/editor.js'), 'utf8') === git(['show', 'HEAD:' + E]).replaceAll('../../vendor/', '../vendor/').replaceAll('../../packages/', '../packages/');
out.status = git(['status', '--short']);
console.log(JSON.stringify(out, null, 1));
