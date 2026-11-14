import {
  planRailwayRoute, planRailwayTurnout, planRailwayCrossings, assertRailwaySeparation, railwayStationAt
} from '../railway-visuals/route.js';
import {RAIL_TRACK_PROFILE} from '../railway-visuals/catalogue.js';
import {createRailwayTrainOnPlan, railwayTurnoutStation} from './railway-train.js';

const EPS = 1e-8;
const BODY_PAD_M = .12;
const SIGNAL_STOP_M = .35;
const FOLLOWING_GAP_M = .45;
const STEP_M = .25;

function signalId(blockId, routeId, track, direction) {
  return [blockId, routeId, track, direction].join('/');
}

function protectedTrack(routeId, track, plan, a, b, directions = [1, -1]) {
  return {routeId, track, plan, lo: Math.max(0, Math.min(a, b)), hi: Math.min(plan.lengthM, Math.max(a, b)), directions};
}

function turnoutBlock({id, plan, turnout}, extraClearanceM) {
  const {stationM, direction} = railwayTurnoutStation(plan, turnout);
  const [x, z] = turnout.throat, [dx, dz] = turnout.incoming;
  const branch = turnout.plan;
  const divergence = distanceM => {
    const at = railwayStationAt(branch, distanceM);
    return Math.abs((at.x - x) * dz - (at.z - z) * dx);
  };
  // Find where the branch bed clears the through bed. Protect both paths
  // through the diverging rails and add room for the ends of the cars.
  let lo = 0, hi = branch.lengthM;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (divergence(mid) < RAIL_TRACK_PROFILE.ballastWidthM + extraClearanceM) lo = mid;
    else hi = mid;
  }
  const end = railwayStationAt(branch, hi);
  const mainClearM = (end.x - x) * dx + (end.z - z) * dz;
  const marginM = .75 + extraClearanceM;
  return {id: 'turnout/' + id, kind: 'turnout', tracks: [
    protectedTrack(id, 'main', plan, stationM - direction * marginM, stationM + direction * (mainClearM + marginM)),
    protectedTrack(id, 'branch', branch, 0, hi + marginM, [-1])
  ]};
}

function signalLayout(plans, crossings, placements = []) {
  const worldSize = placements.some(train => train.profile === 'world');
  const extraClearanceM = worldSize ? 1.5 : 0;
  const byId = new Map(plans.map(route => [route.id, route]));
  const blocks = crossings.map(crossing => ({
    id: 'crossing/' + crossing.point.join(',') + '/' + crossing.tracks.map(track => track.id).join('/'),
    kind: 'crossing',
    tracks: crossing.tracks.map(({id, stationM}) => protectedTrack(id, 'main', byId.get(id).plan,
      stationM - crossing.clearanceM - extraClearanceM * Math.SQRT2,
      stationM + crossing.clearanceM + extraClearanceM * Math.SQRT2))
  }));
  for (const route of plans) if (route.turnout) blocks.push(turnoutBlock(route, extraClearanceM));
  const signals = [];
  for (const block of blocks) for (const track of block.tracks) for (const direction of track.directions) {
    const at = railwayStationAt(track.plan, direction > 0 ? track.lo : track.hi);
    signals.push({id: signalId(block.id, track.routeId, track.track, direction), blockId: block.id, kind: block.kind,
      routeId: track.routeId, track: track.track, x: at.x, z: at.z, yaw: Math.atan2(direction * at.s, direction * at.c),
      sideOffsetM: worldSize ? 2.2 : 1.21, heightScale: worldSize ? 2 : 1});
  }
  return {byId, blocks, signals};
}

// Convert a physical track interval to distance along a train's itinerary.
function project(segment, {lo, hi}) {
  const lower = Math.max(lo, Math.min(segment.fromM, segment.toM));
  const upper = Math.min(hi, Math.max(segment.fromM, segment.toM));
  if (upper < lower - EPS) return null;
  const [from, to] = segment.direction > 0 ? [lower, upper] : [upper, lower];
  return {start: segment.startM + Math.abs(from - segment.fromM), end: segment.startM + Math.abs(to - segment.fromM)};
}

function visits(entry, path, blocks) {
  const key = path.segments;
  if (entry.visits.has(key)) return entry.visits.get(key);
  const result = [];
  for (const block of blocks) {
    const along = [];
    for (const segment of key) for (const track of block.tracks) {
      if (track.routeId !== entry.placement.routeId || track.track !== segment.track) continue;
      const range = project(segment, track);
      if (!range) continue;
      along.push({...range, blockId: block.id, kind: block.kind,
        signalId: signalId(block.id, track.routeId, track.track, segment.direction)});
    }
    along.sort((a, b) => a.start - b.start);
    for (const range of along) {
      const previous = result.at(-1);
      if (previous?.blockId === range.blockId && range.start <= previous.end + EPS) {
        previous.end = Math.max(previous.end, range.end);
      } else result.push(range);
    }
  }
  entry.visits.set(key, result);
  return result;
}

function occupied(entry, blocks) {
  const path = entry.motion.trajectory(entry.placement.switchPosition);
  const rearM = path.headM - path.lengthM;
  const owns = new Set(visits(entry, path, blocks).filter(range =>
    path.headM + BODY_PAD_M >= range.start - EPS && rearM - BODY_PAD_M <= range.end + EPS).map(range => range.blockId));
  const footprint = [];
  for (const segment of path.segments) {
    const from = Math.max(segment.startM, rearM - BODY_PAD_M);
    const to = Math.min(segment.startM + segment.lengthM, path.headM + BODY_PAD_M);
    if (to < from - EPS) continue;
    const a = segment.fromM + segment.direction * (from - segment.startM);
    const b = segment.fromM + segment.direction * (to - segment.startM);
    footprint.push({track: segment.track, direction: segment.direction, lo: Math.min(a, b), hi: Math.max(a, b)});
  }
  return {path, owns, footprint, routeId: entry.placement.routeId};
}

function protectSwitch(entry, position) {
  const {routeId, switchPosition} = entry.placement;
  if (entry.motion.canTakeBranch && position.owns.has('turnout/' + routeId)) {
    entry.motion.lockSwitch(switchPosition);
  }
}

function makeEntries(layout, placements) {
  if (!Array.isArray(placements) || placements.length > 2 ||
      new Set(placements.map(train => train?.stock)).size !== placements.length) {
    throw new Error('Place one steam train and one electric train.');
  }
  const entries = placements.map(placement => {
    const route = layout.byId.get(placement?.routeId);
    if (!route) throw new Error('The train references a railway route that is missing.');
    return {placement: {...placement}, motion: createRailwayTrainOnPlan(route, placement), visits: new WeakMap(),
      reversed: new WeakMap(), travelDirection: 1, waiting: null};
  });
  if (entries.length === 2) {
    const [a, b] = entries.map(entry => occupied(entry, layout.blocks));
    if ([...a.owns].some(block => b.owns.has(block)) || (a.routeId === b.routeId &&
        a.footprint.some(first => b.footprint.some(second => first.track === second.track &&
          first.hi + EPS >= second.lo && second.hi + EPS >= first.lo)))) {
      throw new Error('The trains overlap at their departures. Choose a different departure end.');
    }
    protectSwitch(entries[0], a);
    protectSwitch(entries[1], b);
  }
  return entries;
}

export function assertRailwayTrainDepartures(plans, crossings, placements) {
  makeEntries(signalLayout(plans, crossings, placements), placements);
}

function obstacles(path, routeId, other) {
  if (other?.routeId !== routeId) return [];
  const result = [];
  for (const segment of path.segments) for (const track of other.footprint) {
    if (segment.track !== track.track) continue;
    const range = project(segment, track);
    if (range && range.end >= path.headM - EPS) {
      result.push({...range, oncoming: segment.direction !== track.direction});
    }
  }
  return result;
}

function travelLimit(entry, present, other, blocks, distanceM) {
  const {path, owns, routeId} = present;
  const requested = Math.min(path.headM + distanceM, path.endM);
  let target = requested, waiting = null;
  const hold = (station, reason) => {
    if (station >= target - EPS) return;
    target = station;
    waiting = reason;
  };
  const ahead = obstacles(path, routeId, other);
  for (const range of visits(entry, path, blocks)) {
    if (owns.has(range.blockId) || path.headM >= range.start - BODY_PAD_M - EPS) continue;
    if (range.start - SIGNAL_STOP_M >= target - EPS) continue;
    // Hold an opposing movement outside the junction until its exit path
    // clears. Allow a following movement only with room for its whole train.
    const exitBlocked = ahead.some(obstacle => obstacle.end >= range.end - EPS &&
      (obstacle.oncoming || obstacle.start < range.end + path.lengthM + FOLLOWING_GAP_M));
    if (other?.owns.has(range.blockId) || exitBlocked) {
      hold(range.start - SIGNAL_STOP_M, {kind: range.kind, signalId: range.signalId});
    }
  }
  for (const obstacle of ahead) hold(obstacle.start - FOLLOWING_GAP_M, {kind: 'track'});
  return {distance: Math.max(0, target - path.headM), waiting};
}

// Turn an itinerary around for reservation/collision queries, not the car
// meshes. Its leading edge is the old rear and every physical interval keeps
// its original route/track identity, including independent diamond routes.
function oriented(entry, present, direction) {
  if (direction > 0) return present;
  const path = present.path;
  let segments = entry.reversed.get(path.segments);
  if (!segments) {
    segments = Object.freeze([...path.segments].reverse().map(segment => Object.freeze({
      track: segment.track, fromM: segment.toM, toM: segment.fromM, direction: -segment.direction,
      startM: path.endM - segment.startM - segment.lengthM, lengthM: segment.lengthM
    })));
    entry.reversed.set(path.segments, segments);
  }
  return {...present, path: {...path, segments, headM: path.endM - path.headM + path.lengthM}};
}

function physicalPeer(entry, blocks) {
  if (!entry) return undefined;
  const present = occupied(entry, blocks);
  return {...present, footprint: present.footprint.map(track => ({...track, direction: track.direction * entry.travelDirection}))};
}

// Advances both consists against the same track occupancy. Small, ordered
// steps give simultaneous arrivals a deterministic tie-break on a clear block.
export function createRailwayTraffic(routes, placements = []) {
  const plans = routes.map(route => {
    const plan = planRailwayRoute(route.waypoints, route.radiusM,route.geometryProfile);
    return {id: route.id, plan, turnout: route.turnout && planRailwayTurnout(plan, route.turnout)};
  });
  const crossings = planRailwayCrossings(plans);
  assertRailwaySeparation(plans, crossings);
  const layout = signalLayout(plans, crossings, placements);
  let entries = makeEntries(layout, placements);
  const originalPlacements = entries.map(entry => ({...entry.placement}));

  function read() {
    const occupiedBy = new Map(), red = new Set();
    const positions = entries.map(entry => occupied(entry, layout.blocks));
    const trains = entries.map((entry, index) => {
      const {stock} = entry.placement;
      const present = positions[index];
      for (const id of present.owns) occupiedBy.set(id, stock);
      const waiting = entry.waiting && travelLimit(entry, oriented(entry, present, entry.travelDirection),
        physicalPeer(entries[1 - index], layout.blocks), layout.blocks, STEP_M).waiting;
      if (waiting?.signalId) red.add(waiting.signalId);
      return {stock, state: entry.motion.read(), waiting, canTakeBranch: entry.motion.canTakeBranch};
    });
    const signals = layout.signals.map(signal => {
      const owner = occupiedBy.get(signal.blockId) ?? null;
      return {...signal, occupiedBy: owner, aspect: owner || red.has(signal.id) ? 'stop' : 'clear'};
    });
    return {trains, signals};
  }

  function advance(distanceM, activeStocks = entries.map(({placement}) => placement.stock)) {
    if (!Number.isFinite(distanceM) || distanceM < 0) throw new Error('Train travel must be finite and nonnegative.');
    const active = new Set(activeStocks);
    if ([...active].some(stock => !entries.some(entry => entry.placement.stock === stock))) {
      throw new Error('Choose a placed train to run.');
    }
    const moving = entries.filter(entry => active.has(entry.placement.stock));
    for (const entry of moving) entry.travelDirection = 1;
    // A waiting train may need its full travel budget after the other train
    // clears, so bound long calls by their combined remaining distances.
    const remainingTrack = moving.reduce((total, entry) => {
      const path = entry.motion.trajectory(entry.placement.switchPosition);
      return total + Math.max(0, path.endM - path.headM);
    }, 0);
    let remaining = Math.min(distanceM, remainingTrack + STEP_M * moving.length);
    while (remaining > EPS) {
      const step = Math.min(STEP_M, remaining);
      let moved = false;
      for (const entry of moving) {
        const present = occupied(entry, layout.blocks);
        if (present.path.headM >= present.path.endM - EPS) { entry.waiting = null; continue; }
        const peer = entries.find(candidate => candidate !== entry);
        const other = peer && occupied(peer, layout.blocks);
        const limit = travelLimit(entry, present, other, layout.blocks, step);
        entry.waiting = limit.waiting;
        if (limit.distance > EPS) {
          entry.motion.move(limit.distance, entry.placement.switchPosition);
          if (peer && entry.motion.canTakeBranch) protectSwitch(entry, occupied(entry, layout.blocks));
          moved = true;
        }
      }
      if (!moved) break;
      remaining -= step;
    }
    return read();
  }

  function advanceSigned(requests) {
    if (!Array.isArray(requests) || requests.length > entries.length ||
        new Set(requests.map(request => request?.stock)).size !== requests.length ||
        requests.some(request => !entries.some(entry => entry.placement.stock === request?.stock) ||
          !Number.isFinite(request.distanceM) || Math.abs(request.distanceM) > 1000)) {
      throw Error('Supply one bounded signed distance per placed train.');
    }
    const distances = new Map(requests.map(request => [request.stock, request.distanceM]));
    const maximum = Math.max(0, ...[...distances.values()].map(Math.abs));
    const steps = Math.max(1, Math.ceil(maximum / STEP_M));
    const moved = Object.fromEntries(entries.map(entry => [entry.placement.stock, 0]));
    for (const entry of entries) {
      const distance = distances.get(entry.placement.stock) ?? 0;
      if (distance) entry.travelDirection = Math.sign(distance);
      entry.waiting = null;
    }
    for (let step = 0; step < steps; step++) for (const entry of entries) {
      const distance = (distances.get(entry.placement.stock) ?? 0) / steps;
      if (!distance) continue;
      const direction = Math.sign(distance), present = occupied(entry, layout.blocks);
      const facing = oriented(entry, present, direction);
      const peer = entries.find(candidate => candidate !== entry);
      const limit = travelLimit(entry, facing, physicalPeer(peer, layout.blocks), layout.blocks, Math.abs(distance));
      entry.waiting = limit.waiting;
      if (limit.distance > EPS) {
        protectSwitch(entry, present);
        const before = entry.motion.trajectory().headM;
        entry.motion.moveSigned(direction * limit.distance, entry.placement.switchPosition);
        moved[entry.placement.stock] += entry.motion.trajectory().headM - before;
        protectSwitch(entry, occupied(entry, layout.blocks));
      }
    }
    return {snapshot: read(), moved};
  }

  function checkpoint() {
    return {version: 1, trains: entries.map(entry => ({stock: entry.placement.stock,
      switchPosition: entry.placement.switchPosition, travelDirection: entry.travelDirection,
      waiting: entry.waiting ? {...entry.waiting} : null, motion: entry.motion.checkpoint()}))};
  }

  function restore(saved) {
    if (!saved || saved.version !== 1 || Object.keys(saved).sort().join(',') !== 'trains,version' ||
        !Array.isArray(saved.trains) || saved.trains.length !== entries.length) throw Error('Unsupported railway traffic checkpoint.');
    const staged = makeEntries(layout, originalPlacements);
    for (const [index, entry] of staged.entries()) {
      const record = saved.trains[index];
      if (!record || Object.keys(record).sort().join(',') !== 'motion,stock,switchPosition,travelDirection,waiting' ||
          record.stock !== entry.placement.stock || ![-1, 1].includes(record.travelDirection) ||
          record.switchPosition !== record.motion?.setting) throw Error('Saved train identity or switch history is incompatible.');
      entry.motion.restore(record.motion);
      entry.placement.switchPosition = record.switchPosition;
      entry.travelDirection = record.travelDirection;
      if (record.waiting !== null) {
        const wait = record.waiting;
        if (!wait || !['crossing', 'turnout', 'track'].includes(wait.kind) ||
            Object.keys(wait).sort().join(',') !== (wait.kind === 'track' ? 'kind' : 'kind,signalId') ||
            wait.kind !== 'track' && !layout.signals.some(signal => signal.id === wait.signalId && signal.kind === wait.kind)) {
          throw Error('Invalid saved railway signal hold.');
        }
        entry.waiting = {...wait};
      }
    }
    const positions = staged.map(entry => occupied(entry, layout.blocks));
    if (positions.length === 2) {
      const [a, b] = positions;
      if ([...a.owns].some(block => b.owns.has(block)) || a.routeId === b.routeId &&
          a.footprint.some(first => b.footprint.some(second => first.track === second.track &&
            first.hi + EPS >= second.lo && second.hi + EPS >= first.lo))) throw Error('Saved trains overlap protected track.');
    }
    entries = staged;
    return read();
  }

  function setTurnout(routeId, switchPosition) {
    const relevant = entries.filter(entry => entry.placement.routeId === routeId && entry.motion.canTakeBranch);
    if (!relevant.length) throw Error('No placed train can select this turnout.');
    for (const entry of relevant) entry.motion.trajectory(switchPosition);
    if (entries.some(entry => occupied(entry, layout.blocks).owns.has('turnout/' + routeId))) {
      return {ok: false, code: 'TURNOUT_OCCUPIED', reason: 'Wait until every carriage clears the protected turnout.'};
    }
    for (const entry of relevant) entry.placement.switchPosition = switchPosition;
    return {ok: true};
  }

  function setSwitch(stock, switchPosition) {
    const entry = entries.find(candidate => candidate.placement.stock === stock);
    if (!entry) throw new Error('Place the selected train first.');
    const path = entry.motion.trajectory(switchPosition);
    if (entries.length === 1 && path.headM <= path.lengthM + EPS) entry.motion.reset(switchPosition);
    entry.placement.switchPosition = switchPosition;
    entry.waiting = null;
  }

  function reset() {
    entries = makeEntries(layout, entries.map(entry => entry.placement));
    return read();
  }

  return Object.freeze({read, advance, setSwitch, reset, advanceSigned, checkpoint, restore, setTurnout});
}
