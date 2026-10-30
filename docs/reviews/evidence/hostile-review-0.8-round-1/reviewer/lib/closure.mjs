// Copy a module's relative import closure out of a donor's Git objects
// (git show only; the donor working tree, index and refs are never touched).
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {git, gitBuffer, evidenceDir} from './common.mjs';

export function extractClosure(repo, commit, entries, label) {
  const dir = path.join(evidenceDir, 'donor', label + '-' + commit.slice(0, 7));
  const files = new Map(), queue = [...entries];
  while (queue.length) {
    const file = queue.shift(); if (files.has(file)) continue;
    let bytes;
    try { bytes = gitBuffer(['show', commit + ':' + file], repo); } catch { files.set(file, {missing: true}); continue; }
    const blob = git(['rev-parse', commit + ':' + file], repo).trim();
    files.set(file, {bytes, blob});
    if (!/\.m?js$/.test(file)) continue;
    const text = bytes.toString('utf8');
    for (const m of text.matchAll(/(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|import\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)|new URL\(\s*['"](\.[^'"]+\.json)['"]/g)) {
      const spec = m[1] || m[2] || m[3] || m[4]; queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)));
    }
  }
  for (const [file, rec] of files) {
    if (rec.missing) continue;
    const p = path.join(dir, file); fs.mkdirSync(path.dirname(p), {recursive: true});
    if (!fs.existsSync(p)) fs.writeFileSync(p, rec.bytes);
  }
  return {dir, commit, manifest: [...files].map(([file, rec]) => rec.missing ? {file, missing: true} : {file, blob: rec.blob, bytes: rec.bytes.length, sha256: createHash('sha256').update(rec.bytes).digest('hex')})};
}
