import {EditingDocument as Legacy} from './roof-document.js';
import * as maps from './roof-maps.js';
import * as blocks from './roof-blocks.js';
import {generateConnectedMap as legacyGenerate} from './roof-generator.js';
import {rotateSceneryBlock as legacyRotate} from './roof-rotation.js';
import {diagonalRoad, ROAD_CORNERS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/diagonal-roads.js';
import {SOLID_TILE_FEATURE, solidTileErrors, assertSolidTiles, solidTileAt, solidTileCells, setSolidTiles, previewSolidTiles} from './solid-tiles.js';
export {blockCanvas, isBlock} from './roof-blocks.js';

const size = 24;
const inSector = (x, y, left, top) => x >= left && x < left + size && y >= top && y < top + size;
const coords = key => key.split(',').map(Number);
function rotateSkin(skin) {
  const road = diagonalRoad(skin);
  if (!road) return skin;
  const corner = ROAD_CORNERS[(ROAD_CORNERS.indexOf(road.corner) + 1) % ROAD_CORNERS.length];
  return `road-diagonal-${road.grass}-${corner}${road.border ? '-border' : ''}`;
}
const mapCells = (map, project) => Object.fromEntries(Object.entries(solidTileCells(map)).flatMap(([key, cell]) => {
  const result = project(...coords(key), cell);
  return result ? [result] : [];
}));

function checkFormat(raw) {
  if (raw?.solidTiles !== undefined &&
      !(raw.kind === 'red-shift-block' ? raw.version === 1 && raw.size === size :
        raw.kind !== 'sector-placeholder' && raw.version === 2 && raw.width === 240 && raw.height === 240))
    throw Error('Solid blocks require a Nautilus aft-map-v2 map or a 24-metre aft-block-v1 block.');
}
function checkSize(map) {
  if (map.solidTiles !== undefined && new TextEncoder().encode(JSON.stringify(map, null, 2)).length > 4000000)
    throw Error('The solid blocks would exceed the 4 MB portable JSON limit. Paint a smaller area.');
}
export function validateMap(map, options) {
  const errors = maps.validateMap(map, options);
  return errors.length ? errors : solidTileErrors(map);
}
export function parseMap(text, options) {
  if (typeof text === 'string' && text.length <= 4000000) checkFormat(JSON.parse(text));
  return assertSolidTiles(maps.parseMap(text, options));
}
export function requiredMapFeatures(map) {
  checkFormat(map);
  const features = maps.requiredMapFeatures(map);
  assertSolidTiles(map);
  return map.solidTiles ? [...features, SOLID_TILE_FEATURE] : features;
}
export function assertMapCapabilities(map, features = []) {
  maps.assertMapCapabilities(map, features);
  checkFormat(map);
  assertSolidTiles(map);
  if (map.solidTiles && !features.includes(SOLID_TILE_FEATURE))
    throw Error('This game adapter does not support solid ground tiles (' + SOLID_TILE_FEATURE + '). Keep the authored blueprint in Nautilus.');
  return map;
}

export function validateBlock(block) {
  blocks.validateBlock(block);
  return assertSolidTiles(block, size);
}
export function extractBlock(map, sx = 0, sy = 0) {
  assertSolidTiles(map);
  const result = blocks.extractBlock(map, sx, sy);
  if (!map.solidTiles) return result;
  const left = sx * size, top = sy * size;
  return setSolidTiles(result, mapCells(map, (x, y, cell) =>
    inSector(x, y, left, top) ? [`${x - left},${y - top}`, cell] : null));
}
export function openBlock(block) {
  const map = blocks.openBlock(block);
  assertSolidTiles(block, size);
  return setSolidTiles(map, solidTileCells(block));
}
export function placeBlock(map, block, sx, sy) {
  assertSolidTiles(map);
  assertSolidTiles(block, size);
  const result = blocks.placeBlock(map, block, sx, sy);
  if (!map.solidTiles && !block.solidTiles) return result;
  const left = sx * size, top = sy * size;
  const kept = mapCells(map, (x, y, cell) => inSector(x, y, left, top) ? null : [`${x},${y}`, cell]);
  const placed = mapCells(block, (x, y, cell) => [`${x + left},${y + top}`, cell]);
  const candidate = assertSolidTiles(setSolidTiles(result, {...kept, ...placed}));
  checkSize(candidate);
  return candidate;
}
export function rotateSceneryBlock(block) {
  validateBlock(block);
  const result = legacyRotate(block);
  const rotated = mapCells(block, (x, y, [steps, skin]) => [`${size - 1 - y},${x}`, [steps, rotateSkin(skin)]]);
  return assertSolidTiles(setSolidTiles(result, rotated), size);
}
export function generateConnectedMap(designs, seed, plan) {
  if (designs.some(block => block?.solidTiles !== undefined))
    throw Error('Connected generation cannot match solid block heights across sectors yet. Place these blocks manually.');
  return legacyGenerate(designs, seed, plan);
}

export class EditingDocument extends Legacy {
  open(text) {
    if (typeof text !== 'string' || text.length > 4000000) throw Error('Choose a map or block JSON file under 4 MB.');
    const raw = JSON.parse(text);
    checkFormat(raw);
    if (raw?.solidTiles !== undefined) {
      if (raw.kind === 'red-shift-block') validateBlock(raw);
      else parseMap(text, {allowDisconnected: true});
      if (new TextEncoder().encode(text).length > 4000000) throw Error('Choose a map or block JSON file under 4 MB.');
    }
    super.open(text);
    if (this.block && raw.solidTiles) {
      setSolidTiles(this.editor.map, solidTileCells(raw));
      this.refresh();
      this.changed = false;
      this.revision = 0;
    }
    return this;
  }
  refresh() {
    super.refresh();
    if (this.block) {
      const cells = solidTileCells(this.editor.map);
      setSolidTiles(this.map, cells);
      setSolidTiles(this.original, cells);
    }
  }
  preview(command) {
    try {
      const result = ['solid-block', 'erase-solid-block'].includes(command?.tool) ?
        previewSolidTiles(this.editor.map, command, this.size) : super.preview(command);
      if (result.ok && result.map.solidTiles !== undefined) {
        assertSolidTiles(result.map, this.size);
        checkSize(this.block ? extractBlock(result.map) : result.map);
      }
      return result;
    } catch (error) { return {ok: false, error: error.message, cells: [], edges: []}; }
  }
  replace(map) {
    assertSolidTiles(map, this.size);
    checkSize(this.block && map.solidTiles ? extractBlock(map) : map);
    return super.replace(map);
  }
  inspect(x, y, z = 0, options = {}) {
    const selection = super.inspect(x, y, z, options);
    if (z === 0 && selection?.type === 'tile' && [undefined, 'auto', 'tile', 'terrain'].includes(options.mode)) {
      const tile = solidTileAt(this.map, selection.x, selection.y);
      if (tile) return {...selection, type: 'solid-block', label: `Solid block · ${tile.steps}/8`, data: tile};
    }
    return selection;
  }
  rotate(selection) {
    if (selection?.type !== 'solid-block') return super.rotate(selection);
    const tile = solidTileAt(this.map, selection.x, selection.y);
    if (!tile || !diagonalRoad(tile.skin)) return {ok: false, error: 'Select a solid block with a diagonal road skin to rotate it.'};
    return this.apply({tool: 'solid-block', start: selection, options: {solidSteps: tile.steps, groundKind: rotateSkin(tile.skin)}});
  }
  capture(sx = 0, sy = 0) {
    if (this.block && (sx !== 0 || sy !== 0)) throw Error('A reusable block has only one sector.');
    return validateBlock(extractBlock(this.editor.map, sx, sy));
  }
  place(block, sx, sy) {
    if (this.block) throw Error('Place blocks in a full map.');
    this.replace(placeBlock(this.editor.map, block, sx, sy));
  }
  validate() {
    const errors = super.validate();
    return errors.length ? errors : solidTileErrors(this.block ? this.original : this.map, this.size);
  }
}
