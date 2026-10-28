import * as legacy from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {wallRunErrors, wallRunsOf, wallRunsBlockStep} from './wall-runs.js';
import {towerForUnit, towerEntry} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/tower-geometry.js';
export * from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
export function blockedEdge(map, a, b) {return legacy.blockedEdge(map, a, b) || wallRunsBlockStep(map, a, b);}
export function neighbors(map, p, stairs, diagonals = true) {
  return legacy.neighbors(map, p, stairs, diagonals).filter(q => {
    if (wallRunsBlockStep(map, p, q)) return false;
    if ((p.z || 0) === (q.z || 0) && Math.abs(p.x - q.x) === 1 && Math.abs(p.y - q.y) === 1) {
      const a = {...p, x: q.x}, b = {...p, y: q.y};
      return ![ [p,a], [p,b], [a,q], [b,q] ].some(([a,b]) => wallRunsBlockStep(map,a,b));
    }
    return true;
  });
}
export function validateMap(map, options = {}) {
  const errors = [...legacy.validateMap(map, options), ...wallRunErrors(map)];
  if (errors.length || !wallRunsOf(map).length) return errors;
  const targets = [...map.starts, ...map.guards, ...map.exits, ...map.guards.flatMap(g => g.patrol || [])].map(p => {
    const tower = towerForUnit(map, p); return tower ? towerEntry(tower) : p;
  });
  const access = [...map.stairs.flatMap(p => [p, {...p, z: p.z + 1}]), ...(map.climbs || []).flatMap(p => [p, legacy.roofTop(p)])];
  for (const p of [...targets, ...access]) if (wallRunsBlockStep(map, p, p)) errors.push(`A wall intersects a character, travel marker, patrol waypoint or traversal landing at ${p.x},${p.y}.`);
  // The inherited grid reachability pass cannot see oriented geometry. Check
  // the ordinary ground/upper targets again through wall-aware neighbours.
  if (options.connectivity !== false && !errors.length) {
    // Match inherited authoring reachability: locks are game-owned, and a tower
    // lookout is reached through its entry rather than its elevated post cell.
    const traversable = {...map, edgeLocks: {}}, key = p => `${p.x},${p.y},${p.z || 0}`, pending = new Set(targets.map(key)), origin = targets[0];
    if (origin) {const queue = [origin], seen = new Set([key(origin)]), stairs = legacy.stairSet(map);pending.delete(key(origin));
      for (let i = 0; i < queue.length && pending.size; i++) for (const next of neighbors(traversable, queue[i], stairs)) {const k = key(next);if (seen.has(k)) continue;seen.add(k);pending.delete(k);queue.push(next);}
      for (const k of pending) errors.push('Unreachable start, marker or patrol waypoint behind wall runs at ' + k + '.');
    }
  }
  return [...new Set(errors)];
}
export function parseMap(text, {allowDisconnected = false} = {}) {
  if (typeof text === 'string' && text.length <= 4000000) {const input=JSON.parse(text);if(input?.wallRuns!==undefined&&input.version!==2)throw Error('Wall runs require the aft-map-v2 format.');}
  const map = legacy.parseMap(text, {allowDisconnected}), errors = validateMap(map, {connectivity: !allowDisconnected});
  if (errors.length) throw Error(errors.join(' ')); return map;
}
