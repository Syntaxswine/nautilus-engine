import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const {aft} = JSON.parse(await readFile(new URL('upstream.json', root), 'utf8'));
// Expand the build's explicit aliases without constructing a DOM or renderer.
const source = (await readFile(new URL('apps/editor/wall-scene.js', root), 'utf8')).replace(/from '([^']+)'/g, (_, specifier) => {
  const relative = specifier.startsWith('../__AFT__/') ? aft.root + '/' + specifier.slice('../__AFT__/'.length) : specifier.startsWith('../packages/') ? specifier.slice(3) : null;
  assert.ok(relative, 'Unreviewed scene import: ' + specifier);
  return 'from ' + JSON.stringify(new URL(relative, root).href);
});
const {InspectionScene} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const T = await import(new URL(aft.root + '/dist/tactics/vendor/three.module.js', root));
const {surfacePixels} = await import(new URL(aft.root + '/dist/tactics/hybrid-materials.js', root));
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

test('repeated exact-length rebuilds retire unused cut geometry and retain shared full panels', () => {
  const scene = {wallGroup: new T.Group(), wallGeometries: new Map(), wallMaterials: new Map(), visibleLevel: 0, options: {walls: true}, dim: material => material, changed() {}};
  scene.wallMaterial = (...args) => methods.wallMaterial.call(scene, ...args);
  const seen = new Set(), disposed = new Set();let full;
  try {
    for (let edit = 1; edit <= 40; edit++) {
      scene.document = {map: {wallRuns: {version: 1, segments: [{id: 'edited', a: [1,1], b: [3 + edit * .013,1], z: 0, stories: 1, material: 'brick'}]}}};
      methods.rebuildWalls.call(scene);
      assert.equal(scene.wallGeometries.size, 2, 'Cache must follow the current full/cut widths');
      full ??= scene.wallGeometries.get('1.000000');
      assert.equal(scene.wallGeometries.get('1.000000'), full, 'Keep geometry still shared by current panels');
      for (const geometry of scene.wallGeometries.values()) if (!seen.has(geometry)) {
        seen.add(geometry);geometry.addEventListener('dispose', () => {assert.ok(!disposed.has(geometry), 'Dispose an owned geometry once');disposed.add(geometry);});
      }
      assert.equal(disposed.size, edit - 1, 'Each replaced cut must dispatch disposal');
    }
    scene.options.walls = false;methods.rebuildWalls.call(scene);
    assert.equal(scene.wallGroup.children.length, 0);assert.equal(scene.wallGeometries.size, 0);
    assert.equal(seen.size, 41);assert.equal(disposed.size, 41);
  } finally {release(scene);}
});

test('unchanged wall drawing mode avoids rebuilding the same instance groups', () => {
  let rebuilds = 0;const scene = {document: {}, rebuildWalls() {rebuilds++;}};
  for (const active of [true,true,false,false]) methods.setWallDrawing.call(scene, active);
  assert.equal(rebuilds, 2);
});
