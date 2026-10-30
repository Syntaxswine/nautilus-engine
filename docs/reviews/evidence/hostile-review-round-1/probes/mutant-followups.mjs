// Close the loop on two surviving mutants. Restores every file in a finally.
// M05: does the surviving clearance mutant actually change behavior on a reachable input?
// M16: is the editor handoff guard caught by anything at all (the CI browser job)?
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const run = (args, opts = {}) => spawnSync(process.execPath, args, {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600000, windowsHide: true, ...opts});
const result = {};
function withMutant(file, find, replace, body) {
  const full = path.join(root, file), original = fs.readFileSync(full), text = original.toString('utf8');
  if (text.split(find).length !== 2) throw Error('needle not unique in ' + file);
  try { fs.writeFileSync(full, text.replace(find, replace)); return body(); }
  finally { fs.writeFileSync(full, original); }
}
const probe = `import {readFileSync} from 'node:fs';import {blankMap} from '../../packages/map-core/index.js';import {createTinderboxScene} from '../../packages/adapters/tinderbox/index.js';
const recipe=JSON.parse(readFileSync(new URL('../../tests/fixtures/consumers/tinderbox/flat-yard-recipe.json',import.meta.url)));
const m=blankMap(recipe.name);m.starts=structuredClone(recipe.starts);m.exits=structuredClone(recipe.exits);m.wallRuns={version:1,segments:[...structuredClone(recipe.walls),{id:'near',a:[20.6,24],b:[20.6,26],z:0,stories:1,material:'wood'}]};
for(const p of recipe.terrain)for(let y=p.y;y<p.y+p.height;y++)for(let x=p.x;x<p.x+p.width;x++)m.terrain[y][x]=p.value;
try{createTinderboxScene(m,recipe.policy);console.log('accepted');}catch(e){console.log(e.code);}`;
fs.writeFileSync(path.join(root, 'artifacts/exp/clearance-probe.mjs'), probe);
result.M05_baseline = run(['artifacts/exp/clearance-probe.mjs']).stdout.trim();
result.M05_mutant = withMutant('packages/adapters/tinderbox/index.js', '< radius - 1e-10', '< -1', () => run(['artifacts/exp/clearance-probe.mjs']).stdout.trim());
result.M16 = withMutant('apps/editor/editor.js',
  '    if (gameAdapter.manifest) assertBlueprintCompatible(document.map, gameAdapter.manifest);\n    else assertMapCapabilities(document.map,gameAdapter.features||[]);\n', '\n', () => {
    const build = run(['tools/build.mjs']);
    const review = run(['tools/review-engine-integration.mjs'], {env: {...process.env}});
    const out = (review.stdout || '') + (review.stderr || '');
    return {build: build.status, reviewStatus: review.status, reviewError: (/(?:Error|AssertionError)[^\n]*/.exec(out) || [''])[0].slice(0, 200)};
  });
const rebuild = run(['tools/build.mjs']);
result.rebuiltAfterRestore = rebuild.status;
execFileSync('git', ['-C', root, 'checkout', '--', 'apps/editor/editor.js', 'packages/adapters/tinderbox/index.js']);
result.status = execFileSync('git', ['-C', root, 'status', '--short', '--untracked-files=no'], {encoding: 'utf8'});
console.log(JSON.stringify(result, null, 2));
