// Massive-structure workload maps for the asset-rendering benchmark's editor
// mode. The nine definitions are round 1's (docs/reviews/2026-10-29-hostile-
// review-0.8-round-1.md, census workloads w0-w7) so results stay comparable;
// round 3's five lamp-lit maps (lN-*-lamps, each with its blank lN-blank) light
// five of them with the fires its review placed. Every map is built through the
// public headless APIs and opened by
// openDocument(); a workload that cannot be built throws rather than shrinking.
//   node tools/bench/workloads.mjs [--tree <engine tree>] [--out <dir>] [--quiet]
// buildWorkloads() returns the same maps in memory (the draw-count gate reads them).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function buildWorkloads({tree = here} = {}) {
  const imp = p => import(pathToFileURL(path.join(tree, p)).href);
  const core = await imp('packages/map-core/index.js'), prefab = await imp('packages/prefab-core/index.js');

  // Rank originals by recorded game triangles and by meshes (catalogue facts).
  const T = await imp('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js');
  const {createBuildingModel} = await imp('packages/building-catalog/three.js');
  const originals = prefab.ORIGINAL_BUILDING_ASSETS.map(asset => {
    const model = createBuildingModel(T, asset.id, {atlas: new T.Texture(), lod: 'game'});
    let meshes = 0; model.root.traverse(node => {if (node.isMesh) meshes++;});
    const row = {id: asset.id, triangles: model.triangles, meshes}; model.dispose(); return row;
  });
  const byTriangles = [...originals].sort((a, b) => b.triangles - a.triangles), byMeshes = [...originals].sort((a, b) => b.meshes - a.meshes);
  const gross = prefab.GROSS_BUILDING_ASSETS.map(asset => asset.id);

  function base(name) {
    const map = core.blankMap(name);
    // Six declared layers (the maximum) so wall runs can use every layer.
    map.levels = 6; map.upper = [...map.upper, ...Array.from({length: 3}, () => structuredClone(map.upper[0]))];
    map.starts = [{x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 2}, {x: 2, y: 2}]; map.exits = [{x: 3, y: 3}];
    return map;
  }
  // Shelf packing through placeBuilding (1 m clearance, the minimum).
  function pack(name, assets, limit = 32) {
    let map = base(name), x = 6, y = 6, row = 0, placed = 0;
    for (const asset of assets) {
      if (placed === limit) break;
      for (const turns of [0, 1]) {
        const t = prefab.buildingTransform({asset, turns, x: 0, y: 0});
        if (x + t.width + 1 > 238) {x = 6; y += row + 3; row = 0;}
        if (y + t.depth + 1 > 238) break;
        try {map = prefab.placeBuilding(map, {asset, x, y, turns, clearance: 1}).map; placed++; x += t.width + 3; row = Math.max(row, t.depth); break;} catch {}
      }
    }
    if (placed < Math.min(limit, assets.length)) throw Error(name + ': placed ' + placed + ' of ' + Math.min(limit, assets.length));
    return map;
  }
  const workloads = [];
  function save(id, description, map) {
    // openDocument mints random character ids for starts; fix them so the files are reproducible.
    let n = 0; const json = core.openDocument(map).export().replace(/"char_[0-9a-f-]{36}"/g, () => '"char_bench-' + String(n++).padStart(4, '0') + '"');
    const parsed = JSON.parse(json);
    workloads.push({id, description, json, buildings: parsed.buildingPrefabs?.instances.length || 0, distinct: new Set(parsed.buildingPrefabs?.instances.map(i => i.asset) || []).size, wallRuns: parsed.wallRuns?.segments.length || 0, roofs: parsed.slopedRoofs?.roofs.length || 0, lamps: parsed.props?.length || 0});
  }

  save('w0-blank', 'Blank 240 m map: the inherited scene alone', base('Blank'));
  save('w1-32x-largest', '32 copies of the largest design (' + byTriangles[0].id + ')', pack('32 x largest design', Array(40).fill(byTriangles[0].id)));
  save('w2-32-distinct-most-meshes', '32 distinct originals with the most meshes', pack('32 distinct most meshes', byMeshes.map(d => d.id)));
  save('w3-32-distinct-most-triangles', '32 distinct originals with the most triangles', pack('32 distinct most triangles', byTriangles.map(d => d.id)));
  save('w4-32-gross', '32 Gross houses (13 designs, cycled)', pack('32 Gross houses', Array.from({length: 40}, (_, i) => gross[i % gross.length])));
  {
    const map = base('Dense axis-aligned walls'), segments = [];
    for (let i = 0; i < 100; i++) {
      const y = 10 + i * 2, a = [20, y], b = [84, y], material = ['wood', 'brick', 'concrete'][i % 3];
      segments.push({id: 'ax-' + i + '-low', a, b, z: 0, stories: 5, material}, {id: 'ax-' + i + '-top', a, b, z: 5, stories: 1, material});
    }
    map.wallRuns = {version: 1, segments};
    save('w5a-walls-axis', '200 axis-aligned 64 m runs on all six layers (38,400 full panels)', map);
  }
  {
    // Parallel 37-degree runs with fractional lengths: each run ends in a uniquely cut panel.
    const map = base('Dense free-angle walls'), segments = [], ux = Math.cos(37 * Math.PI / 180), uy = Math.sin(37 * Math.PI / 180);
    let panels = 0, i = 0;
    for (let row = 0; row < 60 && segments.length < 4000; row++) for (let col = 0; col < 40 && segments.length < 4000; col++) {
      const len = 3 + ((row * 40 + col) * 0.6180339887) % 6, x0 = 10 + col * 5.5 + row * 0.07, y0 = 6 + row * 3.7;
      const a = [Math.round(x0 * 1e6) / 1e6, Math.round(y0 * 1e6) / 1e6], b = [Math.round((x0 + ux * len) * 1e6) / 1e6, Math.round((y0 + uy * len) * 1e6) / 1e6];
      if (b[0] > 238 || b[1] > 238) continue;
      const z = i % 6, stories = Math.min(6 - z, 1 + (i % 3)); i++;
      const add = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])) * stories;
      if (panels + add > 50000) continue;
      panels += add; segments.push({id: 'fa-' + row + '-' + col, a, b, z, stories, material: ['wood', 'brick', 'concrete'][(row + col) % 3]});
    }
    map.wallRuns = {version: 1, segments};
    save('w5b-walls-free-angle', segments.length + ' free-angle runs on all six layers (' + panels + ' panels)', map);
  }
  {
    const map = base('Many sloped roofs'), roofs = [];
    for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) roofs.push({id: 'roof-' + (r * 12 + c), x: 8 + c * 18, y: 8 + r * 18, width: 12, depth: 8, z: 1, style: ['gable', 'hip', 'shed'][(r + c) % 3], axis: 'x', pitch: 35, overhang: 0.3, material: ['slate', 'clay', 'metal'][(r * 12 + c) % 3], seed: 7, ...((r + c) % 3 === 2 ? {direction: 1} : {})});
    map.slopedRoofs = {version: 1, roofs};
    save('w6-roofs-144', '144 procedural sloped roofs (12 x 12)', map);
  }
  save('w7-mixed-13-gross-19-largest', 'All 13 Gross designs plus the 19 largest originals', pack('Mixed massive', [...byTriangles.slice(0, 19).map(d => d.id), ...gross]));
  // Round 4's threshold map: Gross designs placed eight side by side, the smallest cluster
  // of neighbours the editor batches (apps/editor/prefab-scene.js BATCHED); a shelf row's end
  // splits some, which then draw per copy.
  save('w8-gross-rows-of-8', '32 Gross houses placed eight of a design side by side', pack('Gross rows of eight', Array.from({length: 40}, (_, i) => gross[Math.floor(i / 8) % gross.length])));
  // Lamp-lit districts (round 3's MF-B and its maps): six always-lit fires, each a point
  // light with shadows (six cube faces, 30 m range), on the free tiles nearest six points
  // in the district's lanes (outside every lot and its clearance, plus one tile). Each
  // lamp-lit map has the blank map with the same lamps beside it (lN-blank): its null
  // control and isolation reference (the benchmark pairs a map with the blank map whose
  // props it shares).
  const blankMap = JSON.parse(workloads.find(w => w.id === 'w0-blank').json), blanksByLamps = new Map(), placed = new Map();
  const lane = y => [23, 61, 99, 137, 175, 213].map(x => [x, y]), fire = i => i % 2 ? 'standing-torch' : 'campfire';
  function placeLamps(id, map, points, kindOf, extra = {}) {
    const taken = new Set(), lamps = [];
    for (const instance of map.buildingPrefabs?.instances || []) {
      const t = prefab.buildingTransform(instance), c = (instance.clearance ?? 1) + 1;
      for (let x = instance.x - c; x < instance.x + t.width + c; x++) for (let y = instance.y - c; y < instance.y + t.depth + c; y++) taken.add(x + ',' + y);
    }
    for (const [i, [tx, ty]] of points.entries()) {
      let lamp = null;
      for (let r = 0; r < 30 && !lamp; r++) for (let dx = -r; dx <= r && !lamp; dx++) for (let dy = -r; dy <= r && !lamp; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || taken.has((tx + dx) + ',' + (ty + dy))) continue;
        const trial = {kind: kindOf(i), x: tx + dx, y: ty + dy, z: 0, ...extra};
        try {core.openDocument({...map, props: [...(map.props || []), ...lamps, trial]}); lamp = trial;} catch {}
      }
      if (!lamp) throw Error(id + ': no free tile near ' + tx + ',' + ty);
      lamps.push(lamp);
    }
    return lamps;
  }
  // A lamp-lit map and, unless one already has its lamps (and start time), its blank.
  function light(source, map, lampId, blankId, description, lamps, time = null) {
    const lit = m => ({...m, props: [...(m.props || []), ...structuredClone(lamps)], ...(time ? {time} : {})}), key = JSON.stringify([lamps, time]);
    save(lampId, source.description + ', ' + description, lit(map)); placed.set(lampId, lit(map).props);
    // Maps without lots get the same lamps (on the points themselves): one blank serves them.
    if (!blanksByLamps.has(key)) {blanksByLamps.set(key, blankId); save(blankId, 'The blank map with the lamps of ' + lampId, lit(blankMap)); placed.set(blankId, lit(blankMap).props);}
  }
  for (const id of ['w1-32x-largest', 'w4-32-gross', 'w5b-walls-free-angle', 'w6-roofs-144', 'w7-mixed-13-gross-19-largest', 'w8-gross-rows-of-8']) {
    const source = workloads.find(w => w.id === id), map = JSON.parse(source.json), n = id.split('-')[0].slice(1);
    light(source, map, 'l' + id.slice(1) + '-lamps', 'l' + n + '-blank', 'lit by six fires', placeLamps(id, map, lane(30), fire));
  }
  // Round 4's lamps among the Gross houses (its N6, built as its review built them): 18
  // fires in three lanes; 12 electric lamps (streetlights and floor lamps) at 22:00; six
  // spot lights switched on. Each has its own blank.
  {
    const source = workloads.find(w => w.id === 'w4-32-gross'), map = JSON.parse(source.json);
    light(source, map, 'l4x-32-gross-18-fires', 'l4x-blank', 'lit by 18 fires', placeLamps('l4x', map, [...lane(4), ...lane(18), ...lane(32)], fire));
    light(source, map, 'l4n-32-gross-12-night-lamps', 'l4n-blank', 'lit by 12 electric lamps at 22:00', placeLamps('l4n', map, [...lane(4), ...lane(32)], i => i % 2 ? 'floor-lamp' : 'streetlight'), {startMinutes: 22 * 60});
    light(source, map, 'l4s-32-gross-6-spotlights', 'l4s-blank', 'lit by six spot lights', placeLamps('l4s', map, lane(32), () => 'spotlight', {lightMode: 'on'}));
  }
  const kinds = props => JSON.stringify((props || []).map(p => p.kind).sort());
  for (const [id, props] of placed) if (kinds(JSON.parse(workloads.find(w => w.id === id).json).props) !== kinds(props)) throw Error(id + ': the lamps did not survive openDocument');
  return workloads;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), option = (name, fallback) => {const i = args.indexOf('--' + name); return i < 0 ? fallback : args[i + 1];};
  const outDir = path.resolve(option('out', path.join(here, 'artifacts/bench/maps')));
  const workloads = await buildWorkloads({tree: path.resolve(option('tree', here))});
  fs.mkdirSync(outDir, {recursive: true});
  for (const workload of workloads) fs.writeFileSync(path.join(outDir, workload.id + '.json'), workload.json);
  if (!args.includes('--quiet')) console.log(JSON.stringify(workloads.map(({json, ...row}) => row), null, 1));
  else console.log('Wrote ' + workloads.length + ' workload maps to ' + path.relative(here, outDir) + '.');
}
