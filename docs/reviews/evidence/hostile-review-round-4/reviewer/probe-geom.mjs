// For each of the 22 clearance probes: the projected spawn, the probe wall's quarter, and the
// spawn's distance to that wall's box (and to the bounds), recomputed independently of the adapter.
const R = {x: 10, y: 20, width: 20, height: 16}, RADIUS = 0.56, T = 0.16;
const probes = [
  ['beside, 0.52 m', {wall: [[20.6, 24], [20.6, 26]]}, false],
  ['beside, 0.62 m', {wall: [[20.7, 24], [20.7, 26]]}, true],
  ['face 5 mm inside the radius', {wall: [[20.635, 24], [20.635, 26]]}, false],
  ['face 5 mm outside the radius', {wall: [[20.645, 24], [20.645, 26]]}, true],
  ['corner 0.15 m past the end, 0.541 m', {wall: [[20.6, 25.15], [20.6, 27.15]]}, false],
  ['corner 0.25 m past the end, 0.577 m', {wall: [[20.6, 25.25], [20.6, 27.25]]}, true],
  ['beside a long vertical run, off its centre', {wall: [[20.6, 24], [20.6, 34]]}, false],
  ['beside a horizontal run, off its centre', {wall: [[18, 24.4], [28, 24.4]]}, false],
  ['beside a horizontal run drawn backwards', {wall: [[23, 24.4], [19, 24.4]]}, false],
  ['beside a vertical run drawn backwards, off its centre', {wall: [[20.6, 30], [20.6, 24]]}, false],
  ['west of the spawn, 0.52 m', {wall: [[19.4, 23.5], [19.4, 25.5]]}, false],
  ['west of the spawn, 0.72 m', {wall: [[19.2, 23.5], [19.2, 25.5]]}, true],
  ['the near run listed first', {wall: [[20.6, 24], [20.6, 26]], first: true}, false],
  ['top row', {start: {x: 20, y: 20}}, false], ['bottom row', {start: {x: 20, y: 35}}, false],
  ['left column', {start: {x: 10, y: 25}}, false], ['right column', {start: {x: 29, y: 25}}, false],
  ['one row inside the top', {start: {x: 20, y: 21}}, true], ['one row inside the bottom', {start: {x: 20, y: 34}}, true],
  ['one column inside the left', {start: {x: 11, y: 25}}, true], ['one column inside the right', {start: {x: 28, y: 25}}, true],
  ['open yard', {}, true]];
const fixtureWalls = [[[15, 23], [25, 23]], [[25, 23], [25, 31]]];
const box = ([a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  return {cx: (a[0] + b[0]) / 2 - R.x + 0.5, cy: (a[1] + b[1]) / 2 - R.y + 0.5, hx: (dx ? len : T) / 2, hy: (dy ? len : T) / 2, quarter: dx > 0 ? 0 : dy > 0 ? 1 : dx < 0 ? 2 : 3}; };
const dist = (p, w) => Math.hypot(Math.max(Math.abs(p.x - w.cx) - w.hx, 0), Math.max(Math.abs(p.y - w.cy) - w.hy, 0));
const rows = probes.map(([name, {wall, start}, free]) => {
  const s = start || {x: 20, y: 25}, p = {x: s.x - R.x + 0.5, y: s.y - R.y + 0.5};
  const bound = Math.min(p.x, p.y, R.width - p.x, R.height - p.y);
  const probe = wall ? box(wall) : null, fixture = Math.min(...fixtureWalls.map(w => dist(p, box(w))));
  const d = probe ? dist(p, probe) : null, side = probe ? (probe.cx < p.x - probe.hx ? 'west' : probe.cx > p.x + probe.hx ? 'east' : probe.cy < p.y ? 'north' : 'south') : null;
  const predictedFree = bound >= RADIUS && fixture >= RADIUS - 1e-10 && (d === null || d >= RADIUS - 1e-10);
  return {name, spawn: p, quarter: probe?.quarter, side, probeDistance: d === null ? null : +d.toFixed(4), boundMargin: +bound.toFixed(2), fixtureDistance: +fixture.toFixed(2), tableFree: free, predictedFree, agrees: predictedFree === free};
});
console.log(JSON.stringify(rows, null, 0).replaceAll('},{', '},\n{'));
console.log('all agree:', rows.every(r => r.agrees));
