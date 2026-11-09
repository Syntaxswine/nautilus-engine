// Builds a portable Workshop export using the public document entry.
export function doorPlaytestDocument(createMapDocument, axis = 'e') {
  const document = createMapDocument('Farmyard door playtest');
  const map = structuredClone(document.map);
  const positions = [[20, 25], [19, 25], [19, 26], [21, 25]];
  for (const [i, start] of map.starts.entries()) {
    [start.x, start.y] = positions[i];
    start.character.id = 'char_playtest_' + i;
  }
  map.starts[0].heading = 270;
  map.exits[0] = {x: 20, y: 26, z: 0};
  map.edges[axis + ':20:25'] = axis === 'e' ? 'door-wood-closed' : 'door-steel-closed';
  document.replace(map);
  return document;
}
