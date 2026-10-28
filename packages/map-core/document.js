import {EditingDocument as LegacyDocument} from './editing-document.js';
import {parseMap, validateMap} from './maps.js';
import {extractBlock, validateBlock, placeBlock} from './blocks.js';
import {wallRunErrors, wallRunsOf, snapWallPoint, measureWallRun, distanceToWall} from './wall-runs.js';
import {expandPlaceholder} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/sector-placeholder.js';
const copy = structuredClone;
function setRuns(map, runs) {
  const metadata = map.wallRuns && Object.keys(map.wallRuns).some(k => k !== 'version' && k !== 'segments');
  if (runs.length || metadata) map.wallRuns = {...map.wallRuns, version: 1, segments: runs};else delete map.wallRuns;
}
export class EditingDocument extends LegacyDocument {
  open(text) {
    if (typeof text !== 'string' || text.length > 4000000) throw Error('Map file is too large (4 MB maximum).');
    let input = JSON.parse(text);
    if (input?.kind === 'sector-placeholder') {
      if (input.wallRuns !== undefined) throw Error('Wall runs require an expanded aft-map-v2 document.');
      input = expandPlaceholder(input); text = JSON.stringify(input);
    }
    if (input?.kind === 'red-shift-block') validateBlock(input);else parseMap(text, {allowDisconnected: true});
    super.open(text);
    if (this.block) {if (input.wallRuns) this.editor.map.wallRuns = copy(input.wallRuns);else delete this.editor.map.wallRuns;this.refresh();}
    this.changed = false; this.revision = 0; return this;
  }
  refresh() {
    super.refresh();
    if (this.block) for (const target of [this.map, this.original]) {if (this.editor.map.wallRuns) target.wallRuns = copy(this.editor.map.wallRuns);else delete target.wallRuns;}
  }
  preview(command) {
    if (!['wall-run', 'erase-wall-run'].includes(command?.tool)) {
      const result = super.preview(command);
      if (result.ok) {const errors = validateMap(result.map, {connectivity: false});if (errors.length) return {...result, ok: false, error: errors[0]};}
      return result;
    }
    const cells = [], edges = [];
    try {
      const map = copy(this.editor.map), options = command.options || {}, start = command.start;
      if (command.tool === 'erase-wall-run') {
        const id = options.id || start?.id || this.inspect(start?.x, start?.y, start?.z || 0)?.data?.id;
        if (!wallRunsOf(map).some(r => r.id === id)) throw Error('Select an angled wall run first.');
        setRuns(map, wallRunsOf(map).filter(r => r.id !== id));return {ok: true, cells, edges, map};
      }
      if (!Number.isFinite(start?.x) || !Number.isFinite(start?.y) || !Number.isInteger(start?.z)) throw Error('Choose a wall start and layer.');
      const anchors = wallRunsOf(map).filter(r => r.z <= start.z && r.z + r.stories > start.z).flatMap(r => [r.a, r.b]);
      const end = options.exact ? command.end : snapWallPoint(command.end, {start, step: options.step ?? .5, angleStep: options.angleStep ?? 45, anchors: options.endpointSnap === false ? [] : anchors});
      if (!Number.isFinite(end?.x) || !Number.isFinite(end?.y)) throw Error('Choose a wall end.');
      let id = options.id, next = 1;if (!id) {do {id = 'wall-' + next++;} while (wallRunsOf(map).some(r => r.id === id));}
      else if (!wallRunsOf(map).some(r => r.id === id)) throw Error('The selected wall no longer exists.');
      const run = {...wallRunsOf(map).find(r => r.id === id), id, a: [start.x, start.y], b: [end.x, end.y], z: start.z, stories: options.stories ?? 1, material: options.material || 'wood'};
      if (!Number.isInteger(run.stories) || run.stories < 1 || run.stories > 5 || run.z < 0 || run.z + run.stories > 6) throw Error('Choose 1–5 stories within the six available layers.');
      map.levels = Math.max(map.levels, run.z + run.stories);while (map.upper.length < map.levels - 1) map.upper.push({});
      setRuns(map, [...wallRunsOf(map).filter(r => r.id !== id), run]);
      const issues = wallRunErrors(map, this.size);if (issues.length) throw Error(issues[0]);
      for (const other of wallRunsOf(map)) {
        if (other.id === run.id || other.z >= run.z + run.stories || run.z >= other.z + other.stories) continue;
        const dx = run.b[0] - run.a[0], dy = run.b[1] - run.a[1], length = measureWallRun(run).length, cross = p => Math.abs((p[0] - run.a[0]) * dy - (p[1] - run.a[1]) * dx) / length;
        if (cross(other.a) > 1e-5 || cross(other.b) > 1e-5) continue;
        const project = p => ((p[0] - run.a[0]) * dx + (p[1] - run.a[1]) * dy) / length, a = project(other.a), b = project(other.b);
        if (Math.min(length, Math.max(a, b)) - Math.max(0, Math.min(a, b)) > 1e-5) throw Error('This wall overlaps an existing run. Join at its endpoint or edit the existing run.');
      }
      if (this.block) validateBlock(extractBlock(map));
      const errors = validateMap(map, {connectivity: false});if (errors.length) throw Error(errors[0]);
      return {ok: true, cells, edges, map, wallRun: run, measurement: measureWallRun(run), snap: end.snapped};
    } catch (error) {return {ok: false, error: error.message, cells, edges};}
  }
  inspect(x, y, z = 0, options = {}) {
    if (options.walls !== false && !['prop', 'character', 'terrain'].includes(options.mode)) {
      const run = wallRunsOf(this.map).filter(r => r.z <= z && r.z + r.stories > z).map(r => ({r, distance: distanceToWall(r, {x, y})})).filter(p => p.distance < .24).sort((a,b) => a.distance - b.distance)[0]?.r;
      if (run) return {x, y, z, type: 'wall-run', label: `Angled wall · ${measureWallRun(run).length.toFixed(2)} m`, data: copy(run), cells: []};
    }
    return super.inspect(x, y, z, options);
  }
  rotate(selection) {
    if (selection?.type !== 'wall-run') return super.rotate(selection);
    const run = wallRunsOf(this.map).find(r => r.id === selection.data.id);if (!run) return {ok: false, error: 'The selected wall no longer exists.'};
    const cx = (run.a[0] + run.b[0]) / 2, cy = (run.a[1] + run.b[1]) / 2, turn = p => ({x: cx + (p[0] - cx - p[1] + cy) / Math.SQRT2, y: cy + (p[0] - cx + p[1] - cy) / Math.SQRT2, z: run.z});
    return this.apply({tool: 'wall-run', start: turn(run.a), end: turn(run.b), options: {...run, exact: true}});
  }
  replace(map) {const errors = validateMap(map, {connectivity: false});if (errors.length) throw Error(errors[0]);if (this.block) validateBlock(extractBlock(map));super.replace(map);}
  capture(sx, sy) {if (this.block && (sx !== 0 || sy !== 0)) throw Error('A reusable block has only one sector.');return validateBlock(extractBlock(this.editor.map, sx, sy));}
  place(block, sx, sy) {if (this.block) throw Error('Place blocks in a full map.');this.replace(placeBlock(this.editor.map, block, sx, sy));}
  validate() {if (!this.block) return validateMap(this.map);try {validateBlock(JSON.parse(this.export()));return [];} catch (error) {return [error.message];}}
}
