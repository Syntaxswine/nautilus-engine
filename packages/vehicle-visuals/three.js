import {roadVehicle, VEHICLE_FINISHES} from './catalogue.js';
import {sculptRoadVehicle, PAINT, RUBBER, GLASS} from './sculpt.js';
import {railwayPaint} from '../railway-visuals/paint.js';

export function roadVehiclePaint(T) {
  return railwayPaint(T, 256, (x, y) => {
    const slot = Math.floor(x * 2) + 2 * Math.floor(y * 2), u = x * 2 % 1, v = y * 2 % 1;
    const brush = 4 * Math.sin(u * 23 + v * 41) + 3 * Math.sin(u * 73 - v * 17);
    if (slot === RUBBER) {
      const tread = Math.sin(u * 54 + v * 19) * Math.sin(v * 91);
      return [141, 144, 138].map(value => value + brush + tread * 10);
    }
    if (slot === GLASS) {
      const reflection = Math.max(0, 1 - Math.abs(v - .27 - u * .43) * 9);
      return [72, 93, 103].map(value => value + reflection * 43 + v * 21 + brush);
    }
    const light = slot === PAINT ? 236 : 222;
    const wear = slot === PAINT ? 12 * v - 8 : 5 * Math.sin(v * 33);
    return [light + 3, light + 1, light - 4].map(value => value + brush + wear);
  });
}
function release(resources) {
  const errors = [];
  for (const resource of resources) {
    try { resource.dispose(); } catch (error) { errors.push(error); }
  }
  if (errors.length) throw new AggregateError(errors, 'Road vehicle cleanup failed.');
}
export function createRoadVehicleKit(THREE) {
  const T = THREE;
  if (!T?.ShapeUtils || !T?.LatheGeometry || !T?.DataTexture) {
    throw new TypeError('Supply the renderer Three namespace to create road vehicles.');
  }
  const resources = [], templates = new Map(), live = new Set(), coats = new Map();
  let disposed = false, details;
  const own = resource => { resources.push(resource); return resource; };
  try {
    const texture = own(roadVehiclePaint(T));
    details = own(new T.MeshStandardMaterial({map: texture, vertexColors: true, roughness: .92}));
    for (const finish of VEHICLE_FINISHES) coats.set(finish.id, own(new T.MeshStandardMaterial({
      color: finish.colour, map: texture, vertexColors: true, roughness: .87
    })));
  } catch (error) { release(resources.reverse()); throw error; }
  function create(id, {lod = 'game'} = {}) {
    if (disposed) throw new Error('Road vehicle kit is disposed.');
    const spec = roadVehicle(id), key = spec.form + ':' + lod;
    if (!templates.has(key)) {
      const parts = sculptRoadVehicle(T, spec.form, {lod});
      for (const geometry of parts.values()) own(geometry);
      templates.set(key, parts);
    }
    const root = new T.Group();
    root.name = spec.id;
    root.userData = {vehicleId: spec.id, form: spec.form, finish: spec.finish, metresPerUnit: 1,
      cells: [...spec.cells], lengthM: spec.lengthM, widthM: 1.97, bodyWidthM: spec.widthM, heightM: spec.heightM, lod};
    for (const [group, geometry] of templates.get(key)) {
      const mesh = new T.Mesh(geometry, group === 'body' ? coats.get(spec.finish) : details);
      mesh.name = group === 'body' ? 'Painted body' : 'Painted windows, tyres and trim';
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }
    const model = {root, dispose() { if (live.delete(model)) root.removeFromParent(); }};
    live.add(model);
    return model;
  }
  return {create, build: create, dispose() {
    if (disposed) return;
    disposed = true;
    templates.clear();
    const handles = [...live];
    live.clear();
    release(handles.map(({root}) => ({dispose: () => root.removeFromParent()})).concat(resources.splice(0).reverse()));
  }};
}