import {RAIL_TRACK_ASSETS, RAIL_TRACK_PROFILE} from './catalogue.js';
import {ballastPaint, tiePaint} from './paint.js';
import {assertRailwaySeparation, planRailwayRoute, planRailwayCircuit, planRailwayTurnout, railwayStationAt, RAILWAY_RADIUS_M} from './route.js';

const {ballastRiseM, ballastWidthM, railCentresM, tieIntervalM} = RAIL_TRACK_PROFILE;
const halfBed = ballastWidthM / 2;
const shoulderStart = .56;
const tieHeight = .106;
const tieTop = .324;
const tieWidth = 1.44;
const tieDepth = .20;
const EPS = 1e-8;
const turnoutCrossingM = radius => radius * Math.acos((radius - railCentresM / 2) / (radius + railCentresM / 2));

function station(piece, t) {
  if (piece.radiusM === null) return {x: 0, z: piece.lengthM * t, c: 1, s: 0, angle: 0, t};
  const angle = Math.PI / 2 * t;
  const c = t === 1 ? 0 : Math.cos(angle), s = t === 1 ? 1 : Math.sin(angle);
  const radius = piece.radiusM;
  return {x: radius * (1 - c), z: radius * s, c, s, angle, t};
}

function ballastSection() {
  const offsets = [-halfBed, -.95, -.88, -.80, -.72, -.64, -shoulderStart,
    shoulderStart, .64, .72, .80, .88, .95, halfBed];
  return offsets.map(u => {
    const v = Math.max(0, Math.abs(u) - shoulderStart) / (halfBed - shoulderStart);
    const h = ballastRiseM * (1 - v * v * (3 - 2 * v));
    const slope = -6 * ballastRiseM * v * (1 - v) / (halfBed - shoulderStart) * Math.sign(u);
    const length = Math.hypot(slope, 1);
    return {u, h, normal: [-slope / length, 1 / length]};
  });
}

const RAIL_PROFILE = [
  [-.066, .322], [-.066, .334], [-.021, .347], [-.018, .394],
  [-.044, .403], [-.044, .42], [-.034, .43], [.034, .43],
  [.044, .42], [.044, .403], [.018, .394], [.021, .347],
  [.066, .334], [.066, .322]
];

// Sweep closed clockwise sections. The end rings use exact stations, with the
// same section and analytic normals on a straight and either end of a curve.
function sweep(T, stations, profile, repeats, colourAt, profileCentre = 0) {
  const positions = [], normals = [], uvs = [], indices = [], colours = [];
  const size = profile.length;
  function vertex(site, point, normal, end, colour) {
    const index = positions.length / 3;
    const u = profileCentre + (point.u - profileCentre) * (site.taper ?? 1);
    positions.push(site.x + site.c * u, point.h, site.z - site.s * u);
    normals.push(...normal);
    uvs.push((point.u + halfBed) * 2, end ? point.h * 2 : site.t * repeats);
    if (colour) colours.push(colour.r, colour.g, colour.b);
    return index;
  }

  for (let edge = 0; edge < size; edge++) {
    const a = profile[edge], b = profile[(edge + 1) % size];
    const du = b.u - a.u, dh = b.h - a.h, length = Math.hypot(du, dh);
    const flat = [-dh / length, du / length];
    const colour = colourAt?.(Math.min(a.h, b.h), false);
    const first = positions.length / 3;
    const surface = edge < size - 1;
    for (const site of stations) {
      for (const p of [a, b]) {
        const [nx, ny] = surface && p.normal ? p.normal : flat;
        vertex(site, p, [site.c * nx, ny, -site.s * nx], false, colour);
      }
    }
    for (let step = 1; step < stations.length; step++) {
      const i = first + 2 * (step - 1);
      indices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
    }
  }

  const outline = profile.map(({u, h}) => new T.Vector2(u, h));
  const capFaces = T.ShapeUtils.triangulateShape(outline, []);
  const capColour = colourAt?.(0, true);
  for (const [site, direction] of [[stations[0], -1], [stations.at(-1), 1]]) {
    const normal = [site.s * direction, 0, site.c * direction];
    const ids = profile.map(point => vertex(site, point, normal, true, capColour));
    for (const [i, j, k] of capFaces) {
      const a = profile[i], b = profile[j], c = profile[k];
      const cross = (b.u - a.u) * (c.h - a.h) - (b.h - a.h) * (c.u - a.u);
      indices.push(ids[i], ...(cross * direction > 0 ? [ids[j], ids[k]] : [ids[k], ids[j]]));
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  if (colourAt) geo.setAttribute('color', new T.Float32BufferAttribute(colours, 3));
  geo.setIndex(indices);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function turnoutDistance(site, turnout, axis) {
  return (site.x - turnout.throat[0]) * axis[0] + (site.z - turnout.throat[1]) * axis[1];
}

function timberExtension(site, turnout) {
  if (site.distanceM < turnout.mainStartM || site.distanceM > turnout.mainEndM) return 0;
  const along = turnoutDistance(site, turnout, turnout.incoming);
  if (along <= 0) return 0;
  if(turnout.plan.geometryProfile==='surveyed-v1'){
    const arc=turnout.plan.spans[0],radius=arc.radiusM,angle=Math.abs(arc.turn),endAlong=radius*Math.sin(angle),across=along<=endAlong?radius-Math.sqrt(Math.max(0,radius**2-along**2)):radius*(1-Math.cos(angle))+(along-endAlong)*Math.tan(angle),offset=across-turnoutDistance(site,turnout,turnout.outward);return offset<=1.4?Math.max(0,offset):Math.max(0,1.4-(offset-1.4)*3);
  }
  const radius = turnout.plan.radiusM, arcEnd = radius * Math.SQRT1_2;
  const offset = along <= arcEnd ? radius - Math.sqrt(radius ** 2 - along ** 2)
    : radius - arcEnd + along - arcEnd;
  return offset <= 1.4 ? offset : Math.max(0, 1.4 - (offset - 1.4) * 3);
}

function bladeStations(plan, from, to) {
  const between = plan.stations.filter(site => site.distanceM > from + 1e-8 && site.distanceM < to - 1e-8);
  return [railwayStationAt(plan, from), ...between, railwayStationAt(plan, to)].map(site => ({
    ...site, t: site.distanceM / plan.lengthM, taper: Math.max(.06, Math.min(1, (site.distanceM - .35) / .95))
  }));
}

function trackSections(stations, sample, lengthM, windows, keepWindows = false) {
  if (!windows.length) return [{sites: stations, inside: false}];
  const sections = [];
  function append(from, to, inside) {
    if (to - from <= EPS) return;
    const between = stations.filter(site => site.distanceM > from + EPS && site.distanceM < to - EPS);
    sections.push({sites: [sample(from / lengthM), ...between, sample(to / lengthM)], inside});
  }
  let from = 0;
  for (const {start, end} of windows) {
    append(from, start, false);
    if (keepWindows) append(start, end, true);
    from = end;
  }
  append(from, lengthM, false);
  return sections;
}

function diamondRailSites({point, track, other}, side) {
  const [dx, dz] = track.heading, [ox, oz] = other.heading;
  const sin = dx * oz - dz * ox;
  const offset = side * railCentresM / 2;
  const x = point[0] + dz * offset, z = point[1] - dx * offset;
  return [-1, 1].map(peerSide => {
    const peerOffset = peerSide * railCentresM / 2;
    const deltaX = oz * peerOffset - dz * offset, deltaZ = -ox * peerOffset + dx * offset;
    const along = (deltaX * oz - deltaZ * ox) / sin;
    const atM = track.stationM + along, gap = .080 / Math.abs(sin);
    return {start: atM - gap, end: atM + gap, x: x + dx * along, z: z + dz * along};
  });
}

function overlapsDiamondTies(site, {track, other, angleDeg}) {
  const [dx, dz] = track.heading, [ox, oz] = other.heading;
  const sine = Math.abs(dx * oz - dz * ox);
  const cosine = angleDeg === 90 ? 0 : Math.SQRT1_2;
  const sharedM = tieWidth * (1 + cosine) / (2 * sine) + tieDepth / 2;
  return Math.abs(site.distanceM - track.stationM) < sharedM;
}

function trackMesh(T, {id, lengthM, stations, sample, gravelRepeats, turnout, branch, crossings = []}, materials, fixtures, own) {
  const crossingM = turnout && (turnout.fittings?.crossingM??turnoutCrossingM(turnout.plan.radiusM));
  const root = new T.Group();
  root.name = id;
  root.userData = {assetId: id, profile: RAIL_TRACK_PROFILE.id, metresPerUnit: 1};
  const secondary = crossings.filter(crossing => !crossing.primary);
  const ballastWindows = secondary.map(({track, clearanceM}) => ({
    start: track.stationM - clearanceM, end: track.stationM + clearanceM
  }));
  // The second bed only takes depth priority at the crossing, so the flat
  // crowns don't flicker where they overlap.
  for (const {sites, inside} of trackSections(stations, sample, lengthM, ballastWindows, true)) {
    const bed = new T.Mesh(own(sweep(T, sites, ballastSection(), gravelRepeats)),
      branch || inside ? materials.branchGravel : materials.gravel);
    bed.name = 'Rounded gravel ballast';
    root.add(bed);
  }

  const iron = new T.Color(0x69483a), polished = new T.Color(0xaebdc4), head = new T.Color(0x7f888c);
  const railColour = (height, cap) => !cap && height >= .42 ? polished : height >= .40 ? head : iron;
  for (const side of [-1, 1]) {
    const centre = side * railCentresM / 2;
    const profile = RAIL_PROFILE.map(([u, h]) => ({u: u + centre, h}));
    const diamonds = crossings.flatMap(crossing => diamondRailSites(crossing, side)).sort((a, b) => a.start - b.start);
    // Both blades start inside the existing rail heads. A relief in the
    // inside blade leaves room where it meets the straight stock rail.
    const strips = branch ? (side === turnout.side
      ? [[.35, crossingM - .19], [crossingM + .19, lengthM]]
      : [[.35, lengthM]]).map(([from, to]) => bladeStations(turnout.plan, from, to))
      : trackSections(stations, sample, lengthM, diamonds).map(({sites}) => sites);
    for (const strip of strips) {
      const rail = new T.Mesh(own(sweep(T, strip, profile, 1, railColour, centre)),
        branch ? materials.branchRail : materials.rail);
      rail.name = side < 0 ? 'Left steel rail' : 'Right steel rail';
      root.add(rail);
    }
    for (const crossing of crossings) if (crossing.primary) {
      for (const {x, z} of diamondRailSites(crossing, side)) {
        const frog = new T.Mesh(fixtures.plate, materials.plate);
        frog.name = 'Diamond crossing frog';
        frog.position.set(x, tieTop + .008, z);
        frog.rotation.y = Math.atan2(crossing.track.heading[0], crossing.track.heading[1]);
        frog.scale.set(1.65, 1, 1.8);
        root.add(frog);
      }
    }
  }

  const count = Math.round(lengthM / tieIntervalM);
  const tieSites = Array.from({length: count}, (_, i) => sample((i + .5) / count))
    .filter(site => (!branch || turnoutDistance(site, turnout, turnout.outward) > 1.4) &&
      !secondary.some(crossing => overlapsDiamondTies(site, crossing)));
  const ties = own(new T.InstancedMesh(fixtures.tie, materials.timber, tieSites.length));
  const plates = own(new T.InstancedMesh(fixtures.plate, materials.plate, 2 * tieSites.length));
  const tint = new T.Color();
  const transform = new T.Object3D();
  for (const [i, site] of tieSites.entries()) {
    transform.rotation.y = site.angle;
    const extension = turnout && !branch ? timberExtension(site, turnout) : 0;
    const [ox, oz] = turnout?.outward ?? [0, 0];
    transform.scale.x = 1 + extension / tieWidth;
    transform.position.set(site.x + ox * extension / 2, tieTop - tieHeight / 2, site.z + oz * extension / 2);
    transform.updateMatrix();
    ties.setMatrixAt(i, transform.matrix);
    tint.setScalar(.72 + .28 * ((i * 13 + 5) % 17) / 16);
    ties.setColorAt(i, tint);
    transform.scale.x = 1;
    for (const [j, side] of [-1, 1].entries()) {
      const u = side * railCentresM / 2;
      transform.position.set(site.x + site.c * u, tieTop + .003, site.z - site.s * u);
      transform.updateMatrix();
      plates.setMatrixAt(2 * i + j, transform.matrix);
    }
  }
  ties.name = 'Timber ties';
  plates.name = 'Rail tie plates';
  root.add(ties, plates);
  if (branch) {
    const crossing = railwayStationAt(turnout.plan, crossingM), u = turnout.side * railCentresM / 2;
    const frog = new T.Mesh(fixtures.plate, materials.plate);
    frog.name = 'Turnout crossing plate';
    frog.position.set(turnout.fittings?.point[0]??crossing.x + crossing.c * u, tieTop + .003,turnout.fittings?.point[1]?? crossing.z - crossing.s * u);
    frog.rotation.y = crossing.angle;
    frog.scale.set(2, 1, 2.8);
    root.add(frog);
  }
  for (const mesh of root.children) mesh.castShadow = mesh.receiveShadow = true;
  return root;
}

function trackTemplate(T, piece, materials, fixtures, own) {
  const divisions = piece.radiusM === null ? 1 : 32;
  const sample = t => station(piece, t);
  const stations = Array.from({length: divisions + 1}, (_, i) => sample(i / divisions));
  return trackMesh(T, {id: piece.id, lengthM: piece.lengthM, stations, sample,
    gravelRepeats: Math.round(2 * piece.lengthM)}, materials, fixtures, own);
}

function retire(actions) {
  const errors = [];
  for (const action of actions) {
    try { action(); }
    catch (error) { errors.push(error); }
  }
  if (errors.length) throw new AggregateError(errors, 'Railway resources retired with cleanup errors.');
}

function overlayMaterial(base) {
  const material = base.clone();
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -1;
  return material;
}

export function createRailwayKit(T) {
  if (!T?.InstancedMesh || !T?.DataTexture || !T?.ShapeUtils || !T?.MeshStandardMaterial) {
    throw new TypeError('Supply the host Three namespace to create a railway kit.');
  }
  const resources = [], templates = new Map(), active = new Set();
  let disposed = false, materials, fixtures;
  const own = resource => { resources.push(resource); return resource; };
  try {
    materials = {
      gravel: own(new T.MeshStandardMaterial({map: own(ballastPaint(T)), roughness: 1})),
      timber: own(new T.MeshStandardMaterial({map: own(tiePaint(T)), roughness: .92})),
      rail: own(new T.MeshStandardMaterial({vertexColors: true, roughness: .49, metalness: .26})),
      plate: own(new T.MeshStandardMaterial({color: 0x3a312a, roughness: .78, metalness: .2}))
    };
    fixtures = {
      tie: own(new T.BoxGeometry(tieWidth, tieHeight, tieDepth)),
      plate: own(new T.BoxGeometry(.175, .022, .155))
    };
    for (const piece of RAIL_TRACK_ASSETS) templates.set(piece.id, trackTemplate(T, piece, materials, fixtures, own));
  } catch (error) {
    retire([...resources.reverse().map(resource => () => resource.dispose()), () => { throw error; }]);
  }

  function retain(root, owned) {
    const model = {
      root,
      dispose() {
        if (!active.delete(model)) return;
        retire([() => root.removeFromParent(), ...owned.map(resource => () => resource.dispose())]);
      }
    };
    active.add(model);
    return model;
  }

  return {
    create(id) {
      if (disposed) throw new Error('Railway kit is disposed.');
      if (!templates.has(id)) throw new RangeError('Unknown railway piece: ' + id);
      const root = templates.get(id).clone(true);
      return retain(root, root.children.filter(child => child.isInstancedMesh));
    },
    createCircuit(waypoints, radiusM = RAILWAY_RADIUS_M) {
      return this.createRoute(waypoints, undefined, [], radiusM, true);
    },
    createRoute(waypoints, split, crossings = [], radiusM = RAILWAY_RADIUS_M, circuit = false, geometryProfile='grid-v1') {
      if (disposed) throw new Error('Railway kit is disposed.');
      const plan = circuit ? planRailwayCircuit(waypoints, radiusM) : planRailwayRoute(waypoints, radiusM,geometryProfile), owned = [];
      if (circuit && (split !== undefined || crossings.length)) throw Error('This circuit profile has no turnouts or crossings.');
      const turnout = split === undefined ? null : planRailwayTurnout(plan, split);
      if (turnout) assertRailwaySeparation([{id: 'route', plan, turnout}]);
      function track(id, path, branch = false) {
        const {lengthM} = path;
        return trackMesh(T, {id, lengthM,
          stations: path.stations.map(site => ({...site, t: site.distanceM / lengthM})),
          sample: t => ({...railwayStationAt(path, t * lengthM), t}),
          gravelRepeats: 2 * lengthM, turnout, branch, crossings: branch ? [] : crossings
        }, materials, fixtures, resource => { owned.push(resource); return resource; });
      }
      try {
        if (turnout || crossings.some(crossing => !crossing.primary)) {
          materials.branchGravel ??= own(overlayMaterial(materials.gravel));
        }
        const root = track('railway:route', plan);
        if (turnout) {
          materials.branchRail ??= own(overlayMaterial(materials.rail));
          root.add(track('railway:branch', turnout.plan, true));
        }
        return retain(root, owned);
      } catch (error) {
        retire([...owned.reverse().map(resource => () => resource.dispose()), () => { throw error; }]);
      }
    },
    createPath(plan,{ballast=true,turnout=null,branch=false}={}){
      if(disposed)throw Error('Railway kit is disposed.');
      if(!plan||!Number.isFinite(plan.lengthM)||plan.lengthM<=0||plan.lengthM>480||!Array.isArray(plan.stations)||plan.stations.length>4096||!Array.isArray(plan.spans)||plan.spans.length>95)throw Error('Supply a bounded authoritative railway plan.');
      if(branch&&!turnout)throw Error('A branch path needs its authoritative turnout.');if(branch){materials.branchGravel??=own(overlayMaterial(materials.gravel));materials.branchRail??=own(overlayMaterial(materials.rail));}
      const owned=[];try{const root=trackMesh(T,{id:'railway:measured-path',lengthM:plan.lengthM,stations:plan.stations.map(site=>({...site,t:site.distanceM/plan.lengthM})),sample:t=>({...railwayStationAt(plan,t*plan.lengthM),t}),gravelRepeats:2*plan.lengthM,turnout,branch,crossings:[]},materials,fixtures,r=>{owned.push(r);return r;});if(!ballast)root.traverse(o=>{if(o.isMesh&&(o.material===materials.gravel||o.material===materials.branchGravel))o.visible=false;});return retain(root,owned);}catch(error){for(const r of owned.reverse())r.dispose();throw error;}
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      templates.clear();
      retire([...active].map(model => () => model.dispose()).concat(
        resources.splice(0).reverse().map(resource => () => resource.dispose())));
    }
  };
}
