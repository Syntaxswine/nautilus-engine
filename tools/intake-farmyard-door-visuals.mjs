// Git-object-only evidence intake; no donor module is evaluated or copied as a runtime.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { moduleReferencesBatch } from './module-references.mjs';

export const FARMYARD_DOOR_VISUAL_COMMIT = '251bf8094b5f9ebe44208443084c1a6d6658512a';
export const FARMYARD_DOOR_VISUAL_ROOT = 'vendor/farmyard-door-visuals/' + FARMYARD_DOOR_VISUAL_COMMIT;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = 'sites/tactical-animal/dist/', entry = dist + 'interaction-view.js';
const wood = dist + 'aft/assets/environment/hybrid-surfaces/wood-factory-v2.png';
const shared = 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/';
const sha = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
const blob = bytes => sha(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]), 'sha1');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const fail = message => { throw Error('Farmyard door visual intake: ' + message); };
const notice = Buffer.from('# Original Farmyard door presentation evidence\n\nSource: https://github.com/Syntaxswine/farmyard-commando at 251bf8094b5f9ebe44208443084c1a6d6658512a. The original interaction-view.js and wood-factory-v2.png byte streams remain unchanged. Embedded comments and attribution remain in their original files. The pinned project has no blanket licence; this intake adds no licence grant.\n\nOnly the timber texture is a runtime resource. The mixed chest/door/clue view and its game/Three closure are reference-only; they are never imported by the provider. The separately maintained Nautilus provider reuses the existing AFT-pinned Three.js and its retained MIT notice. provenance.json records the source/static dependency hashes, deferred chest/clue resources, and original provenance/notice references without duplicating that runtime.\n');

function sourceReader(repo) {
  const absolute = path.resolve(repo), git = args => execFileSync('git', ['-c', 'safe.directory=' + absolute.replaceAll('\\', '/'), '-C', absolute, ...args], { windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (git(['rev-parse', FARMYARD_DOOR_VISUAL_COMMIT + '^{commit}']).toString().trim() !== FARMYARD_DOOR_VISUAL_COMMIT) fail('Reviewed commit is absent.');
  const inventory = new Map();
  for (const row of git(['ls-tree', '-r', '-l', '-z', FARMYARD_DOOR_VISUAL_COMMIT]).toString().split('\0').filter(Boolean)) {
    const [meta, name] = row.split('\t'), [mode, type, gitBlob, bytes] = meta.trim().split(/\s+/);
    if (type === 'blob') inventory.set(name, { path: name, mode, gitBlob, bytes: Number(bytes) });
  }
  const cache = new Map();
  function read(name) {
    const info = inventory.get(name);
    if (!info || info.mode !== '100644' || !Number.isSafeInteger(info.bytes) || info.bytes > 12 * 1024 * 1024) fail('Missing or oversized regular source blob: ' + name);
    if (!cache.has(name)) {
      const bytes = git(['cat-file', 'blob', info.gitBlob]);
      if (bytes.length !== info.bytes || blob(bytes) !== info.gitBlob) fail('Git object mismatch: ' + name);
      cache.set(name, bytes);
    }
    return cache.get(name);
  }
  return { read, hashed(name) { const bytes = read(name); return { path: name, gitBlob: inventory.get(name).gitBlob, bytes: bytes.length, sha256: sha(bytes) }; } };
}
function discover(read, hashed) {
  const seen = new Set(), graph = []; let pending = [entry];
  while (pending.length) {
    const batch = [...new Set(pending)].filter(name => !seen.has(name)).sort(); pending = [];
    for (const name of batch) seen.add(name);
    for (const record of moduleReferencesBatch(batch.map(filename => ({ filename, source: read(filename).toString('utf8') })))) {
      const imports = record.specifiers.map(specifier => {
        if (!specifier.startsWith('./') && !specifier.startsWith('../') || /[\\?#%\u0000-\u001f]/.test(specifier)) fail('Unsupported module reference: ' + record.filename + ' -> ' + specifier);
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(record.filename), specifier));
        if (!target.startsWith(dist) || !target.endsWith('.js')) fail('Module closure escapes source dist: ' + target);
        pending.push(target); return { specifier, target };
      });
      graph.push({ ...hashed(record.filename), imports, copied: record.filename === entry });
    }
    if (seen.size > 128) fail('Static reference closure exceeds reviewed bound.');
  }
  return graph.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
export function buildFarmyardDoorVisualIntake(repo, commit = FARMYARD_DOOR_VISUAL_COMMIT) {
  if (commit !== FARMYARD_DOOR_VISUAL_COMMIT) fail('Use the full reviewed commit only.');
  const { read, hashed } = sourceReader(repo), staticModules = discover(read, hashed);
  const propPath = dist + 'aft/tactics/prop-art.js', propSource = read(propPath).toString('utf8');
  const literal = /export const PROP_ART\s*=\s*([\s\S]*);\s*$/.exec(propSource)?.[1];
  if (!literal) fail('PROP_ART is no longer a literal JSON catalogue.');
  const art = JSON.parse(literal), chest = ['supply-chest-closed', 'supply-chest-open'].map(id => {
    const record = art[id];
    if (!record || typeof record.file !== 'string' || !/^[\w/-]+\.png$/.test(record.file) || !Array.isArray(record.crop) || record.crop.length !== 4) fail('Chest paint entry changed: ' + id);
    return { id, ...hashed(dist + 'aft/assets/environment/' + record.file), crop: record.crop, copied: false };
  });
  const three = ['three.module.js', 'three.core.js', 'THREE-LICENSE.txt'].map(name => {
    const original = dist + 'aft/tactics/vendor/' + name, reusedPath = shared + name, bytes = fs.readFileSync(path.join(projectRoot, reusedPath));
    const normalized = value => value.toString('utf8').replaceAll('\r\n', '\n');
    if (normalized(read(original)) !== normalized(bytes)) fail('Existing Three differs substantively: ' + name);
    return { ...hashed(original), copied: false, reusedPath, reusedBytes: bytes.length, reusedSha256: sha(bytes),
      comparison: 'Equal after CRLF-to-LF conversion only; existing original engine bytes and MIT notice remain unchanged.' };
  });
  const files = [entry, wood].map(name => ({ ...hashed(name), role: name === entry ? 'mixed-view-reference-only' : 'native-runtime-timber-texture' }));
  if (files[1].bytes !== 2757790 || files[1].sha256 !== 'fd84b8b6dffb4974ce19c51d8a8e0dbe7295a2dddcf8c262eaa94e542ed64021') fail('Reviewed native paint differs.');
  const manifest = {
    schemaVersion: 1, repository: 'https://github.com/Syntaxswine/farmyard-commando', commit, snapshotRoot: FARMYARD_DOOR_VISUAL_ROOT,
    files, copiedPayload: { originalFiles: 2, originalBytes: files.reduce((n, f) => n + f.bytes, 0), generatedFiles: ['NOTICE.md', 'provenance.json'] },
    runtime: { adaptedEntry: 'packages/door-visuals/three.js', resources: [wood], sharedThree: 'packages/render-effects/three.js',
      donorRuntimeImported: false, duplicateThreeModules: 0, profile: 'farmyard-single-ground-leaf-endpoint-v1' },
    referenceClosure: { entry, staticModules, scope: 'Complete literal static JavaScript import closure of the mixed InteractionScenery reference. Only the entry is copied. Dynamic/runtime resources are separately bounded below; this is not a complete game asset inventory.' },
    deferred: {
      chestPaints: chest,
      clue: { geometry: 'OctahedronGeometry(.18)', material: { color: '0xe0c17b', roughness: .85 },
        owners: [dist + 'mission-scenery.js', dist + 'missions.js'], copied: false,
        disposition: 'Clue anchor placement, mission state and inspected/fog tint remain host-specific; no external clue texture is loaded by this reference.' },
      mixedView: 'Do not instantiate or import InteractionScenery: it eagerly loads both chest paints and imports mission, grid, interaction and separate Three source dependencies.',
      staticGameData: 'All transitive mission/map source modules are hashed in referenceClosure.staticModules and remain uncopied; unrelated PROP_ART catalogue entries are not loaded by InteractionScenery and are outside the two-chest resource list.'
    },
    dependencyResolutions: { three },
    noticeReferences: [hashed('sites/tactical-animal/aft-provenance.json'), hashed(dist + 'aft/tactics/vendor/THREE-LICENSE.txt')],
    notices: 'Original embedded notices are byte-preserved. No blanket project licence is present at this pin and no new licence is asserted. Shared Three/MIT bytes are retained in the existing engine snapshot.',
    transformations: ['Replace mixed view with one presentation-only unit box scaled/centred from the host public collider.', 'Reuse the original PNG bytes, source sRGB, material color/roughness and shadow flags.', 'Preserve source known-only door visibility and instant endpoint updates; no hinge animation or behavior authority.']
  };
  return { manifest, payload: new Map([[entry, read(entry)], [wood, read(wood)], ['NOTICE.md', notice]]) };
}
function writeIntake(intake) {
  const destination = path.join(projectRoot, FARMYARD_DOOR_VISUAL_ROOT), manifestBytes = json(intake.manifest);
  if (fs.existsSync(destination)) {
    for (const [name, bytes] of [...intake.payload, ['provenance.json', manifestBytes]]) if (!fs.readFileSync(path.join(destination, name)).equals(bytes)) fail('Existing immutable snapshot differs: ' + name);
    return;
  }
  const parent = path.dirname(destination), stage = path.join(parent, '.intake-' + randomUUID());
  fs.mkdirSync(stage, { recursive: true });
  try {
    for (const [name, bytes] of [...intake.payload, ['provenance.json', manifestBytes]]) {
      const file = path.join(stage, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: 'wx' });
    }
    fs.renameSync(stage, destination);
  } finally {
    if (path.dirname(path.resolve(stage)) !== path.resolve(parent) || !path.basename(stage).startsWith('.intake-')) fail('Unsafe staging cleanup path.');
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true });
  }
}
function main(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--write' && !options.write) options.write = true;
    else if (['--repo', '--commit'].includes(key) && !options[key] && argv[i + 1]) options[key] = argv[++i];
    else fail('Use --repo <read-only donor> --commit <full reviewed SHA> [--write].');
  }
  if (!options['--repo'] || !options['--commit']) fail('Pass --repo and --commit; dry-run is the default.');
  const intake = buildFarmyardDoorVisualIntake(options['--repo'], options['--commit']);
  if (options.write) writeIntake(intake);
  console.log(JSON.stringify({ commit: intake.manifest.commit, snapshot: FARMYARD_DOOR_VISUAL_ROOT,
    originalFiles: 2, originalBytes: intake.manifest.copiedPayload.originalBytes,
    staticReferenceModules: intake.manifest.referenceClosure.staticModules.length,
    deferredChestResources: intake.manifest.deferred.chestPaints.length, written: !!options.write }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
