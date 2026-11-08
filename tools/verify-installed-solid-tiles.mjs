import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {packProfile, root} from './distribution.mjs';
import {solidTilePackageFiles} from './solid-tile-registration.mjs';

const profile = packProfile('core');
const artifacts = fs.realpathSync(path.join(root, 'artifacts'));
const scratch = fs.mkdtempSync(path.join(artifacts, 'solid-tile-install-'));
try {
  fs.writeFileSync(path.join(scratch, 'package.json'), JSON.stringify({name: 'solid-tile-install-proof', private: true, type: 'module'}));
  const npm = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  execFileSync(process.execPath, [npm, 'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', profile.file],
    {cwd: scratch, windowsHide: true, timeout: 90000});
  const installed = path.join(scratch, 'node_modules', '@nautilus-engine', 'core');
  assert.equal(fs.lstatSync(installed).isSymbolicLink(), false);
  const pkg = JSON.parse(fs.readFileSync(path.join(installed, 'package.json'), 'utf8'));
  const files = solidTilePackageFiles('core');
  for (const file of files) {
    assert.ok(pkg.files.includes(file));
    assert.ok(fs.readFileSync(path.join(installed, file)).equals(fs.readFileSync(path.join(root, file))));
  }
  const probe = `
    import assert from 'node:assert/strict';
    import {createMapDocument, openDocument, createSave, parseSave, serializeSave, solidTileAt, SOLID_TILE_FEATURE} from '@nautilus-engine/core';
    import {engineManifest, schemaDocuments} from '@nautilus-engine/core/contracts';
    import {assertBlueprintCompatible} from '@nautilus-engine/core/capabilities';
    import fs from 'node:fs';
    const doc = createMapDocument('Solid tile install');
    assert.ok(doc.apply({tool:'solid-block',start:{x:10,y:10,z:0},options:{solidSteps:8,groundKind:'ground-biome-snow'}}).ok);
    const blueprint = JSON.parse(doc.export());
    assert.equal(solidTileAt(openDocument(blueprint).map,10,10).heightM,2.12);
    assert.deepEqual(parseSave(serializeSave(createSave(blueprint))).payload.data,blueprint);
    const schema = schemaDocuments().find(item=>item.id==='nautilus-solid-ground-tiles');
    assert.equal(JSON.parse(fs.readFileSync(new URL(schema.url))).$id,schema.uri);
    const manifest = engineManifest();
    assert.equal(assertBlueprintCompatible(blueprint,manifest),blueprint);
    manifest.capabilities = manifest.capabilities.filter(item=>item.id!==SOLID_TILE_FEATURE);
    assert.throws(()=>assertBlueprintCompatible(blueprint,manifest), error => error.diagnostics[0].code==='UNSUPPORTED_REQUIRED_FEATURE');
  `;
  execFileSync(process.execPath, ['--input-type=module', '-e', probe], {cwd: scratch, windowsHide: true, timeout: 30000});
  const result = {package: profile.name, tarball: profile.file, integrity: profile.integrity, files,
    reopened: true, checkedPackageAliases: true, unsupportedConsumerRefused: true};
  const output = path.join(artifacts, 'solid-tile-review');
  fs.mkdirSync(output, {recursive: true});
  fs.writeFileSync(path.join(output, 'installed-core.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  const resolved = fs.realpathSync(scratch);
  if (path.dirname(resolved) !== artifacts || !path.basename(resolved).startsWith('solid-tile-install-'))
    throw Error('Unexpected temporary solid tile install location.');
  fs.rmSync(resolved, {recursive: true, force: true});
}
