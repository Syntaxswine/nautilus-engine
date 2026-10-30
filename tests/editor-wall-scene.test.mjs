import test from 'node:test';
import assert from 'node:assert/strict';
import {InspectionScene,patchWallWidth,unitWallGeometry} from '../apps/editor/wall-scene.js';
import {WALL_KIT,wallRunsOf,wallPanels} from '../packages/map-core/wall-runs.js';
import * as T from '../packages/render-effects/three.js';
import {surfacePixels} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-materials.js';
const methods = InspectionScene.prototype;
const release = scene => {
  for (const mesh of scene.wallGroup?.children || []) mesh.dispose();
  for (const geometry of scene.wallGeometries?.values() || []) geometry.dispose();
  for (const material of scene.wallMaterials.values()) {material.map.dispose();material.dispose();}
};

test('wall material lookup uses the pinned brick surface and preserves wood/concrete pixels', () => {
  const scene = {wallMaterials: new Map(), dim: material => material};
  try {
    for (const kind of ['brick', 'wood', 'concrete']) {
      const pixels = methods.wallMaterial.call(scene, kind, 0).map.image.data;
      assert.deepEqual(pixels, surfacePixels(kind).data);
      if (kind === 'brick') assert.notDeepEqual(pixels, surfacePixels('wall-brick').data);
      else assert.deepEqual(pixels, surfacePixels(kind === 'wood' ? 'wood' : 'wall-concrete').data);
    }
  } finally {release(scene);}
});

const wallScene = () => {const scene = {wallGroup: new T.Group(), wallMaterials: new Map(), visibleLevel: 0, options: {walls: true}, dim: material => material, changed() {}};scene.wallMaterial = (...args) => methods.wallMaterial.call(scene, ...args);return scene;};

test('repeated rebuilds dispose each replaced wall geometry once and keep one instanced mesh per material', () => {
  const scene = wallScene(), seen = new Set(), disposed = new Set();
  try {
    for (let edit = 1; edit <= 40; edit++) {
      // Three runs, every one ending in a different cut panel: still one draw per material.
      scene.document = {map: {wallRuns: {version: 1, segments: [0, 1, 2].map(i => ({id: 'edited-' + i, a: [1, 1 + i * 2], b: [3 + edit * .013 + i * .17, 1 + i * 2], z: 0, stories: 1, material: i === 2 ? 'wood' : 'brick'}))}}};
      methods.rebuildWalls.call(scene);
      const meshes = scene.wallGroup.children.filter(mesh => mesh.isInstancedMesh);
      assert.equal(meshes.length, 2, 'One instanced mesh per material, whatever the cut lengths');
      assert.equal(meshes.reduce((n, mesh) => n + mesh.count, 0), 3 * 3, 'Two full panels and one cut panel per run');
      for (const mesh of meshes) if (!seen.has(mesh.geometry)) {
        const geometry = mesh.geometry;seen.add(geometry);geometry.addEventListener('dispose', () => {assert.ok(!disposed.has(geometry), 'Dispose an owned geometry once');disposed.add(geometry);});
      }
      assert.equal(disposed.size, (edit - 1) * 2, 'Each rebuild releases the previous geometries');
    }
    scene.options.walls = false;methods.rebuildWalls.call(scene);
    assert.equal(scene.wallGroup.children.length, 0);assert.equal(seen.size, 80);assert.equal(disposed.size, 80);
  } finally {release(scene);}
});

test('a unit wall scaled by width in float32 reproduces BoxGeometry(width) positions and per-metre UVs bit for bit', () => {
  // The vertex shader computes transformed.x = position.x * wallWidth and, on the
  // long faces, u * wallWidth, in IEEE float32: Math.fround of the float32 product.
  const unit = unitWallGeometry(), widths = [1, .05, .1, .3, .333333, .5, .617, .999999, Math.SQRT2 - 1, 2.718281828 % 1, 6 / 7];
  for (const width of widths) {
    const reference = new T.BoxGeometry(width, WALL_KIT.height, WALL_KIT.thickness), uv = reference.attributes.uv, w = Math.fround(width);
    for (let i = 0; i < uv.count; i++) {const face = Math.floor(i / 4);uv.setXY(i, uv.getX(i) * (face < 2 ? WALL_KIT.thickness : width), uv.getY(i) * (face === 2 || face === 3 ? WALL_KIT.thickness : WALL_KIT.height));}
    for (let i = 0; i < unit.attributes.position.count; i++) {
      assert.equal(Math.fround(unit.attributes.position.getX(i) * w), reference.attributes.position.getX(i), width + ' x of vertex ' + i);
      assert.equal(unit.attributes.position.getY(i), reference.attributes.position.getY(i));assert.equal(unit.attributes.position.getZ(i), reference.attributes.position.getZ(i));
      const u = unit.attributes.wallScaleU.getX(i) > .5 ? Math.fround(unit.attributes.uv.getX(i) * w) : unit.attributes.uv.getX(i);
      assert.equal(u, uv.getX(i), width + ' u of vertex ' + i);assert.equal(unit.attributes.uv.getY(i), uv.getY(i));
      assert.deepEqual(unit.attributes.normal.array.slice(i * 3, i * 3 + 3), reference.attributes.normal.array.slice(i * 3, i * 3 + 3));
    }
    reference.dispose();
  }
  unit.dispose();
});

// Free-angle runs ending in cut panels, every material, several layers and stories.
const freeAngleRuns = () => Array.from({length: 24}, (_, i) => {const a = [4 + (i % 6) * 9.3, 4 + Math.floor(i / 6) * 7.1], angle = (17 + i * 23) * Math.PI / 180, length = 2.2 + (i * .617) % 5;
  return {id: 'fa-' + i, a, b: [Math.round((a[0] + Math.cos(angle) * length) * 1e6) / 1e6, Math.round((a[1] + Math.sin(angle) * length) * 1e6) / 1e6], z: i % 3, stories: 1 + (i % 2), material: ['wood', 'brick', 'concrete'][i % 3]};});
const shaderAfter = material => {const shader = {vertexShader: '#include <common>\nvoid main(){\n#include <uv_vertex>\n#include <begin_vertex>\n}', fragmentShader: ''};material.onBeforeCompile(shader, null);return shader.vertexShader;};

test('every wall instance set carries width-patched shadow materials for sun, spot and point lights', () => {
  const scene = wallScene();
  try {
    scene.document = {map: {wallRuns: {version: 1, segments: freeAngleRuns()}}};scene.visibleLevel = 5;methods.rebuildWalls.call(scene);
    const meshes = scene.wallGroup.children.filter(mesh => mesh.isInstancedMesh);assert.equal(meshes.length, 3);
    for (const mesh of meshes) {
      // The renderer picks customDistanceMaterial for point lights, customDepthMaterial otherwise.
      assert.ok(mesh.customDepthMaterial?.isMeshDepthMaterial && mesh.customDepthMaterial.depthPacking === T.RGBADepthPacking, 'sun/spot shadow material');
      assert.ok(mesh.customDistanceMaterial?.isMeshDistanceMaterial, 'point-light shadow material');
      for (const material of [mesh.customDepthMaterial, mesh.customDistanceMaterial]) assert.match(shaderAfter(material), /transformed\.x \*= wallWidth;/);
      assert.notEqual(mesh.customDepthMaterial.customProgramCacheKey(), mesh.customDistanceMaterial.customProgramCacheKey());
    }
  } finally {release(scene);scene.wallShadows?.depth.dispose();scene.wallShadows?.distance.dispose();}
});

test('every placed panel is its own BoxGeometry(width) at its own transform, inside its mesh bounds', () => {
  // An independent enumeration of the panels: each instance must equal the matrix and width
  // main would have used for that panel, and the unit box times that width must equal the box.
  const scene = wallScene(), segments = freeAngleRuns(), matrix = new T.Matrix4(), position = new T.Vector3(), rotation = new T.Quaternion(), up = new T.Vector3(0, 1, 0), one = new T.Vector3(1, 1, 1);
  try {
    scene.document = {map: {wallRuns: {version: 1, segments}}};scene.visibleLevel = 5;methods.rebuildWalls.call(scene);
    const byMaterial = new Map(scene.wallGroup.children.filter(mesh => mesh.isInstancedMesh).map(mesh => [[...scene.wallMaterials].find(([, m]) => m === mesh.material)[0], {mesh, next: 0}]));
    const unit = unitWallGeometry(), checkedWidths = new Set();let panels = 0;
    for (const run of wallRunsOf({wallRuns: {version: 1, segments}})) for (const panel of wallPanels(run)) {
      const slot = byMaterial.get(panel.material), i = slot.next++, expected = new Float32Array(16);
      matrix.compose(position.fromArray(panel.center), rotation.setFromAxisAngle(up, panel.yaw), one).toArray(expected);
      assert.deepEqual(slot.mesh.instanceMatrix.array.slice(i * 16, i * 16 + 16), expected, 'instance matrix of panel ' + panels);
      assert.equal(slot.mesh.geometry.attributes.wallWidth.getX(i), Math.fround(panel.size[0]), 'width of panel ' + panels);
      const w = Math.fround(panel.size[0]);
      if (!checkedWidths.has(w)) {
        checkedWidths.add(w);const reference = new T.BoxGeometry(panel.size[0], WALL_KIT.height, WALL_KIT.thickness);
        for (let v = 0; v < 24; v++) assert.equal(Math.fround(unit.attributes.position.getX(v) * w), reference.attributes.position.getX(v));
        reference.dispose();
      }
      // The instance's scaled box lies inside its mesh's bounding sphere (culling stays safe).
      const box = new T.Box3(new T.Vector3(-w / 2, -WALL_KIT.height / 2, -WALL_KIT.thickness / 2), new T.Vector3(w / 2, WALL_KIT.height / 2, WALL_KIT.thickness / 2)).applyMatrix4(matrix);
      for (const corner of [box.min, box.max]) assert.ok(slot.mesh.boundingSphere.distanceToPoint(corner) <= 1e-6, 'bounds of panel ' + panels);
      panels++;
    }
    for (const {mesh, next} of byMaterial.values()) assert.equal(next, mesh.count, 'every instance accounted for');
    assert.ok(checkedWidths.size > 20, 'the runs end in many distinct cut widths');unit.dispose();
  } finally {release(scene);scene.wallShadows?.depth.dispose();scene.wallShadows?.distance.dispose();}
});

test('the width patch reaches the shader through the inherited dimming clone and keys its own program', () => {
  const material = patchWallWidth(new T.MeshStandardMaterial(), 'nautilus-wall-width-v1'), shader = {vertexShader: '#include <common>\nvoid main(){\n#include <uv_vertex>\n#include <begin_vertex>\n}', fragmentShader: '#include <opaque_fragment>'};
  // The inherited dim(): a clone whose onBeforeCompile calls the base material's.
  const dimmed = material.clone();dimmed.onBeforeCompile = (s, r) => {material.onBeforeCompile(s, r);s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight *= .38;\n#include <opaque_fragment>');};
  dimmed.onBeforeCompile(shader, null);
  assert.match(shader.vertexShader, /^attribute float wallWidth;\nattribute float wallScaleU;/);
  assert.match(shader.vertexShader, /#include <begin_vertex>\n\ttransformed\.x \*= wallWidth;/);
  assert.match(shader.vertexShader, /vMapUv = \( mapTransform \* vec3\( wallScaleU > 0\.5 \? uv\.x \* wallWidth : uv\.x, uv\.y, 1\.0 \) \)\.xy;/);
  assert.equal(material.customProgramCacheKey(), 'nautilus-wall-width-v1');
  assert.notEqual(material.customProgramCacheKey(), new T.MeshStandardMaterial().customProgramCacheKey());
  material.dispose();dimmed.dispose();
});

test('unchanged wall drawing mode avoids rebuilding the same instance groups', () => {
  let rebuilds = 0;const scene = {document: {}, rebuildWalls() {rebuilds++;}};
  for (const active of [true,true,false,false]) methods.setWallDrawing.call(scene, active);
  assert.equal(rebuilds, 2);
});
