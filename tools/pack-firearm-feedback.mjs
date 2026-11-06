import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const component = path.join(root, 'packages/firearm-feedback');
const output = path.join(root, 'artifacts/firearm-feedback-package');
export const packageName = '@nautilus-engine/firearm-feedback';
export const rendererName = '@nautilus-engine/renderer';
export const rendererEntry = rendererName + '/render-effects/three';
export const peerBridge = "export * from '" + rendererEntry + "';\n";

export function runNpm(args, cwd, cache = path.join(cwd, 'npm-cache')) {
  const npm = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')]
    .find(file => file && path.basename(file) === 'npm-cli.js' && fs.existsSync(file));
  if (!npm) throw Error('Node with npm is required.');
  return execFileSync(process.execPath, [npm, ...args], {
    cwd, windowsHide: true, encoding: 'utf8', timeout: 120000,
    env: {...process.env, npm_config_cache: cache}, maxBuffer: 8 * 1024 * 1024
  });
}

export function packFirearmFeedback() {
  fs.mkdirSync(output, {recursive: true});
  const stage = fs.mkdtempSync(path.join(output, 'firearm-pack-stage-'));
  try {
    const files = ['README.md', 'NOTICE.md', 'source.json', 'THREE-LICENSE.txt',
      'audio.js', 'pose.js', 'rig.js', 'shared-three.js', 'shoulder.js', 'three.js'];
    const manifest = {
      name: packageName, version: '0.1.0', private: true, type: 'module',
      description: 'Farmyard firearm aim, recoil and committed-round cues for Nautilus',
      exports: {'.': './three.js'}, peerDependencies: {[rendererName]: '^0.10.0'}, files,
      engines: {node: '>=22'}
    };
    const source = JSON.parse(fs.readFileSync(path.join(component, 'source.json')));
    const notice = source.files.find(file => file.path.endsWith('/THREE-LICENSE.txt'));
    const noticeBytes = fs.readFileSync(path.join(root, source.root, notice.snapshotPath));
    if (createHash('sha256').update(noticeBytes).digest('hex') !== notice.sha256) throw Error('Changed source Three notice.');
    fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
    for (const file of files) {
      const destination = path.join(stage, file);
      // The only build-time binding maps the checkout's canonical Three entry
      // to the installed renderer peer. All other component bytes are copied.
      if (file === 'shared-three.js') fs.writeFileSync(destination, peerBridge);
      else if (file === 'THREE-LICENSE.txt') fs.writeFileSync(destination, noticeBytes);
      else fs.copyFileSync(path.join(component, file), destination);
    }
    const [pack] = JSON.parse(runNpm(['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', output], stage));
    const packed = pack.files.map(file => file.path).sort();
    if (JSON.stringify(packed) !== JSON.stringify([...files, 'package.json'].sort())) {
      throw Error('Unexpected firearm package file list.');
    }
    return {name: packageName, version: manifest.version, file: path.join(output, pack.filename), files: packed};
  } finally {
    const target = fs.realpathSync(stage);
    if (path.dirname(target) !== fs.realpathSync(output) || !path.basename(target).startsWith('firearm-pack-stage-')) {
      throw Error('Unsafe firearm package staging path.');
    }
    fs.rmSync(target, {recursive: true, force: true});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(packFirearmFeedback(), null, 2));
}
