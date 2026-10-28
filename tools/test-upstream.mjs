import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const {aft} = JSON.parse(fs.readFileSync(new URL('../upstream.json', import.meta.url)));
const files = ['editor-3d-editing', 'editor-3d', 'tactics-blocks', 'tactics-connections', 'tactics-feature-plan'].map(name => 'tests/' + name + '.test.mjs');
const run = spawnSync(process.execPath, ['--test', ...files], {cwd: path.resolve(aft.root), stdio: 'inherit', windowsHide: true});
process.exit(run.status ?? 1);
