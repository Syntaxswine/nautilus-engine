// The close view sits at each map's first building, the blank map's at (50, 50), so
// "frame minus the blank map" compared two cameras there. Take the blank map's counts
// at this map's own close view (once, while the blank map is open before the timed
// open), compare against those, and give no subtraction estimate for the close view.
import fs from 'node:fs';
const file = process.argv[2];
let s = fs.readFileSync(file, 'utf8');
const edits = [
  [`          // Open time: blank first (releases templates and libraries), then the map; arms alternate.
          for (let k = 0; k < opens; k++) for (const arm of k % 2 ? [...order[run]].reverse() : order[run]) {
            await pages[arm].evaluate(b => window.nautilus.open(b), blank);
            sample.openMs[arm].push(await pages[arm].evaluate(async j => {const t = performance.now(); await window.nautilus.open(j); return performance.now() - t;}, json));
          }
          for (const page of Object.values(pages)) await page.waitForTimeout(150);
          const views = {overview: {x: 119.5, y: 119.5, span: 250, preset: '0'}, close: first ? {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'} : {x: 50, y: 50, span: 40, preset: '0'}};`,
   `          const views = {overview: {x: 119.5, y: 119.5, span: 250, preset: '0'}, close: first ? {x: first.x + 10, y: first.y + 10, span: 40, preset: '0'} : {x: 50, y: 50, span: 40, preset: '0'}};
          // Open time: blank first (releases templates and libraries), then the map; arms alternate.
          // The close view sits at this map's first building, so the first time the blank map
          // is open, its draws are counted at that same camera (the reference for --assets-only).
          for (let k = 0; k < opens; k++) for (const arm of k % 2 ? [...order[run]].reverse() : order[run]) {
            await pages[arm].evaluate(b => window.nautilus.open(b), blank);
            if (!k) (sample.blankAtClose ??= {})[arm] = await pages[arm].evaluate(v => window.__bench.frames(1, v, {warmup: 1}).counts, views.close);
            sample.openMs[arm].push(await pages[arm].evaluate(async j => {const t = performance.now(); await window.nautilus.open(j); return performance.now() - t;}, json));
          }
          for (const page of Object.values(pages)) await page.waitForTimeout(150);`],
  [`      // The subtraction estimate of the assets' own time: this frame minus the same
      // run's blank-map frame, per run. Below the blank map's spread it means little.
      const blank = result.samples.filter(s => s.backend === backend && s.map === 'w0-blank'), own = arm => list.map(s => median(s.views[view][arm].map(b => median(b.total))) - median(blank.find(z => z.run === s.run).views[view][arm].map(b => median(b.total))));
      if (id !== 'w0-blank' && blank.length && blank[0].views[view]) row.views[view].estimateBySubtraction`,
   `      // The subtraction estimate of the assets' own time: this frame minus the same
      // run's blank-map frame, per run. Below the blank map's spread it means little.
      // Only where both use one camera: the close view sits at each map's first building.
      const blank = result.samples.filter(s => s.backend === backend && s.map === 'w0-blank'), own = arm => list.map(s => median(s.views[view][arm].map(b => median(b.total))) - median(blank.find(z => z.run === s.run).views[view][arm].map(b => median(b.total))));
      if (id !== 'w0-blank' && !view.startsWith('close') && blank.length && blank[0].views[view]) row.views[view].estimateBySubtraction`],
  [`    const isolatedDraws = minus(s.views[view + ':assets'][arm][0].counts, none[arm]), frameDraws = minus(s.views[view][arm][0].counts, blank.views[view][arm][0].counts);`,
   `    const reference = view === 'close' ? s.blankAtClose?.[arm] : blank.views[view][arm][0].counts;
    if (!reference) {refusals.push(s.map + ' close: no blank-map count at its camera'); continue;}
    const isolatedDraws = minus(s.views[view + ':assets'][arm][0].counts, none[arm]), frameDraws = minus(s.views[view][arm][0].counts, reference);`]
];
for (const [from, to] of edits) {
  if (s.split(from).length !== 2) throw Error('anchor not found once: ' + from.slice(0, 90));
  s = s.replace(from, () => to);
}
fs.writeFileSync(file, s);
console.log('patched');
