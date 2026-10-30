// Offline installed public-import reference. No browser, server or source fallback.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { root, packProfile } from './distribution.mjs';
import { FARMYARD_DOOR_REFERENCE_PACKAGE as packageName, farmyardDoorReviewInputs } from './farmyard-door-reference-inputs.mjs';

const kind = 'nautilus-farmyard-door-installed-reference-v1';
const ownerTool = 'tools/prepare-farmyard-door-installed.mjs';
const relativeStage = path.join('artifacts', 'farmyard-door-installed-reference');
const markerName = '.proof-ownership.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const slash = file => file.replaceAll('\\', '/');
const json = value => JSON.stringify(value, null, 2) + '\n';
const fail = message => { throw Error('Installed Farmyard door reference: ' + message); };

function unlinkedTree(folder) {
  const files = [];
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name), stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) fail('Refusing linked output: ' + file);
    if (stat.isDirectory()) files.push(...unlinkedTree(file));
    else if (stat.isFile()) files.push(file);
    else fail('Refusing nonregular output: ' + file);
  }
  return files;
}
/** Read-only ownership check, exported for synthetic safety tests. */
export function assertOwnedFarmyardDoorInstalledReference(projectRoot = root) {
  const project = path.resolve(projectRoot);
  if (fs.realpathSync(project) !== project) fail('Use the canonical project root.');
  const stage = path.resolve(project, relativeStage);
  if (path.relative(project, stage) !== relativeStage || path.basename(stage) !== 'farmyard-door-installed-reference') fail('Invalid reference target.');
  const parent = path.dirname(stage);
  if (fs.existsSync(parent) && (fs.lstatSync(parent).isSymbolicLink() || fs.realpathSync(parent) !== parent)) fail('Refusing linked artifacts directory.');
  if (!fs.existsSync(stage)) return stage;
  if (fs.lstatSync(stage).isSymbolicLink() || fs.realpathSync(stage) !== stage || !fs.lstatSync(stage).isDirectory()) fail('Refusing linked/unexpected reference directory.');
  const marker = path.join(stage, markerName), markerStat = fs.lstatSync(marker);
  if (!markerStat.isFile() || markerStat.isSymbolicLink() || markerStat.size > 16384) fail('Missing/invalid ownership marker.');
  const prior = JSON.parse(fs.readFileSync(marker, 'utf8'));
  if (prior.schemaVersion !== 1 || prior.kind !== kind || prior.projectRoot !== project || prior.stage !== stage || prior.ownerTool !== ownerTool) fail('Refusing to replace an unowned reference.');
  const allowed = [markerName, 'package.json', 'node_modules', 'player', 'installation.json'];
  if (fs.readdirSync(stage).some(name => !allowed.includes(name))) fail('Unexpected files in reference directory; preserve before retrying.');
  unlinkedTree(stage);
  return stage;
}
function npmCLI() {
  const file = [process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')]
    .find(value => value && path.basename(value) === 'npm-cli.js' && fs.existsSync(value));
  if (!file) fail('Run through npm or a Node installation containing npm.');
  return file;
}
function installedFile(installed, name) {
  if (typeof name !== 'string' || name.includes('\\') || path.posix.normalize(name) !== name || name.startsWith('/') || name.split('/').some(part => !part || part === '.' || part === '..')) fail('Unsafe installed path: ' + name);
  const file = path.resolve(installed, name);
  if (!file.startsWith(installed + path.sep)) fail('Installed path escapes package: ' + name);
  if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) fail('Installed target must be a regular file: ' + name);
  return file;
}
function verifyPackage(installed, packed, inputs) {
  const actual = unlinkedTree(installed).map(file => slash(path.relative(installed, file))).sort();
  const expected = [...inputs.compatibility.files, 'package.json', 'package-provenance.json'].sort();
  assert.deepEqual(actual, expected, 'Installed package contains omitted/unexpected runtime files.');
  for (const name of actual) if (/^vendor\/(?:farmyard-grenades|farmyard-grenade-visuals|farmyard-door-view)\//.test(name) ||
    name.startsWith('vendor/farmyard-door-visuals/') && /\.(?:m?js|source)$/.test(name)) fail('Raw mixed donor/game source leaked into the runtime: ' + name);
  const manifest = JSON.parse(fs.readFileSync(installedFile(installed, 'package.json'), 'utf8'));
  assert.equal(manifest.name, packageName); assert.equal(manifest.version, packed.version);
  assert.deepEqual(manifest.exports, inputs.compatibility.exports, 'Installed declared exports differ.');
  const provenanceBytes = fs.readFileSync(installedFile(installed, 'package-provenance.json')), provenance = JSON.parse(provenanceBytes);
  assert.equal(provenance.schemaVersion, 1); assert.equal(provenance.profile, 'compatibility'); assert.equal(provenance.version, packed.version);
  assert.ok(Array.isArray(provenance.files)); assert.equal(provenance.files.length, inputs.compatibility.files.length);
  const seen = new Set(), source = new Map(inputs.files.map(file => [file.path, file]));
  for (const record of provenance.files) {
    if (seen.has(record.path) || !inputs.compatibility.files.includes(record.path)) fail('Unexpected/duplicate packaged provenance entry.');
    seen.add(record.path); const expectedSource = source.get(record.path), bytes = fs.readFileSync(installedFile(installed, record.path));
    assert.equal(record.bytes, expectedSource.bytes); assert.equal(record.sha256, expectedSource.sha256, 'Packed source changed: ' + record.path);
    assert.equal(bytes.length, record.bytes); assert.equal(hash(bytes), record.sha256, 'Installed resource differs: ' + record.path);
  }
  return { manifest, provenanceSha256: hash(provenanceBytes), paths: seen };
}
function publicEntry(installed, manifest, name) {
  if (!name.startsWith(packageName + '/')) fail('Unexpected public namespace: ' + name);
  const entry = manifest.exports['.' + name.slice(packageName.length)];
  if (typeof entry !== 'string' || !entry.startsWith('./')) fail('Missing explicit installed public export: ' + name);
  const file = installedFile(installed, entry.slice(2));
  return { path: slash(path.relative(installed, file)), href: '../node_modules/' + packageName + '/' + entry.slice(2) };
}
function probePublicPackage(stage, installed) {
  // This separate foreground command resolves bare names from the actual isolated
  // install. It cannot fall back to Root's package paths or a sibling checkout.
  const script = `
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import * as D from '@nautilus-engine/map-core/adapters/farmyard/doors';
import * as V from '@nautilus-engine/map-core/adapters/farmyard/doors/three';
import * as T from '@nautilus-engine/map-core/render-effects/three';
const installed=fs.realpathSync(process.argv[1]),pin='251bf8094b5f9ebe44208443084c1a6d6658512a',digest='fd84b8b6dffb4974ce19c51d8a8e0dbe7295a2dddcf8c262eaa94e542ed64021';
assert.equal(D.FARMYARD_DOOR_PROFILE.sourceCommit,pin);assert.equal(V.FARMYARD_DOOR_VISUAL_SOURCE.commit,pin);
assert.equal(V.FARMYARD_DOOR_VISUAL_SOURCE.wood.sha256,digest);
const resources=Object.entries(V.farmyardDoorVisualResourceURLs()).map(([id,url])=>{const file=fs.realpathSync(fileURLToPath(url));assert.ok(file.startsWith(installed+path.sep));const bytes=fs.readFileSync(file);const sha256=createHash('sha256').update(bytes).digest('hex');assert.equal(id,'wood');assert.equal(bytes.length,2757790);assert.equal(sha256,digest);return {id,path:path.relative(installed,file).replaceAll('\\\\','/'),bytes:bytes.length,sha256};});
assert.equal(resources.length,1);
const texture=new T.Texture(),visual=await V.createFarmyardDoorPresentation({collider:{id:'installed-proof',interactionId:'installed-proof',kind:'wall',x0:0,x1:.16,y0:0,y1:1.12,z0:0,height:2},known:true,visible:true,texture});
try{assert.ok(visual.root instanceof T.Group);assert.ok(visual.leaf instanceof T.Mesh);assert.equal(visual.leaf.geometry.index.count/3,12);assert.equal(visual.leaf.material.map instanceof T.Texture,true);}finally{visual.dispose();texture.dispose();}
console.log(JSON.stringify({publicImports:true,sharedThree:true,resources}));
`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script, installed],
    { cwd: stage, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 }));
}
function prepareHTML(html, reference, installed, checked) {
  const imports = {}, adaptations = [];
  for (const name of Object.keys(reference.importMap.imports)) imports[name] = publicEntry(installed, checked.manifest, name).href;
  let output = html.replace(reference.importMapTag, () => '<script type="importmap">' + JSON.stringify({ imports }) + '</script>');
  adaptations.push({ kind: 'installed-public-import-map', imports });
  const replacements = new Map();
  for (const link of reference.links) {
    let target = link.packagePath;
    if (!checked.paths.has(target) && link.kind === 'guide' && target === 'docs/ui/farmyard-door-reference.md') target = 'docs/adapters/farmyard-doors.md';
    if (!checked.paths.has(target)) fail('Installed package omits the reference guide/home target: ' + target);
    installedFile(installed, target);
    const href = '../node_modules/' + packageName + '/' + target + (link.fragment ?? '');
    replacements.set(link.source, href);
    adaptations.push({ kind: link.kind, source: link.source, output: href, packagePath: target, redirected: target !== link.packagePath });
  }
  output = output.replace(/(\bhref\s*=\s*)(["'])(.*?)\2/gi, (whole, prefix, quote, href) => replacements.has(href) ? prefix + quote + replacements.get(href) + quote : whole);
  for (const [before, after] of replacements) {
    if (output.includes('href="' + before + '"') || output.includes("href='" + before + "'") || !output.includes(after)) fail('Unadapted reference navigation link.');
  }
  return { bytes: Buffer.from(output), publicImports: Object.keys(imports).sort(), adaptations };
}
export function prepareInstalledFarmyardDoorReference() {
  const inputs = farmyardDoorReviewInputs(), npm = npmCLI(), packed = packProfile('compatibility');
  const tarball = path.resolve(packed.file), distributionDirectory = path.resolve(root, 'artifacts/distribution');
  if (!tarball.startsWith(distributionDirectory + path.sep) || fs.realpathSync(tarball) !== tarball || !fs.lstatSync(tarball).isFile()) fail('Unexpected package tarball path.');
  const tarballSha256 = hash(fs.readFileSync(tarball));
  if (farmyardDoorReviewInputs().inputSha256 !== inputs.inputSha256) fail('Inputs changed while packing.');
  const stage = assertOwnedFarmyardDoorInstalledReference(), markerPath = path.join(stage, markerName);
  // The exact absolute target, canonical parent, ownership marker and descendant
  // links were all checked immediately before recursive deletion.
  if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });
  const ownership = { schemaVersion: 1, kind, projectRoot: root, stage, ownerTool, preparedAt: new Date().toISOString(),
    inputSha256: inputs.inputSha256, status: 'preparing',
    purpose: 'Disposable offline installed door reference. No browser/server/helper is started; rebuild deliberately through the recorded tool.',
    restart: { cwd: root, executable: process.execPath, args: [ownerTool], requirements: 'Node/npm, integrated reference fixture closure and compatibility package inputs; offline npm install only.' } };
  fs.writeFileSync(markerPath, json(ownership));
  try {
    fs.writeFileSync(path.join(stage, 'package.json'), json({ name: 'nautilus-installed-farmyard-door-proof', private: true, type: 'module' }));
    execFileSync(process.execPath, [npm, 'install', '--offline', '--ignore-scripts', '--package-lock=false', '--no-audit', '--no-fund', tarball],
      { cwd: stage, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
    const installed = path.join(stage, 'node_modules', ...packageName.split('/'));
    if (fs.realpathSync(installed) !== installed || fs.lstatSync(installed).isSymbolicLink()) fail('Unexpected installed package location.');
    const checked = verifyPackage(installed, packed, inputs), native = probePublicPackage(stage, installed);
    const sourceFiles = new Map(inputs.files.map(file => [file.path, file])), player = path.join(stage, 'player');
    fs.mkdirSync(player);
    const sourceHTML = fs.readFileSync(path.join(root, inputs.reference.entry), 'utf8');
    const adapted = prepareHTML(sourceHTML, inputs.reference, installed, checked), files = [];
    for (const record of inputs.reference.files) {
      const source = fs.readFileSync(path.join(root, record.path));
      assert.equal(hash(source), sourceFiles.get(record.path).sha256, 'Reference input changed before copying.');
      const name = path.posix.basename(record.path), output = record.path === inputs.reference.entry ? adapted.bytes : source;
      fs.writeFileSync(path.join(player, name), output, { flag: 'wx' });
      files.push({ path: 'player/' + name, bytes: output.length, sourcePath: record.path,
        sourceSha256: hash(source), installedFixtureSha256: hash(output),
        adaptation: record.path === inputs.reference.entry ? 'Only installed public import map and recorded guide/home links' : 'Unchanged private consumer fixture bytes' });
    }
    if (farmyardDoorReviewInputs().inputSha256 !== inputs.inputSha256) fail('Inputs changed while preparing installed reference.');
    const report = { schemaVersion: 1, kind, preparedAt: ownership.preparedAt, projectRoot: root,
      inputSha256: inputs.inputSha256, inputs: inputs.files, package: packed, tarballSha256,
      installed: { path: slash(path.relative(root, installed)), provenanceSha256: checked.provenanceSha256,
        files: inputs.compatibility.files.length, declaredExports: checked.manifest.exports },
      entry: 'player/' + path.posix.basename(inputs.reference.entry), publicImports: adapted.publicImports, files,
      adaptations: adapted.adaptations, nativeResources: native.resources, oneSharedThree: native.sharedThree,
      sourceFallback: false, privateEngineImports: false, rawReferenceSnapshotsInstalled: false,
      ownership: { marker: markerName, ownerTool, stage, disposable: true }, helpersStarted: 0 };
    fs.writeFileSync(path.join(stage, 'installation.json'), json(report));
    fs.writeFileSync(markerPath, json({ ...ownership, status: 'complete' }));
    return report;
  } catch (error) {
    fs.writeFileSync(markerPath, json({ ...ownership, status: 'failed', failure: 'Preparation failed. Preserve installation output and rerun deliberately after fixing the input/install failure.' }));
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(json(prepareInstalledFarmyardDoorReference())); }
  catch (error) { console.error(error); process.exitCode = 1; }
}
