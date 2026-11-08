// Public catalogue. Models face local +Z, with the anchor at the floor of the reserved cells.
const row = (id, name, family, cells, form, options = {}) => {
  const {solid = true, mounting = 'floor', lit = false, light = null, note = ''} = options;
  return Object.freeze({
    id: 'city1880-' + id, name, family, cells: Object.freeze(cells), form, solid, mounting, lit,
    light: light ? Object.freeze(light) : null, note
  });
};
const furniture = (id, name, cells) => row(id, name, 'Eastlake furniture', cells, id);
const shop = (id, name, form, note) => row(id, name, 'Shop fixtures', [1, 1], form, {note});
const lamp = (id, name, mounting, light, note, solid = false) =>
  [true, false].map(lit => row(id + (lit ? '-lit' : '-unlit'), name + (lit ? ' · lit' : ' · unlit'),
    'Oil lighting', [1, 1], id, {mounting, lit, light, note, solid}));

export const CITY_PROP_CONTRACT = Object.freeze({version: 1, metresPerUnit: 1, style: 'North American city, circa 1885'});
export const CITY_PROPS = Object.freeze([
  furniture('side-chair', 'Eastlake side chair', [1, 1]),
  furniture('armchair', 'Eastlake armchair', [1, 1]),
  furniture('rocker', 'Eastlake rocker', [1, 1]),
  furniture('settee', 'Eastlake settee', [2, 1]),
  furniture('dining-table', 'Eastlake dining table', [2, 1]),
  furniture('pedestal-table', 'Eastlake pedestal table', [1, 1]),
  furniture('washstand', 'Eastlake marble washstand', [1, 1]),
  furniture('dresser', 'Eastlake mirror dresser', [1, 1]),
  furniture('bedstead', 'Eastlake double bedstead', [2, 2]),
  shop('counter', 'Paneled sales counter', 'counter', 'Align side by side with counter bays and the glass case.'),
  shop('corner-counter', 'Paneled counter corner', 'corner-counter', 'Joins a counter run at a right angle. Turn to face the customer aisle.'),
  shop('glass-case', 'Glazed display counter', 'glass-case', 'Shares the sales counter bay width and alignment.'),
  shop('shelf-empty', 'Open shop shelving · empty', 'shelf-empty', 'Place back to the wall. Joins other shop shelving bays.'),
  shop('shelf-stocked', 'Open shop shelving · stocked', 'shelf-stocked', 'Matches the empty shelf and drawer bay.'),
  shop('apothecary', 'Apothecary drawer and bottle bay', 'apothecary', 'Label slots, brass pulls and a tier of medicine bottles.'),
  shop('dry-bin', 'Sloped dry goods bins', 'dry-bin', 'Three open bins, including an empty compartment.'),
  shop('bolt-rack', 'Draper’s fabric bolt rack', 'bolt-rack', 'Varied cloth bolts on an open oak stand.'),
  shop('scale-counter', 'Sales counter with balance scale', 'scale-counter', 'A paneled bay with a brass scale and iron weights.'),
  ...lamp('table-lamp', 'Kerosene lamp on parlor stand', 'floor', [0, 1.009, 0], 'Freestanding lamp and pedestal share one tile.', true),
  ...lamp('reflector-sconce', 'Kerosene wall lamp with reflector', 'wall', [0, 1.47, -.299], 'Align the rear plate to a wall edge.'),
  ...lamp('shop-pendant', 'Hanging kerosene shop lamp', 'ceiling', [0, 1.736, 0], 'The canopy meets the 2.12 m story ceiling.'),
  ...lamp('hand-lantern', 'Kerosene hand lantern', 'floor', [0, .138, 0], 'Portable lantern with a hinged-loop silhouette.'),
  ...lamp('entry-lantern', 'Kerosene entry lantern', 'wall', [0, 1.559, -.268], 'Align the rear plate to a storefront or courtyard wall.')
]);

const byId = new Map(CITY_PROPS.map(prop => [prop.id, prop]));
export function cityProp(id) {
  const prop = byId.get(id);
  if (!prop) throw new RangeError('Unknown 1880s city prop: ' + id);
  return prop;
}

export const CITY_PROP_ATLAS = 'assets/city-props/painted-city-materials-v1.png';
export function cityPropURLs(id) {
  const prop = cityProp(id);
  const root = new URL('../../assets/city-props/', import.meta.url);
  return Object.freeze({
    model: new URL('models/' + prop.id + '.gltf', root).href,
    buffer: new URL('models/' + prop.id + '.bin', root).href,
    atlas: new URL('painted-city-materials-v1.png', root).href
  });
}

// The built Map Workshop uses the same prop keys, grid dimensions and quarter turns as its stock scenery.
export const CITY_SCENERY = Object.freeze(Object.fromEntries(CITY_PROPS.map(prop => {
  const [w, h] = prop.cells;
  return [prop.id, Object.freeze({
    w, h, origin: Object.freeze([(w - 1) / 2, (h - 1) / 2]),
    facing: Object.freeze([0, 1]), name: prop.name, model: 'city1880', form: prop.id,
    solid: prop.solid, cover: 0
  })];
})));
