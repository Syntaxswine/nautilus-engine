// Keep the donor's CPU-heavy audition exports separate from parallel engine tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {BABBLE_ROOT, checkBabbleLab} from './check-babble-lab.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const donor = path.join(root, BABBLE_ROOT);
const files = fs.readdirSync(path.join(donor, 'test')).filter(name => name.endsWith('.test.mjs')).sort().map(name => 'test/' + name);
const env = {...process.env}; delete env.NODE_TEST_CONTEXT;
checkBabbleLab(root);
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-concurrency=1', ...files], {cwd: donor, env, encoding: 'utf8', windowsHide: true, timeout: 300000, maxBuffer: 8 * 1024 * 1024});
process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
assert.equal(result.error, undefined, result.error?.message);
assert.equal(result.status, 0, 'Original Babble Lab suite failed.');
assert.equal(Number(/^# tests (\d+)$/m.exec(result.stdout)?.[1]), 84, 'Every case in the reviewed original suite must run.');
checkBabbleLab(root);
