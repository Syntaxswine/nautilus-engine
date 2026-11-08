import * as T from '../../packages/render-effects/three.js';
import {solidTileAt, solidTileGeometry, solidTileHeightM, SOLID_TILE_STEPS} from '../../packages/map-core/solid-tiles.js';
import {configureBiomeTexture, createBiomeGround} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/biome-foliage-paint.js';
import {BIOME_TERRAIN} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/biome-gameplay-data.js';
import {materialKind} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-materials.js';
import {InspectionScene as RoofScene} from './roof-scene.js';
import {createSolidTileMaterial} from './solid-tile-paint.js';

const groundAtlasURL = new URL('../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/assets/environment/biome-foliage/ground-atlas-v1.png', import.meta.url).href;

export class InspectionScene extends RoofScene {
  constructor(...args) {
    super(...args);
    this.solidTiles = new T.Group();
    this.solidTiles.name = 'Solid ground tiles';
    this.scene.add(this.solidTiles);
    this.solidTop = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.solidSide = new T.PlaneGeometry(1, 1);
    this.solidBiomeMaterials = new Map();
    this.solidPaintMaterials = new Map();
    this.solidRay = new T.Raycaster();
  }
  solidGroundMaterial(skin) {
    const family = BIOME_TERRAIN[skin];
    if (!family) return this.material(materialKind({material: skin, kind: 'floor'}));
    const atlas = this.biomes.textures.ground || this.solidAtlas;
    if (!atlas?.image) {
      if (!this.solidAtlas && !this.solidAtlasFailed) {
        this.solidAtlas = this.loader.load(groundAtlasURL, loaded => {
          if (this.solidDisposed) return;
          configureBiomeTexture(loaded);
          this.rebuildSolidTiles();
          this.changed();
        }, undefined, () => {
          if (this.solidDisposed) return;
          this.solidAtlasFailed = true;
          this.diagnostics.push('Solid blocks: the shared biome ground atlas could not load.');
          this.changed();
        });
      }
      return this.material('grass');
    }
    if (!this.solidBiomeMaterials.has(family)) this.solidBiomeMaterials.set(family, createBiomeGround(atlas, family));
    return this.solidBiomeMaterials.get(family);
  }
  rebuildSolidTiles() {
    if (!this.solidTiles || this.solidDisposed) return;
    const source = this.solidPreview?.map || this.document?.map;
    const dimmed = !this.options.showAllLevels && this.options.level > 0;
    const atlasReady = !!(this.biomes.textures.ground || this.solidAtlas)?.image;
    const signature = JSON.stringify(source?.solidTiles?.cells || {}) + ':' + dimmed + ':' + atlasReady;
    if (signature === this.solidSignature) return;
    this.solidSignature = signature;
    for (const mesh of this.solidTiles.children) mesh.dispose();
    this.solidTiles.clear();

    const batches = new Map(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0);
    const add = (geometry, surface, tile, x, h, y, angle = 0, height = 1) => {
      const material = this.dim(surface, 0);
      const key = [Math.floor(tile.x / 16), Math.floor(tile.y / 16), geometry.uuid, material.uuid].join(':');
      if (!batches.has(key)) batches.set(key, {geometry, material, matrices: []});
      batches.get(key).matrices.push(new T.Matrix4().compose(
        new T.Vector3(x, h, y), q.setFromAxisAngle(up, angle), new T.Vector3(1, height, 1)));
    };
    for (const tile of solidTileGeometry(source)) {
      const paint = this.solidGroundMaterial(tile.skin);
      if (!this.solidPaintMaterials.has(paint)) this.solidPaintMaterials.set(paint, createSolidTileMaterial(paint));
      const wrapped = this.solidPaintMaterials.get(paint);
      add(this.solidTop, wrapped, tile, tile.x, tile.heightM, tile.y);
      for (const side of tile.sides) {
        add(this.solidSide, wrapped, tile, tile.x + side.dx * .5,
          (side.minH + side.maxH) / 2, tile.y + side.dy * .5, Math.atan2(side.dx, side.dy), side.maxH - side.minH);
      }
    }
    for (const {geometry, material, matrices} of batches.values()) {
      const mesh = new T.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.solidTiles.add(mesh);
    }
  }
  rebuild() { super.rebuild(); this.rebuildSolidTiles(); }

  // Pick the committed volumes, even while a changed height is previewed.
  // The ray's span between ground and one storey bounds the nearby columns.
  pickSolidTile(x, y, width, height) {
    const map = this.document?.map;
    if (!map?.solidTiles || this.options.level !== 0 || !(width > 0 && height > 0)) return null;
    this.solidRay.setFromCamera(new T.Vector2(2 * x / width - 1, 1 - 2 * y / height), this.camera);
    const ray = this.solidRay.ray;
    if (ray.direction.y >= -1e-6 || ray.origin.y <= 0) return null;
    const base = ray.at(-ray.origin.y / ray.direction.y, new T.Vector3());
    const high = ray.at(Math.max(0, (solidTileHeightM(SOLID_TILE_STEPS) - ray.origin.y) / ray.direction.y), new T.Vector3());
    const box = new T.Box3(), hit = new T.Vector3(), size = this.document.size;
    let best = null, distance = Infinity;
    for (let ty = Math.max(0, Math.floor(Math.min(base.z, high.z) + .5)); ty <= Math.min(size - 1, Math.floor(Math.max(base.z, high.z) + .5)); ty++) {
      for (let tx = Math.max(0, Math.floor(Math.min(base.x, high.x) + .5)); tx <= Math.min(size - 1, Math.floor(Math.max(base.x, high.x) + .5)); tx++) {
        const tile = solidTileAt(map, tx, ty);
        if (!tile) continue;
        box.min.set(tx - .5, 0, ty - .5); box.max.set(tx + .5, tile.heightM, ty + .5);
        if (ray.intersectBox(box, hit)) {
          const depth = hit.distanceToSquared(ray.origin);
          if (depth < distance) { best = {x: tx, y: ty, z: 0}; distance = depth; }
        }
      }
    }
    return best;
  }
  preview(result) {
    this.solidPreview = result?.ok && result.solidPreview ? result : null;
    super.preview(this.solidPreview ? null : result);
    this.rebuildSolidTiles();
    if (this.solidPreview) this.outlineSolidTiles(result.cells, result.map);
  }
  select(selection) {
    super.select(selection);
    if (selection?.type === 'solid-block') this.outlineSolidTiles(selection.cells, this.document.map);
  }
  outlineSolidTiles(cells, map) {
    const vertices = [];
    for (const {x, y} of cells) {
      const h = (solidTileAt(map, x, y)?.heightM || 0) + .015;
      const corners = [[x - .5, y - .5], [x + .5, y - .5], [x + .5, y + .5], [x - .5, y + .5]];
      for (let i = 0; i < 4; i++) {
        const a = corners[i], b = corners[(i + 1) % 4];
        vertices.push(new T.Vector3(a[0], h, a[1]), new T.Vector3(b[0], h, b[1]));
      }
    }
    this.highlight.geometry.dispose();
    this.highlight.geometry = new T.BufferGeometry().setFromPoints(vertices);
    this.changed();
  }
  dispose() {
    if (this.solidDisposed) return;
    this.solidDisposed = true;
    for (const mesh of this.solidTiles.children) mesh.dispose();
    this.solidTiles.clear();
    this.solidTiles.removeFromParent();
    this.solidTop.dispose();
    this.solidSide.dispose();
    this.solidAtlas?.dispose();
    for (const material of this.solidBiomeMaterials.values()) material.dispose();
    for (const material of this.solidPaintMaterials.values()) material.dispose();
    super.dispose();
  }
}
