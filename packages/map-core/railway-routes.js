import {
  planRailwayRoute, planRailwayTurnout, planRailwayCrossings, RAILWAY_ROUTE_LIMITS, assertRailwaySeparation, railwaySegmentBounds,
  railwaySegmentDistance
} from '../railway-visuals/route.js';
import {buildingLot} from '../prefab-core/index.js';
import {WALL_KIT, wallRunsOf} from './wall-runs.js';
import {W, H, edgePoints} from './maps.js';
import {assertRailwayTrainFits} from './railway-train.js';
import {assertRailwayTrainDepartures} from './railway-traffic.js';
import {floorTerrain, propCells} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/environment.js';

const EPS = 1e-8;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const inside = (p, [x, y, right, bottom]) => p[0] >= x && p[0] <= right && p[1] >= y && p[1] <= bottom;
const asPoint = ({x, y}) => [x, y];
const idPattern = /^[a-zA-Z0-9_-]{1,64}$/;

export function railwayRoutesOf(map) { return map?.railwayRoutes?.routes ?? []; }
export function railwayTrainsOf(map) {
  const data = map?.railwayRoutes;
  return data?.trains ?? (data?.train ? [data.train] : []);
}
export function railwayTrainOf(map) {
  const trains = railwayTrainsOf(map);
  if (trains.length > 1) throw new Error('Use railwayTrainsOf to read both train placements.');
  return trains[0] ?? null;
}

export function refuseRailwayRoutes(map, workflow) {
  if (map?.railwayRoutes !== undefined) {
    throw new Error(`${workflow} does not support railway routes. Keep the track in a full Map Workshop design.`);
  }
}

export function setRailwayRoutes(map, routes, trains = railwayTrainsOf(map)) {
  if (!routes.length) {
    if (trains.length) throw new Error('Choose a placed railway route for the train.');
    delete map.railwayRoutes;
    return {plans: [], crossings: []};
  }
  let data;
  if (routes.some(route => route.radiusM !== undefined) || trains.some(train => train.profile !== undefined)) {
    data = {version: 6, routes, trains};
  } else if (trains.length > 1) data = {version: 5, routes, trains};
  else if (trains.length) data = {version: 4, routes, train: trains[0]};
  else data = {version: routes.some(route => route.turnout) ? 2 : 1, routes};
  const layout = checkRailwayRoutes(map, data, true);
  if (!trains.length && layout.crossings.length && data.version < 6) data.version = 3;
  map.railwayRoutes = data;
  return layout;
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

function checkRailwayRoutes(map, data, allowNewCrossings = false) {
  if (data === undefined) return {plans: [], crossings: []};
  if (map.kind === 'red-shift-block') refuseRailwayRoutes(map, 'The reusable block format');
  if (map.version !== 2 || map.width !== W || map.height !== H) {
    throw new Error('Railway routes require a full aft-map-v2 design.');
  }
  const keys = ['version', 'routes'];
  if (data?.version === 4) keys.push('train');
  if (data?.version >= 5) keys.push('trains');
  if (!exact(data, keys) || ![1, 2, 3, 4, 5, 6].includes(data.version) || !Array.isArray(data.routes) ||
      !data.routes.length || data.routes.length > RAILWAY_ROUTE_LIMITS.routes) {
    throw new Error('Expected railwayRoutes version 1–6 with 1–64 routes.');
  }
  const ids = new Set(), plans = [];
  const mapPoint = point => Array.isArray(point) && point.length === 2 &&
    Number.isInteger(point[0]) && point[0] >= 0 && point[0] < W &&
    Number.isInteger(point[1]) && point[1] >= 0 && point[1] < H;
  let totalLength = 0;
  for (const route of data.routes) {
    const hasTurnout = data.version >= 2 && Object.hasOwn(route ?? {}, 'turnout');
    const keys = hasTurnout ? ['id', 'waypoints', 'turnout'] : ['id', 'waypoints'];
    if (data.version === 6 && Object.hasOwn(route ?? {}, 'radiusM')) keys.push('radiusM');
    if (!exact(route, keys) || typeof route.id !== 'string' || !idPattern.test(route.id) || ids.has(route.id)) {
      throw new Error('Each railway route needs unique portable ID and waypoints fields.');
    }
    if (!Array.isArray(route.waypoints) || route.waypoints.length < 2 || route.waypoints.length > RAILWAY_ROUTE_LIMITS.waypoints ||
        ![...route.waypoints].every(mapPoint)) {
      throw new Error(`Railway route ${route.id} needs whole-metre waypoints inside the map.`);
    }
    const plan = planRailwayRoute(route.waypoints, route.radiusM);
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
  const crossings = data.version >= 3 || allowNewCrossings ? planRailwayCrossings(plans) : [];
  if (data.version === 3 && !crossings.length) {
    throw new Error('Railway routes version 3 requires at least one crossing.');
  }
  assertRailwaySeparation(plans, crossings);
  assertGround(map, plans);
  if (data.version === 4) {
    if (!exact(data.train, ['routeId', 'stock', 'departure', 'switchPosition'])) {
      throw new Error('The train needs a route, stock type, departure end and switch position.');
    }
    const route = plans.find(item => item.id === data.train.routeId);
    if (!route) throw new Error('The train references a railway route that is missing.');
    assertRailwayTrainFits(route, data.train);
  }
  if (data.version === 5) {
    if (!Array.isArray(data.trains) || data.trains.length !== 2 ||
        ![...data.trains].every(train => exact(train, ['routeId', 'stock', 'departure', 'switchPosition']))) {
      throw new Error('Railway routes version 5 needs two train placements.');
    }
    assertRailwayTrainDepartures(plans, crossings, data.trains);
  }
  if (data.version === 6) {
    if (!Array.isArray(data.trains) || data.trains.length > 2 ||
        ![...data.trains].every(train => exact(train, ['routeId', 'stock', 'departure', 'switchPosition',
          ...(Object.hasOwn(train ?? {}, 'profile') ? ['profile'] : [])]) &&
          (!Object.hasOwn(train, 'profile') || ['miniature', 'world'].includes(train.profile)))) {
      throw new Error('Railway routes version 6 needs up to two placements with World size or Miniature proportions.');
    }
    assertRailwayTrainDepartures(plans, crossings, data.trains);
  }
  return {plans, crossings};
}

export function assertRailwayRoutes(map) {
  return checkRailwayRoutes(map, map?.railwayRoutes);
}

export function railwayCrossingsOf(map) {
  return map?.railwayRoutes?.version >= 3 ? assertRailwayRoutes(map).crossings : [];
}

export function railwayTrackAt(map, x, y) {
  let closest = null, distance = Infinity;
  function inspect(route, path, branch) {
    for (const {a, b, startM, endM, radius} of path.segments) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
      const gap = Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
      if (gap > radius + EPS || gap >= distance - EPS) continue;
      distance = gap;
      const stationM = startM + t * (endM - startM);
      const departure = branch ? 'branch' : stationM <= path.lengthM / 2 ? 'start' : 'end';
      closest = {route, departure};
    }
  }
  for (const route of railwayRoutesOf(map)) {
    const plan = planRailwayRoute(route.waypoints, route.radiusM);
    inspect(route, plan, false);
    if (route.turnout) inspect(route, planRailwayTurnout(plan, route.turnout).plan, true);
  }
  return closest;
}

export function railwayRouteAt(map, x, y) {
  return railwayTrackAt(map, x, y)?.route ?? null;
}
