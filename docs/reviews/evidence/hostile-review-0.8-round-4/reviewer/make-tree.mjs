// Round 4: a built copy of one commit of the sandbox's repository, outside any Git work tree
// (so the bench's identity() reads the stamp, not the sandbox's HEAD), optionally with edits
// (each needle must occur exactly once), then `node tools/build.mjs` in the copy.
//   node make-tree.mjs <commit> <dest> [<edits.json>]   edits: [{file, needle, replace}]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), [commit, dest, editsFile] = process.argv.slice(2);
if (fs.existsSync(dest)) throw Error('Refusing an existing destination: ' + dest);
fs.mkdirSync(dest, {recursive: true});
const tar = path.join(dest, '..', path.basename(dest) + '.tar');
execFileSync('git', ['-C', here, 'archive', '--format=tar', '-o', tar, commit]);
// Relative paths: GNU tar reads 'C:' in a path as a remote host.
execFileSync('tar', ['-xf', path.basename(tar), '-C', path.basename(dest)], {cwd: path.dirname(path.resolve(dest))}); fs.rmSync(tar);
const edits = editsFile ? JSON.parse(fs.readFileSync(editsFile, 'utf8')) : [];
for (const x of edits) {
  const file = path.join(dest, x.file), text = fs.readFileSync(file, 'utf8'), n = text.split(x.needle).length - 1;
  if (n !== 1) throw Error('needle occurs ' + n + ' times in ' + x.file);
  fs.writeFileSync(file, text.replace(x.needle, () => x.replace));
}
const full = execFileSync('git', ['-C', here, 'rev-parse', commit], {encoding: 'utf8'}).trim();
fs.writeFileSync(path.join(dest, '.bench-tree.json'), JSON.stringify({commit: full, method: 'git archive' + (edits.length ? ' + ' + edits.length + ' edit(s) from ' + path.basename(editsFile) : '')}));
const r = spawnSync(process.execPath, ['tools/build.mjs'], {cwd: dest, encoding: 'utf8', maxBuffer: 1 << 28});
fs.writeFileSync(path.join(dest, 'build.log'), (r.stdout || '') + (r.stderr || ''));
console.log(`tree ${full.slice(0, 7)} -> ${dest}: build exit ${r.status}${edits.length ? ', ' + edits.length + ' edit(s)' : ''}`);
if (r.status !== 0) process.exit(1);
