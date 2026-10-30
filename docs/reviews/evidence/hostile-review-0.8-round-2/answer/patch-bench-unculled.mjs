// --expect compares the candidate's asset draws with culling off (camera-independent)
// against the pinned headless counts, for the editor's two level states.
import fs from 'node:fs';
const file = process.argv[2];
let s = fs.readFileSync(file, 'utf8');
const edits = [
  [`          for (const [name, view] of Object.entries(views)) {await measure(name, view); if (flag('assets-only')) await isolated(name, view);}
          for (const page of Object.values(pages)) await page.evaluate(() => window.__bench.cutaway(true));
          await measure('cutaway', views.overview);
          if (flag('assets-only')) await isolated('cutaway', views.overview);`,
   `          // --expect: both arms' asset draws with culling off, in each level state.
          const unculled = async state => {(sample.unculled ??= {})[state] = {}; for (const arm of ['a', 'b']) sample.unculled[state][arm] = await pages[arm].evaluate(v => window.__bench.unculled(v), views.overview);};
          for (const [name, view] of Object.entries(views)) {await measure(name, view); if (flag('assets-only')) await isolated(name, view);}
          if (flag('expect')) await unculled('exterior');
          for (const page of Object.values(pages)) await page.evaluate(() => window.__bench.cutaway(true));
          await measure('cutaway', views.overview);
          if (flag('assets-only')) await isolated('cutaway', views.overview);
          if (flag('expect')) await unculled('cutaway');`],
  [`  // --expect: the candidate's whole-map frames (overview, cutaway) minus the blank map
  // must issue exactly the pinned headless counts (tests/fixtures/asset-draw-counts.json).
  if (flag('expect')) {
    const pinned = JSON.parse(fs.readFileSync(path.join(trees.b, 'tests/fixtures/asset-draw-counts.json'), 'utf8')).workloads;
    for (const s of result.samples) for (const [view, headless] of [['overview', 'exterior'], ['cutaway', 'cutaway']]) {
      const blank = result.samples.find(z => z.backend === s.backend && z.run === s.run && z.map === 'w0-blank'), layers = pinned[s.map]?.[headless];
      if (!blank || !layers) {refusals.push('--expect needs w0-blank and a pinned count for ' + s.map); continue;}
      const sum = key => Object.values(layers).reduce((total, layer) => total + layer[key], 0), b = s.views[view].b[0].counts, z = blank.views[view].b[0].counts;
      const measured = {main: (b.calls - b.shadowCalls) - (z.calls - z.shadowCalls), shadow: b.shadowCalls - z.shadowCalls, triangles: b.triangles - z.triangles};`,
   `  // --expect: the candidate's asset draws with culling off, in each level state, must be
  // exactly the pinned headless counts (tests/fixtures/asset-draw-counts.json).
  if (flag('expect')) {
    const pinned = JSON.parse(fs.readFileSync(path.join(trees.b, 'tests/fixtures/asset-draw-counts.json'), 'utf8')).workloads;
    for (const s of result.samples) for (const [view, headless] of [['overview', 'exterior'], ['cutaway', 'cutaway']]) {
      const layers = pinned[s.map]?.[headless], measured = s.unculled?.[headless]?.b;
      if (!layers || !measured) {refusals.push('--expect needs a pinned and a measured count for ' + s.map + ' ' + headless); continue;}
      const sum = key => Object.values(layers).reduce((total, layer) => total + layer[key], 0);`]
];
for (const [from, to] of edits) {
  if (s.split(from).length !== 2) throw Error('anchor not found once: ' + from.slice(0, 90));
  s = s.replace(from, () => to);
}
fs.writeFileSync(file, s);
console.log('patched');
