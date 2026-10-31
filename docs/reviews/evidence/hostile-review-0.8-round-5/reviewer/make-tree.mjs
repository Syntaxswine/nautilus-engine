// A built copy of the engine worktree for pilots, outside any Git work tree: git archive of a
// commit, then (with --dirty) every changed or untracked, not ignored, file of the worktree
// copied over, then optional edits (each needle must occur exactly once), then the build.
// A stamp (.bench-tree.json) names the commit, the copied files' hashes and the edits.
//   node make-tree.mjs <worktree> <commit> <dest> [--dirty] [--edits <edits.json>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
const args = process.argv.slice(2), [tree, commit, dest] = args, dirty = args.includes('--dirty'), editsAt = args.indexOf('--edits'), editsFile = editsAt < 0 ? null : args[editsAt + 1];
if (fs.existsSync(dest)) throw Error('Refusing an existing destination: ' + dest);
fs.mkdirSync(dest, {recursive: true});
const tar = path.join(path.dirname(path.resolve(dest)), path.basename(dest) + '.tar');
execFileSync('git', ['-C', tree, 'archive', '--format=tar', '-o', tar, commit]);
execFileSync('tar', ['-xf', path.basename(tar), '-C', path.basename(dest)], {cwd: path.dirname(path.resolve(dest))}); fs.rmSync(tar);
const copied = {};
if (dirty) {
  const listed = execFileSync('git', ['-C', tree, 'status', '--porcelain', '--untracked-files=all'], {encoding: 'utf8'}).split('\n').filter(Boolean);
  for (const line of listed) {
    const file = line.slice(3).trim().replace(/^"|"$/g, '');
    if (line.startsWith(' D') || line.startsWith('D ')) {fs.rmSync(path.join(dest, file), {force: true}); copied[file] = 'deleted'; continue;}
    fs.mkdirSync(path.dirname(path.join(dest, file)), {recursive: true}); fs.copyFileSync(path.join(tree, file), path.join(dest, file));
    copied[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(tree, file))).digest('hex').slice(0, 16);
  }
}
const edits = editsFile ? JSON.parse(fs.readFileSync(editsFile, 'utf8')) : [];
for (const x of edits) {
  const file = path.join(dest, x.file), text = fs.readFileSync(file, 'utf8'), n = text.split(x.needle).length - 1;
  if (n !== 1) throw Error('needle occurs ' + n + ' times in ' + x.file);
  fs.writeFileSync(file, text.replace(x.needle, () => x.replace));
}
const full = execFileSync('git', ['-C', tree, 'rev-parse', commit], {encoding: 'utf8'}).trim();
fs.writeFileSync(path.join(dest, '.bench-tree.json'), JSON.stringify({commit: full, method: 'git archive' + (dirty ? ' + the worktree\'s changed files' : '') + (edits.length ? ' + ' + edits.length + ' edit(s) from ' + path.basename(editsFile) : ''), copied, edits}));
const r = spawnSync(process.execPath, ['tools/build.mjs'], {cwd: dest, encoding: 'utf8', maxBuffer: 1 << 28});
fs.writeFileSync(path.join(dest, 'build.log'), (r.stdout || '') + (r.stderr || ''));
console.log(`tree ${full.slice(0, 7)}${dirty ? '+dirty(' + Object.keys(copied).length + ')' : ''} -> ${dest}: build exit ${r.status}${edits.length ? ', ' + edits.length + ' edit(s)' : ''}`);
if (r.status !== 0) process.exit(1);
