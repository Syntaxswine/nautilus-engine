// Explicit optional train additions. Fixture tools/evidence are source-only.
export const TRAIN_GUIDES = ['docs/drivable-trains.md', 'docs/train-controls.md',
  'docs/reviews/2026-11-10-drivable-trains.md', 'docs/reviews/2026-11-10-drivable-train-playtest.md'];
const core = ['README.md', 'contract.js', 'data.js', 'circuit-traffic.js', 'index.js', 'index.d.ts']
  .map(file => 'packages/train-core/' + file);
const ui = ['public.js', 'public.d.ts', 'index.js', 'index.d.ts', 'view.js', 'style.css']
  .map(file => 'packages/train-ui/' + file);

export function trainPackageExports(profile = 'compatibility') {
  if (profile === 'core') return {'./trains': './packages/train-core/index.js'};
  return profile === 'compatibility' ? {'./trains': './packages/train-core/index.js',
    './trains/ui': './packages/train-ui/public.js', './trains/style.css': './packages/train-ui/style.css'} : {};
}
export function trainPackageFiles(profile) {
  return [...TRAIN_GUIDES, ...(profile === 'core' || profile === 'compatibility' ? core : []),
    ...(profile === 'compatibility' ? ui : [])];
}
export function checkTrainRegistration({read, indexed}) {
  for (const file of [...trainPackageFiles('compatibility'), 'tools/train-registration.mjs']) {
    const bytes = read(file);
    if (!bytes.length) throw Error('Empty train registration file: ' + file);
    indexed(file, bytes);
  }
}

export function trainBuildBytes(before) {
  const text = before.toString('utf8');
  const anchor = "fs.cpSync(path.join(root, 'packages'), path.join(output, 'packages'), {recursive: true});";
  if (text.split(anchor).length !== 2) throw Error('Expected one package copy in the authenticated build.');
  const replacement = "fs.cpSync(path.join(root, 'packages'), path.join(output, 'packages'), {recursive: true, filter: source => !/^train-ui\\/(?:evidence|tools|tests|fixture)(?:\\/|$)/.test(path.relative(path.join(root, 'packages'), source).split(path.sep).join('/'))});";
  return Buffer.from(text.replace(anchor, replacement));
}
