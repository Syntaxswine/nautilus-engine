import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const manifest = read('source-manifest.json'), measured = read('source-measurements.json'), browser = read('source-browser-review.json'), cleanup = read('source-helper-cleanup.json');
assert.equal(measured.sourceCommit, manifest.sourceCommit);
assert.equal(browser.sourceCommit, manifest.sourceCommit);
assert.equal(measured.samples.length, 260);
assert.equal(measured.weapons.length, 13);
assert.deepEqual(measured.failures, []);
assert.deepEqual(browser.errors, []);
assert.deepEqual(browser.failedRequests, []);
assert.equal(new Set(browser.captures).size, 44);
assert.equal(cleanup.retainedHelpers, 0);
assert.ok(cleanup.checks.every(check => check.portReleased && check.processes.every(process => process.exactLifetimeEnded)));
assert.ok(browser.checks.every(check => check.nativeScale.every(scale => JSON.stringify(scale) === '[1,1,1]')));
const sampleRef = sample => ({outfit: sample.outfit, weapon: sample.weapon, sample: sample.label, body: sample.body, visual: sample.visual, equipped: sample.equipped});
const groundFindings = measured.samples.filter(sample => sample.equipped.min[1] < -.005).map(sample => ({...sampleRef(sample), belowFloorM: -sample.equipped.min[1]}));
const widthFindings = measured.samples.filter(sample => sample.equipped.size[2] > 1).map(sample => ({...sampleRef(sample), excessWidthM: sample.equipped.size[2] - 1}));
const by = (outfit, weapon, label) => measured.samples.find(sample => sample.outfit === outfit && sample.weapon === weapon && sample.label === label);
const figures = browser.captures.map(name => {
  const bytes = fs.readFileSync(new URL(name, import.meta.url));
  return {path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')};
});
const report = {
  schemaVersion: 1,
  status: 'Source-reference preparation complete; integrated provider/editor acceptance pending.',
  sourceCommit: manifest.sourceCommit, engineBaseline: manifest.engineBaseline,
  proposalCommit: '1115871def96e8a9e5ddc239bf4ad5a5a7ff9829', candidateCommit: null,
  sourceCacheFiles: manifest.files.length, sourceCacheBytes: manifest.bytes,
  cacheIsRuntimePackage: false, importedRuntimeBytes: 0,
  headlessSamples: measured.samples.length, pairedCaptures: figures.length,
  sourceContactToleranceM: .001, measuredMaximumContactErrorM: measured.maxContactErrorM,
  figures,
  reviewedExamples: {
    normalCarry: sampleRef(by('normal', 'hands', 'carry')),
    redHatCarry: sampleRef(by('red-hats', 'hands', 'carry')),
    hmgCarry: sampleRef(by('normal', 'hmg', 'carry')),
    rpgIdle: sampleRef(by('normal', 'rpg', 'idle:4.2')),
    sniperCrawl: sampleRef(by('normal', 'sniper', 'crawl:0'))
  },
  findings: [
    {id: 'bear-source-prone-composition', kind: 'measured source-helper composition failure',
      boundary: 'createBattlePosture + worker.pose(carry) + posture.apply(prone:1) + posture.ground(); not a claim about a reviewed Nautilus provider or every donor game path.',
      effect: 'Perfect hand anchors coexist with visible equipment under the floor. Raw posture must not be advertised as complete equipment-specific prone presentation.',
      observations: groundFindings,
      recommendation: 'Select or adapt the correct equipment-specific prone family while preserving native joints, contacts and prop dimensions; declare unsupported combinations explicitly until reviewed.'},
    {id: 'bear-source-door-width', kind: 'measured conservative envelope warning',
      boundary: 'Whole visible equipped AABB across fixed samples, not a swept query or physical doorway proof.',
      effect: 'One-tile placement cannot establish clearance. HMG carry has only 0.005362 m total spare width; RPG idle and sniper crawl exceed 1 m.',
      observations: widthFindings,
      recommendation: 'Keep native scale. Test host-confirmed swept clearance using the active equipment and stance; widen or reroute authoring spaces where needed.'},
    {id: 'bear-source-close-paint', kind: 'subjective visual observation',
      effect: 'The front close view has soft/squinting eye detail; extreme close views reveal projection registration at garment seams and beneath the tail. These are recorded in the source reference, not introduced by a Nautilus import.',
      recommendation: 'Preserve the native outfit painting as the comparison baseline. Consider any close-camera cleanup separately with the same source/candidate views; do not substitute generic uniform paint.'}
  ],
  supportedByThisReference: {
    carry: 'Both outfits, all thirteen equipment choices, measured and captured.',
    idle: 'Both outfits, all thirteen choices, three measured phases and selected painted captures; seek/replay checked.',
    posture: 'Both outfits, all thirteen choices measured; selected painted views. Raw prone composition has the recorded floor failures.',
    crawl: 'Both outfits, all thirteen choices, four measured phases; HMG has four paired painted views.',
    locomotion: 'Three paired rifle distance samples.',
    mammalAimFire: 'Six paired rifle times including 6.15 aim, 6.62 recoil and 8.2 rise. This donor helper uses the internal rifle; other weapons are not relabelled as supported.',
    horseOnlyProneStudy: 'Explicitly unavailable to bear: createProneMotion rejects non-horse profiles.'
  },
  pending: [
    'Architect-supplied fixed shared-provider and Editor commits; compare these same views through the actual installed provider and editor.',
    'Provider-declared grenade, traversal, casualty/fire, unarmed chair and speaking families, including unsupported equipment restrictions.',
    'Two actors with different gear, changes/seeks, resource failure/cancellation/late-load and exactly-once disposal with borrowed resources preserved.',
    'Actual host doorway, ceiling and prone swept clearance at native metre scale and the 2.12 m kit interval.',
    'Preserved placement/history/save/export/import, existing-animal comparisons and installed-package resources.'
  ],
  helperCleanup: cleanup,
  releaseAccepted: false
};
fs.writeFileSync(new URL('source-findings.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({samples: measured.samples.length, captures: figures.length, contactFailures: measured.failures.length, rawProneFloorFailures: groundFindings.length, widthWarnings: widthFindings.length, candidateCommit: null, retainedHelpers: cleanup.retainedHelpers}));
