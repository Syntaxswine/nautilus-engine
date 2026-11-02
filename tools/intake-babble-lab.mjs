// Read only Git objects. Never reads or changes a donor's working files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {BABBLE_COMMIT, BABBLE_ROOT, BABBLE_REPOSITORY, gitHash, snapshotTree} from './check-babble-lab.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), sourceIndex = args.indexOf('--source');
const source = sourceIndex < 0 ? root : path.resolve(args[sourceIndex + 1]);
const commitIndex = args.indexOf('--commit');
if (commitIndex < 0 || args[commitIndex + 1] !== BABBLE_COMMIT) throw Error('Supply the deliberately reviewed full --commit ' + BABBLE_COMMIT);
const git = (params, options = {}) => execFileSync('git', ['-c', 'safe.directory=' + source.replaceAll('\\', '/'), '-C', source, ...params], {windowsHide: true, maxBuffer: 16 * 1024 * 1024, ...options});
const commit = git(['cat-file', 'commit', BABBLE_COMMIT]);
if (gitHash('commit', commit) !== BABBLE_COMMIT) throw Error('Source commit object is corrupt.');
const tree = /^tree ([a-f0-9]{40})\n/.exec(commit.toString())?.[1];
const files = git(['ls-tree', '-r', '-z', '--long', BABBLE_COMMIT], {encoding: 'utf8'}).split('\0').filter(Boolean).map(row => {
  const match = /^(100644|100755) blob ([a-f0-9]{40})\s+(\d+)\t(.+)$/.exec(row);
  if (!match) throw Error('Unsupported tree entry; refusing an incomplete import: ' + row);
  return {mode: match[1], gitBlob: match[2], bytes: Number(match[3]), path: match[4]};
});
if (snapshotTree(files) !== tree || files.some(entry => entry.path === 'provenance.json')) throw Error('Snapshot inventory does not match the complete original tree.');
const stream = git(['cat-file', '--batch'], {input: files.map(entry => entry.gitBlob).join('\n') + '\n'});
const contents = new Map(); let offset = 0;
for (const entry of files) {
  const end = stream.indexOf(10, offset), header = stream.subarray(offset, end).toString();
  if (header !== entry.gitBlob + ' blob ' + entry.bytes) throw Error('Git batch header mismatch.');
  const data = stream.subarray(end + 1, end + 1 + entry.bytes);
  if (data.length !== entry.bytes || gitHash('blob', data) !== entry.gitBlob || stream[end + 1 + entry.bytes] !== 10) throw Error('Git batch content mismatch.');
  entry.sha256 = createHash('sha256').update(data).digest('hex');
  contents.set(entry.path, data); offset = end + 2 + entry.bytes;
}
if (offset !== stream.length) throw Error('Unexpected trailing Git batch data.');
const manifest = {
  schemaVersion: 1, repository: BABBLE_REPOSITORY, commit: BABBLE_COMMIT, tree,
  scope: 'entire-committed-tree', commitObjectBase64: commit.toString('base64'), files,
  adaptations: 'None. Every tracked path and byte from the source tree is preserved. Nautilus wrappers and build selection are separate.',
  rightsStatus: 'Repository owner explicitly authorized full reuse in the sound-engineer task on 2026-11-02. Original package.json declares MIT; no separate LICENSE file exists at this pin. Original README, attributes and asset-source/licence references are retained. Untracked recording banks and audition/output files are not part of this source tree.',
};
if (args.includes('--write')) {
  const destination = path.join(root, BABBLE_ROOT);
  if (fs.existsSync(destination)) throw Error('Immutable snapshot already exists; refusing to overwrite it.');
  for (const entry of files) {
    const target = path.join(destination, entry.path);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, contents.get(entry.path));
    if (process.platform !== 'win32') fs.chmodSync(target, entry.mode === '100755' ? 0o755 : 0o644);
  }
  fs.writeFileSync(path.join(destination, 'provenance.json'), JSON.stringify(manifest, null, 2) + '\n');
}
console.log(JSON.stringify({commit: BABBLE_COMMIT, tree, files: files.length, bytes: files.reduce((sum, entry) => sum + entry.bytes, 0), written: args.includes('--write')}));
