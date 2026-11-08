import {cityProp, cityPropURLs} from './index.js';
import {Sculpt} from './sculpt.js';
import {FURNITURE} from './furniture.js';
import {SHOP_FIXTURES} from './shops.js';
import {OIL_LIGHTS} from './lamps.js';

export const CITY_PAINT_URL = cityPropURLs('city1880-side-chair').atlas;
const forms = {...FURNITURE, ...SHOP_FIXTURES, ...OIL_LIGHTS};
export function sculptCityProp(THREE, id, detail = 'map') {
  if (!['map', 'sculpt'].includes(detail)) throw new RangeError('Unknown city prop mesh density: ' + detail);
  const prop = cityProp(id), sculpt = new Sculpt(THREE, detail);
  forms[prop.form](sculpt, prop.lit);
  return sculpt.geometry();
}

export function createCityPropLibrary(THREE, atlas) {
  if (!atlas?.isTexture) throw new TypeError('Load the city paint atlas before creating models.');
  const glass = (color, opacity) => new THREE.MeshStandardMaterial({
    color, opacity, transparent: true, depthWrite: false, roughness: .25, side: THREE.DoubleSide
  });
  const materials = {
    paint: new THREE.MeshStandardMaterial({map: atlas, vertexColors: true, roughness: .75}),
    glass: glass(0xb6c9bb, .27),
    amber: glass(0xf1c475, .28),
    mirror: new THREE.MeshStandardMaterial({color: 0x8b9c9e, metalness: .38, roughness: .26}),
    flame: new THREE.MeshBasicMaterial({color: 0xffbf55, toneMapped: false})
  };
  const templates = new Map();
  let disposed = false;
  return Object.freeze({
    build(id) {
      if (disposed) throw new Error('City prop library is disposed.');
      if (!templates.has(id)) templates.set(id, sculptCityProp(THREE, id));
      const root = new THREE.Group();
      root.name = cityProp(id).name;
      for (const [finish, geometry] of templates.get(id)) {
        const mesh = new THREE.Mesh(geometry, materials[finish]);
        mesh.name = finish;
        mesh.castShadow = finish === 'paint';
        mesh.receiveShadow = finish === 'paint';
        root.add(mesh);
      }
      // Individual placements borrow immutable geometry, materials and the shared atlas.
      return {root, dispose() { root.removeFromParent(); root.clear(); }};
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const parts of templates.values()) for (const geometry of parts.values()) geometry.dispose();
      for (const material of Object.values(materials)) material.dispose();
      templates.clear();
    }
  });
}
