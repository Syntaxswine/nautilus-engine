// Mutants of the glass halves (packages/prefab-core/display-batches.js); each must
// fail the batch, facade or count tests. Restores in a finally; a null status (a
// killed child, e.g. maxBuffer) is reported, never read as a pass.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const file = 'packages/prefab-core/display-batches.js';
const mutants = [
  ['H1 front half first', 'pair=[T.BackSide,T.FrontSide].map(', 'pair=[T.FrontSide,T.BackSide].map('],
  ['H2 back half casts', 'if(!i)copy.userData={...copy.userData,noShadow:true};', ''],
  ['H3 shadow single-sided', 'pair[1].shadowSide=T.DoubleSide;', ''],
  ['H4 daylight flag kept', 'delete material.userData.daylightPrepared;', ''],
  ['H5 half materials leak', 'for(const pair of sided.values())for(const material of pair)material.dispose();', ''],
  ['H6 no halves', 'if(source.side!==T.DoubleSide||source.forceSinglePass)return [mesh.clone()];', 'return [mesh.clone()];'],
  ['H7 views move one half', 'for(const {top,copies}of glass)for(const copy of copies)copy.visible=top.visible;', 'for(const {top,mesh}of glass)mesh.visible=top.visible;'],
  ['H8 halves share no cache', 'cache.set(source,pair);', '']
];
const original = fs.readFileSync(file, 'utf8'), results = [];
try {
  for (const [name, from, to] of mutants) {
    if (original.split(from).length !== 2) {results.push(name + ': ANCHOR NOT FOUND'); continue;}
    fs.writeFileSync(file, original.replace(from, () => to));
    const run = spawnSync(process.execPath, ['--test', 'tests/prefab-display-batches.test.mjs', 'tests/shared-assets.test.mjs', 'tests/asset-draw-counts.test.mjs'], {encoding: 'utf8', maxBuffer: 1 << 30});
    const failed = [...new Set((run.stdout.match(/^✖ (.*?) \(/gm) || []).filter(l => !l.startsWith('✖ failing tests')).map(l => l.slice(2, 72)))];
    results.push(`${name}: ${run.status !== 0 ? 'KILLED' : 'SURVIVED'}${run.error ? ' (' + run.error.code + ')' : ''}${failed.length ? ' — ' + failed.slice(0, 2).join(' | ') : ''}`);
    fs.writeFileSync(file, original);
  }
} finally {fs.writeFileSync(file, original);}
console.log(results.join('\n'));
console.log('restored:', fs.readFileSync(file, 'utf8') === original);
