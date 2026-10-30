// Does a map authored through the public document API (the editor's own model) pass the
// Tinderbox adapter? The adapter's tests build their fixture with blankMap() directly.
import {createMapDocument, openDocument} from '../../packages/map-core/index.js';
import {createTinderboxScene} from '../../packages/adapters/tinderbox/index.js';
const policy = {region: {x: 0, y: 0, width: 40, height: 40}, playerStart: 0, markerPolicy: 'select-player-preserve-markers', outsidePolicy: 'require-unmodified-yard', seed: 1};
const report = [];
function attempt(label, doc) {
  const json = JSON.parse(doc.export());
  const keys = Object.keys(json).filter(k => !['version', 'width', 'height', 'levels', 'name', 'terrain', 'upper', 'edges', 'stairs', 'climbs', 'props', 'starts', 'guards', 'exits', 'wallRuns', 'metadata'].includes(k));
  try { createTinderboxScene(json, policy); report.push({label, extraKeys: keys, adapter: 'accepted'}); }
  catch (error) { report.push({label, extraKeys: keys, adapter: error.code + ' ' + error.path + ': ' + error.message.slice(0, 120)}); }
}
const d = createMapDocument('Editor yard');
attempt('fresh createMapDocument', d);
const starts = JSON.parse(d.export()).starts;
report.push({label: 'fresh starts', starts: JSON.stringify(starts).slice(0, 300), exits: JSON.stringify(JSON.parse(d.export()).exits)});
// Move the markers into the region with the public API (replace), then paint some grass.
const m = JSON.parse(d.export());
m.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}]; m.exits = [{x: 20, y: 20}];
const d2 = openDocument(m);
attempt('markers moved', d2);
for (const command of [
  {tool: 'ground-grass', start: {x: 10, y: 10, z: 0}, end: {x: 14, y: 14, z: 0}},
  {tool: 'wall-run', start: {x: 20, y: 4, z: 0}, end: {x: 26, y: 4, z: 0}, options: {material: 'brick', exact: true}},
]) {
  const r = d2.apply(command); report.push({label: 'apply ' + command.tool, ok: r.ok, error: r.error});
  attempt('after ' + command.tool, d2);
}
// Paint foliage and erase it again: does an empty envelope remain and block the adapter?
const f = d2.apply({tool: 'foliage-cover', start: {x: 30, y: 30, z: 0}, end: {x: 32, y: 32, z: 0}, options: {foliagePreset: 'meadow', foliageDensity: 65}});
report.push({label: 'apply foliage', ok: f.ok, error: f.error});
attempt('after foliage', d2);
const e = d2.apply({tool: 'foliage-erase', start: {x: 30, y: 30, z: 0}, end: {x: 32, y: 32, z: 0}});
report.push({label: 'apply foliage-erase', ok: e.ok, error: e.error});
attempt('after foliage erase', d2);
d2.undo(); d2.undo(); attempt('after undoing foliage', d2);
console.log(JSON.stringify(report, null, 2));
