import test from 'node:test';
import * as W from '../packages/windows-core/index.js';
import * as F from '../packages/adapters/farmyard/windows.js';
import * as T from '../packages/render-effects/three.js';
import * as V from '../packages/native-window-presenter/three.js';
import {lifecycleCaseNames,runLifecycleCase} from './fixtures/native-window-presenter/lifecycle-proof.mjs';
for(const [index,name]of lifecycleCaseNames.entries())test('native window lifecycle: '+name,()=>runLifecycleCase({W,F,T,V},index));
