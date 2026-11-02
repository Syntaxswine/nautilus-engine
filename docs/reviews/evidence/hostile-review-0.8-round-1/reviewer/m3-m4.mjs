// M3/M4 re-check on this tree.
// M3: can the agent-built collections be placed? Is the registry still fixed?
// M4: can the editor author a reusable asset (save-as-asset, manifest, schema)?
// Control: a shipped house must place, and a known house in a blocked spot must
// fail with a DIFFERENT message, so "Unknown building asset" is a real signal.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {sandbox, git, writeResult, nodeRig} from './lib/common.mjs';

const core = await import(pathToFileURL(path.join(sandbox, 'packages/map-core/index.js')).href);
const prefab = await import(pathToFileURL(path.join(sandbox, 'packages/prefab-core/index.js')).href);
const yard = core.blankMap('Structures');
yard.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}]; yard.exits = [{x: 8, y: 8}];
const place = (asset, x = 30, y = 30, map = yard) => { try { const r = core.placeBuilding(map, {asset, x, y, turns: 0, clearance: 2}); return r.map?.buildingPrefabs?.instances?.length ? 'placed' : 'no instance'; } catch (e) { return 'REJECTED: ' + e.message.slice(0, 110); } };
const agentBuilt = {
  'codex/measured-building-art (8631b0c), via fort branch e375a1a': ['ellis-hospital-two', 'boott-mill-four', 'quincy-market-hall'],
  'codex/h-plan-apartments (e5abac5)': ['alder-court', 'mercer-courts'],
};
const placement = {registryCount: core.BUILDING_ASSETS.length, control_shipped: place('albany-cottage')};
const occupied = core.placeBuilding(yard, {asset: 'albany-cottage', x: 30, y: 30, turns: 0, clearance: 2}).map;
placement.control_blockedKnownAsset = place('albany-cottage', 31, 31, occupied);
for (const [branch, ids] of Object.entries(agentBuilt)) placement[branch] = Object.fromEntries(ids.map((id) => [id, place(id)]));
const branches = ['codex/measured-building-art', 'codex/h-plan-apartments', 'codex/fort-apache-art', 'codex/fort-era-variants', 'codex/frontier-stockade-art', 'codex/bathroom-art', 'codex/missile-silo-art', 'codex/nautilus-art'];
const merged = Object.fromEntries(branches.map((b) => { const sha = git(['rev-parse', '--short', b]).trim(); let m; try { git(['merge-base', '--is-ancestor', b, 'HEAD']); m = true; } catch { m = false; } return [b, {tip: sha, ancestorOfHead: m}]; }));
const registry = fs.readFileSync(path.join(sandbox, 'packages/prefab-core/registry.js'), 'utf8');
const registryFacts = {
  hardCodedCollectionImports: [...registry.matchAll(/^import .* from '\.\/(catalogue|original-catalogue)\.js';$/gm)].map((m) => m[1]),
  combinedCatalogueId: registry.match(/COMBINED_PREFAB_CATALOGUE='([^']+)'/)?.[1],
  binaryProviderBranch: /provider==='original'/.test(registry),
  exportsARegistrationFunction: /export function register/.test(registry),
};
// M4: search the tracked tree for an asset-authoring path.
const tracked = git(['ls-files']).split('\n').filter(Boolean);
const grepFiles = (re, filter) => tracked.filter((f) => filter(f) && /\.(m?js|json|html)$/.test(f)).filter((f) => re.test(fs.readFileSync(path.join(sandbox, f), 'utf8')));
const m4 = {
  schemas: tracked.filter((f) => f.startsWith('schemas/')).map((f) => f.slice(8)),
  buildingOrPartSchema: tracked.filter((f) => /schemas\/.*(building|part|asset|assembly)/i.test(f)),
  editorSaveAsAssetCode: grepFiles(/save[- ]?as[- ]?(asset|part|building|prefab)|exportAsset|saveAsset|createPartDefinition|definePart/i, (f) => f.startsWith('apps/') || f.startsWith('packages/')),
  blockRejectsPrefabs: /Building prefabs belong to full maps/.test(fs.readFileSync(path.join(sandbox, 'packages/prefab-core/index.js'), 'utf8')),
  functionalPartsPlanIsDocsOnly: git(['diff', '--name-only', '8c4670450cb2b38c1e1abd811d633c22de9e2b7c', 'HEAD']).split('\n').filter(Boolean).filter((f) => !f.startsWith('docs/') && !f.endsWith('.md')),
};
const out = {rig: nodeRig(), placement, artBranchesMergedIntoHead: merged, registryFacts, m4,
  verdict: {m3PlacementStillRejected: Object.values(placement).filter((v) => typeof v === 'object').every((o) => Object.values(o).every((s) => s.startsWith('REJECTED: Unknown'))),
    controlsDiscriminate: placement.control_shipped === 'placed' && placement.control_blockedKnownAsset.startsWith('REJECTED') && !placement.control_blockedKnownAsset.includes('Unknown')}};
writeResult('m3-m4.json', out);
console.log(JSON.stringify(out, null, 1));
