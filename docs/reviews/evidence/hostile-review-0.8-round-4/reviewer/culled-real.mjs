// Round 4: the culled asset draws measured from real (unstubbed) SwiftShader frames by
// pixels.mjs (':counts' arm) against the SwiftShader rig's entry of the culled fixture,
// which was pinned with the draw calls stubbed (the CI method).
//   node culled-real.mjs <pixels result.json> <arm> <fixture.json>
import fs from 'node:fs';
const [file, arm, fixtureFile] = process.argv.slice(2), r = JSON.parse(fs.readFileSync(file, 'utf8')), fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
const rig = fixture.rigs.find(x => x.rig.maxTextures === 32); let equal = 0, differ = 0;
for (const [map, views] of Object.entries(r.captures[arm])) if (typeof views === 'object' && views) for (const [view, shot] of Object.entries(views)) {
  if (!shot?.culledReal) continue;
  const pinned = rig.maps[map]?.[view], same = JSON.stringify(pinned) === JSON.stringify(shot.culledReal);
  same ? equal++ : differ++;
  console.log(`${map} ${view}: real ${JSON.stringify(shot.culledReal)} pinned(stubbed) ${JSON.stringify(pinned)} ${same ? 'equal' : 'DIFFER'}`);
}
console.log(`SwiftShader rig ${JSON.stringify(rig.rig)}: ${equal} equal, ${differ} differ`);
