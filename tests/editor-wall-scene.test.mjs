import test from 'node:test';
import assert from 'node:assert/strict';
import {InspectionScene,patchWallWidth,unitWallGeometry} from '../apps/editor/wall-scene.js';
import {WALL_KIT} from '../packages/map-core/wall-runs.js';
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
