import test from 'node:test';import * as core from '../packages/tiles-core/index.js';import * as T from '../packages/render-effects/three.js';
import * as prepare from '../packages/tile-visuals/prepare.js';import * as three from '../packages/tile-visuals/three.js';import * as examples from '../packages/tile-visuals/example.js';
import {tileLifecycleCaseNames,runTileLifecycleCase} from './fixtures/tile-visuals/lifecycle-proof.mjs';
for(const [index,name]of tileLifecycleCaseNames.entries())test('tile visual lifecycle: '+name,()=>runTileLifecycleCase(core,T,{...prepare,...three},examples,index));
