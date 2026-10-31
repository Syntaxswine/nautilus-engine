// Mask local paths and the account name in this folder's text evidence.
//   node mask.mjs <sandbox> <baseline>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [sandbox, baseline] = process.argv.slice(2).map(p => path.resolve(p));
const user = os.userInfo().username, home = os.homedir(), tmp = os.tmpdir();
const variants = p => {
  const back = p.replaceAll('/', '\\'), fwd = p.replaceAll('\\', '/');
  return [back.replaceAll('\\', '\\\\'), back.replaceAll(user, '<user>').replaceAll('\\', '\\\\'), back, back.replaceAll(user, '<user>'), fwd, fwd.replaceAll(user, '<user>'), 'file:///' + fwd.replaceAll(' ', '%20'), fwd.replaceAll(' ', '%20')];
};
const pairs = [...variants(sandbox).map(v => [v, '<sandbox>']), ...variants(baseline).map(v => [v, '<baseline>']), ...variants(tmp).map(v => [v, '<scratch>']), ...variants(home).map(v => [v, '<home>'])];
let files = 0, edits = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {if (!['gen-diff', 'maps'].includes(entry.name) && !entry.name.endsWith('-png')) walk(full); continue;}
    if (!/\.(json|log|md|txt)$/.test(entry.name)) continue;
    let text = fs.readFileSync(full, 'utf8'); const before = text;
    for (const [from, to] of pairs) text = text.split(from).join(to);
    text = text.replaceAll(user, '<user>');
    if (text !== before) {fs.writeFileSync(full, text); files++; edits++;}
  }
}
walk(here);
console.log(JSON.stringify({maskedFiles: files}));
