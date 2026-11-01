// Can the review's new lines fail, and fail fast? Mutate the built title (dist is ignored
// by git), run the real review, restore in a finally and prove the bytes came back.
//   node mutate-fix.mjs <worktree>
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root = process.argv[2], file = path.join(root, 'dist/packages/game-ui/title.js');
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 16);
const original = fs.readFileSync(file, 'utf8'), before = sha(original);
const MUTANTS = {
  'K0 control, no change': [null, null, 'pass'],
  'M1 close handler focuses Start, not the opener': ["lastDialogButton?.focus();});", "buttons.start.focus();});", /Expected values to be strictly equal[\s\S]*credits|'start' !== 'credits'/],
  'M2 Escape no longer closes Credits': ["listen(closeCredits,'click',()=>credits.close());", "listen(closeCredits,'click',()=>credits.close());listen(credits,'cancel',event=>event.preventDefault());", /waitForFunction: Timeout 10000ms exceeded/],
};
const results = [];
try {
  for (const [name, [needle, next, expected]] of Object.entries(MUTANTS)) {
    let text = original;
    if (needle) {const parts = original.split(needle); if (parts.length !== 2) throw Error('Needle not found once: ' + name); text = parts.join(next);}
    fs.writeFileSync(file, text);
    const t = Date.now(), run = spawnSync(process.execPath, ['tools/review-game-starter.mjs'], {cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 120000});
    if (run.status === null) throw Error('A run ended without an exit code: ' + name + ' ' + run.signal);
    const out = (run.stdout || '') + (run.stderr || ''), ms = Date.now() - t;
    const verdict = expected === 'pass' ? (run.status === 0 ? 'passed, as a control must' : 'CONTROL FAILED') : run.status !== 0 && expected.test(out) ? 'killed for the named reason' : run.status === 0 ? 'SURVIVED' : 'failed for another reason';
    const where = (out.match(/review-game-starter\.mjs:(\d+):/) || [])[1] ?? '-';
    results.push({name, status: run.status, ms, where, verdict});
    console.log(name.padEnd(50), 'exit', run.status, String(ms).padStart(6) + ' ms', 'line', where.padEnd(4), verdict);
  }
} finally {
  fs.writeFileSync(file, original);
  const after = sha(fs.readFileSync(file, 'utf8'));
  console.log('restored', after === before ? 'byte for byte' : 'WRONGLY', after);
}
