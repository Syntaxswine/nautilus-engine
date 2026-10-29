import fs from 'node:fs';
import {serializeWorld} from '../packages/world-core/index.js';
import {makeFifteenStoryWorld} from './fixtures/fifteen-story.mjs';

// Bounded original fixture, with no worker/donor I/O or root build changes.
const output=new URL('../examples/native-fifteen-story.world.json',import.meta.url);
const json=serializeWorld(makeFifteenStoryWorld());
fs.writeFileSync(output,json+'\n');
console.log('Native fifteen-story fixture: '+Buffer.byteLength(json)+' UTF-8 bytes.');
