import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSmartTileEditorSource} from '../tools/check-smart-tile-editor-source.mjs';
import * as mapCore from '../packages/map-core/index.js';
import * as tiles from '../packages/tiles-core/index.js';
import * as examples from '../packages/tile-visuals/example.js';
import {smartTileProofCheckpoint} from '../apps/editor/smart-tile/seed.js';
test('editor uses exact relayed UI and reviewed public runtime bytes without a private provider',()=>{assert.equal(checkSmartTileEditorSource().uiFiles,10);});
test('real reference seed retains complete original map, supplied native floors and empty resolved layout',()=>{const c=smartTileProofCheckpoint(mapCore,tiles,examples),source=JSON.parse(c.document.sourceJSON);assert.equal(source.width,240);assert.equal(source.height,240);assert.equal(source.metadata.original.actorResources.ap,0);assert.equal(c.document.floorBinding.floors[1].elevationM,2.12);assert.equal(tiles.openTileBundle(c.document.tileBundle,{requireResolved:true}).compiled.instances.length,0);assert.equal(c.journal.pending,null);});
