import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root, packProfile} from './distribution.mjs';

// Foreground offline proof. No server/browser, donor mutation or install script.
const packed = packProfile('compatibility');
const reportRoot = path.join(root, 'artifacts/installed-train-controls');
const archiveDigest = createHash('sha256').update(fs.readFileSync(packed.file)).digest('hex').slice(0, 16);
const folder = path.join(reportRoot, archiveDigest);
fs.mkdirSync(folder, {recursive: true});
fs.writeFileSync(path.join(folder, 'package.json'), JSON.stringify({private: true, type: 'module'}, null, 2));
const archive = path.join(folder, 'train-controls-' + archiveDigest + '.tgz');
fs.copyFileSync(packed.file, archive);
const npm = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
  path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')]
  .find(file => file && path.basename(file) === 'npm-cli.js' && fs.existsSync(file));
assert.ok(npm, 'Use a Node installation with npm.');
execFileSync(process.execPath, [npm, 'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', folder, archive],
  {cwd: root, windowsHide: true, maxBuffer: 4 * 1024 * 1024});
const resolve = createRequire(path.join(folder, 'package.json'));
const entry = resolve.resolve('@nautilus-engine/map-core/trains/ui');
assert.ok(entry.startsWith(path.join(folder, 'node_modules') + path.sep));
const api = await import(pathToFileURL(entry));
assert.equal(typeof api.mountTrainControls, 'function');
assert.deepEqual(api.TRAIN_CONTROLS_CARD.steamProfiles, ['classic', 'compact-notched']);
const style = resolve.resolve('@nautilus-engine/map-core/trains/style.css');
const compactStyle = path.join(path.dirname(style), 'compact.css');
assert.match(fs.readFileSync(style, 'utf8'), /compact\.css/);
const packageRoot = path.resolve(path.dirname(style), '../..');
const source = JSON.parse(fs.readFileSync(path.join(packageRoot, 'packages/train-ui/compact-source.json')));
const resources = source.runtimeResources.map(row => {
  const bytes = fs.readFileSync(path.join(packageRoot, row.path));
  assert.equal(bytes.length, row.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256);
  return {path: row.path, bytes: bytes.length};
});
const urls = [...fs.readFileSync(compactStyle, 'utf8').matchAll(/url\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
assert.equal(urls.length, 3);
for (const url of urls) assert.ok(fs.statSync(fileURLToPath(new URL(url, pathToFileURL(compactStyle)))).isFile());
for (const file of source.notices) assert.ok(fs.readFileSync(path.join(packageRoot, file)).length > 1000);
const provenance = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package-provenance.json')));
assert.ok(provenance.files.every(row => !/^packages\/train-ui\/(?:fixture|tools|tests|evidence)\//.test(row.path)));
assert.ok(provenance.files.every(row => !/^vendor\/tinderbox-train-controls\/[^/]+\/(?:src|docs)\//.test(row.path)));

// The optional browser proof uses installed UI with the retained project world,
// simulation and native train/actor art. It does not claim a packaged game.
const yard = path.join(reportRoot, 'yard'); fs.mkdirSync(yard, {recursive: true});
const installedBase = '/artifacts/installed-train-controls/' + archiveDigest + '/node_modules/@nautilus-engine/map-core/packages/train-ui/';
const installedPackage=installedBase.replace(/packages\/train-ui\/$/,'');
for (const name of ['train-yard.html', 'train-yard.css', 'train-yard.js', 'train-yard-application.js', 'train-yard-host.js']) {
  let body = fs.readFileSync(path.join(root, 'examples', name), 'utf8');
  if (name.endsWith('.html')) body = body.replaceAll('"../packages/', '"'+installedPackage+'packages/');
  if (name.endsWith('.js')) body = body
    .replace("from '../packages/train-ui/public.js'", "from '" + installedBase + "public.js'")
    .replaceAll("from '../packages/", "from '"+installedPackage+"packages/")
    .replaceAll("from '../vendor/", "from '/vendor/")
    .replaceAll("new URL('../vendor/", "new URL('/vendor/");
  fs.writeFileSync(path.join(yard, name), body);
}
const report = {package: packed.name, installedEntry: path.relative(folder, entry).replaceAll('\\', '/'),
  resources, exactBinaryBytes: resources.reduce((sum, row) => sum + row.bytes, 0),
  noticesPresent: true, sourceFixturesExcluded: true, uiImportsWithoutDOM: true,
  browserEntry: '/artifacts/installed-train-controls/yard/train-yard.html',
  scope: 'Installed UI/resources; the browser proof explicitly borrows the project native world and train host.'};
fs.writeFileSync(path.join(reportRoot, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
