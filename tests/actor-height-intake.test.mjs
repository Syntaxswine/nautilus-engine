import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const review = 'docs/reviews/actor-height-intake/';
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

test('actor/height intake sealed evidence retains exact bytes and digests without donor checkouts', () => {
  const acceptance = read(review + 'acceptance.json');
  const inventory = read(review + 'sources.json');
  const expected = ['README.md', 'inventory.py', 'measure.mjs', 'bindings.mjs',
    'verify.test.mjs', 'seal.mjs', 'sources.json', 'measurements.json'].map(file => review + file)
    .concat(['packages/assets/bindings/actor-intake-v1.json',
      'packages/assets/bindings/tall-building-intake-v1.json']);
  assert.equal(acceptance.baselineCommit, inventory.baselineCommit);
  assert.deepEqual(acceptance.evidence.map(file => file.path).sort(), expected.sort());
  let total = 0;
  for (const file of acceptance.evidence) {
    const bytes = fs.readFileSync(path.join(root, file.path));
    assert.equal(bytes.length, file.bytes, file.path + ' byte count');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256,
      file.path + ' SHA-256');
    total += bytes.length;
  }
  assert.equal(total, acceptance.evidenceBytes);
});

test('actor/height proposed bindings match their deterministic read-only generator', () => {
  const output = execFileSync(process.execPath, [path.join(root, review, 'bindings.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024
  });
  assert.match(output, /Verified proposed bindings:/);
});
