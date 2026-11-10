import {RAIL_TRACK_ASSETS, RAIL_TRACK_PROFILE} from './catalogue.js';

export const RAILWAY_ROUTE_FEATURE = 'nautilus-railway-routes-v1';
export const RAILWAY_TURNOUT_FEATURE = 'nautilus-railway-turnouts-v1';
export const RAILWAY_CROSSING_FEATURE = 'nautilus-railway-crossings-v1';
export const RAILWAY_ROUTE_LIMITS = Object.freeze({routes: 64, waypoints: 48, lengthM: 480, totalLengthM: 1200});
export const RAILWAY_RADIUS_M = RAIL_TRACK_ASSETS.find(piece => piece.radiusM !== null).radiusM;
const HALF_BED = RAIL_TRACK_PROFILE.ballastWidthM / 2;
const ANGLE_STEP = Math.PI / 64;
const EPS = 1e-8;
const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const moved = (a, u, length) => [a[0] + u[0] * length, a[1] + u[1] * length];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const offset = (a, b) => [b[0] - a[0], b[1] - a[1]];
const directions = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const integerPoint = p => Array.isArray(p) && p.length === 2 && [...p].every(Number.isSafeInteger);

export function snapRailwayWaypoint(anchor, target) {
  const grid = target.map(Math.round);
  if (!anchor) return grid;
  const [dx, dy] = offset(anchor, grid);
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  const [ux, uy] = directions[(octant + 8) % 8];
  const run = Math.round((dx * ux + dy * uy) / (ux * ux + uy * uy));
  return moved(anchor, [ux, uy], run);
}

function station(point, heading, distanceM) {
  const [x, z] = point, [s, c] = heading;
  return {x, z, s, c, angle: Math.atan2(s, c), distanceM};
}

function stationOn(span, distanceM) {
  const along = distanceM - span.startM;
  if (along <= EPS) return station(span.a, span.incoming, span.startM);
  if (along >= span.lengthM - EPS) return station(span.b, span.outgoing, span.startM + span.lengthM);
  if (span.kind === 'straight') return station(moved(span.a, span.incoming, along), span.incoming, distanceM);
  const theta = span.turn * along / span.lengthM;
  const c = Math.cos(theta), s = Math.sin(theta);
  const [vx, vy] = offset(span.center, span.a), [ux, uy] = span.incoming;
  return station([span.center[0] + vx * c - vy * s, span.center[1] + vx * s + vy * c],
    [ux * c - uy * s, ux * s + uy * c], distanceM);
}

export function railwayStationAt(plan, distanceM) {
  const at = Math.max(0, Math.min(plan.lengthM, distanceM));
  const span = plan.spans.find(span => at <= span.startM + span.lengthM + EPS) ?? plan.spans.at(-1);
  return stationOn(span, at);
}

function corner(at, incoming, outgoing) {
  const turn = Math.atan2(cross(incoming, outgoing), dot(incoming, outgoing));
  if (Math.abs(turn) > Math.PI / 2 + EPS) {
    throw new Error(`Railway turn at ${at.join(', ')} is too sharp. Use 45° or 90° changes of heading.`);
  }
  const trim = RAILWAY_RADIUS_M * Math.tan(Math.abs(turn) / 2);
  const a = moved(at, incoming, -trim), b = moved(at, outgoing, trim);
  const center = moved(a, [-incoming[1], incoming[0]], Math.sign(turn) * RAILWAY_RADIUS_M);
  return {kind: 'curve', a, b, incoming, outgoing, turn, trim, center, lengthM: RAILWAY_RADIUS_M * Math.abs(turn)};
}

function fit(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2 || waypoints.length > RAILWAY_ROUTE_LIMITS.waypoints ||
      ![...waypoints].every(integerPoint)) {
    throw new Error('Choose 2–48 whole-metre railway waypoints.');
  }
  const used = new Set();
  for (const point of waypoints) {
    const key = point.join(',');
    if (used.has(key)) throw new Error('Railway waypoints must be distinct. Use Undo point to backtrack.');
    used.add(key);
  }
  const legs = waypoints.slice(1).map((b, i) => {
    const a = waypoints[i], [dx, dy] = offset(a, b);
    if (dx && dy && Math.abs(dx) !== Math.abs(dy)) {
      throw new Error(`Railway approach ${i + 1} must follow a cardinal or 45° diagonal heading.`);
    }
    const length = distance(a, b);
    return {a, b, unit: [dx / length, dy / length], length};
  });
  // Preserve authored waypoints while allowing additional points along an approach.
  const runs = [];
  for (const leg of legs) {
    const previous = runs.at(-1);
    if (previous && Math.abs(previous.unit[0] - leg.unit[0]) < EPS &&
        Math.abs(previous.unit[1] - leg.unit[1]) < EPS) {
      previous.b = leg.b;
      previous.length = distance(previous.a, leg.b);
    } else runs.push(leg);
  }

  const corners = runs.slice(1).map(({a, unit}, i) => corner(a, runs[i].unit, unit));

  const spans = [];
  let lengthM = 0;
  function append(span) {
    spans.push({...span, startM: lengthM});
    lengthM += span.lengthM;
  }
  for (const [i, run] of runs.entries()) {
    const before = corners[i - 1], after = corners[i];
    const trimmed = (before?.trim ?? 0) + (after?.trim ?? 0);
    const straight = run.length - trimmed;
    if (straight < -EPS) {
      throw new Error(`Railway approach ${run.a.join(', ')} to ${run.b.join(', ')} needs ${trimmed.toFixed(2)} m for its 4 m radius turns. Move the waypoint or lengthen the approach.`);
    }
    if (straight > EPS) append({kind: 'straight', gridAnchor: run.a, a: before?.b ?? run.a, b: after?.a ?? run.b,
      incoming: run.unit, outgoing: run.unit, lengthM: straight});
    if (after) append(after);
  }
  return sampleSpans(spans, lengthM);
}

function sampleSpans(spans, lengthM) {
  if (lengthM > RAILWAY_ROUTE_LIMITS.lengthM) {
    throw new Error(`Keep each railway route at or below ${RAILWAY_ROUTE_LIMITS.lengthM} m.`);
  }

  const stations = [stationOn(spans[0], 0)];
  const segments = [];
  for (const span of spans) {
    const count = span.kind === 'curve' ? Math.ceil(Math.abs(span.turn) / ANGLE_STEP) : Math.ceil(span.lengthM);
    const pad = span.kind === 'curve' ? RAILWAY_RADIUS_M * (1 - Math.cos(Math.abs(span.turn) / count / 2)) : 0;
    for (let i = 1; i <= count; i++) {
      const end = stationOn(span, span.startM + span.lengthM * i / count);
      const start = stations.at(-1);
      stations.push(end);
      // Add the maximum arc-to-chord distance to the ballast half width.
      segments.push({a: [start.x, start.z], b: [end.x, end.z],
        startM: start.distanceM, endM: end.distanceM, radius: HALF_BED + pad});
    }
  }
  return {lengthM, spans, stations, segments};
}

export function snapRailwayTurnoutAnchor(plan, point) {
  let closest = null, best = HALF_BED + EPS;
  for (const span of plan.spans) {
    if (span.kind !== 'straight') continue;
    const step = span.incoming.map(Math.sign);
    const steps = Math.round(dot(offset(span.gridAnchor, point), step) / dot(step, step));
    const at = moved(span.gridAnchor, step, steps);
    const along = dot(offset(span.a, at), span.incoming);
    const gap = distance(at, point);
    if (along >= -EPS && along <= span.lengthM + EPS && gap < best) {
      closest = at;
      best = gap;
    }
  }
  return closest;
}

export function planRailwayTurnout(main, {at, end} = {}) {
  if (!integerPoint(at) || !integerPoint(end)) throw new Error('Choose whole-metre points for the railway split.');
  const straight = main.spans.find(span => span.kind === 'straight' &&
    pointToRailwaySegment(at, span.a, span.b) < EPS);
  if (!straight) throw new Error('Choose a point on a straight section of the main track.');
  const run = offset(at, end), length = Math.hypot(...run);
  if (length < 4 || (run[0] && run[1] && Math.abs(run[0]) !== Math.abs(run[1]))) {
    throw new Error('Give the branch at least 4 m on a cardinal or diagonal heading.');
  }
  const outgoing = run.map(n => n / length);
  const alignment = dot(straight.incoming, outgoing);
  if (Math.abs(Math.abs(alignment) - Math.SQRT1_2) > EPS) {
    throw new Error('Choose a branch that leaves the main line at 45°.');
  }
  const forward = alignment > 0;
  const incoming = straight.incoming.map(n => forward ? n : -n);
  const arc = corner(at, incoming, outgoing);
  const back = dot(offset(forward ? straight.a : straight.b, at), incoming);
  if (back < arc.trim + .5 - EPS || straight.lengthM - back < 4 - EPS) {
    throw new Error('The split needs at least 2.16 m of straight track behind the point and 4 m ahead in the branch direction.');
  }
  const exitLength = length - arc.trim;
  const lengthM = arc.lengthM + exitLength;
  if (main.lengthM + lengthM > RAILWAY_ROUTE_LIMITS.lengthM) {
    throw new Error(`Keep a route and its branch at or below ${RAILWAY_ROUTE_LIMITS.lengthM} m in total.`);
  }
  const plan = sampleSpans([{...arc, startM: 0}, {
    kind: 'straight', gridAnchor: at, a: arc.b, b: end, incoming: outgoing, outgoing, lengthM: exitLength, startM: arc.lengthM
  }], lengthM);
  const side = Math.sign(arc.turn), throat = arc.a;
  return {
    plan, throat, incoming, outward: [-side * incoming[1], side * incoming[0]], side,
    mainStartM: straight.startM, mainEndM: straight.startM + straight.lengthM
  };
}

export function pointToRailwaySegment(point, a, b) {
  const [dx, dy] = offset(a, b);
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(point, a);
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared));
  return distance(point, [a[0] + t * dx, a[1] + t * dy]);
}

export function railwaySegmentDistance(a, b, c, d) {
  const ab = offset(a, b), cd = offset(c, d);
  const determinant = cross(ab, cd);
  if (Math.abs(determinant) > EPS) {
    const ac = offset(a, c), s = cross(ac, cd) / determinant, t = cross(ac, ab) / determinant;
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) return 0;
  }
  return Math.min(pointToRailwaySegment(a, c, d), pointToRailwaySegment(b, c, d),
    pointToRailwaySegment(c, a, b), pointToRailwaySegment(d, a, b));
}

export function railwaySegmentBounds(segment) {
  const {a, b, radius} = segment;
  return [Math.min(a[0], b[0]) - radius, Math.min(a[1], b[1]) - radius,
    Math.max(a[0], b[0]) + radius, Math.max(a[1], b[1]) + radius];
}

function diamondAt(a, b, firstId, secondId) {
  const sin = cross(a.incoming, b.incoming);
  if (Math.abs(sin) < EPS) return null;
  const delta = offset(a.a, b.a);
  const alongA = cross(delta, b.incoming) / sin;
  const alongB = cross(delta, a.incoming) / sin;
  if (alongA < -EPS || alongA > a.lengthM + EPS || alongB < -EPS || alongB > b.lengthM + EPS) return null;
  // Integer compass lines intersect on the whole- or half-metre grid. Keep
  // the exact point even when neither route has a waypoint there.
  const point = moved(a.a, a.incoming, alongA).map(n => Math.round(n * 2) / 2);
  const clearanceM = 2 * HALF_BED / Math.abs(sin);
  if (Math.min(alongA, a.lengthM - alongA, alongB, b.lengthM - alongB) < clearanceM - EPS) {
    throw new Error(`Extend both straight approaches at the crossing near ${point.join(', ')}. Leave ${clearanceM.toFixed(2)} m of straight track on each side.`);
  }
  const track = (id, span, along) => ({
    id, stationM: span.startM + along, heading: span.incoming,
    spanStartM: span.startM, spanEndM: span.startM + span.lengthM
  });
  const angleDeg = Math.abs(dot(a.incoming, b.incoming)) < EPS ? 90 : 45;
  return {point, angleDeg, clearanceM, tracks: [track(firstId, a, alongA), track(secondId, b, alongB)]};
}

export function railwayCrossingsByRoute(crossings) {
  const grouped = new Map();
  for (const {point, angleDeg, clearanceM, tracks: [first, second]} of crossings) {
    for (const [track, other, primary] of [[first, second, true], [second, first, false]]) {
      if (!grouped.has(track.id)) grouped.set(track.id, []);
      grouped.get(track.id).push({point, angleDeg, clearanceM, track, other, primary});
    }
  }
  for (const along of grouped.values()) along.sort((a, b) => a.track.stationM - b.track.stationM);
  return grouped;
}

export function planRailwayCrossings(routes) {
  const ordered = routes.map(({id, plan}) => ({id, spans: plan.spans.filter(span => span.kind === 'straight')}));
  // The first route owns the crossing fittings. Route order in the file does
  // not affect that choice or the renderer's coplanar ballast priority.
  ordered.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const crossings = [];
  for (let i = 0; i < ordered.length; i++) {
    const first = ordered[i];
    for (let j = i + 1; j < ordered.length; j++) {
      const second = ordered[j];
      for (const a of first.spans) for (const b of second.spans) {
        const crossing = diamondAt(a, b, first.id, second.id);
        if (crossing) crossings.push(crossing);
      }
    }
  }
  for (const along of railwayCrossingsByRoute(crossings).values()) {
    for (let i = 1; i < along.length; i++) {
      const before = along[i - 1], after = along[i];
      if (after.track.stationM - before.track.stationM < before.clearanceM + after.clearanceM - EPS) {
        throw new Error(`Railway crossings need separate approaches near ${after.point.join(', ')}. Move one crossing farther away.`);
      }
    }
  }
  return crossings;
}

function onDiamondApproach(segment, track, clearance) {
  return segment.startM >= track.spanStartM - EPS && segment.endM <= track.spanEndM + EPS &&
    segment.startM <= track.stationM + clearance + EPS && segment.endM >= track.stationM - clearance - EPS;
}

export function assertRailwaySeparation(routes, crossings = []) {
  const bins = new Map();
  const diamonds = railwayCrossingsByRoute(crossings);
  const tracks = routes.flatMap(({id, plan, turnout}) => [
    {id, plan, turnout, branch: false},
    ...(turnout ? [{id, plan: turnout.plan, turnout, branch: true}] : [])
  ]);
  for (const {id, plan, turnout, branch} of tracks) {
    for (const segment of plan.segments) {
      const [west, north, east, south] = railwaySegmentBounds(segment).map(value => Math.floor(value / 4));
      const checked = new Set();
      for (let y = north; y <= south; y++) for (let x = west; x <= east; x++) {
        const key = `${x},${y}`, bin = bins.get(key) ?? [];
        for (const other of bin) {
          if (checked.has(other)) continue;
          checked.add(other);
          // Adjacent parts of one continuous track naturally share ballast.
          // With the fixed radius, 3 m along that track exceeds the 2 m bed width.
          const b = other.segment;
          if (other.id === id) {
            if (branch === other.branch && segment.startM - b.endM < 3) continue;
            if (branch && !other.branch &&
                b.startM >= turnout.mainStartM - EPS && b.endM <= turnout.mainEndM + EPS) continue;
          }
          if (railwaySegmentDistance(segment.a, segment.b, b.a, b.b) <= segment.radius + b.radius + EPS) {
            const where = segment.a.map(n => Math.round(n)).join(', ');
            if (other.id === id) throw new Error(`Railway route ${id} crosses or doubles back near ${where}. Separate the two approaches.`);
            if (!branch && !other.branch && diamonds.get(id)?.some(crossing =>
              crossing.other.id === other.id &&
              onDiamondApproach(segment, crossing.track, crossing.clearanceM) &&
              onDiamondApproach(b, crossing.other, crossing.clearanceM))) continue;
            throw new Error(`Railway route ${id} crosses or is too close to ${other.id} near ${where}. Leave room for both 2 m ballast beds.`);
          }
        }
      }
      const entry = {id, segment, branch};
      for (let y = north; y <= south; y++) for (let x = west; x <= east; x++) {
        const key = `${x},${y}`;
        if (!bins.has(key)) bins.set(key, []);
        bins.get(key).push(entry);
      }
    }
  }
}

export function planRailwayRoute(waypoints) {
  const plan = fit(waypoints);
  assertRailwaySeparation([{id: 'preview', plan}]);
  return plan;
}
