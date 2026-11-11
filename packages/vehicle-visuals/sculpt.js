import {VEHICLE_BODIES} from './catalogue.js';

export const PAINT = 0, RUBBER = 1, GLASS = 2, TRIM = 3;
const SIDES = [-1, 1], WHITE = 0xffffff;
const INK = 0x313737, TYRE = 0x454643, STEEL = 0xaaa99c, CHROME = 0xc3c4b7;
const WINDOW = 0x75939c, IVORY = 0xe2d3a0, TAIL = 0xa84c3d;

// One mesh per finish class. Body colour changes share every position and UV.
class Sculpt {
  constructor(T, lod) {
    this.T = T;
    this.steps = lod === 'sculpt' ? 24 : 10;
    this.radial = lod === 'sculpt' ? 48 : 20;
    this.batches = new Map();
    this.primitives = new Map();
    this.transform = new T.Object3D();
    this.point = new T.Vector3();
    this.normal = new T.Vector3();
    this.normalMatrix = new T.Matrix3();
    this.colour = new T.Color();
    this.up = new T.Vector3(0, 1, 0);
  }
  primitive(key, make) {
    if (!this.primitives.has(key)) this.primitives.set(key, make());
    return this.primitives.get(key);
  }
  append(geometry, tint, group, swatch) {
    if (!this.batches.has(group)) this.batches.set(group, {p: [], n: [], c: [], uv: [], index: []});
    const batch = this.batches.get(group), first = batch.p.length / 3;
    const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
    const colour = this.colour.set(tint);
    this.transform.updateMatrix();
    this.normalMatrix.getNormalMatrix(this.transform.matrix);
    const u0 = .034 + swatch % 2 * .5, v0 = .034 + Math.floor(swatch / 2) * .5;
    for (let i = 0; i < p.count; i++) {
      const point = this.point.fromBufferAttribute(p, i).applyMatrix4(this.transform.matrix);
      const normal = this.normal.fromBufferAttribute(n, i).applyNormalMatrix(this.normalMatrix);
      batch.p.push(point.x, point.y, point.z);
      batch.n.push(normal.x, normal.y, normal.z);
      batch.c.push(colour.r, colour.g, colour.b);
      batch.uv.push(u0 + .432 * uv.getX(i), v0 + .432 * uv.getY(i));
    }
    const index = geometry.index;
    for (let i = 0; i < (index?.count ?? p.count); i++) batch.index.push(first + (index ? index.getX(i) : i));
  }
  box(position, size, colour = WHITE, group = 'body', swatch = PAINT) {
    this.transform.position.fromArray(position);
    this.transform.scale.fromArray(size);
    this.transform.quaternion.identity();
    this.append(this.primitive('box', () => new this.T.BoxGeometry(1, 1, 1)), colour, group, swatch);
  }
  bar(a, b, width, depth, colour = INK) {
    const from = new this.T.Vector3(...a), direction = new this.T.Vector3(...b).sub(from);
    this.transform.position.copy(from).addScaledVector(direction, .5);
    this.transform.scale.set(width, direction.length(), depth);
    this.transform.quaternion.setFromUnitVectors(this.up, direction.normalize());
    this.append(this.primitive('box', () => new this.T.BoxGeometry(1, 1, 1)), colour, 'details', TRIM);
  }
  cylinder(a, b, radius, colour, swatch = TRIM) {
    const from = new this.T.Vector3(...a), direction = new this.T.Vector3(...b).sub(from);
    this.transform.position.copy(from).addScaledVector(direction, .5);
    this.transform.scale.set(radius, direction.length(), radius);
    this.transform.quaternion.setFromUnitVectors(this.up, direction.normalize());
    this.append(this.primitive('cylinder', () => new this.T.CylinderGeometry(1, 1, 1, this.radial)),
      colour, 'details', swatch);
  }
  panel(points, colour, group = 'details', swatch = PAINT, normal) {
    const T = this.T, positions = points.flat(), indices = [];
    for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
    const minZ = Math.min(...points.map(p => p[2])), maxZ = Math.max(...points.map(p => p[2]));
    const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
    const uv = points.flatMap(p => [(p[2] - minZ) / Math.max(.001, maxZ - minZ),
      (p[1] - minY) / Math.max(.001, maxY - minY)]);
    this.geometry(positions, indices, uv, colour, group, swatch, normal);
  }
  geometry(positions, indices, uv, colour, group, swatch, normal) {
    const T = this.T, g = new T.BufferGeometry();
    try {
      g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      if (normal) {
        const vertex = i => new T.Vector3(...positions.slice(indices[i] * 3, indices[i] * 3 + 3));
        const a = vertex(0), b = vertex(1), c = vertex(2);
        if (b.sub(a).cross(c.sub(a)).dot(new T.Vector3(...normal)) < 0) {
          indices = indices.flatMap((_, i) => i % 3 === 0 ? [indices[i], indices[i + 2], indices[i + 1]] : []);
        }
      }
      g.setIndex(indices);
      g.computeVertexNormals();
      this.transform.position.set(0, 0, 0);
      this.transform.scale.set(1, 1, 1);
      this.transform.quaternion.identity();
      this.append(g, colour, group, swatch);
    } finally { g.dispose(); }
  }
  loft(rings, colour = WHITE, group = 'body') {
    const positions = [], indices = [], uv = [], count = rings[0][1].length;
    const rear = rings[0][0], front = rings.at(-1)[0];
    for (let j = 0; j < count; j++) {
      const first = positions.length / 3;
      for (const [z, profile] of rings) {
        positions.push(...profile[j], z, ...profile[(j + 1) % count], z);
        uv.push((z - rear) / (front - rear), 0, (z - rear) / (front - rear), 1);
      }
      for (let k = 1; k < rings.length; k++) {
        const i = first + (k - 1) * 2;
        indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
      }
    }
    for (const [ring, back] of [[rings[0], true], [rings.at(-1), false]]) {
      const [z, profile] = ring, first = positions.length / 3;
      for (const [x, y] of profile) { positions.push(x, y, z); uv.push(x / 2 + .5, y / 2.12); }
      for (let j = 1; j < count - 1; j++) {
        indices.push(first, first + (back ? j + 1 : j), first + (back ? j : j + 1));
      }
    }
    this.geometry(positions, indices, uv, colour, group, PAINT);
  }
  skirt(side, body, top, bottom, archRadius) {
    const {lengthM, wheelRadiusM, axlesM} = body, rear = -lengthM / 2 + .09, front = lengthM / 2 - .09;
    const outline = [[rear, top], [front, top], [front, bottom]];
    const start = Math.asin((bottom - wheelRadiusM) / archRadius);
    for (const centre of [...axlesM].reverse()) {
      for (let j = 0; j <= this.steps; j++) {
        const angle = start + (Math.PI - 2 * start) * j / this.steps;
        outline.push([centre + archRadius * Math.cos(angle), wheelRadiusM + archRadius * Math.sin(angle)]);
      }
    }
    outline.push([rear, bottom]);
    const points = outline.map(([z, y]) => new this.T.Vector2(z, y));
    const triangles = this.T.ShapeUtils.triangulateShape(points, []).flat();
    const x = side * body.widthM / 2;
    const positions = outline.flatMap(([z, y]) => [x, y, z]);
    const uv = outline.flatMap(([z, y]) => [(z + lengthM / 2) / lengthM, (y - bottom) / (top - bottom)]);
    this.geometry(positions, triangles, uv, WHITE, 'body', PAINT, [side, 0, 0]);
  }
  arch(side, body, centre, radius) {
    const positions = [], uv = [], indices = [], x = side * (body.widthM / 2 + .006);
    for (let j = 0; j <= this.steps; j++) {
      const angle = Math.PI * j / this.steps;
      for (const r of [radius, radius + .026]) {
        positions.push(x, body.wheelRadiusM + r * Math.sin(angle), centre + r * Math.cos(angle));
        uv.push(j / this.steps, r === radius ? 0 : 1);
      }
      if (j) { const i = 2 * j; indices.push(i - 2, i - 1, i, i - 1, i + 1, i); }
    }
    this.geometry(positions, indices, uv, 0xd9d9d3, 'body', PAINT, [side, 0, 0]);
  }
  tyre(side, body, z) {
    const {wheelRadiusM: r, widthM} = body, x = side * (widthM / 2 - .092);
    const profile = [[.58, -.50], [.87, -.50], [.97, -.36], [1, -.14],
      [1, .14], [.97, .36], [.87, .50], [.58, .50], [.58, -.50]];
    const g = this.primitive('tyre', () => new this.T.LatheGeometry(
      profile.map(([radius, width]) => new this.T.Vector2(radius, width)), this.radial));
    this.transform.position.set(x, r, z);
    this.transform.scale.set(r, .19, r);
    this.transform.quaternion.setFromUnitVectors(this.up, new this.T.Vector3(1, 0, 0));
    this.append(g, TYRE, 'details', RUBBER);
    const outer = x + side * .092;
    this.cylinder([outer - side * .031, r, z], [outer, r, z], r * .59, STEEL);
    this.cylinder([outer, r, z], [outer + side * .011, r, z], r * .41, CHROME);
    this.cylinder([outer + side * .01, r, z], [outer + side * .018, r, z], r * .15, INK);
    for (let j = 0; j < 5; j++) {
      const a = j * Math.PI * 2 / 5;
      const yy = r + .43 * r * Math.cos(a), zz = z + .43 * r * Math.sin(a);
      this.cylinder([outer + side * .002, yy, zz], [outer + side * .010, yy, zz], .031, INK);
    }
  }
  finish() {
    const result = new Map();
    for (const [name, batch] of this.batches) {
      const T = this.T, geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(batch.p, 3));
      geometry.setAttribute('normal', new T.Float32BufferAttribute(batch.n, 3));
      geometry.setAttribute('color', new T.Float32BufferAttribute(batch.c, 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(batch.uv, 2));
      geometry.setIndex(batch.index);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      result.set(name, geometry);
    }
    return result;
  }
  dispose() { for (const g of this.primitives.values()) g.dispose(); }
}

function topSection(width, lower, top) {
  return [[-width + .035, lower], [width - .035, lower], [width, lower + .04],
    [width, top - .047], [width - .067, top], [-width + .067, top], [-width, top - .047], [-width, lower + .04]];
}
function roofSection(baseWidth, roofWidth, belt, roof) {
  return [[-baseWidth, belt], [baseWidth, belt], [roofWidth, roof - .04],
    [roofWidth * .71, roof], [-roofWidth * .71, roof], [-roofWidth, roof - .04]];
}
function roofAt(roof, z) {
  const i = Math.max(0, roof.findIndex(([at]) => at >= z) - 1);
  const [a, b] = [roof[i], roof[Math.min(i + 1, roof.length - 1)]];
  const t = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0])));
  return a[1] + (b[1] - a[1]) * t;
}
function clipToTriangle(polygon, triangle) {
  const area = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const sign = Math.sign(area(triangle[0], triangle[1], triangle[2]));
  for (let edge = 0; edge < 3 && polygon.length; edge++) {
    const a = triangle[edge], b = triangle[(edge + 1) % 3], clipped = [];
    for (let j = 0; j < polygon.length; j++) {
      const p = polygon[j], q = polygon[(j + 1) % polygon.length];
      const dp = sign * area(a, b, p), dq = sign * area(a, b, q);
      if (dp >= -1e-9) clipped.push(p);
      if ((dp < 0) !== (dq < 0)) {
        const t = dp / (dp - dq);
        clipped.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    polygon = clipped;
  }
  return polygon;
}

function sideGlass(b, side, roof, wb, wr, belt, start, end) {
  const pane = [[start, belt + .085], [end, belt + .085],
    [end, roofAt(roof, end) - .095], [start, roofAt(roof, start) - .095]];
  for (let i = 1; i < roof.length; i++) {
    const [z0, top0] = roof[i - 1], [z1, top1] = roof[i];
    const a = [z0, belt, wb], d = [z0, top0 - .04, wr];
    const c = [z1, top1 - .04, wr], e = [z1, belt, wb];
    for (const triangle of [[a, d, e], [d, c, e]]) {
      const [p, q, r] = triangle;
      const det = (q[1] - r[1]) * (p[0] - r[0]) + (r[0] - q[0]) * (p[1] - r[1]);
      if (Math.abs(det) < 1e-9) continue;
      const clipped = clipToTriangle(pane, triangle);
      if (clipped.length < 3) continue;
      const points = clipped.map(([z, y]) => {
        const u = ((q[1] - r[1]) * (z - r[0]) + (r[0] - q[0]) * (y - r[1])) / det;
        const v = ((r[1] - p[1]) * (z - r[0]) + (p[0] - r[0]) * (y - r[1])) / det;
        return [side * (u * p[2] + v * q[2] + (1 - u - v) * r[2] + .009), y, z];
      });
      b.panel(points, WINDOW, 'details', GLASS, [side, 0, 0]);
    }
  }
}
function windscreen(b, roof, wb, wr, belt, front) {
  const [a, c] = front ? roof.slice(-2) : roof.slice(0, 2).reverse();
  const zNear = c[0] + (a[0] - c[0]) * .14, zFar = c[0] + (a[0] - c[0]) * .86;
  const yNear = c[1] + (a[1] - c[1]) * .14, yFar = c[1] + (a[1] - c[1]) * .86;
  const side = front ? 1 : -1, lift = .008;
  const nearW = wr * .96, farW = wr * .93;
  const points = [[-nearW, yNear + lift, zNear + side * lift], [nearW, yNear + lift, zNear + side * lift],
    [farW, yFar + lift, zFar + side * lift], [-farW, yFar + lift, zFar + side * lift]];
  b.panel(points, WINDOW, 'details', GLASS, [0, .5, side]);
  if (front) for (const s of SIDES) b.bar([s * nearW * .36, yNear + .022, zNear + side * .013],
    [s * nearW * .12, yNear + .095, zNear - side * .12], .013, .018);
}

function shape(body) {
  const height = body.heightM - (body.kind === 'suv' ? .064 : 0);
  if (body.id === 'hatchback') return {belt: .82, roof: [[-1.56, .90], [-1.12, height], [.29, height], [.87, .86]],
    windows: [[-1.25, -.46], [-.37, .62]], doors: [-.42, .66]};
  if (body.id === 'sedan') return {belt: .83, roof: [[-1.51, .89], [-.96, height], [.44, height], [1.11, .88]],
    windows: [[-1.16, -.35], [-.25, .78]], doors: [-.31, .80]};
  if (body.id === 'pickup') return {belt: 1.05, roof: [[-.09, 1.15], [.10, height], [.98, height], [1.52, 1.08]],
    windows: [[.07, 1.22]], doors: [1.29], bedEnd: -.19};
  if (body.id === 'crew-pickup') return {belt: 1.10, roof: [[-.68, 1.19], [-.42, height], [1.11, height], [1.72, 1.13]],
    windows: [[-.44, .20], [.29, 1.39]], doors: [.24, 1.45], bedEnd: -.78};
  if (body.id === 'cargo-van') return {belt: 1.09, roof: [[-2.22, 1.83], [-2.03, height], [1.02, height], [1.89, 1.13]],
    windows: [[.84, 1.52]], doors: [.60, 1.59], cargo: true};
  if (body.id === 'passenger-van') return {belt: 1.04, roof: [[-2.12, 1.61], [-1.84, height], [.80, height], [1.62, 1.08]],
    windows: [[-1.84, -.84], [-.73, .29], [.40, 1.27]], doors: [.34, 1.34]};
  if (body.id === 'utility-suv') return {belt: 1.07, roof: [[-1.92, 1.61], [-1.73, height], [.61, height], [1.18, 1.11]],
    windows: [[-1.70, -.88], [-.77, -.09], [.02, .90]], doors: [-.84, -.04, .96]};
  return {belt: .96, roof: [[-1.91, 1.13], [-1.36, height], [.44, height], [1.25, 1.00]],
    windows: [[-1.55, -.46], [-.35, .95]], doors: [-.41, 1.01]};
}

function sculpt(b, body) {
  const {lengthM, widthM, wheelRadiusM: r} = body;
  const half = lengthM / 2, w = widthM / 2, spec = shape(body), belt = spec.belt;
  const arch = r + .078, low = r + arch + .025;
  b.box([0, .34, 0], [widthM - .29, .22, lengthM - .30], 0x454940, 'details', TRIM);
  for (const z of body.axlesM) {
    b.cylinder([-w + .08, r, z], [w - .08, r, z], .055, INK);
    for (const s of SIDES) { b.tyre(s, body, z); b.arch(s, body, z, arch); }
  }
  for (const s of SIDES) {
    b.skirt(s, body, low + .025, .29, arch);
    const [rearAxle, frontAxle] = body.axlesM;
    for (const [from, to] of [[-half + .14, rearAxle - arch - .025],
      [rearAxle + arch + .025, frontAxle - arch - .025], [frontAxle + arch + .025, half - .14]]) {
      b.box([s * (w + .003), .329, (from + to) / 2], [.017, .063, to - from], 0x5d645b, 'details', TRIM);
    }
  }
  const section = (width, top) => topSection(width, low, Math.max(low + .09, top));
  if (spec.bedEnd) {
    b.loft([[spec.roof[0][0], section(w, belt)], [half - .22, section(w, belt - .07)],
      [half - .09, section(w - .09, belt - .12)]]);
    const bedRear = -half + .13, bedFront = spec.bedEnd, bedLength = bedFront - bedRear;
    b.box([0, low + .027, (bedRear + bedFront) / 2], [widthM - .16, .055, bedLength], 0xa3a3a0);
    for (const s of SIDES) b.box([s * (w - .039), (low + belt) / 2, (bedRear + bedFront) / 2],
      [.076, belt - low, bedLength]);
    b.box([0, (low + belt) / 2, bedRear], [widthM - .08, belt - low, .074]);
    b.box([0, (low + belt) / 2, bedFront], [widthM - .08, belt - low, .074]);
    for (let j = -3; j <= 3; j++) b.box([j * .18, low + .057, (bedRear + bedFront) / 2],
      [.019, .003, bedLength - .10], 0x82847e);
    b.box([0, belt - .07, bedRear - .044], [.237, .043, .011], INK, 'details', TRIM);
  } else {
    b.loft([[-half + .09, section(w - .10, belt - .10)], [-half + .27, section(w, belt)],
      [half - .25, section(w, belt - .02)], [half - .09, section(w - .09, belt - .12)]]);
  }

  const wb = w - .052, wr = wb * .79;
  b.loft(spec.roof.map(([z, y]) => [z, roofSection(wb, wr, belt, y)]));
  for (const s of SIDES) {
    for (const [from, to] of spec.windows) sideGlass(b, s, spec.roof, wb, wr, belt, from, to);
    for (const z of spec.doors) {
      b.box([s * (w + .003), (low + belt) / 2, z], [.006, Math.max(.08, belt - low - .025), .012],
        0x696e65, 'details', TRIM);
      b.box([s * (w + .010), belt - .093, z - .16], [.023, .033, .135], CHROME, 'details', TRIM);
    }
    const mirrorZ = spec.windows.at(-1)[1] - .16, mirrorY = belt + .16;
    b.box([s * .935, mirrorY, mirrorZ], [.075, .047, .065], INK, 'details', TRIM);
    b.box([s * .958, mirrorY + .025, mirrorZ - .018], [.054, .117, .153], 0xc4c4ba);
    b.box([s * .961, mirrorY + .025, mirrorZ - .098], [.045, .087, .008], WINDOW, 'details', GLASS);
  }
  windscreen(b, spec.roof, wb, wr, belt, true);
  if (!spec.cargo) windscreen(b, spec.roof, wb, wr, belt, false);

  for (const s of SIDES) {
    const z = s * (half - .068), bumperY = body.kind === 'car' ? .45 : .55;
    b.box([0, bumperY, z], [widthM - .12, .136, .080], INK, 'details', TRIM);
    b.box([0, bumperY + .042, z + s * .043], [widthM - .26, .031, .019], STEEL, 'details', TRIM);
    b.box([0, bumperY + .02, z + s * .057], [.27, .092, .014], 0xc1b997, 'details', TRIM);
    for (const side of SIDES) {
      const lightWidth = body.kind === 'car' ? .41 : .32;
      b.box([side * (w - .30), belt - .16, z + s * .008], [lightWidth + .033, .155, .060], INK, 'details', TRIM);
      b.box([side * (w - .30), belt - .16, z + s * .042], [lightWidth, .118, .012],
        s > 0 ? IVORY : TAIL, 'details', TRIM);
      b.box([side * (w - .13), belt - .16, z + s * .051], [.057, .115, .009],
        s > 0 ? 0xc29351 : 0xc17c58, 'details', TRIM);
    }
  }
  b.box([0, belt - .17, half - .015], [widthM * .34, .151, .015], INK, 'details', TRIM);
  for (const y of [-.045, 0, .045]) b.box([0, belt - .17 + y, half - .005],
    [widthM * .32, .009, .007], STEEL, 'details', TRIM);
  if (spec.cargo) {
    for (const s of SIDES) {
      b.box([s * (w + .004), 1.48, -.63], [.005, .013, 2.49], 0x9a9e8d, 'details', TRIM);
      b.box([s * (w + .004), 1.12, -.63], [.005, .013, 2.49], 0x8a8f80, 'details', TRIM);
      b.box([s * (w + .006), 1.42, -.68], [.007, .55, .013], 0x888d80, 'details', TRIM);
    }
    b.box([0, 1.29, -half + .035], [.018, .94, .013], 0x70796a, 'details', TRIM);
  }
  if (body.kind === 'suv') for (const s of SIDES) {
    b.bar([s * .57, body.heightM - .025, -.99], [s * .57, body.heightM - .025, .38], .046, .047, INK);
  }
}

export function sculptRoadVehicle(T, id, {lod = 'game'} = {}) {
  const body = VEHICLE_BODIES.find(row => row.id === id);
  if (!body) throw new RangeError('Unknown vehicle body: ' + String(id));
  if (!['game', 'sculpt'].includes(lod)) throw new RangeError('Choose game or sculpt detail.');
  const b = new Sculpt(T, lod);
  try { sculpt(b, body); return b.finish(); }
  finally { b.dispose(); }
}