import fs from 'node:fs';
import {bearEditorCases,bearEditorBaselineFixtures} from './fixtures/editor-bear.mjs';
const fixtures=bearEditorBaselineFixtures();
for(const [name,value]of Object.entries({
  'comparison-cow.block.json':fixtures.baselineBlock,
  'unsupported-v0.8-bear.block.json':fixtures.unsupportedBearBlock,
  'acceptance-intent.json':bearEditorCases()
}))fs.writeFileSync(new URL('../tests/fixtures/editor-bear/'+name,import.meta.url),JSON.stringify(value,null,2)+'\n');
console.log('Wrote deterministic comparison, intentionally unsupported bear block and 26 appearance cases.');
