// Git-object-only intake. This tools-only module never evaluates donor source.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {moduleReferencesBatch} from './module-references.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FARMYARD_GRENADE_COMMIT = '251bf8094b5f9ebe44208443084c1a6d6658512a';
export const FARMYARD_GRENADE_ROOT = 'vendor/farmyard-grenades/' + FARMYARD_GRENADE_COMMIT;
const reviewPath = 'docs/reviews/2026-10-29-farmyard-grenades.sources.json';
const prefix = 'sites/tactical-animal/', dist = prefix + 'dist/';
const designer = dist + 'designer/a20b343a0234/';
const engineAft = 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/';
const entries = ['solo-game.js', 'grenade-controls.js'].map(p => dist + p).concat(
  ['grenades', 'grenade-controls', 'grenade-input', 'area-weapon-button'].map(p => prefix + 'tests/' + p + '.test.mjs'));
const readResources = ['app.js', 'game.html', 'field-hardware.css'].map(p => dist + p);
const notices = [prefix + 'aft-provenance.json', prefix + 'designer-provenance.json',
  dist + 'aft/tactics/vendor/THREE-LICENSE.txt', designer + 'tactics/vendor/THREE-LICENSE.txt'];
const builtins = ['node:assert/strict', 'node:fs', 'node:test', 'node:vm'];
const packageBytes = Buffer.from('{\n  "private": true,\n  "type": "module"\n}\n');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const fail = message => { throw Error('Farmyard grenade intake: ' + message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const summary = manifest => ({commit: manifest.commit, snapshotRoot: FARMYARD_GRENADE_ROOT,
  files: manifest.files.length, bytes: manifest.files.reduce((n, f) => n + f.bytes, 0),
  modules: manifest.headless.modules.length, copiedBinaryAssets: 0});

function relativeTarget(importer, specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    if (specifier.startsWith('.')) fail('Relative imports require ./ or ../: ' + specifier);
    return null;
  }
  if (/[\\?#%\u0000-\u001f\u007f]/.test(specifier) || specifier.endsWith(' ')) fail('Unsupported module URL: ' + specifier);
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (!target.startsWith(prefix) || !/\.m?js$/.test(target)) fail('Module escapes supported source closure: ' + target);
  return target;
}

function discover(entryFiles, read, allowBuiltins) {
  const modules = new Map(), seen = new Set();
  let pending = [...entryFiles];
  while (pending.length) {
    const batch = [...new Set(pending)].filter(p => !seen.has(p)).sort();
    pending = [];
    for (const p of batch) seen.add(p);
    const records = moduleReferencesBatch(batch.map(filename => ({filename, source: read(filename).toString('utf8')})));
    for (const {filename, specifiers} of records) {
      const imports = specifiers.map(specifier => {
        const target = relativeTarget(filename, specifier);
        if (target === null && (!allowBuiltins || !builtins.includes(specifier))) fail('Unexpected external dependency: ' + filename + ' -> ' + specifier);
        if (target !== null) pending.push(target);
        return {specifier, target};
      });
      modules.set(filename, {path: filename, imports});
    }
    if (seen.size > 128) fail('Module closure exceeds reviewed bound.');
  }
  return [...modules.values()].sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

function sourceReader(repo, commit) {
  const git = (args, options = {}) => execFileSync('git', ['-c', 'safe.directory=' + path.resolve(repo).replaceAll('\\', '/'), '-C', repo, ...args],
    {windowsHide: true, maxBuffer: 64 * 1024 * 1024, ...options});
  if (git(['rev-parse', commit + '^{commit}']).toString().trim() !== FARMYARD_GRENADE_COMMIT) fail('Unexpected commit object.');
  const inventory = new Map();
  for (const record of git(['ls-tree', '-r', '-l', '-z', commit]).toString().split('\0').filter(Boolean)) {
    const [meta, name] = record.split('\t'), [mode, type, oid, size] = meta.trim().split(/\s+/);
    if (type === 'blob') inventory.set(name, {mode, gitBlob: oid, bytes: Number(size)});
  }
  const cache = new Map();
  function describe(name) {
    const record = inventory.get(name);
    if (!record || record.mode !== '100644' || !Number.isSafeInteger(record.bytes)) fail('Missing regular Git blob: ' + name);
    return {path: name, gitBlob: record.gitBlob, bytes: record.bytes};
  }
  function read(name) {
    const record = describe(name);
    if (record.bytes > 4 * 1024 * 1024) fail('Individual source blob exceeds reviewed bound: ' + name);
    if (!cache.has(name)) {
      const bytes = git(['cat-file', 'blob', record.gitBlob]);
      if (bytes.length !== record.bytes || gitBlob(bytes) !== record.gitBlob) fail('Git object integrity mismatch: ' + name);
      cache.set(name, bytes);
    }
    return cache.get(name);
  }
  function hashed(name) { return {...describe(name), sha256: sha256(read(name))}; }
  return {inventory, read, describe, hashed};
}

function buildIntake(repo, commit) {
  if (commit !== FARMYARD_GRENADE_COMMIT) fail('Only the full reviewed pin is accepted: ' + FARMYARD_GRENADE_COMMIT);
  const source = sourceReader(repo, commit), {read, describe, hashed, inventory} = source;
  const modules = discover(entries, read, true);
  const names = [...new Set([...modules.map(m => m.path), ...readResources, ...notices])].sort();
  const files = names.map(name => ({...hashed(name), role: 'reference', purpose:
    notices.includes(name) ? (/LICENSE/.test(name) ? 'license-notice' : 'upstream-provenance') :
    readResources.includes(name) ? (name.endsWith('app.js') ? 'harness-script-and-UI-reference' : 'text-test-resource') :
    name.endsWith('.test.mjs') ? 'original-test' : 'headless-conformance-module'}));
  const sourceBytes = files.reduce((n, f) => n + f.bytes, 0);
  if (modules.length !== 36 || files.length !== 43 || sourceBytes !== 894207) fail('Reviewed source closure changed.');
  if (files.length > 64 || sourceBytes > 1024 * 1024) fail('Copied evidence exceeds intake budget.');

  const nativeEntry = dist + 'aft/tactics/grenade-model.js';
  const throwEntry = designer + 'tactics/grenade-throw-motion.js';
  const presenterEntry = designer + 'tactics/battle-grenades.js';
  const referenceGroup = entry => {
    const graph = discover([entry], read, false), fileList = graph.map(m => hashed(m.path));
    return {entry, copied: false, completeResourceClosure: false,
      staticModules: fileList, bytes: fileList.reduce((n, f) => n + f.bytes, 0)};
  };
  const nativeModel = referenceGroup(nativeEntry), designerThrow = referenceGroup(throwEntry), designerPresenter = referenceGroup(presenterEntry);
  if (nativeModel.staticModules.length !== 3 || designerThrow.staticModules.length !== 3 || designerPresenter.staticModules.length !== 75) fail('Reference module closure changed.');
  const spritesText = read(dist + 'target-sprites.js').toString('utf8');
  const spritesLiteral = /Object\.freeze\((\{[^\r\n]+\})\)/.exec(spritesText)?.[1];
  if (!spritesLiteral) fail('Target sprite inventory is no longer a literal JSON object.');
  const spriteNames = Object.keys(JSON.parse(spritesLiteral)).sort();
  if (spriteNames.length !== 354 || spriteNames.some(p => p.includes('..') || !/^[\w/-]+\.png$/.test(p))) fail('Target sprite inventory changed.');
  const sprites = spriteNames.map(p => describe(dist + 'aft/assets/characters/' + p));
  const modelPaint = dist + 'aft/assets/equipment/painted-ui/grenade-surface.png';
  const designerAssets = ['equipment/painted-ui/grenade-surface.png',
    'effects/painted-fire/tank-burst-atlas-v1.png', 'effects/painted-fire/smoke-atlas-v1.png',
    'environment/painted/foliage-atlas-v1.png', 'environment/biome-foliage/foliage-atlas-v1.png',
    'environment/biome-foliage/ground-atlas-v1.png'].map(p => designer + 'assets/' + p);

  const comparisons = [];
  for (const donorPrefix of [dist + 'aft/tactics/vendor/', designer + 'tactics/vendor/']) {
    for (const name of ['three.module.js', 'three.core.js', 'THREE-LICENSE.txt']) {
      const donorPath = donorPrefix + name, enginePath = engineAft + name;
      const donorBytes = read(donorPath), engineBytes = fs.readFileSync(path.join(projectRoot, enginePath));
      const lf = bytes => Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
      const normalizedSource = lf(donorBytes), normalizedEngine = lf(engineBytes);
      if (!normalizedSource.equals(normalizedEngine)) fail('Substantive Three mismatch: ' + donorPath);
      comparisons.push({source: hashed(donorPath), enginePath, engineSha256: sha256(engineBytes), engineBytes: engineBytes.length,
        rawEqual: donorBytes.equals(engineBytes), comparison: 'UTF-8 with CRLF converted to LF only; original bytes preserved',
        normalizedLfSha256: sha256(normalizedSource), normalizedLfEqual: true,
        disposition: 'Reuse existing pinned engine Three identity once in a separate renderer adapter; no new Three snapshot or runtime import here.'});
    }
  }

  function evidence(file, needle) {
    const lines = read(file).toString('utf8').split(/\r\n|[\n\r]/), index = lines.findIndex(line => line.includes(needle));
    if (index < 0) fail('Source evidence anchor missing: ' + file + ' / ' + needle);
    return {path: file, line: index + 1, anchor: needle};
  }
  const game = dist + 'solo-game.js', app = dist + 'app.js', field = dist + 'field-view.js';
  const manifest = {
    schemaVersion: 1, donor: 'farmyard-grenades', repository: 'https://github.com/Syntaxswine/farmyard-commando',
    commit, sourcePrefix: prefix, snapshotRoot: FARMYARD_GRENADE_ROOT,
    status: 'Immutable test-only conformance and review evidence; not a public runtime dependency or a game-integration claim.',
    files, copiedPayload: {files: files.length, bytes: sourceBytes, maximumFiles: 64, maximumBytes: 1048576,
      binaryAssets: 0, generatedFiles: ['package.json', 'provenance.json']},
    headless: {entries, modules, externalBuiltins: builtins,
      noRendererDependency: true, originalTests: 32,
      readResources: readResources.map(p => ({path: p, execution: p.endsWith('app.js') ? 'The original app-harness removes one-line import declarations and evaluates this script in a Node VM with explicit fake DOM, view, art and storage dependencies.' : 'Read as text by original area-weapon-button tests; not rendered or fetched.'})),
      scope: 'The 36 ESM modules close the original four tests plus solo-game and grenade-controls. app.js is an intentional harness script resource, not a closed browser/ESM application entry. Node VM is test behavior, not importer behavior.'},
    references: {
      liveFieldView: {...hashed(field), copied: false, scope: 'Actual Farmyard grenade trajectory and transient visual hooks; its full browser, actor and art dependency closure is not imported.'},
      nativeModel, designerThrow, designerPresenter,
      preparedBalance: {...hashed(designer + 'tactics/grenade-prepared.js'), copied: false, optionalFor: throwEntry},
      motionBoundary: 'The generic designer throw accepts a caller-owned worker rig and grenade prop; grenade.id must be grenade. It resets root transforms/pose and may use optional preparedBalance or iterative balance. Animal-specific rigs, bone names, wing handling and caller lifetime remain required. Designer presenter also uses hen-grenade-throw. None is invoked by the live FieldView; its illustrative bounce/physics is not Farmyard authoritative gameplay.'
    },
    dynamicResources: {
      policy: 'No binary assets copied. Git blob IDs/bytes identify unimported resources; SHA-256 is included only where computed. These lists bound the named URL/data constructions, not a complete live-app or caller-owned rig resource closure.',
      controlSymbols: {owner: dist + 'shooting-controls.js', construction: "new URL('./assets/ui/industrial-switches/symbols.svg', import.meta.url); query propagated and symbol fragment selected", resource: describe(dist + 'assets/ui/industrial-switches/symbols.svg'), fetchedByHeadlessTests: false},
      targetSprites: {owner: dist + 'targeting-monitor.js', metadata: dist + 'target-sprites.js',
        construction: "new URL('./aft/assets/characters/'+file+release, import.meta.url); release is the importing module query", files: sprites,
        bytes: sprites.reduce((n, f) => n + f.bytes, 0), fetchedByHeadlessTests: false},
      nativePaint: {owner: nativeEntry, construction: "new URL('../assets/equipment/painted-ui/grenade-surface.png', import.meta.url)", resource: hashed(modelPaint),
        loading: 'Default lazy TextureLoader path requires document and no supplied paint; external paint can be supplied. Existing engine native asset inventory is reused separately.'},
      designerPresenterAssets: designerAssets.map(p => describe(p)),
      blastTextureOwner: designer + 'tactics/grenade-blast-effects.js',
      blastLoading: 'Two painted-fire atlases are loaded via Promise.allSettled; broader optional presenter also references foliage atlases. No image is loaded during intake or headless tests.'
    },
    dependencyResolutions: {three: comparisons, publicRuntimeImportsDonorGame: false,
      gamePolicy: 'Missions, cast, scheduling, visibility, storage, windows, fuel and fire stay reference-only. A separate engine-owned runtime must expose its supported profile and reject unsupported host facts before costs.'},
    behavior: [
      {claim: 'Base grenade cost 5 AP; equipped pistol, pistol-offhand or SMG discounts to 2.5. Accepted command consumes one grenade and synchronizes pack rounds while retaining the equipped weapon. Failed preview spends nothing. Eligibility precedes possible exploration-to-combat AP refresh; no living guards means no refresh.', sources: [evidence(game, 'export const grenadeCost='), evidence(game, 'export function throwGrenade(')]},
      {claim: 'Range 10 m, blast 5 m; trajectory uses 33 sinusoidal samples. Explored landing, in-bounds, obstacle, air-path and AP checks are distinct from blast lineClear. Footprint is fog-limited, not a visibility reveal.', sources: [evidence(game, 'export function grenadeTrajectory('), evidence(game, 'export function grenadeBlastFootprint('), evidence(game, 'export function previewGrenade(')]},
      {claim: 'Blast resolves during the accepted command, visits living units in source order including self/allies, applies falloff/resistance and ordinary casualty consequences once. Conditional loaded-fuel detonation may replace damage, consume saved RNG, alter later victims and break windows before the ordinary post-loop windowBlast. These are ordered authoritative consequences, not cosmetic callbacks.', sources: [evidence(game, 'export function throwGrenade('), evidence(game, 'function detonateImpact('), evidence(game, 'function windowBlast('), evidence(dist + 'solo-fuel.js', 'function explode(')]},
      {claim: 'Surviving guards within 20 m of the thrower become alert and remember the thrower. This is a game alert policy, not an acoustic simulation.', sources: [evidence(game, 'export function throwGrenade(')]},
      {claim: 'Fuel blast radius 5 breaks windows ignoring walls, destroys carried fuel/pack/slot state, lights eligible ground cells for 3 turns, kills in the 3 m same-height square and ignites radius-5 units. Source save restore checks destroyed-tank consistency. Fire, windows and geometry stay explicit host consequence boundaries.', sources: [evidence(dist + 'solo-fuel.js', 'export function createFuelRules('), evidence(game, 'function windowBlast(')]},
      {claim: 'App aim/cancel is free; commit rechecks the landing, calls actual Core.throwGrenade, ends camera aim with 800 ms linger and saves. Original input/button tests use the actual app script with view/art stubs.', sources: [evidence(app, 'if(!Core.throwGrenade(state,u,landing))return;'), evidence(app, 'view.endGrenadeAim({linger:800})')]},
      {claim: 'Live FieldView presents sampled line/ring effects on a 700 ms lifetime and delayed grenade window visuals; it does not call the designer body throw driver. This is transient playback of an already resolved command.', sources: [evidence(field, 'ttl:700'), evidence(field, 'const windowStart=event=>')]},
      {claim: 'encodeSave omits effect, fireAnimations and windowEvents. Spent AP/stock, HP/casualties, fuel/fire/window changes persist; there is no authoritative fuse, bounce or saved midflight projectile to resume.', sources: [evidence(game, 'export function encodeSave(')]}
    ],
    rights: {rootNotices: [...inventory.keys()].filter(p => /^(?:LICENSE|NOTICE|COPYING)(?:\.[^/]+)?$/i.test(p)).sort(),
      preserved: notices, status: 'Original bytes, embedded comments, upstream provenance and the two Three MIT notices are retained. No root license is present at this pin. Provenance is not an additional license grant.'},
    adaptations: 'None in original payload. Generated private ESM package.json makes preserved .js conformance modules directly runnable under Node. Public runtime/adapters and packaging decisions are separate.',
    designEvaluation: {accuracy: 'Prefer exact source semantics for Farmyard-compatible tactical comparison; sinusoidal paths and planar blast cover are approximations, not measured ballistics or shrapnel.',
      efficiency: 'Measured raw copied payload and static dependency/resource sizes only. Headless evidence avoids renderer/art copying; no CPU, memory or mobile performance claim.',
      narrative: 'Keep Farmyard controls/outcome rules for compatibility. Other games choose explicit adapters. Richer fuel/fire belongs to a declared ordered reactive profile.'}
  };
  return {manifest, payload: new Map(names.map(name => [name, read(name)]))};
}

function regularBytes(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('Expected regular file: ' + file);
  return fs.readFileSync(file);
}
function walk(dir, base = dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) fail('Snapshot symlink: ' + file);
    if (entry.isDirectory()) result.push(...walk(file, base));
    else if (entry.isFile()) result.push(path.relative(base, file).replaceAll('\\', '/'));
    else fail('Unsupported snapshot entry: ' + file);
  }
  return result.sort();
}
function verifySnapshot(destination, manifest) {
  if (manifest.commit !== FARMYARD_GRENADE_COMMIT || manifest.snapshotRoot !== FARMYARD_GRENADE_ROOT || manifest.donor !== 'farmyard-grenades') fail('Unexpected provenance identity.');
  if (!same(manifest.headless.entries, entries) || !same(manifest.headless.externalBuiltins, builtins)) fail('Executable entry/builtin policy drift.');
  const expected = [...manifest.files.map(f => f.path), 'package.json', 'provenance.json'].sort();
  if (new Set(expected).size !== 45 || manifest.files.length !== 43 || manifest.copiedPayload.bytes !== 894207 || manifest.copiedPayload.binaryAssets !== 0) fail('Payload bounds/identity drift.');
  if (!same(walk(destination), expected)) fail('Unexpected or missing snapshot files.');
  for (const file of manifest.files) {
    if (!file.path.startsWith(prefix) || file.path.includes('..') || !/\.(?:m?js|json|html|css|txt)$/.test(file.path) || file.role !== 'reference') fail('Invalid source record: ' + file.path);
    const data = regularBytes(path.join(destination, file.path));
    if (data.length !== file.bytes || sha256(data) !== file.sha256 || gitBlob(data) !== file.gitBlob) fail('Source bytes changed: ' + file.path);
  }
  if (!regularBytes(path.join(destination, 'package.json')).equals(packageBytes)) fail('Generated package scope drift.');
  const modules = discover(entries, file => regularBytes(path.join(destination, file)), true);
  if (!same(modules, manifest.headless.modules) || modules.length !== 36) fail('Headless module closure drift.');
  if (modules.some(m => /\/vendor\/three|field-view|designer\//.test(m.path))) fail('Renderer leaked into headless closure.');
}

/** Offline source-integrity gate. No donor checkout, VM app execution or network. */
export function verifyFarmyardGrenadeIntake(root = projectRoot) {
  const destination = path.join(root, FARMYARD_GRENADE_ROOT);
  const review = regularBytes(path.join(root, reviewPath));
  if (review.length > 1024 * 1024 || !review.equals(regularBytes(path.join(destination, 'provenance.json')))) fail('Review/snapshot provenance differs or exceeds bound.');
  const manifest = JSON.parse(review.toString('utf8'));
  verifySnapshot(destination, manifest);
  for (const record of manifest.dependencyResolutions.three) {
    const data = regularBytes(path.join(root, record.enginePath));
    if (data.length !== record.engineBytes || sha256(data) !== record.engineSha256 ||
        sha256(Buffer.from(data.toString('utf8').replaceAll('\r\n', '\n'))) !== record.normalizedLfSha256 || record.normalizedLfEqual !== true) fail('Existing pinned Three compatibility evidence drift: ' + record.enginePath);
  }
  return summary(manifest);
}

function writeIntake(intake) {
  const destination = path.join(projectRoot, FARMYARD_GRENADE_ROOT), review = path.join(projectRoot, reviewPath);
  const manifestBytes = jsonBytes(intake.manifest);
  if (fs.existsSync(destination)) {
    if (!regularBytes(path.join(destination, 'provenance.json')).equals(manifestBytes) || !fs.existsSync(review) || !regularBytes(review).equals(manifestBytes)) fail('Existing immutable snapshot differs; do not overwrite.');
    verifyFarmyardGrenadeIntake();
    return;
  }
  if (fs.existsSync(review) && !regularBytes(review).equals(manifestBytes)) fail('Existing review manifest differs; do not overwrite.');
  const parent = path.dirname(destination), stage = path.join(parent, '.intake-' + randomUUID());
  fs.mkdirSync(stage, {recursive: true});
  try {
    for (const [name, bytes] of intake.payload) {
      const file = path.join(stage, name);
      fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, bytes, {flag: 'wx'});
    }
    fs.writeFileSync(path.join(stage, 'package.json'), packageBytes, {flag: 'wx'});
    fs.writeFileSync(path.join(stage, 'provenance.json'), manifestBytes, {flag: 'wx'});
    verifySnapshot(stage, intake.manifest);
    fs.mkdirSync(path.dirname(review), {recursive: true});
    fs.writeFileSync(review, manifestBytes, {flag: fs.existsSync(review) ? 'w' : 'wx'});
    fs.renameSync(stage, destination);
  } finally {
    if (path.dirname(path.resolve(stage)) !== path.resolve(parent) || !path.basename(stage).startsWith('.intake-')) fail('Unsafe staging cleanup target.');
    if (fs.existsSync(stage)) fs.rmSync(stage, {recursive: true});
  }
  verifyFarmyardGrenadeIntake();
}

function main(argv) {
  if (argv.length === 1 && argv[0] === '--verify') {
    console.log(JSON.stringify({...verifyFarmyardGrenadeIntake(), verified: true})); return;
  }
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write' && !options.write) options.write = true;
    else if ((arg === '--repo' || arg === '--commit') && !options[arg] && argv[i + 1] && !argv[i + 1].startsWith('--')) options[arg] = argv[++i];
    else fail('Use --verify OR --repo <checkout> --commit <full reviewed SHA> [--write].');
  }
  if (!options['--repo'] || !options['--commit']) fail('Pass --repo and --commit; dry-run is the default.');
  const intake = buildIntake(options['--repo'], options['--commit']);
  if (options.write) writeIntake(intake);
  console.log(JSON.stringify({...summary(intake.manifest), written: !!options.write, referenceStaticModules: {
    nativeModel: intake.manifest.references.nativeModel.staticModules.length,
    designerThrow: intake.manifest.references.designerThrow.staticModules.length,
    optionalDesignerPresenter: intake.manifest.references.designerPresenter.staticModules.length}}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
