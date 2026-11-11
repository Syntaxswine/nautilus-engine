import {RAIL_TRACK_PROFILE} from './catalogue.js';
import {railwayPaint} from './paint.js';
import {railwayStockProfile} from './stock-profile.js';
import {createRollingStockKit as createMiniatureStockKit} from './miniature-stock.js';

const {railCentresM, railTopM} = RAIL_TRACK_PROFILE;
const SIDES = [-1, 1];
const BRUSH = 0, TIMBER = 1, FLUTED_STEEL = 2, GLASS = 3;

const INK = 0x23292b, IRON = 0x414b4d, STEEL = 0x8c9693, BRASS = 0xbd9252;
const GREEN = 0x344e43, RED_OXIDE = 0x7b3730;
const SILVER = 0xb8c1c3, SIGNAL_RED = 0xb43c36, WINDOW = 0x91a7b0;

const cars = {
  'steam-engine': {scale: [2.2, 2.5], deckM: 1.25, driver: true, sculpt: steamEngine},
  'coal-tender': {scale: [2.25, 2.5], deckM: 1.20, wheelRadiusM: .29, sculpt: coalTender},
  'steam-coach': {scale: [2.12, 2.5], deckM: 1.10, wheelRadiusM: .32, sculpt: steamCoach},
  'electric-cab': {scale: [2.05, 2.55], deckM: 1.10, wheelRadiusM: .32, sculpt: (b, h) => commuter(b, h, true)},
  'electric-coach': {scale: [2.05, 2.55], deckM: 1.10, wheelRadiusM: .32, sculpt: (b, h) => commuter(b, h, false)}
};

// A shared paint sheet carries brush marks, varnished grain, shallow stainless
// flutes and painted reflections. The larger silhouettes are sculpted.
function stockPaint(T) {
  return railwayPaint(T, 256, (x, y) => {
    const slot = Math.floor(2 * x) + 2 * Math.floor(2 * y);
    const u = 2 * x % 1, v = 2 * y % 1;
    const stroke = 5 * Math.sin(7 * u + 23 * v) + 4 * Math.sin(12 * u - 67 * v);
    if (slot === TIMBER) {
      const grain = Math.sin(178 * v + 3 * Math.sin(6 * u + 10 * v));
      return [236, 227, 219].map(value => value + stroke + 7 * grain);
    }
    if (slot === FLUTED_STEEL) {
      const flute = Math.cos(v * 24 * Math.PI);
      return [235, 240, 242].map(value => value + stroke * .45 + 13 * flute);
    }
    if (slot === GLASS) {
      const edge = Math.max(0, 1 - Math.abs(v - .42 - .31 * u) * 8);
      return [95, 121, 134].map(value => value + 47 * edge + 32 * v + stroke);
    }
    return [243, 240, 236].map(value => value + stroke + 7 * Math.sin(u * 13 + v * 5));
  });
}

class CarSculpt {
  constructor(T) {
    this.T = T;
    this.parts = new Map();
    this.primitives = new Map();
    this.point = new T.Vector3();
    this.normal = new T.Vector3();
    this.colour = new T.Color();
    this.transform = new T.Object3D();
    this.normalMatrix = new T.Matrix3();
    this.up = new T.Vector3(0, 1, 0);
    this.mapping = null;
  }

  primitive(key, make) {
    if (!this.primitives.has(key)) this.primitives.set(key, make());
    return this.primitives.get(key);
  }

  append(geometry, colour, finish, swatch) {
    let batch = this.parts.get(finish);
    if (!batch) {
      batch = {positions: [], normals: [], colours: [], uvs: [], indices: []};
      this.parts.set(finish, batch);
    }
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv'), index = geometry.getIndex();
    const first = batch.positions.length / 3;
    const u0 = .032 + swatch % 2 * .5, v0 = .032 + Math.floor(swatch / 2) * .5;
    const tint = this.colour.set(colour);
    this.transform.updateMatrix();
    this.normalMatrix.getNormalMatrix(this.transform.matrix);
    for (let i = 0; i < position.count; i++) {
      const p = this.point.fromBufferAttribute(position, i).applyMatrix4(this.transform.matrix);
      const n = this.normal.fromBufferAttribute(normal, i).applyNormalMatrix(this.normalMatrix);
      // Reuse the painted upper-body recipes, but keep wheels and their rail
      // datum outside this affine transform. Normal correction keeps the
      // stretched shells lit correctly without scaling the returned root.
      if (this.mapping) {
        const {x, y, z, offsetY} = this.mapping;
        p.set(p.x * x, p.y * y + offsetY, p.z * z);
        n.set(n.x / x, n.y / y, n.z / z).normalize();
      }
      batch.positions.push(p.x, p.y, p.z);
      batch.normals.push(n.x, n.y, n.z);
      batch.colours.push(tint.r, tint.g, tint.b);
      batch.uvs.push(u0 + .436 * uv.getX(i), v0 + .436 * uv.getY(i));
    }
    for (let i = 0; i < (index?.count ?? position.count); i++) {
      batch.indices.push(first + (index ? index.getX(i) : i));
    }
  }

  box(position, size, colour, swatch = BRUSH, finish = 'paint') {
    this.transform.position.fromArray(position);
    this.transform.scale.fromArray(size);
    this.transform.quaternion.identity();
    this.append(this.primitive('box', () => new this.T.BoxGeometry(1, 1, 1)), colour, finish, swatch);
  }

  axial(geometry, from, to, width, depth, colour, finish, swatch = BRUSH) {
    const a = new this.T.Vector3(...from), b = new this.T.Vector3(...to);
    const axis = b.clone().sub(a);
    this.transform.position.copy(a).lerp(b, .5);
    this.transform.scale.set(width, axis.length(), depth);
    this.transform.quaternion.setFromUnitVectors(this.up, axis.normalize());
    this.append(geometry, colour, finish, swatch);
  }

  cylinder(from, to, radius, colour, finish = 'metal', ratio = 1) {
    const shape = this.primitive('cylinder-' + ratio, () => new this.T.CylinderGeometry(ratio, 1, 1, 20));
    this.axial(shape, from, to, radius, radius, colour, finish);
  }

  bar(from, to, width, depth, colour, finish = 'metal') {
    this.axial(this.primitive('box', () => new this.T.BoxGeometry(1, 1, 1)),
      from, to, width, depth, colour, finish);
  }

  tire(x, y, z, radius) {
    const rim = this.primitive('tire', () => new this.T.LatheGeometry([
      [.82, -.50], [.95, -.50], [1, -.41], [1, .41], [.95, .50], [.82, .50], [.82, -.50]
    ].map(([r, height]) => new this.T.Vector2(r, height)), 20));
    this.axial(rim, [x - .055, y, z], [x + .055, y, z], radius, radius, STEEL, 'metal');
  }

  wheelCover(side, y, z, radius) {
    const cover = this.primitive('splasher', () => new this.T.LatheGeometry([
      [.972, -.50], [1, -.50], [1, .50], [.972, .50], [.972, -.50]
    ].map(([r, height]) => new this.T.Vector2(r, height)), 12, 1.19 * Math.PI, .62 * Math.PI));
    const x = side * .51;
    this.axial(cover, [x - .075, y, z], [x + .075, y, z], radius, radius, 0x2b3831, 'paint');
  }

  lump(position, size, rotation, colour) {
    this.transform.position.fromArray(position);
    this.transform.scale.fromArray(size);
    this.transform.rotation.set(...rotation);
    const chip = this.primitive('coal', () => new this.T.IcosahedronGeometry(1, 0));
    this.append(chip, colour, 'paint', BRUSH);
  }

  // Rings run rear to front. Each profile is a convex, counterclockwise XY outline.
  shell(rings, colour, swatch = BRUSH) {
    const positions = [], uvs = [], indices = [];
    const edges = rings[0][1].length;
    const back = rings[0][0], front = rings.at(-1)[0];
    for (let edge = 0; edge < edges; edge++) {
      const start = positions.length / 3;
      for (const [z, profile] of rings) {
        positions.push(...profile[edge], z, ...profile[(edge + 1) % edges], z);
        const u = (z - back) / (front - back);
        uvs.push(u, 0, u, 1);
      }
      for (let ring = 1; ring < rings.length; ring++) {
        const a = start + 2 * (ring - 1);
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    for (const [z, profile] of [rings[0], rings.at(-1)]) {
      const start = positions.length / 3;
      for (const [x, y] of profile) {
        positions.push(x, y, z);
        uvs.push((x + .6) / 1.2, y / 2.12);
      }
      for (let j = 1; j < edges - 1; j++) {
        indices.push(start, start + (z === back ? j + 1 : j), start + (z === back ? j : j + 1));
      }
    }
    const geometry = new this.T.BufferGeometry();
    try {
      geometry.setAttribute('position', new this.T.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new this.T.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      this.transform.position.set(0, 0, 0);
      this.transform.scale.set(1, 1, 1);
      this.transform.quaternion.identity();
      this.append(geometry, colour, 'paint', swatch);
    } finally {
      geometry.dispose();
    }
  }

  releasePrimitives() {
    for (const geometry of this.primitives.values()) geometry.dispose();
  }
}

function barrelRoof(halfWidth, eave, crown) {
  return [[-halfWidth, eave - .036], [halfWidth, eave - .036], [halfWidth, eave],
    [halfWidth * .83, eave + (crown - eave) * .65], [halfWidth * .44, crown], [-halfWidth * .44, crown],
    [-halfWidth * .83, eave + (crown - eave) * .65], [-halfWidth, eave]];
}

function straightShell(b, back, front, profile, colour, swatch) {
  b.shell([[back, profile], [front, profile]], colour, swatch);
}

function chassis(b, half, recipe, couplerY) {
  const {deckM, driver} = recipe, width = driver ? .91 : 1.04;
  const section = w => [[-w, deckM - .18], [w, deckM - .18], [w, deckM], [-w, deckM]];
  b.shell([[-half + .075, section(.72)], [-half + .48, section(width)],
    [half - .48, section(width)], [half - .075, section(.72)]], driver ? RED_OXIDE : INK);
  for (const side of SIDES) {
    b.box([side * .70, deckM - .15, 0], [.13, .22, 2 * half - .65], IRON);
  }
  for (const side of SIDES) {
    b.box([0, couplerY, side * half], [.15, .10, .30], IRON, BRUSH, 'coupler');
    b.box([0, couplerY, side * (half + .105)], [.26, .14, .15], INK, BRUSH, 'coupler');
    b.box([0, couplerY + .014, side * (half + .14)], [.20, .075, .09], STEEL, BRUSH, 'coupler');
  }
  if (!driver) return;
  for (const side of SIDES) {
    b.cylinder([side * .63, 1.27, half - 1.20], [side * .63, 1.27, half - .58], .16, IRON);
    b.cylinder([side * .63, 1.27, half - 1.24], [side * .63, 1.27, half - 1.13], .18, INK);
  }
}

function wheelset(b, z, radius, driver = false) {
  const gauge = railCentresM / 2, y = railTopM + radius;
  b.cylinder([-.51, y, z], [.51, y, z], .06, IRON);
  for (const s of SIDES) {
    const x = s * gauge;
    const across = (a, c, r, colour) => b.cylinder([s * a, y, z], [s * c, y, z], r, colour);
    b.tire(x, y, z, radius);
    across(gauge - .084, gauge - .064, radius + .014, INK);
    if (driver) {
      for (let j = 0; j < 8; j++) {
        const a = j * Math.PI / 4, dy = Math.cos(a), dz = Math.sin(a);
        b.bar([s * .47, y + .08 * dy, z + .08 * dz],
          [s * .47, y + .84 * radius * dy, z + .84 * radius * dz], .073, .056, GREEN);
      }
      across(.40, .57, .12, IRON);
      across(.57, .604, .068, BRASS);
    } else {
      across(.410, .497, radius - .018, IRON);
      across(.497, .55, .09, INK);
      across(.55, .572, .054, STEEL);
      b.box([s * .51, y + .18, z], [.16, .11, .48], INK);
      b.box([s * .57, y + .22, z], [.08, .045, .32], IRON);
    }
  }
}

// These five body recipes retain the miniature's original paint, glazing and
// silhouette details. Their coordinates remain in the original sculpt space;
// template() expands only these upper parts, then builds world running gear.
function steamEngine(b) {
  b.box([0, .93, -.11], [.778, .067, 1.87], INK);
  for (const s of SIDES) {
    b.box([s * .448, .93, 0], [.126, .060, .826], INK);
    b.cylinder([s * .318, 1.30, -.59], [s * .318, 1.30, .70], .012, BRASS);
    for (const z of [-.40, .44]) b.cylinder([s * .29, 1.30, z], [s * .333, 1.30, z], .018, BRASS);
  }

  b.cylinder([0, 1.28, -.65], [0, 1.28, .77], .327, GREEN, 'paint');
  for (const z of [-.41, .08, .53]) b.cylinder([0, 1.28, z], [0, 1.28, z + .032], .333, 0x4f5f4c, 'paint');
  b.cylinder([0, 1.28, .62], [0, 1.28, .996], .299, INK, 'paint');
  b.cylinder([0, 1.28, .972], [0, 1.28, 1.03], .287, IRON);
  b.cylinder([0, 1.28, 1.026], [0, 1.28, 1.061], .244, 0x353c3b, 'paint', .87);
  b.cylinder([0, 1.28, 1.058], [0, 1.28, 1.076], .057, BRASS);
  b.bar([-.115, 1.273, 1.065], [.115, 1.297, 1.065], .021, .019, INK);
  b.cylinder([0, 1.633, .85], [0, 1.633, 1.005], .082, BRASS);
  b.cylinder([0, 1.633, .999], [0, 1.633, 1.013], .060, 0xffcf7e, 'lamp');

  b.cylinder([0, 1.52, .67], [0, 1.70, .67], .113, INK, 'paint', .64);
  b.cylinder([0, 1.68, .67], [0, 1.94, .67], .072, IRON, 'paint', 1.14);
  b.cylinder([0, 1.93, .67], [0, 1.99, .67], .107, INK, 'paint', 1.12);
  b.cylinder([0, 1.991, .67], [0, 1.998, .67], .082, 0x131719, 'paint');
  for (const [z, radius, top] of [[-.14, .125, 1.763], [.22, .079, 1.719]]) {
    b.cylinder([0, 1.55, z], [0, top - .04, z], radius, BRASS, 'metal', .84);
    b.cylinder([0, top - .044, z], [0, top, z], .85 * radius, BRASS, 'metal', .60);
  }
  b.box([0, 1.304, -.873], [1.018, .735, .511], GREEN);
  for (const s of SIDES) {
    b.box([s * .516, 1.481, -.873], [.025, .245, .343], BRASS);
    b.box([s * .531, 1.481, -.873], [.014, .207, .304], WINDOW, GLASS);
    b.box([s * .54, 1.481, -.873], [.012, .207, .018], GREEN);
    b.box([s * .518, 1.19, -.872], [.022, .106, .281], 0x416151);
    b.box([s * .482, .841, -.979], [.151, .047, .203], IRON);
  }
  b.box([0, 1.30, -1.131], [.38, .74, .022], INK);
  straightShell(b, -1.175, -.56, barrelRoof(.558, 1.72, 1.84), INK);
  b.box([0, .824, 1.061], [.90, .106, .112], RED_OXIDE);
  for (let j = -3; j <= 3; j++) {
    b.bar([j * .113, .818, 1.044], [j * .090, .646, 1.167], .036, .040, INK);
  }
  b.box([0, .64, 1.169], [.60, .049, .047], INK);
}

function coalTender(b) {
  const tank = w => [[-w, .884], [w, .884], [w, 1.388], [w - .04, 1.424], [-w + .04, 1.424], [-w, 1.388]];
  b.shell([[-.797, tank(.408)], [-.691, tank(.487)], [.655, tank(.487)], [.779, tank(.435)]], GREEN);
  for (const s of SIDES) {
    b.box([s * .49, 1.156, -.014], [.015, .311, 1.227], 0x2d4139);
    b.box([s * .500, 1.311, -.014], [.012, .019, 1.233], BRASS);
    b.box([s * .500, 1.008, -.014], [.012, .016, 1.233], 0x866b44);
    b.box([s * .469, 1.468, .084], [.041, .11, 1.162], GREEN);
    b.box([s * .431, .812, -.698], [.151, .041, .201], IRON);
  }
  b.box([0, 1.464, -.515], [.90, .097, .052], GREEN);
  b.box([0, 1.452, .662], [.908, .143, .055], GREEN);
  b.box([0, 1.422, .080], [.861, .088, 1.147], 0x2e3030);
  b.cylinder([0, 1.427, -.671], [0, 1.479, -.671], .121, IRON);

  const coal = [0x323635, 0x383a38, 0x484c4a, 0x3c4144, 0x252a2c];
  for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
    const j = 5 * row + col;
    const x = (col - 2) * .164 + .036 * Math.sin(j * 2.31);
    const z = (row - 3) * .156 + .079 + .042 * Math.cos(j * 1.73);
    const y = 1.475 + .119 * (1 - Math.abs(x) / .45) * (1 - Math.abs(z - .079) / .64);
    b.lump([x, y, z], [.095 + j % 3 * .019, .079 + j % 4 * .016, .126],
      [j * .83, j * 1.76, j * .38], coal[j % coal.length]);
  }
}

function steamCoach(b, half) {
  const wine = 0x674032, panel = 0x794d3b, cream = 0xc8ad78;
  const section = w => [[-w + .035, .881], [w - .035, .881], [w, .959], [w, 1.728],
    [w - .043, 1.785], [-w + .043, 1.785], [-w, 1.728], [-w, .959]];
  b.shell([[-half + .132, section(.415)], [-half + .238, section(.522)],
    [half - .238, section(.522)], [half - .132, section(.415)]], wine, TIMBER);
  straightShell(b, -half + .100, half - .100, barrelRoof(.574, 1.78, 1.876), 0x343837);
  straightShell(b, -half + .259, half - .259, barrelRoof(.272, 1.937, 2.015), 0x414541);
  for (const s of SIDES) {
    b.box([s * .266, 1.891, 0], [.055, .105, 1.874], cream);
    for (let j = -3; j <= 3; j++) {
      b.box([s * .298, 1.899, j * .249], [.013, .043, .171], WINDOW, GLASS);
    }
    b.box([s * .527, 1.499, 0], [.022, .402, 2.213], cream);
    b.box([s * .543, 1.272, 0], [.023, .022, 2.221], BRASS);
    b.box([s * .531, .982, 0], [.023, .025, 2.22], 0x9a7050);
    for (let j = -2; j <= 2; j++) {
      const z = j * .399;
      b.box([s * .541, 1.506, z], [.018, .303, .302], 0x634539);
      b.box([s * .554, 1.506, z], [.011, .257, .265], WINDOW, GLASS);
      b.box([s * .561, 1.507, z], [.010, .258, .019], cream);
      b.box([s * .544, 1.114, z], [.018, .191, .342], panel, TIMBER);
    }
    b.box([0, .862, s * (half - .080)], [.768, .040, .147], IRON);
    b.box([0, 1.343, s * (half - .128)], [.325, .76, .045], 0x583a2e, TIMBER);
    b.box([0, 1.535, s * (half - .099)], [.220, .263, .019], WINDOW, GLASS);
    for (const x of [-.377, .377]) {
      b.cylinder([x, .882, s * (half - .057)], [x, 1.141, s * (half - .057)], .017, BRASS);
    }
    for (const x of [-.421, .421]) {
      b.box([x, .746, s * (half - .144)], [.199, .045, .206], IRON);
    }
  }
}

function commuter(b, half, cab) {
  const profile = (w, crown = 1.953) => [[-w + .05, .868], [w - .05, .868],
    [w, .993], [w, 1.645], [w - .04, 1.795], [w - .14, crown - .03],
    [w - .25, crown], [-w + .25, crown], [-w + .14, crown - .03],
    [-w + .04, 1.795], [-w, 1.645], [-w, .993]];
  const shoulder = cab ? half - .358 : half - .151;
  b.shell([[-half + .031, profile(.43)], [-half + .151, profile(.549)],
    [shoulder, profile(.549)], ...(cab ? [] : [[half - .031, profile(.43)]])], SILVER);
  if (cab) {
    b.shell([[shoulder, profile(.549)], [half - .108, profile(.456, 1.907)],
      [half - .048, profile(.386, 1.862)]], SIGNAL_RED);
    cabFace(b, half);
  }

  const trimEnd = shoulder - .035, trimStart = -half + .17;
  for (const s of SIDES) {
    b.box([s * .552, 1.199, (trimStart + trimEnd) / 2],
      [.018, .383, trimEnd - trimStart], SILVER, FLUTED_STEEL);
    b.box([s * .556, 1.462, (trimStart + trimEnd) / 2],
      [.025, .293, trimEnd - trimStart], 0x333f45);
    b.box([s * .565, 1.043, (trimStart + trimEnd) / 2],
      [.019, .058, trimEnd - trimStart], SIGNAL_RED);
    for (const z of cab ? [-.390, -.059, .280] : [-.381, 0, .381]) {
      b.box([s * .575, 1.482, z], [.015, .202, .262], WINDOW, GLASS);
      b.box([s * .582, 1.481, z], [.010, .199, .014], 0x46545b);
    }
    for (const z of cab ? [-.875, .722] : [-.892, .892]) commuterDoor(b, s, z);
    if (cab) {
      b.box([s * .555, 1.59, .981], [.019, .222, .127], 0x313b3f);
      b.box([s * .568, 1.59, .981], [.011, .176, .087], WINDOW, GLASS);
    }
  }
  b.box([0, 1.318, -half + .049], [.388, .72, .057], 0x465257);
  b.box([0, 1.51, -half + .017], [.221, .219, .022], WINDOW, GLASS);
  if (!cab) {
    b.box([0, 1.318, half - .049], [.388, .72, .057], 0x465257);
    b.box([0, 1.51, half - .017], [.221, .219, .022], WINDOW, GLASS);
  }

  b.box([0, 1.968, cab ? .295 : 0], [.464, .090, .433], 0x727e80);
  for (const x of [-.139, .139]) {
    b.box([x, 2.016, cab ? .295 : 0], [.127, .018, .341], 0x414b4e, FLUTED_STEEL);
  }
  b.cylinder([-.169, 1.960, -.950], [-.169, 1.960, .657], .022, 0x7d5a44);
  if (cab) collector(b);
}

function commuterDoor(b, side, z) {
  // A 1.913 m frame surrounds 1.836 m leaves after the body mapping.
  b.box([side * .571, 1.30, z], [.037, .75, .365], 0x424c51);
  for (const leaf of SIDES) {
    const at = z + leaf * .079;
    b.box([side * .584, 1.30, at], [.015, .72, .149], 0xa5afb2);
    b.box([side * .594, 1.438, at], [.010, .201, .098], WINDOW, GLASS);
  }
  b.box([side * .566, .945, z], [.047, .028, .345], 0xc0aa72);
}

function cabFace(b, half) {
  const face = half - .041;
  b.box([0, 1.50, face], [.730, .385, .025], 0x333e43);
  for (const s of SIDES) {
    b.box([s * .178, 1.511, face + .016], [.315, .288, .018], WINDOW, GLASS);
    b.bar([s * .175, 1.431, face + .028], [s * .104, 1.559, face + .028], .014, .012, INK);
    for (const [y, radius, lens] of [[1.207, .052, 0xffe2a1], [1.081, .029, 0xe96f5a]]) {
      b.cylinder([s * .276, y, face - .015], [s * .276, y, face + .018], radius + .015, IRON);
      b.cylinder([s * .276, y, face + .016], [s * .276, y, face + .030], radius, lens, 'lamp');
    }
  }
  b.box([0, 1.760, face], [.312, .078, .024], INK);
  b.box([0, 1.760, face + .014], [.235, .027, .015], 0xffba66, BRUSH, 'lamp');
  b.box([0, 1.078, face], [.247, .041, .020], SILVER);
}

function collector(b) {
  b.box([0, 1.958, -.647], [.460, .047, .481], IRON);
  for (const s of SIDES) {
    const x = s * .157;
    for (const z of [-.806, -.478]) {
      b.cylinder([x, 1.967, z], [x, 2.024, z], .049, 0xb39773, 'paint', .75);
    }
    b.bar([x, 2.014, -.813], [x, 2.093, -.478], .027, .031, RED_OXIDE);
    b.bar([x, 2.093, -.478], [x, 2.100, -.727], .023, .025, STEEL);
  }
  b.box([0, 2.100, -.730], [.484, .025, .068], INK);
}

const meshNames = {
  paint: 'Paint and glazing', metal: 'Running gear and fittings', lamp: 'Lamp lenses', coupler: 'Couplers'
};

function sculptMeshes(T, root, materials, own, sculpt) {
  const b = new CarSculpt(T);
  try {
    sculpt(b);
    for (const [finish, batch] of b.parts) {
      const geometry = own(new T.BufferGeometry());
      geometry.setAttribute('position', new T.Float32BufferAttribute(batch.positions, 3));
      geometry.setAttribute('normal', new T.Float32BufferAttribute(batch.normals, 3));
      geometry.setAttribute('color', new T.Float32BufferAttribute(batch.colours, 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(batch.uvs, 2));
      geometry.setIndex(batch.indices);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new T.Mesh(geometry, materials[finish]);
      mesh.name = meshNames[finish];
      mesh.castShadow = mesh.receiveShadow = finish !== 'lamp';
      root.add(mesh);
    }
  } finally {
    b.releasePrimitives();
  }
}

function wheelModule(b, recipe) {
  if (recipe.driver) {
    const radius = .58, y = railTopM + radius;
    wheelset(b, 0, radius, true);
    for (const side of SIDES) {
      b.wheelCover(side, y, 0, radius + .065);
      b.box([side * .50, y + .18, 0], [.16, .13, .55], INK);
      b.box([side * .62, y + .04, 0], [.065, .11, .11], BRASS, BRUSH, 'metal');
    }
    return;
  }
  // One short, two-axle truck at each route contact. Only the truck pivot is
  // supplied by the host; the +/- .43 m axles follow its local tangent.
  for (const z of [-.43, .43]) wheelset(b, z, recipe.wheelRadiusM);
  b.box([0, 1.00, 0], [1.10, .13, 1.34], INK, BRUSH, 'metal');
  b.cylinder([0, 1.00, 0], [0, recipe.deckM - .06, 0], .16, IRON);
  for (const side of SIDES) {
    b.box([side * .54, .94, 0], [.14, .16, 1.32], IRON, BRUSH, 'metal');
    for (const y of [.98, 1.025]) {
      b.box([side * .58, y, 0], [.10, .026, .62], STEEL, BRUSH, 'metal');
    }
  }
}

function template(T, id, dimensions, profile, materials, own) {
  const recipe = cars[id], {lengthM, wheelbaseM: wheelContactSpanM} = dimensions;
  const root = new T.Group();
  root.name = id;
  root.userData = {carId: id, profile: 'world', lengthM, wheelContactSpanM, metresPerUnit: 1};
  sculptMeshes(T, root, materials, own, b => {
    const [x, y] = recipe.scale;
    b.mapping = {x, y, z: 3, offsetY: recipe.deckM - .9 * y};
    recipe.sculpt(b, lengthM / 6);
    b.mapping = null;
    chassis(b, lengthM / 2, recipe, profile.couplerHeightM);
  });
  const front = new T.Group();
  front.name = 'Front wheel contact';
  front.position.z = wheelContactSpanM / 2;
  sculptMeshes(T, front, materials, own, b => wheelModule(b, recipe));
  const rear = front.clone(true);
  rear.name = 'Rear wheel contact';
  rear.position.z *= -1;
  root.add(front, rear);
  if (recipe.driver) {
    const rods = new T.Group();
    sculptMeshes(T, rods, materials, own, b => b.box([0, 0, 0], [.065, 1, .065], STEEL, BRUSH, 'metal'));
    const rod = rods.children[0];
    for (const side of SIDES) {
      for (const type of ['Coupling rod ', 'Valve rod ']) {
        const link = rod.clone();
        link.name = type + side;
        root.add(link);
      }
    }
  }
  return root;
}

function wheelContacts(T, root, recipe, lengthM) {
  const front = root.getObjectByName('Front wheel contact'), rear = root.getObjectByName('Rear wheel contact');
  const up = new T.Vector3(0, 1, 0), a = new T.Vector3(), b = new T.Vector3(), axis = new T.Vector3();
  const rods = recipe.driver ? SIDES.map(side => ({side,
    coupling: root.getObjectByName('Coupling rod ' + side), valve: root.getObjectByName('Valve rod ' + side)})) : [];
  function axle(out, group, side) {
    const offset = side * .62;
    out.set(group.position.x + Math.cos(group.rotation.y) * offset, railTopM + .58 + .04,
      group.position.z - Math.sin(group.rotation.y) * offset);
  }
  function link(mesh) {
    axis.subVectors(b, a);
    mesh.position.copy(a).lerp(b, .5);
    mesh.scale.y = axis.length();
    if (axis.lengthSq() > 0) mesh.quaternion.setFromUnitVectors(up, axis.normalize());
  }
  function updateRods() {
    for (const {side, coupling, valve} of rods) {
      axle(a, rear, side);
      axle(b, front, side);
      link(coupling);
      axle(a, front, side);
      b.set(side * .63, 1.27, lengthM / 2 - .85);
      link(valve);
    }
  }
  function valid(contact) {
    return contact && Number.isFinite(contact.x) && Number.isFinite(contact.z) &&
      Number.isFinite(contact.yaw ?? 0);
  }
  function position(group, contact) {
    group.position.set(contact.x, 0, contact.z);
    group.rotation.y = contact.yaw ?? 0;
  }
  updateRods();
  return contacts => {
    if (!contacts || !valid(contacts.front) || !valid(contacts.rear)) {
      throw new TypeError('Supply finite front/rear wheel contact x, z and optional yaw in car-local metres/radians.');
    }
    position(front, contacts.front);
    position(rear, contacts.rear);
    updateRods();
  };
}

function release(resources) {
  const errors = [];
  for (const resource of resources) {
    try { resource.dispose(); }
    catch (error) { errors.push(error); }
  }
  if (errors.length) throw new AggregateError(errors, 'Rolling stock cleanup failed.');
}

export function createRollingStockKit(THREE, {profile = 'world'} = {}) {
  const proportions = railwayStockProfile(profile);
  if (profile === 'miniature') {
    const miniature = createMiniatureStockKit(THREE);
    return {
      create(id) {
        const model = miniature.create(id);
        model.root.userData.profile = 'miniature';
        return model;
      },
      dispose() { miniature.dispose(); }
    };
  }
  const T = THREE;
  if (!T?.LatheGeometry || !T?.DataTexture || !T?.MeshStandardMaterial) {
    throw new TypeError('Supply the host Three namespace to create rolling stock.');
  }
  const shared = [], templates = new Map(), live = new Set();
  const dimensions = new Map(Object.values(proportions.stock).flatMap(stock => stock.cars.map(car => [car.id, car])));
  const own = resource => { shared.push(resource); return resource; };
  let disposed = false, materials;
  try {
    const paint = own(new T.MeshStandardMaterial({map: own(stockPaint(T)), vertexColors: true, roughness: .83}));
    const metal = own(new T.MeshStandardMaterial({vertexColors: true, roughness: .58, metalness: .21}));
    const lamp = own(new T.MeshBasicMaterial({vertexColors: true}));
    materials = {paint, metal, lamp, coupler: metal};
  } catch (error) {
    release(shared.reverse());
    throw error;
  }

  return {
    create(id) {
      if (disposed) throw new Error('Rolling stock kit is disposed.');
      if (!Object.hasOwn(cars, id)) throw new RangeError('Unknown railway car: ' + id);
      if (!templates.has(id)) {
        const newGeometry = [];
        try {
          const car = template(T, id, dimensions.get(id), proportions, materials,
            resource => { newGeometry.push(resource); return resource; });
          templates.set(id, car);
          shared.push(...newGeometry);
        } catch (error) {
          release(newGeometry.reverse());
          throw error;
        }
      }
      const root = templates.get(id).clone(true);
      const setWheelContacts = wheelContacts(T, root, cars[id], dimensions.get(id).lengthM);
      const model = {
        root,
        setWheelContacts(contacts) {
          if (!live.has(model)) throw new Error('This rolling stock model is disposed.');
          setWheelContacts(contacts);
        },
        dispose() {
          if (live.delete(model)) root.removeFromParent();
        }
      };
      live.add(model);
      return model;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      templates.clear();
      const models = [...live];
      live.clear();
      release(models.map(({root}) => ({dispose: () => root.removeFromParent()})).concat(shared.splice(0).reverse()));
    }
  };
}
