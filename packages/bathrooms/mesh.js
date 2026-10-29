import {compileBathroom} from './index.js';
import {bathroomRecipe, BATHROOM_LAYOUTS} from './designs.js';
import {Surfaces, append, revolve, ring, oval, rod, add, sub, mul, cross, dot} from './geometry.js';
export {BATHROOM_MATERIALS} from './geometry.js';
const batches = s => [...s.batches.values()];
function move(point, origin, yaw = 0) { const [x, y, z] = point, c = Math.cos(yaw), s = Math.sin(yaw); return [origin[0] + x * c + z * s, origin[1] + y, origin[2] - x * s + z * c]; }
export function hingePoint(hinge, point, degrees = 0) {
  const a = degrees * hinge.swingSign * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), axis = hinge.axis;
  return move(add(add(mul(point, c), mul(cross(axis, point), s)), mul(axis, dot(axis, point) * (1 - c))), hinge.pivot, hinge.yaw);
}
function hinge(s, hinges, id, kind, pivot, axis, sign, make, extra = {}) {
  const local = new Surfaces(s.lod, s.uvMode); local.channel(kind, 0); make(local);
  hinges.push({id, kind, pivot, axis, yaw: 0, swingSign: sign, angleRange: [0, 90], defaultAngle: 0, batches: batches(local), ...extra});
}
function paper(s, x, z) {
  s.channel('fittings', 0); rod(s, [x, .66, z], [x + .14, .66, z], .052, 'paper');
  s.box([x + .07, .595, z - .015], [.12, .075, .008], 'paper');
}
function tap(s, x, z, base = .85) {
  s.channel('fittings', 0); rod(s, [x, base - .03, z], [x, base + .16, z], .013);
  rod(s, [x, base + .16, z], [x, base + .16, z - .12], .013);
  rod(s, [x, base + .16, z - .12], [x, base + .12, z - .12], .013);
  s.box([x, base + .045, z], [.075, .015, .025], 'metal', true);
}
function toilet(s, hinges, r, prefix = r.id) {
  const material = r.style === 'steel' ? 'metal' : 'ceramic';
  s.channel('fixture', 0);
  revolve(s, [.25, 0, .32], [[0, .115, .18], [.07, .12, .18], [.22, .09, .12], [.29, .13, .17], [.29, 0, 0], [0, 0, 0]], material);
  revolve(s, [.25, 0, .31], [[.16, .11, .15], [.23, .15, .21], [.35, .22, .28], [.405, .225, .285],
    [.405, .18, .235], [.33, .145, .19], [.24, .075, .10], [.19, .028, .04], [.16, .028, .04]], material);
  s.channel('water', 0); oval(s, [.25, .245, .31], [.07, .095], .005, 'water');
  s.channel('seat', 0); ring(s, [.25, .445, .31], [.23, .29], [.175, .23], .032, r.style === 'period' ? 'timber' : material);
  s.channel('fittings', 0); rod(s, [.25, .12, .52], [.25, .12, .78], .055, material);
  if (r.style === 'period') {
    s.channel('fixture', 0); s.box([.25, 1.73, .70], [.42, .32, .16], 'ceramic', true);
    rod(s, [.25, .53, .70], [.25, 1.58, .70], .018);
    rod(s, [.44, 1.69, .70], [.44, .95, .70], .005); s.box([.44, .94, .70], [.025, .08, .025], 'timber', true);
  } else {
    s.channel('fixture', 0); s.box([.25, .64, .70], [.41, .34, .16], material, true);
    s.box([.25, .82, .70], [.435, .045, .18], material, true);
    s.channel('fittings', 0); s.cylinder([.25, .847, .70], .026, .008, 'metal');
  }
  hinge(s, hinges, prefix + ':lid', 'lid', [.25, .478, .57], [1, 0, 0], 1, local => {
    oval(local, [0, 0, -.26], [.23, .29], .026, r.style === 'period' ? 'timber' : material);
  });
}
function basin(s, x, z, rx, rz, material = 'ceramic', height = .83) {
  s.channel('fixture', 0);
  revolve(s, [x, 0, z], [[height - .22, rx * .33, rz * .35], [height - .14, rx * .72, rz * .7],
    [height - .035, rx, rz], [height, rx, rz], [height, rx - .028, rz - .028],
    [height - .07, rx * .7, rz * .68], [height - .17, .028, .028], [height - .22, .028, .028]], material);
  s.channel('fittings', 0); oval(s, [x, height - .166, z], [.023, .023], .008, 'dark');
  if (s.lod === 'source') for (const offset of [-.012, 0, .012]) rod(s, [x - .014, height - .16, z + offset], [x + .014, height - .16, z + offset], .0018);
}
function rectHole(s, rect, center, radius, material) {
  const n = s.lod === 'source' ? 72 : 24, angles = Array.from({length: n}, (_, i) => i * Math.PI * 2 / n);
  for (const x of [rect.x, rect.x + rect.width]) for (const z of [rect.z, rect.z + rect.depth]) angles.push((Math.atan2(z - center[1], x - center[0]) + Math.PI * 2) % (Math.PI * 2));
  const sorted = [...new Set(angles.map(a => Math.round(a * 1e12) / 1e12))].sort((a, b) => a - b);
  function points(a) {
    const dx = Math.cos(a), dz = Math.sin(a), tx = Math.abs(dx) < 1e-9 ? Infinity : ((dx > 0 ? rect.x + rect.width : rect.x) - center[0]) / dx,
      tz = Math.abs(dz) < 1e-9 ? Infinity : ((dz > 0 ? rect.z + rect.depth : rect.z) - center[1]) / dz, t = Math.min(tx, tz);
    return [[center[0] + t * dx, rect.height, center[1] + t * dz], [center[0] + radius[0] * dx, rect.height, center[1] + radius[1] * dz]];
  }
  for (let i = 0; i < sorted.length; i++) {
    const [a, b] = points(sorted[i]), [c, d] = points(sorted[(i + 1) % sorted.length]), down = p => [p[0], p[1] - rect.thickness, p[2]];
    s.face([a, b, d, c], material, [0, 1, 0]); s.face([down(c), down(d), down(b), down(a)], material, [0, -1, 0]);
    s.face([a, c, down(c), down(a)], material, [a[0] - center[0], 0, a[2] - center[1]]);
    s.face([d, b, down(b), down(d)], material, [center[0] - b[0], 0, center[1] - b[2]]);
  }
}
function sink(s, r) {
  const material = r.style === 'stone' ? 'carved' : 'ceramic', x = r.width / 2, z = r.depth * .47;
  basin(s, x, z, r.width * .44, r.depth * .42, material);
  s.channel('fixture', 0);
  if (r.style === 'pedestal' || r.style === 'stone') revolve(s, [x, 0, z + .015], [[0, .15, .14], [.06, .16, .15], [.13, .1, .095], [.62, .09, .085], [.7, .16, .13], [.7, 0, 0], [0, 0, 0]], material);
  else { rod(s, [x, .63, z], [x, .44, z], .022); rod(s, [x, .44, z], [x, .44, r.depth - .025], .022); }
  tap(s, x, r.depth - .035);
}
function doubleSink(s) {
  s.channel('counter', 0);
  for (const x of [0, 1]) rectHole(s, {x, z: 0, width: 1, depth: .6, height: .83, thickness: .06}, [x + .5, .27], [.385, .215], 'ceramic');
  for (const x of [.5, 1.5]) { basin(s, x, .27, .40, .23); tap(s, x, .565); s.channel('structure', 0); rod(s, [x, .63, .27], [x, .50, .27], .023); rod(s, [x, .50, .27], [x, .50, .57], .023); }
  s.channel('fixture', 0); s.box([1, .91, .575], [2, .16, .05], 'tile', true);
}
function urinal(s, trough = false) {
  s.channel('fixture', 0);
  if (trough) {
    s.box([1, .59, .23], [1.94, .07, .36], 'metal', true);
    s.box([1, .72, .05], [2, .32, .06], 'metal', true); s.box([1, .69, .42], [2, .25, .06], 'metal', true);
    for (const x of [.03, 1.97]) s.box([x, .70, .23], [.06, .28, .35], 'metal', true);
    for (const x of [.5, 1.5]) { tap(s, x, .045, .99); rod(s, [x, .58, .23], [x, .43, .23], .025); }
    s.channel('fittings', 0); oval(s, [1, .628, .23], [.035, .035], .008, 'dark');
  } else {
    basin(s, .275, .20, .23, .175, 'ceramic', .70);
    s.channel('fixture', 0); s.box([.275, 1.01, .35], [.43, .68, .08], 'ceramic', true);
    s.box([.275, .95, .30], [.32, .45, .025], 'ceramic', true);
    rod(s, [.275, 1.35, .35], [.275, 1.47, .35], .018); s.box([.275, 1.44, .35], [.11, .04, .045], 'metal', true);
  }
}
function partition(s, x, depth = 2, material = 'paint') {
  s.channel('partition', 0); s.box([x + .02, .985, depth / 2], [.04, 1.65, depth], material, true);
  s.channel('fittings', 0); for (const z of [.15, depth - .15]) { s.box([x + .02, .08, z], [.025, .16, .035], 'metal', true); s.box([x + .02, .015, z], [.035, .03, .07], 'metal', true); }
}
function stallFrame(s, x = 0, material = 'paint') {
  s.channel('partition', 0);
  for (const xx of [.04, .96]) s.box([x + xx, .98, .06], [.08, 1.96, .08], material, true);
  s.box([x + .5, 1.94, .06], [.92, .04, .07], 'metal', true);
}
function stallDoor(s, hinges, id, x = 0, hand = 'left', material = 'paint', outhouse = false) {
  const left = hand === 'left', masonry = outhouse && material === 'stone', width = outhouse ? (masonry ? .62 : .74) : .80,
    inset = outhouse ? (masonry ? .19 : .13) : .10, pivotX = x + (left ? inset : 1 - inset), sign = left ? 1 : -1;
  hinge(s, hinges, id, 'door', [pivotX, 0, .06], [0, 1, 0], sign, local => {
    local.box([sign * width / 2, outhouse ? .94 : .985, 0], [width, outhouse ? 1.76 : 1.65, .035], material, true);
    if (material === 'timber') for (const h of [.25, 1.55]) local.box([sign * width / 2, h, .025], [width - .06, .075, .025], 'timber', true);
    for (const face of [-1, 1]) {
      local.box([sign * (width - .08), 1, face * .035], [.035, .07, .03], 'metal', true);
      local.box([sign * (width - .08), 1.045, face * .04], [.05, .02, .025], 'metal', true);
    }
    for (const h of [.30, 1.55]) { rod(local, [0, h - .045, 0], [0, h + .045, 0], .009); if (local.lod === 'source') local.box([sign * .02, h, .023], [.035, .07, .008], 'metal', true); }
  }, {hand, closedAperture: [outhouse ? (masonry ? .68 : .76) : .84, outhouse ? 1.85 : 1.92], minimumFullyOpen: [outhouse ? (masonry ? .54 : .66) : .74, outhouse ? 1.82 : 1.9]});
}
function addToilet(s, hinges, origin, prefix, style = 'ceramic') {
  const temp = new Surfaces(s.lod, s.uvMode), localHinges = []; toilet(temp, localHinges, {id: prefix, style}, prefix);
  append(s, batches(temp), origin); for (const h of localHinges) hinges.push({...h, pivot: move(h.pivot, origin)});
}
function stall(s, hinges, id, x = 0, hand = 'left', west = true) {
  if (west) partition(s, x); partition(s, x + .96);
  s.channel('partition', 0); s.box([x + (west ? .5 : .48), .985, 1.98], [west ? .92 : .96, 1.65, .04], 'paint', true);
  stallFrame(s, x); stallDoor(s, hinges, id + ':door', x, hand);
  addToilet(s, hinges, [x + .25, 0, 1.12], id + ':toilet'); paper(s, x + .055, 1.01);
}
function privyBench(s, x, material) {
  s.channel('fixture', 0); rectHole(s, {x: x + .08, z: 1.18, width: .84, depth: .74, height: .45, thickness: .045}, [x + .5, 1.52], [.17, .215], material);
  s.box([x + .5, .2, 1.20], [.84, .4, .04], material, true);
  for (const xx of [x + .1, x + .9]) s.box([xx, .22, 1.65], [.04, .44, .45], material, true);
  ring(s, [x + .5, .47, 1.52], [.195, .24], [.17, .215], .02, material);
  s.channel('pit', 0); oval(s, [x + .5, .06, 1.52], [.165, .21], .01, 'dark'); paper(s, x + .09, .96);
}
function outhouse(s, hinges, r) {
  const material = r.style === 'masonry' ? 'stone' : r.style === 'portable' ? 'blue' : 'timber', t = r.style === 'masonry' ? .16 : .08;
  s.channel('floor', 0); s.box([r.width / 2, -.06, 1], [r.width, .12, 2], r.style === 'masonry' ? 'stone' : r.style === 'portable' ? 'blue' : 'timber', true);
  s.channel('exterior', 0);
  for (const x of [t / 2, r.width - t / 2]) s.box([x, 1, 1], [t, 2, 2], material, true);
  // Rear ventilation is a genuine gap with small slats, not a painted rectangle.
  s.box([r.width / 2, .83, 2 - t / 2], [r.width - 2 * t, 1.66, t], material, true);
  s.box([r.width / 2, 1.96, 2 - t / 2], [r.width - 2 * t, .08, t], material, true);
  for (let i = 0; i < r.bays; i++) {
    if (i) { s.channel('partition', 0); s.box([i, 1, 1], [.08, 2, 2], material, true); }
    s.channel('exterior', 0);
    for (const x of [i + .06, i + .94]) s.box([x, 1, .04], [.12, 2, .08], material, true);
    s.box([i + .5, 1.925, .04], [.76, .15, .08], material, true);
    for (const h of [1.72, 1.80, 1.88]) s.box([i + .5, h, 1.97], [.68, .025, .045], material, true);
    stallDoor(s, hinges, r.id + ':bay-' + i + ':door', i, i % 2 ? 'right' : 'left', material, true);
    if (r.style === 'portable') addToilet(s, hinges, [i + .25, 0, 1.12], r.id + ':toilet', 'steel');
    else privyBench(s, i, r.style === 'masonry' ? 'stone' : 'timber');
  }
  s.channel('roof', 1);
  if (r.style === 'portable') {
    s.box([r.width / 2, 2.065, 1], [r.width, .13, 2], 'blue', true);
    rod(s, [.82, .4, 1.82], [.82, 2.46, 1.82], .035); s.cylinder([.82, 2.48, 1.82], .05, .04, 'metal');
    s.channel('exterior', 0); for (const x of [.15, .30, .70, .85]) s.box([x, .98, 1.97], [.03, 1.8, .03], 'blue', true);
  } else {
    const peak = 2.42, mid = r.width / 2, low = 2.06;
    for (const [a, b] of [[[0, low, 0], [mid, peak, 0]], [[mid, peak, 0], [r.width, low, 0]]]) {
      const A = [a, b, [b[0], b[1], 2], [a[0], a[1], 2]], down = p => [p[0], p[1] - .06, p[2]];
      s.face(A, 'slate', [0, 1, 0]); s.face(A.map(down).reverse(), 'slate', [0, -1, 0]);
      for (let j = 0; j < 4; j++) { const q = (j + 1) % 4; s.face([A[j], A[q], down(A[q]), down(A[j])], 'slate', [A[j][0] - mid, 0, A[j][2] - 1]); }
    }
    s.channel('gable', 1); for (const z of [0, 2]) s.face([[0, 2, z], [r.width, 2, z], [r.width, low, z], [mid, peak - .06, z], [0, low, z]], material, [0, 0, z ? 1 : -1]);
  }
}
function moduleGeometry(s, hinges, r) {
  if (r.kind === 'toilet') toilet(s, hinges, r);
  else if (r.kind === 'sink') sink(s, r);
  else if (r.kind === 'sink-double') doubleSink(s);
  else if (r.kind === 'urinal' || r.kind === 'urinal-trough') urinal(s, r.kind === 'urinal-trough');
  else if (r.kind === 'partition') partition(s, 0);
  else if (r.kind === 'divider') { s.channel('partition', 0); s.box([.02, 1, .325], [.04, 1.3, .65], 'paint', true); }
  else if (r.kind === 'frame') stallFrame(s);
  else if (r.kind === 'door') stallDoor(s, hinges, r.id + ':door', 0, r.hand);
  else if (r.kind === 'stall') stall(s, hinges, r.id, 0, r.hand);
  else if (r.kind === 'stall-row') for (let x = 0; x < 3; x++) stall(s, hinges, r.id + ':bay-' + x, x, x % 2 ? 'right' : 'left', x === 0);
  else if (r.kind === 'outhouse') outhouse(s, hinges, r);
}
function layoutGeometry(s, hinges, r, lod, uvMode) {
  s.channel('floor', 0); s.box([r.width / 2, -.06, r.depth / 2], [r.width, .12, r.depth], r.enclosed ? 'tile' : 'stone', true);
  if (r.enclosed) {
    s.channel('exterior', 0); for (const x of [0, r.width]) s.box([x, 1, r.depth / 2], [.16, 2, r.depth], 'tile', true);
    s.box([r.width / 2, 1, r.depth], [r.width, 2, .16], 'tile', true);
    for (const [x, width] of [[1.25, 2.5], [4.75, 2.5]]) s.box([x, 1, 0], [width, 2, .16], 'tile', true);
    s.box([3, 1.96, 0], [1, .08, .16], 'tile', true);
  }
  for (const i of r.instances) {
    const data = buildBathroomMesh(i.assetId, {lod, uvMode}); append(s, data.batches, i.position, i.yaw);
    for (const h of data.hinges) hinges.push({...structuredClone(h), id: i.id + ':' + h.id, pivot: move(h.pivot, i.position, i.yaw), yaw: h.yaw + i.yaw, instanceId: i.id});
  }
}
export function meshStats(data) {
  const bounds = {min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity]}, motion = structuredClone(bounds);
  let triangles = 0;
  const grow = (b, p) => p.forEach((v, i) => { b.min[i] = Math.min(b.min[i], v); b.max[i] = Math.max(b.max[i], v); });
  for (const b of data.batches) { triangles += b.positions.length / 9; for (let i = 0; i < b.positions.length; i += 3) grow(bounds, b.positions.slice(i, i + 3)); }
  for (const h of data.hinges) for (const b of h.batches) {
    triangles += b.positions.length / 9;
    for (let i = 0; i < b.positions.length; i += 3) grow(bounds, hingePoint(h, b.positions.slice(i, i + 3)));
  }
  motion.min = [...bounds.min]; motion.max = [...bounds.max];
  for (const h of data.hinges) for (let angle = 0; angle <= 90; angle++) for (const b of h.batches) for (let i = 0; i < b.positions.length; i += 3) grow(motion, hingePoint(h, b.positions.slice(i, i + 3), angle));
  motion.min = motion.min.map(v => v - .001); motion.max = motion.max.map(v => v + .001);
  return {triangles, draws: data.batches.length + data.hinges.reduce((n, h) => n + h.batches.length, 0), bounds, motionBounds: motion};
}
export function buildBathroomMesh(input, {lod = 'game', uvMode = 'metres'} = {}) {
  if (!['source', 'game'].includes(lod) || !['metres', 'atlas'].includes(uvMode)) throw Error('Unsupported bathroom detail or UV mode.');
  const asset = compileBathroom(input), r = asset.recipe, s = new Surfaces(lod, uvMode), hinges = [];
  if (r.kind === 'layout') layoutGeometry(s, hinges, r, lod, uvMode); else moduleGeometry(s, hinges, r);
  const data = {schema: 'nautilus-bathroom-mesh', version: 1, asset, lod, uvMode, batches: batches(s), hinges};
  const stats = meshStats(data); data.bounds = stats.bounds; data.motionBounds = stats.motionBounds; delete stats.bounds; delete stats.motionBounds; data.metrics = stats;
  return data;
}
