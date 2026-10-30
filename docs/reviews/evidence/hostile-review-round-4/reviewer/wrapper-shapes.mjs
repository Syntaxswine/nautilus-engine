// The bridge test's import handling (tests/editor-host-bridge.test.mjs:16-18, 61-62), replayed in
// memory on variants of the committed editor.js: does each import shape the regexes cannot strip
// fail loudly (a SyntaxError building the Function, or the import checks failing)? No file is touched.
// Usage: node wrapper-shapes.mjs <root>
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root = path.resolve(process.argv[2]);
const source = execFileSync('git', ['-C', root, 'show', 'HEAD:apps/editor/editor.js'], {encoding: 'utf8'});
const KNOWN = ['ENGINE_VERSION', 'MAP_CONTRACT', 'openDocument', 'describeBlueprint', 'engineManifest', 'exampleYard', 'createGameHandoff', 'installAssetLibrary', 'installBuildingLibrary'];
const first = "import {installAssetLibrary} from './assets.js';";
const variants = {
  committed: source,
  'multi-line import': source.replace(first, "import {\n  installAssetLibrary\n} from './assets.js';"),
  'trailing comment': source.replace(first, first + ' // assets'),
  'side-effect import': source.replace(first, first + "\nimport './extra.js';"),
  'default import': source.replace(first, first + "\nimport extra from './extra.js';"),
  'renamed import': source.replace(first, "import {installAssetLibrary as install} from './assets.js';"),
  'same name, other module': source.replace(first, "import {installAssetLibrary} from './assets-copy.js';")
};
const out = {};
for (const [name, text] of Object.entries(variants)) {
  const imports = text.match(/^import .*;/gm) || [], named = [...text.matchAll(/^import \{([^}]*)\} from /gm)], imported = named.flatMap(m => m[1].split(',').map(s => s.trim()));
  let built = 'ok';
  try { new Function('d', `'use strict';const {${[...KNOWN, 'document', 'window', 'MutationObserver', 'confirm'].join(', ')}} = d;\n${text.replace(/^import .*;\r?\n/gm, '')}`); } catch (error) { built = error.name + ': ' + error.message; }
  out[name] = {everyImportNamed: named.length === imports.length, namesCovered: JSON.stringify([...imported].sort()) === JSON.stringify([...KNOWN].sort()), functionBuilds: built};
}
console.log(JSON.stringify(out, null, 1));
