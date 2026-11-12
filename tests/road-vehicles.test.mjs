import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../packages/render-effects/three.js';
import {VEHICLE_GRID, VEHICLE_BODIES, ROAD_VEHICLES, ROAD_VEHICLE_ASSETS, ROAD_VEHICLE_SCENERY, roadVehicle}
  from '../packages/vehicle-visuals/catalogue.js';
import {createRoadVehicleKit} from '../packages/vehicle-visuals/three.js';
import {editorAssets} from '../apps/editor/asset-catalog.js';
import {sharedAsset} from '../packages/assets/index.js';
import {roadVehicleSceneryCopy, roadVehicleImportMap} from '../tools/editor-road-vehicles.mjs';
import {MeshoptSimplifier} from '../vendor/meshoptimizer/7b2d4f4c817aea55d74dcd65d9763ac2ca608026/meshopt_simplifier.module.js';
import {authenticatedRoadVehicleImages} from '../tools/road-vehicle-registration.mjs';
import {distribution} from '../tools/distribution.mjs';

const near = (a, b, tolerance = 2e-6) => assert.ok(Math.abs(a - b) <= tolerance, a + ' vs ' + b);
const triangles = root => root.children.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0);

test('renderer packages include only the nine explicitly authenticated vehicle images',()=>{
  const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url));
  for(const profile of ['renderer','compatibility','core','assets']){
    const images=authenticatedRoadVehicleImages(profile,{read});
    assert.equal(images.length,profile==='renderer'||profile==='compatibility'?9:0);
    assert.deepEqual(distribution(profile).files.filter(f=>f.startsWith('packages/vehicle-visuals/skins/')).sort(),[...images].sort());
    for(const file of images){const png=read(file);assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],file.endsWith('running-gear.png')?[1024,1024]:[2048,2048]);}
  }
  assert.throws(()=>authenticatedRoadVehicleImages('renderer',{read:file=>Buffer.concat([read(file),Buffer.from([0])])}),/Unreviewed road vehicle skin/);
});

test('all 24 vehicle skins retain the 1 m tile scale and 2.12 m height reference', () => {
  assert.deepEqual(VEHICLE_GRID, {tileM: 1, storyM: 2.12});
  assert.equal(VEHICLE_BODIES.length, 8);
  assert.equal(ROAD_VEHICLES.length, 24);
  assert.equal(new Set(ROAD_VEHICLES.map(row => row.id)).size, 24);
  const kit = createRoadVehicleKit(T);
  try {
    for (const row of ROAD_VEHICLES) {
      const model = kit.create(row.id), box = new T.Box3().setFromObject(model.root);
      assert.equal(model.root.children.length, 2);
      near(box.min.y, 0);
      assert.ok(box.max.y <= VEHICLE_GRID.storyM + 1e-6);
      assert.ok(box.min.x >= -row.cells[0] / 2 && box.max.x <= row.cells[0] / 2);
      assert.ok(box.min.z >= -row.cells[1] / 2 && box.max.z <= row.cells[1] / 2);
      assert.ok(box.max.z - box.min.z <= row.lengthM + 1e-6);
      near(box.max.y, row.heightM, .002);
      for(const mesh of model.root.children){
        const {position,normal,uv}=mesh.geometry.attributes;
        assert.ok(position.array.every(Number.isFinite),row.id+' has invalid vertices');
        assert.ok(normal.array.every(Number.isFinite));
        assert.ok(uv.array.every(n=>Number.isFinite(n)&&n>=0&&n<=1));
      }
      assert.equal(model.root.userData.metresPerUnit, 1);
      model.dispose();
    }
  } finally { kit.dispose(); }
});

test('the simplified bodies preserve sculpt dimensions and reduce triangle counts', () => {
  const kit = createRoadVehicleKit(T);
  try {
    for (const body of VEHICLE_BODIES) {
      const game = kit.create('vehicle-' + body.id + '-sage');
      const sculpt = kit.create('vehicle-' + body.id + '-sage', {lod: 'sculpt'});
      const a = new T.Box3().setFromObject(game.root), b = new T.Box3().setFromObject(sculpt.root);
      for (const axis of ['x', 'y', 'z']) { near(a.min[axis], b.min[axis], .003); near(a.max[axis], b.max[axis], .003); }
      assert.ok(triangles(sculpt.root)>=30000);
      assert.ok(triangles(game.root)>10000&&triangles(game.root)<14000);
      assert.ok(triangles(game.root) < triangles(sculpt.root) * .65, body.id);
      game.dispose(); sculpt.dispose();
    }
    assert.throws(() => kit.create('vehicle-sedan-sage', {lod: 'other'}), /detail/);
  } finally { kit.dispose(); }
});

test('baked gameplay meshes are reproducible collapses of the finished sculpt, including its UV skin registration', async()=>{
  await MeshoptSimplifier.ready;
  const report=JSON.parse(fs.readFileSync(new URL('../packages/vehicle-visuals/reduction.json',import.meta.url)));
  const sha=data=>createHash('sha256').update(data).digest('hex');
  assert.equal(report.sculptSha256,sha(fs.readFileSync(new URL('../packages/vehicle-visuals/sculpt.js',import.meta.url))));
  assert.equal(report.reducedDataSha256,sha(fs.readFileSync(new URL('../packages/vehicle-visuals/reduced-data.js',import.meta.url))));
  const kit=createRoadVehicleKit(T);
  try{for(const body of VEHICLE_BODIES){
    const row=report.bodies.find(b=>b.id===body.id);
    const sculpt=kit.create('vehicle-'+body.id+'-sage',{lod:'sculpt'}),game=kit.create('vehicle-'+body.id+'-sage');
    assert.equal(row.sourceTriangles,triangles(sculpt.root));assert.equal(row.triangles,triangles(game.root));
    for(let j=0;j<sculpt.root.children.length;j++){
      const high=sculpt.root.children[j].geometry,low=game.root.children[j].geometry;
      const [index,error]=MeshoptSimplifier.simplify(new Uint32Array(high.index.array),high.attributes.position.array,3,
        Math.floor(11200*high.index.count/(row.sourceTriangles*3))*3,.008,['ErrorAbsolute']);
      assert.ok(error<=.008);
      const remap=new Map();const compact=new Uint16Array(index.length);
      for(let i=0;i<index.length;i++){const old=index[i];if(!remap.has(old))remap.set(old,remap.size);compact[i]=remap.get(old);}
      assert.deepEqual(low.index.array,compact);
      for(const [key,size]of [['position',3],['normal',3],['uv',2]]){
        const source=high.attributes[key].array,expected=new Float32Array(remap.size*size);
        for(const[old,i]of remap)for(let c=0;c<size;c++)expected[i*size+c]=source[old*size+c];
        assert.deepEqual(low.attributes[key].array,expected,body.id+' '+key);
      }
    }
    sculpt.dispose();game.dispose();
  }}finally{kit.dispose();}
});

test('painted image resources are shared across finishes and late image completion cannot revive a disposed kit',async()=>{
  const pending=[],loaded=[];
  const kit=createRoadVehicleKit(T,{loadSkin:url=>new Promise(resolve=>pending.push({url,resolve}))});
  await Promise.resolve();
  assert.equal(pending.length,9);
  assert.ok(pending.every(p=>p.url.endsWith('.png')));
  const a=kit.create('vehicle-hatchback-sage'),b=kit.create('vehicle-hatchback-teal');
  assert.strictEqual(a.root.children[0].material.map,b.root.children[0].material.map);
  const map=a.root.children[0].material.map;let disposals=0;map.addEventListener('dispose',()=>disposals++);
  kit.dispose();
  for(const p of pending){const texture=new T.Texture({width:2048,height:2048});let disposed=0;
    texture.addEventListener('dispose',()=>disposed++);loaded.push(()=>disposed);p.resolve(texture);}
  await kit.ready;
  assert.equal(map.image,null);assert.equal(disposals,1);
  assert.ok(loaded.every(count=>count()===1));
});

test('skin load failures remain visible to the host and do not leave live models after retirement',async()=>{
  const kit=createRoadVehicleKit(T,{loadSkin:async()=>{throw Error('Skin image unavailable');}});
  const scene=new T.Scene(),model=kit.create('vehicle-pickup-sage');scene.add(model.root);
  await assert.rejects(kit.ready,/Skin image unavailable/);
  kit.dispose();assert.equal(scene.children.length,0);
});

test('paint variants share geometry and one-car retirement preserves the other vehicles', () => {
  const scene = new T.Scene(), kit = createRoadVehicleKit(T);
  const a = kit.create('vehicle-hatchback-sage'), b = kit.create('vehicle:hatchback-teal');
  scene.add(a.root, b.root);
  for (let i = 0; i < a.root.children.length; i++) assert.strictEqual(a.root.children[i].geometry, b.root.children[i].geometry);
  assert.notStrictEqual(a.root.getObjectByName('Painted body').material, b.root.getObjectByName('Painted body').material);
  const owned = new Set([...a.root.children, ...b.root.children].flatMap(mesh =>
    [mesh.geometry, mesh.material, mesh.material.map]).filter(Boolean));
  const events = new Map();
  for (const resource of owned) resource.addEventListener('dispose', () => events.set(resource, (events.get(resource) ?? 0) + 1));
  a.dispose(); a.dispose();
  assert.equal(a.root.parent, null);
  assert.equal(b.root.parent, scene);
  assert.equal(events.size, 0);
  kit.dispose(); kit.dispose(); b.dispose();
  assert.equal(scene.children.length, 0);
  for (const resource of owned) assert.equal(events.get(resource), 1);
  assert.throws(() => kit.create('vehicle-sedan-sage'), /disposed/);
  assert.throws(() => createRoadVehicleKit(), TypeError);
});

test('public asset discovery and Workshop rows describe the same parked vehicles', () => {
  const rows = editorAssets({includeRoadVehicles: true}).filter(row => row.category === 'Vehicles');
  assert.equal(rows.length, ROAD_VEHICLES.length);
  for (const [i, asset] of ROAD_VEHICLE_ASSETS.entries()) {
    const spec = roadVehicle(asset.id), card = sharedAsset(asset.id);
    assert.deepEqual(card, asset);
    assert.equal(card.modelId, spec.id);
    assert.equal(rows.find(row => row.id === spec.id).bindings['prop-kind'], spec.id);
    assert.deepEqual(ROAD_VEHICLE_SCENERY[spec.id].origin, spec.cells.map(n => (n - 1) / 2));
    assert.equal(ROAD_VEHICLE_ASSETS[i].dimensions.metresPerUnit, 1);
  }
  assert.throws(() => roadVehicle('vehicle:missing'), RangeError);
});

test('Workshop scenery additions use separate module names and exact pinned inputs', () => {
  const once = (text, before, after) => { assert.equal(text.split(before).length, 2); return text.replace(before, after); };
  const source = 'export const SCENERY_PROPS=Object.freeze({\n});';
  const alias = roadVehicleSceneryCopy('dist/tactics/scenery-catalog.js', source, once);
  assert.equal(alias.path, 'dist/tactics/nautilus-vehicles-scenery-catalog.js');
  assert.ok(alias.text.includes('...ROAD_VEHICLE_SCENERY,'));
  assert.equal(source, 'export const SCENERY_PROPS=Object.freeze({\n});');
  assert.equal(roadVehicleSceneryCopy('other.js', source, once), null);
  const imports = JSON.parse(roadVehicleImportMap().replace('<script type="importmap">', '').replace('</script>', ''));
  assert.equal(Object.keys(imports.imports).length, 2);
  assert.equal(imports.imports['./scenery-scene.js'], './nautilus-vehicles-scenery-scene.js');
});
