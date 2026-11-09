import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const component = path.join(root, 'packages/adapters/farmyard/playtest');
const output = path.join(root, 'artifacts/farmyard-playtest');
const prefix = 'playtest-pack-stage-';

export const packageName = '@nautilus-engine/farmyard-playtest';
export const corePeer = {'@nautilus-engine/core': '^0.10.0'};
export const peerBridge = "export {validateMap} from '@nautilus-engine/core';\n" +
  "export {FARMYARD_DOOR_CONTRACT} from '@nautilus-engine/core/adapters/farmyard/doors';\n";

export function runNpm(args, cwd) {
  const npm = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')
  ].find(file => file && path.basename(file) === 'npm-cli.js' && fs.existsSync(file));
  if (!npm) throw Error('Node with npm is required.');
  return execFileSync(process.execPath, [npm, ...args], {
    cwd, windowsHide: true, encoding: 'utf8', timeout: 60_000,
    env: {...process.env, npm_config_cache: path.join(cwd, 'npm-cache')},
    maxBuffer: 4 * 1024 * 1024
  });
}

export function packFarmyardPlaytest() {
  fs.mkdirSync(output, {recursive: true});
  const stage = fs.mkdtempSync(path.join(output, prefix));
  try {
    const files = ['README.md', 'core-peer.js', 'index.js', 'profile.js'];
    const manifest = {
      name: packageName,
      version: '0.1.0',
      private: true,
      type: 'module',
      description: 'Retained Farmyard solo door playtest connector for Nautilus',
      exports: {'.': './index.js'},
      peerDependencies: corePeer,
      files,
      engines: {node: '>=22'}
    };
    fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
    fs.writeFileSync(path.join(stage, 'core-peer.js'), peerBridge);
    fs.copyFileSync(path.join(root, 'docs/adapters/farmyard-playtest.md'), path.join(stage, 'README.md'));
    for (const name of ['index.js', 'profile.js']) {
      fs.copyFileSync(path.join(component, name), path.join(stage, name));
    }
    const [pack] = JSON.parse(runNpm(['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', output], stage));
    const packed = pack.files.map(file => file.path).sort();
    assert.deepEqual(packed, [...files, 'package.json'].sort(), 'Unexpected optional package payload.');
    return {name: packageName, version: manifest.version, file: path.join(output, pack.filename), files: packed, integrity: pack.integrity};
  } finally {
    const target = fs.realpathSync(stage);
    assert.ok(path.dirname(target) === fs.realpathSync(output) && path.basename(target).startsWith(prefix));
    fs.rmSync(target, {recursive: true, force: true});
    assert.ok(!fs.existsSync(target));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(packFarmyardPlaytest(), null, 2));
}
