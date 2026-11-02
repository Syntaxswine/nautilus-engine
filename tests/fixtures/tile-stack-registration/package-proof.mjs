// Actual public installed entry. Internal contract/allocator checks are handled
// separately and labelled whitebox; this file uses only public package imports.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as tiles from '@nautilus-engine/core/tiles';
import * as stack from '@nautilus-engine/core/tiles/stack';
const installed=fs.realpathSync(process.argv[2]),manifest=JSON.parse(fs.readFileSync(path.join(installed,'package.json'),'utf8'));
assert.equal(manifest.name,'@nautilus-engine/core');assert.equal(manifest.exports['./tiles/stack'],'./packages/tile-stack-core/index.js');
const actualStack=fs.realpathSync(fileURLToPath(import.meta.resolve('@nautilus-engine/core/tiles/stack'))),actualTiles=fs.realpathSync(fileURLToPath(import.meta.resolve('@nautilus-engine/core/tiles')));
assert.equal(actualStack,path.join(installed,'packages/tile-stack-core/index.js'));assert.equal(actualTiles,path.join(installed,'packages/tiles-core/index.js'));
assert.deepEqual(Object.keys(stack).sort(),['STACK_PLANNER_LIMITS','STACK_PROFILE','StackPlanError','planTileStack','prepareTileStack'].sort());
assert.equal(typeof tiles.prepareTileRepair,'function');assert.equal(typeof tiles.createRetainedTileConsumer,'function');assert.equal(stack.STACK_PROFILE,'nautilus-rectangle-stack-intent-v1');assert.equal(typeof stack.planTileStack,'function');
assert.equal(typeof globalThis.window,'undefined');assert.equal(typeof globalThis.document,'undefined');assert.equal(typeof globalThis.THREE,'undefined');
console.log(JSON.stringify({registered:true,publicStack:true,privateFallback:false,stackPath:actualStack,tilesPath:actualTiles,exports:Object.keys(stack).sort(),headless:true}));
