import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const commit = '12cbb6881a344181f45519ca2275a20a7768f61b';
const repository = 'https://github.com/Syntaxswine/farmyard-commando-realtime';
const project = fileURLToPath(new URL('../', import.meta.url));
const root = `vendor/farmyard-firearm-feedback/${commit}`;
const dist = 'sites/tactical-animal/dist/';
const weaponManifest = dist + 'assets/audio/weapon-sfx/manifest.json';
const sources = [
  'fork-provenance.json',
  dist + 'weapon-pose.js',
  dist + 'weapon-pose-rig.js',
  dist + 'rifle-aim-pose.js',
  dist + 'weapon-feedback.js',
  dist + 'field-view.js',
  dist + 'aft/tactics/idle-rig-math.js',
  dist + 'aft/tactics/animal-motion-catalog.js',
  dist + 'aft/tactics/battle-posture.js',
  dist + 'aft/tactics/vendor/THREE-LICENSE.txt',
  dist + 'designer/a20b343a0234/tactics/battle-sound-data.js',
  dist + 'designer/a20b343a0234/tactics/battle-audio.js'
];
const cueIds = ['tt33', 'mosin-m38', 'ak47-shot', 'shotgun-fire', 'shotgun-pump'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// This command reads only pinned Git objects. It never extracts a recording.
const donor = process.argv[2];
if (!donor) throw Error('Supply a read-only Farmyard Commando Real Time Git checkout.');
const git = args => execFileSync('git', args, {cwd: donor, windowsHide: true});
const blob = source => git(['cat-file', 'blob', commit + ':' + source]);
const gitBlob = source => git(['rev-parse', commit + ':' + source]).toString().trim();
const tree = git(['rev-parse', commit + '^{tree}']).toString().trim();
const manifest = blob(weaponManifest);
const {sampleRate, channels, bank, effects} = JSON.parse(manifest);
const recordings = cueIds.map(id => {
  const entry = effects.find(effect => effect.id === id);
  if (!entry || entry.file !== id + '.wav') throw Error('Missing expected firearm cue: ' + id);
  const {sourceAsset, license, preparation, timing} = entry.recipe;
  const sourcePath = dist + 'assets/audio/weapon-sfx/' + entry.file;
  return {
    id, sourcePath, gitBlob: gitBlob(sourcePath), sha256: entry.sha256, frames: entry.frames,
    inputSha256: entry.input.sha256,
    sourceAsset: {
      publisher: sourceAsset.publisher, library: sourceAsset.library,
      archiveEntry: sourceAsset.archiveEntry, sha256: sourceAsset.sha256
    },
    license, preparation, timing
  };
});

const output = path.join(project, root);
if (fs.existsSync(output)) throw Error('Snapshot already exists: ' + output);
const files = sources.map(source => {
  const bytes = blob(source), snapshotPath = source.endsWith('/THREE-LICENSE.txt') ? source + '.original' : source;
  return {bytes, snapshotPath, record: {
    path: source, bytes: bytes.length, gitBlob: gitBlob(source), sha256: sha(bytes),
    ...(source === snapshotPath ? {} : {snapshotPath})
  }};
});
for (const {bytes, snapshotPath} of files) {
  const destination = path.join(output, snapshotPath);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.writeFileSync(destination, bytes);
}
const record = {
  schemaVersion: 1, repository, commit, tree, files: files.map(file => file.record),
  audio: {
    manifest: {path: weaponManifest, bytes: manifest.length, gitBlob: gitBlob(weaponManifest), sha256: sha(manifest)},
    sampleRate, channels, bank, recordings,
    redistribution: 'Metadata only. A consuming game supplies appropriately licensed or owned clips.'
  },
  root
};
fs.writeFileSync(path.join(project, 'packages/firearm-feedback/source.json'), JSON.stringify(record, null, 2) + '\n');
