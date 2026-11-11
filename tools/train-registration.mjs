// Explicit optional train additions. Fixture tools/evidence are source-only.
import {createHash} from 'node:crypto';
const trainImage = 'packages/train-ui/art/steam-cab-surface.svg';
// Exact original art reviewed in UI5577773727b757c3142cb2ded0a10315e25cd41d.
const trainImageSha256 = 'cc7479604e0eb2fdcc5f9a6ed1971a283b5c24dd1f4aa17b441bb7f24c8f7567';
export const TRAIN_COMPACT_SOURCE = 'fb0628605c274550ff8abad50b151843f08747d1';
const compactRoot = 'vendor/tinderbox-train-controls/' + TRAIN_COMPACT_SOURCE;
const compactManifest = compactRoot + '/source.json';
const compactFonts = compactRoot + '/assets/art/ui/typography/';
const compactWood = compactRoot + '/vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/hybrid-surfaces/wood-factory-v2.png';
const compactResources = [compactWood, compactFonts + 'besley/Besley[wght].ttf', compactFonts + 'oldstandardtt/OldStandard-Regular.ttf'];
const compactSupport = [compactRoot + '/NOTICE.md', compactFonts + 'besley/OFL.txt', compactFonts + 'oldstandardtt/OFL.txt', compactManifest, compactFonts + 'manifest.json'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const trainVisualResourcePaths = () => [...compactResources];
export const trainStaticResourcePaths = () => [...compactResources, ...compactSupport];
export function authenticatedTrainImages(profile, {read, indexed = () => {}}) {
  if (profile !== 'compatibility') return [];
  const images = [[trainImage, trainImageSha256], [compactWood, 'fd84b8b6dffb4974ce19c51d8a8e0dbe7295a2dddcf8c262eaa94e542ed64021']];
  for (const [file, hash] of images) {
    const bytes = read(file);
    if (digest(bytes) !== hash) throw Error('Unreviewed train panel artwork: ' + file);
    indexed(file, bytes);
  }
  return images.map(([file]) => file);
}
export const TRAIN_GUIDES = ['docs/drivable-trains.md', 'docs/train-controls.md',
  'docs/reviews/2026-11-10-drivable-trains.md', 'docs/reviews/2026-11-10-drivable-train-playtest.md',
  'docs/reviews/2026-11-11-tinderbox-train-controls.md'];
const core = ['README.md', 'contract.js', 'data.js', 'circuit-traffic.js', 'index.js', 'index.d.ts']
  .map(file => 'packages/train-core/' + file);
const ui = ['public.js', 'public.d.ts', 'index.js', 'index.d.ts', 'view.js', 'feedback.js', 'style.css',
  'art/steam-cab-surface.svg', 'art/references.json', 'compact-model.js', 'compact-input.js', 'compact.css',
  'compact-source.json', 'compact-handoff.json', 'source.json', 'COMPACT-PROFILE.md']
  .map(file => 'packages/train-ui/' + file);

export function trainPackageExports(profile = 'compatibility') {
  if (profile === 'core') return {'./trains': './packages/train-core/index.js'};
  return profile === 'compatibility' ? {'./trains': './packages/train-core/index.js',
    './trains/ui': './packages/train-ui/public.js', './trains/style.css': './packages/train-ui/style.css'} : {};
}
export function trainPackageFiles(profile) {
  return [...TRAIN_GUIDES, ...compactSupport, ...(profile === 'core' || profile === 'compatibility' ? core : []),
    ...(profile === 'compatibility' ? [...ui, ...compactResources] : [])];
}
export function checkTrainRegistration({read, indexed}) {
  for (const file of [...trainPackageFiles('compatibility'), 'tools/train-registration.mjs', 'tools/npm-files.mjs']) {
    const bytes = read(file);
    if (!bytes.length) throw Error('Empty train registration file: ' + file);
    indexed(file, bytes);
  }
  const sourceBytes = read(compactManifest);
  if (digest(sourceBytes) !== 'dd00fa451b542957600b23a908de5f65535048901aa070364c542c8b57687823') throw Error('Unreviewed compact train source inventory.');
  const source = JSON.parse(sourceBytes);
  if (source.commit !== TRAIN_COMPACT_SOURCE || source.files.length !== 27) throw Error('Unexpected compact train source pin or closure.');
  for (const row of source.files) {
    const file = compactRoot + '/' + row.path, bytes = read(file);
    if (bytes.length !== row.bytes || digest(bytes) !== row.sha256) throw Error('Imported train source bytes changed: ' + file);
    indexed(file, bytes);
  }
  if (digest(read(compactRoot + '/NOTICE.md')) !== '2a72e16a8c12cdf08b091ca4dc754b80c552fca6c726517a82ff2aedfbf02895') throw Error('Compact source notice changed.');
  if (digest(read('packages/train-ui/compact-source.json')) !== 'ded0653ff0b31f66391afd2026c2e03bc8770706992fb72833e12ecf8ac10c3e') throw Error('Compact adaptation source record changed.');
}

export function trainBuildBytes(before) {
  let text = before.toString('utf8');
  const importAnchor = "import {moduleReferenceGraph} from './module-references.mjs';";
  if (text.split(importAnchor).length !== 2) throw Error('Expected one authenticated build parser import.');
  text = text.replace(importAnchor, importAnchor + "\nimport {trainStaticResourcePaths} from './train-registration.mjs';");
  const anchor = "fs.cpSync(path.join(root, 'packages'), path.join(output, 'packages'), {recursive: true});";
  if (text.split(anchor).length !== 2) throw Error('Expected one package copy in the authenticated build.');
  const replacement = "fs.cpSync(path.join(root, 'packages'), path.join(output, 'packages'), {recursive: true, filter: source => !/^train-ui\\/(?:evidence|tools|tests|fixture)(?:\\/|$)/.test(path.relative(path.join(root, 'packages'), source).split(path.sep).join('/'))});";
  return Buffer.from(text.replace(anchor, replacement + "\nfor (const file of trainStaticResourcePaths()) write(file, fs.readFileSync(path.join(root, file)));"));
}
