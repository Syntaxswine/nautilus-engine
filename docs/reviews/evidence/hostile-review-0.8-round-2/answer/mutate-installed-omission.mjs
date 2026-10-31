// Falsifier for the installed building proof: after the offline install, delete
// display-batches.js from the installed renderer package (an omitted file). The
// proof must fail, which shows it runs the tarball's copy, not the source tree's.
// Mutates the harness only; restores it in a finally.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const file = 'tools/distribution.mjs';
const original = fs.readFileSync(file, 'utf8');
const anchor = "fs.copyFileSync(path.join(root,'tests/fixtures/buildings/renderer-package-proof.mjs'),path.join(consumer,'building-renderer-proof.mjs'));";
if (original.split(anchor).length !== 2) throw Error('anchor not found once');
const omit = anchor + "fs.rmSync(path.join(consumer,'node_modules/@nautilus-engine/renderer/packages/prefab-core/display-batches.js'));";
let outcome;
try {
  fs.writeFileSync(file, original.replace(anchor, () => omit));
  try {
    const out = execFileSync(process.execPath, ['tools/distribution.mjs', '--test-grenade-renderer'], {encoding: 'utf8', stdio: 'pipe'});
    outcome = 'installed proof with display-batches.js deleted: PASS (the proof cannot see the omission)\n' + out.slice(-300);
  } catch (error) {
    const text = (error.stderr || '') + (error.stdout || '');
    outcome = 'installed proof with display-batches.js deleted: FAIL as required\n' + (text.match(/.*(display-batches|ERR_MODULE_NOT_FOUND|Cannot find).*/g) || [text.slice(-600)]).slice(0, 2).join('\n');
  }
} finally {
  fs.writeFileSync(file, original);
}
console.log(outcome);
console.log('harness restored:', fs.readFileSync(file, 'utf8') === original);
