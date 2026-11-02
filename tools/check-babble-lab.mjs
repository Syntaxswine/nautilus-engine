import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {moduleReferenceGraph} from './module-references.mjs';

export const BABBLE_COMMIT = '0df4be4a05cfa7b636624e1911c5413a9fe844cd';
export const BABBLE_ROOT = 'vendor/babble-lab/' + BABBLE_COMMIT;
export const BABBLE_REPOSITORY = 'https://github.com/Syntaxswine/babble-lab';
export const gitHash = (type, bytes) => createHash('sha1').update(type + ' ' + bytes.length + '\0').update(bytes).digest('hex');

// Rebuild the original Git tree without needing a donor checkout or fetched
// commit in a shallow CI clone. Modes, filenames and every original blob count.
export function snapshotTree(files) {
  const tree = new Map();
  for (const entry of files) {
    if (!/^(100644|100755)$/.test(entry.mode) || !/^[a-f0-9]{40}$/.test(entry.gitBlob)) throw Error('Invalid Babble source mode/blob.');
    if (typeof entry.path !== 'string' || entry.path.includes('\\') || entry.path.includes('\0') || entry.path.split('/').some(part => !part || part === '.' || part === '..' || part === '.git')) throw Error('Invalid Babble source path.');
    const parts = entry.path.split('/'); let folder = tree;
    for (const part of parts.slice(0, -1)) {
      if (!folder.has(part)) folder.set(part, new Map());
      folder = folder.get(part);
      if (!(folder instanceof Map)) throw Error('Conflicting Babble source path.');
    }
    if (folder.has(parts.at(-1))) throw Error('Duplicate Babble source path.');
    folder.set(parts.at(-1), entry);
  }
  function digest(folder) {
    const rows = [...folder].map(([name, value]) => ({name, directory: value instanceof Map, value}));
    rows.sort((a, b) => Buffer.compare(Buffer.from(a.name + (a.directory ? '/' : '')), Buffer.from(b.name + (b.directory ? '/' : ''))));
    return gitHash('tree', Buffer.concat(rows.map(row => Buffer.concat([
      Buffer.from((row.directory ? '40000' : row.value.mode) + ' ' + row.name + '\0'),
      Buffer.from(row.directory ? digest(row.value) : row.value.gitBlob, 'hex'),
    ]))));
  }
  return digest(tree);
}

export function babbleBrowserFiles(manifest) {
  return manifest.files.map(entry => entry.path).filter(file => /^(src|workbench|dist)\//.test(file) || ['index.html', 'README.md', 'package.json', '.gitattributes'].includes(file));
}

export function checkBabbleLab(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), {tracked} = {}) {
  const pin = JSON.parse(fs.readFileSync(path.join(root, 'modules/audio/source.json')));
  if (pin?.commit !== BABBLE_COMMIT || pin.root !== BABBLE_ROOT || pin.repository !== BABBLE_REPOSITORY) throw Error('Babble Lab source pin mismatch.');
  const folder = path.join(root, pin.root), manifestPath = pin.root + '/provenance.json';
  const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath)));
  if (manifest.commit !== pin.commit || manifest.repository !== pin.repository || manifest.scope !== 'entire-committed-tree') throw Error('Babble Lab provenance mismatch.');
  const commitBytes = Buffer.from(manifest.commitObjectBase64, 'base64');
  if (gitHash('commit', commitBytes) !== pin.commit || !commitBytes.toString().startsWith('tree ' + manifest.tree + '\n')) throw Error('Babble Lab commit object mismatch.');
  if (snapshotTree(manifest.files) !== manifest.tree) throw Error('Babble Lab snapshot is not the complete original Git tree.');
  const indexed = tracked ? new Map(execFileSync('git', ['-c', 'safe.directory=' + root.replaceAll('\\', '/'), '-C', root, 'ls-files', '--stage', '-z', '--', pin.root], {encoding: 'utf8', windowsHide: true}).split('\0').filter(Boolean).map(row => {
    const match = /^(\d+) ([a-f0-9]{40}) 0\t(.+)$/.exec(row);
    if (!match) throw Error('Unmerged Babble source index entry.');
    return [match[3], {mode: match[1], gitBlob: match[2]}];
  })) : null;
  let bytes = 0;
  for (const entry of manifest.files) {
    const file = path.join(folder, entry.path);
    if (!fs.lstatSync(file).isFile()) throw Error('Babble snapshot must contain only original regular files: ' + entry.path);
    const data = fs.readFileSync(file);
    if (data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256 || gitHash('blob', data) !== entry.gitBlob) throw Error('Changed Babble source: ' + entry.path);
    if (tracked && !tracked.has(pin.root + '/' + entry.path)) throw Error('Untracked Babble source: ' + entry.path);
    const staged = indexed?.get(pin.root + '/' + entry.path);
    if (indexed && (staged?.mode !== entry.mode || staged.gitBlob !== entry.gitBlob)) throw Error('Git would alter Babble source bytes/mode: ' + entry.path);
    bytes += data.length;
  }
  if (tracked && !tracked.has(manifestPath)) throw Error('Untracked Babble provenance.');
  const originals = new Set(manifest.files.map(entry => entry.path));
  function inspect(directory, prefix = '') {
    for (const item of fs.readdirSync(directory, {withFileTypes: true})) {
      const relative = prefix + item.name;
      if (item.isDirectory()) inspect(path.join(directory, item.name), relative + '/');
      else if (!item.isFile() || !originals.has(relative) && relative !== 'provenance.json') throw Error('Unexpected file inside immutable Babble snapshot: ' + relative);
    }
  }
  inspect(folder);
  const entries = ['modules/audio/index.js', 'modules/audio/runtime.js'];
  const graph = moduleReferenceGraph(entries.map(file => path.join(root, file)), {root});
  for (const record of graph) {
    const relative = path.relative(root, record.filename).replaceAll('\\', '/');
    if (!entries.includes(relative) && !relative.startsWith(pin.root + '/src/')) throw Error('Audio runtime escaped its reviewed closure: ' + relative);
    if (record.specifiers.some(specifier => !specifier.startsWith('./') && !specifier.startsWith('../'))) throw Error('Audio runtime has an external dependency.');
    if (tracked && !tracked.has(relative)) throw Error('Untracked audio runtime dependency: ' + relative);
  }
  return {commit: pin.commit, tree: manifest.tree, files: manifest.files.length, bytes, runtimeModules: graph.length, browserFiles: babbleBrowserFiles(manifest).length};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(checkBabbleLab()));
