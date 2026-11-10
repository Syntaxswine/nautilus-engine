import {
  planRailwayRoute, planRailwayTurnout, RAILWAY_ROUTE_LIMITS, assertRailwaySeparation, railwaySegmentBounds,
  railwaySegmentDistance, pointToRailwaySegment
} from '../railway-visuals/route.js';
import {buildingLot} from '../prefab-core/index.js';
import {WALL_KIT, wallRunsOf} from './wall-runs.js';
import {W, H, edgePoints} from './maps.js';
import {floorTerrain, propCells} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/environment.js';

const EPS = 1e-8;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const inside = (p, [x, y, right, bottom]) => p[0] >= x && p[0] <= right && p[1] >= y && p[1] <= bottom;
const asPoint = ({x, y}) => [x, y];
const idPattern = /^[a-zA-Z0-9_-]{1,64}$/;

export function railwayRoutesOf(map) { return map?.railwayRoutes?.routes ?? []; }

export function refuseRailwayRoutes(map, workflow) {
  if (map?.railwayRoutes !== undefined) {
    throw new Error(`${workflow} does not support railway routes. Keep the track in a full Map Workshop design.`);
  }
}

export function setRailwayRoutes(map, routes) {
  if (routes.length) map.railwayRoutes = {version: routes.some(route => route.turnout) ? 2 : 1, routes};
  else delete map.railwayRoutes;
  return map;
}

function hitsRect(segment, rect) {
  if (inside(segment.a, rect) || inside(segment.b, rect)) return true;
  const [x, y, right, bottom] = rect;
  const corners = [[x, y], [right, y], [right, bottom], [x, bottom]];
  return corners.some((a, i) => railwaySegmentDistance(segment.a, segment.b, a, corners[(i + 1) % 4]) <= segment.radius + EPS);
}

function binKeys(bounds) {
  const [west, north, east, south] = bounds.map(n => Math.floor(n / 4));
  const keys = [];
  for (let y = north; y <= south; y++) for (let x = west; x <= east; x++) keys.push(`${x},${y}`);
  return keys;
}

function groundObstacles(map) {
  const cells = new Map(), walls = new Map();
  function occupy(p, label) {
    if (!(p.z ?? 0)) cells.set(p.x + ',' + p.y, label);
  }
  function wall(a, b, label) {
    const item = {a, b, label, radius: WALL_KIT.thickness / 2};
    for (const key of binKeys(railwaySegmentBounds(item))) {
      if (!walls.has(key)) walls.set(key, []);
      walls.get(key).push(item);
    }
  }
  for (const prop of map.props ?? []) for (const p of propCells(prop)) occupy(p, 'an object or terrain prop');
  for (const field of ['starts', 'guards', 'exits', 'stairs', 'climbs']) for (const p of map[field] ?? []) {
    occupy(p, 'a character, marker or traversal landing');
    for (const waypoint of p.patrol ?? []) occupy(waypoint, 'a patrol waypoint');
  }
  for (const key of Object.keys(map.edges ?? {})) {
    const [a, b] = edgePoints(key);
    if (!a.z) wall(asPoint(a), asPoint(b), 'a wall, fence or door');
  }
  for (const run of wallRunsOf(map)) if (!run.z) wall(run.a, run.b, 'a wall run');
  const lots = (map.buildingPrefabs?.instances ?? []).map(instance => {
    const {x, y, width, depth} = buildingLot(instance, instance.clearance);
    return [x - .5, y - .5, x + width - .5, y + depth - .5];
  });
  return {cells, walls, lots};
}

function assertGround(map, routes) {
  const {cells, walls, lots} = groundObstacles(map);
  for (const {id, plan, turnout} of routes) for (const segment of [
    ...plan.segments, ...(turnout?.plan.segments ?? [])
  ]) {
    const bounds = railwaySegmentBounds(segment);
    const [west, north, east, south] = bounds;
    const fail = (reason, where = segment.a.map(Math.round).join(', ')) => {
      throw new Error(`Railway route ${id} needs clear, flat ground near ${where}. The ballast clearance reaches ${reason}.`);
    };
    if (west < -.5 - EPS || north < -.5 - EPS || east > W - .5 + EPS || south > H - .5 + EPS) {
      fail('outside the map');
    }
    for (let y = Math.max(0, Math.ceil(north - .5)); y <= Math.min(H - 1, Math.floor(south + .5)); y++) {
      for (let x = Math.max(0, Math.ceil(west - .5)); x <= Math.min(W - 1, Math.floor(east + .5)); x++) {
        const key = `${x},${y}`, terrain = map.terrain?.[y]?.[x];
        const occupied = cells.get(key) || (map.landPaint?.[key] && 'raised terrain') ||
          (map.foliage?.[key + ',0'] && 'foliage') ||
          ((!floorTerrain(terrain) || /bridge|woodland|wetland|bog/.test(terrain)) && 'water, a bridge, or unsuitable ground');
        if (occupied && hitsRect(segment, [x - .5, y - .5, x + .5, y + .5])) fail(occupied, `${x}, ${y}`);
      }
    }
    for (const key of binKeys(bounds)) for (const wall of walls.get(key) ?? []) {
      if (railwaySegmentDistance(segment.a, segment.b, wall.a, wall.b) <= segment.radius + wall.radius + EPS) {
        fail(wall.label);
      }
    }
    if (lots.some(lot => hitsRect(segment, lot))) fail('a reserved building lot');
  }
}

export function assertRailwayRoutes(map) {
  const data = map?.railwayRoutes;
  if (data === undefined) return [];
  if (map.kind === 'red-shift-block') refuseRailwayRoutes(map, 'The reusable block format');
  if (map.version !== 2 || map.width !== W || map.height !== H) {
    throw new Error('Railway routes require a full aft-map-v2 design.');
  }
  if (!exact(data, ['version', 'routes']) || ![1, 2].includes(data.version) || !Array.isArray(data.routes) ||
      !data.routes.length || data.routes.length > RAILWAY_ROUTE_LIMITS.routes) {
    throw new Error('Expected railwayRoutes version 1 or 2 with 1–64 routes.');
  }
  const ids = new Set(), plans = [];
  const mapPoint = point => Array.isArray(point) && point.length === 2 &&
    Number.isInteger(point[0]) && point[0] >= 0 && point[0] < W &&
    Number.isInteger(point[1]) && point[1] >= 0 && point[1] < H;
  let totalLength = 0;
  for (const route of data.routes) {
    const hasTurnout = data.version === 2 && Object.hasOwn(route ?? {}, 'turnout');
    const keys = hasTurnout ? ['id', 'waypoints', 'turnout'] : ['id', 'waypoints'];
    if (!exact(route, keys) || typeof route.id !== 'string' || !idPattern.test(route.id) || ids.has(route.id)) {
      throw new Error('Each railway route needs unique portable ID and waypoints fields.');
    }
    if (!Array.isArray(route.waypoints) || route.waypoints.length < 2 || route.waypoints.length > RAILWAY_ROUTE_LIMITS.waypoints ||
        ![...route.waypoints].every(mapPoint)) {
      throw new Error(`Railway route ${route.id} needs whole-metre waypoints inside the map.`);
    }
    const plan = planRailwayRoute(route.waypoints);
    let turnout;
    if (hasTurnout) {
      if (!exact(route.turnout, ['at', 'end']) || !mapPoint(route.turnout.at) || !mapPoint(route.turnout.end)) {
        throw new Error(`The split on railway route ${route.id} needs whole-metre start and end points inside the map.`);
      }
      turnout = planRailwayTurnout(plan, route.turnout);
    }
    ids.add(route.id);
    totalLength += plan.lengthM + (turnout?.plan.lengthM ?? 0);
    if (totalLength > RAILWAY_ROUTE_LIMITS.totalLengthM) throw new Error('Keep the total railway length at or below 1200 m.');
    plans.push({id: route.id, plan, turnout});
  }
  if (data.version === 2 && !plans.some(route => route.turnout)) {
    throw new Error('Use railwayRoutes version 1 for routes without a split.');
  }
  assertRailwaySeparation(plans);
  assertGround(map, plans);
  return plans;
}

export function railwayRouteAt(map, x, y) {
  for (const route of railwayRoutesOf(map)) {
    const plan = planRailwayRoute(route.waypoints);
    const hits = ({segments}) => segments.some(segment =>
      pointToRailwaySegment([x, y], segment.a, segment.b) <= segment.radius + EPS);
    if (hits(plan) || (route.turnout && hits(planRailwayTurnout(plan, route.turnout).plan))) return route;
  }
  return null;
}
