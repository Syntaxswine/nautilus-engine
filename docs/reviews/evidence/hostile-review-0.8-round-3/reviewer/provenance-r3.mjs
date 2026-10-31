// Round 3: re-derive the reviewed-output pin from Git objects.
//   node provenance-r3.mjs <sandbox root> <out.json>
// 1. ee7c18e's own building-catalog files (index.js, designs.js, three.js) are
//    written to a scratch folder from Git objects; the CURRENT digest tool
//    (tools/building-geometry.mjs) digests every design at both LODs with them.
//    The fixture must equal that (it claims to be recorded with ee7c18e's renderer).
// 2. The current renderer must give the same 96 digests (byte-identical output).
// 3. Hashes the record files under reviewed/current are recomputed from objects.
// 4. Controls: a forged fixture entry, and ee7c18e's renderer with glass opacity
//    nudged (must change a digest), so the comparison can fail.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const [root, outFile] = process.argv.slice(2).map(p => path.resolve(p));
const git = (...a) => execFileSync('git', ['-C', root, ...a], {maxBuffer: 1 << 28});
const sha = b => createHash('sha256').update(b).digest('hex');
const REV = 'ee7c18ecdc2669168247b94a82156634b2c4ffe5';
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'r08-3-prov-'));
const result = {script: 'provenance-r3.mjs', head: git('rev-parse', 'HEAD').toString().trim(), status: git('status', '--short').toString(), reviewed: REV, checks: {}};
try {
  // ee7c18e's catalog package from objects, at a path that keeps its relative imports.
  const rel = 'packages/building-catalog';
  for (const name of ['index.js', 'designs.js', 'three.js']) {
    const dir = path.join(scratch, 'rev', rel); fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, name), git('show', REV + ':' + rel + '/' + name));
  }
  // The control renderer: the same file with the glass opacity nudged.
  const revThree = fs.readFileSync(path.join(scratch, 'rev', rel, 'three.js'), 'utf8');
  const nudged = revThree.replace("opacity:id==='glass'?(grey?.08:.58):1", "opacity:id==='glass'?(grey?.08:.59):1");
  if (nudged === revThree) throw Error('control needle not found in the reviewed renderer');
  const cdir = path.join(scratch, 'control', rel); fs.mkdirSync(cdir, {recursive: true});
  for (const name of ['index.js', 'designs.js']) fs.copyFileSync(path.join(scratch, 'rev', rel, name), path.join(cdir, name));
  fs.writeFileSync(path.join(cdir, 'three.js'), nudged);

  const T = await import(pathToFileURL(path.join(root, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href);
  const {buildingDigests} = await import(pathToFileURL(path.join(root, 'tools/building-geometry.mjs')).href);
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/original-building-geometry.json'), 'utf8'));
  const ids = [...new Set(Object.keys(fixture.digests).map(k => k.split(':')[1]))];
  const digestsWith = async dir => buildingDigests(T, (await import(pathToFileURL(path.join(dir, 'three.js')).href)).createBuildingModel, ids);
  const reviewed = await digestsWith(path.join(scratch, 'rev', rel)), current = await digestsWith(path.join(root, rel)), control = await digestsWith(cdir);
  const same = (x, y) => Object.keys(fixture.digests).filter(k => x[k] === y[k]).length;
  result.checks.entries = Object.keys(fixture.digests).length;
  result.checks.fixtureEqualsReviewedRenderer = same(fixture.digests, reviewed);
  result.checks.fixtureEqualsCurrentRenderer = same(fixture.digests, current);
  result.checks.controlNudgedGlassEqualsFixture = same(fixture.digests, control) + ' (must be fewer than entries)';
  const forged = {...fixture.digests, [Object.keys(fixture.digests)[0]]: '0'.repeat(64)};
  result.checks.controlForgedEntryEqualsReviewed = same(forged, reviewed) + ' (must be entries - 1)';
  // Hashes filed under reviewed/current, recomputed.
  result.checks.reviewedRendererSha = sha(git('show', REV + ':' + rel + '/three.js'));
  result.checks.currentRendererSha = sha(fs.readFileSync(path.join(root, rel, 'three.js')));
  result.checks.fixtureSha = sha(fs.readFileSync(path.join(root, 'tests/fixtures/original-building-geometry.json')));
  const revCatalogue = JSON.parse(git('show', REV + ':assets/buildings/catalogue.json').toString()), curCatalogue = JSON.parse(fs.readFileSync(path.join(root, 'assets/buildings/catalogue.json'), 'utf8'));
  const content = c => sha(JSON.stringify({...c, inputs: c.inputs.filter(input => input.file !== 'packages/building-catalog/three.js')}));
  result.checks.reviewedCatalogueContentSha = content(revCatalogue);
  result.checks.currentCatalogueContentSha = content(curCatalogue);
  result.checks.reviewedCatalogueFileSha = sha(git('show', REV + ':assets/buildings/catalogue.json'));
  const {ORIGINAL_BUILDING_SOURCE: record} = await import(pathToFileURL(path.join(root, 'packages/prefab-core/original-catalogue.js')).href);
  result.record = record;
  result.verdicts = {
    reviewedRenderer: record.reviewed.renderer.sha256 === result.checks.reviewedRendererSha,
    reviewedCatalogueContent: record.reviewed.catalogueContentSha256 === result.checks.reviewedCatalogueContentSha && result.checks.currentCatalogueContentSha === result.checks.reviewedCatalogueContentSha,
    fixturePinned: record.reviewed.geometry.sha256 === result.checks.fixtureSha,
    currentRenderer: record.current.inputs.find(i => i.file.endsWith('three.js')).sha256 === result.checks.currentRendererSha,
    fixtureRecordedWithReviewed: result.checks.fixtureEqualsReviewedRenderer === result.checks.entries,
    currentOutputIdentical: result.checks.fixtureEqualsCurrentRenderer === result.checks.entries,
    controlsFail: !String(result.checks.controlNudgedGlassEqualsFixture).startsWith(String(result.checks.entries) + ' ') && String(result.checks.controlForgedEntryEqualsReviewed).startsWith(String(result.checks.entries - 1) + ' ')
  };
} finally {fs.rmSync(scratch, {recursive: true, force: true});}
fs.writeFileSync(outFile, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result.verdicts), JSON.stringify(result.checks));
