// Run the component owner's behavioral tests in the normal engine/CI suite.
import fs from 'node:fs';
const tests = new URL('../packages/train-ui/tests/', import.meta.url);
for (const file of fs.readdirSync(tests).filter(file => file.endsWith('.test.mjs')).sort()) {
  await import(new URL(file, tests).href);
}
