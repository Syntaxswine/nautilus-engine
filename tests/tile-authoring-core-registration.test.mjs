import test from 'node:test';
import assert from 'node:assert/strict';
import {checkTileAuthoringCoreSource} from '../tools/check-tile-authoring-core-source.mjs';
test('ordinary authoring entry has exact four-profile delta and immutable headless dependencies',()=>{const r=checkTileAuthoringCoreSource();assert.equal(r.runtimeModules,8);assert.deepEqual(r.profiles.map(p=>[p.profile,p.entryAdded,p.filesAdded.length]),[['core',true,13],['compatibility',true,13],['renderer',false,0],['assets',false,0]]);});
