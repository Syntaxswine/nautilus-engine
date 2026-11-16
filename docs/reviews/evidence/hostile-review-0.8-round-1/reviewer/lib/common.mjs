// Shared helpers for the round-1 (r08-1) hostile review evidence.
// Every result file records HEAD, `git status --short` and the rig, and every
// string that leaves this process is masked: no usernames or local paths.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const evidenceDir = path.resolve(here, '..');
export const sandbox = path.resolve(evidenceDir, '..', '..');
export const resultsDir = path.join(evidenceDir, 'results');
const home = os.homedir();

// Donor repositories are read only through Git objects. Point these at your own
// clones with R08_TINDERBOX / R08_FARMYARD / R08_AFT3D; they have no defaults
// in this copy.
export const donors = {
  tinderbox: process.env.R08_TINDERBOX || '<tinderbox>',
  farmyard: process.env.R08_FARMYARD || '<farmyard>',
  aft3d: process.env.R08_AFT3D || '<aft3d>',
};

const variants = (p) => {
  const fwd = p.replaceAll('\\', '/');
  return [p, fwd, encodeURI(fwd), fwd.replaceAll(' ', '%20'), p.replaceAll('\\', '\\\\'), 'file:///' + encodeURI(fwd), 'file:///' + fwd];
};
const masks = [
  ...variants(sandbox).map((v) => [v, '<sandbox>']),
  ...variants(donors.tinderbox).map((v) => [v, '<tinderbox>']),
  ...variants(donors.farmyard).map((v) => [v, '<farmyard>']),
  ...variants(donors.aft3d).map((v) => [v, '<aft3d>']),
  ...variants(os.tmpdir()).map((v) => [v, '<scratch>']),
  ...variants(home).map((v) => [v, '<home>']),
].sort((a, b) => b[0].length - a[0].length);
const user = path.basename(home);

export function mask(text) {
  let out = String(text);
  for (const [from, to] of masks) {
    if (!from) continue;
    out = out.split(from).join(to);
    out = out.split(from.toLowerCase()).join(to);
  }
  return out.replace(new RegExp('\\b' + user + '\\b', 'gi'), '<user>');
}

export function git(args, cwd = sandbox) {
  return execFileSync('git', ['--no-optional-locks', '-C', cwd, ...args], {encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28});
}
export function gitBuffer(args, cwd) {
  return execFileSync('git', ['--no-optional-locks', '-C', cwd, ...args], {windowsHide: true, maxBuffer: 1 << 30});
}

export function treeState() {
  return {head: git(['rev-parse', 'HEAD']).trim(), statusShort: git(['status', '--short']).split('\n').filter(Boolean)};
}

export function nodeRig() {
  const cpus = os.cpus();
  return {node: process.version, platform: process.platform + ' ' + os.release(), cpu: cpus[0]?.model?.trim(), logicalCpus: cpus.length, totalMemGiB: Math.round(os.totalmem() / 2 ** 30), loadNote: 'Shared machine: another session runs a rendering benchmark concurrently; wall-clock timings are indicative only.'};
}

export function stats(samples) {
  const s = [...samples].sort((a, b) => a - b), n = s.length, med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  const round = (v) => Math.round(v * 1000) / 1000;
  return {n, median: round(med), min: round(s[0]), max: round(s[n - 1]), spreadPct: round(((s[n - 1] - s[0]) / (med || 1)) * 100)};
}

export function writeResult(name, data) {
  fs.mkdirSync(resultsDir, {recursive: true});
  const record = {generatedAt: new Date().toISOString(), tree: treeState(), ...data};
  const file = path.join(resultsDir, name);
  fs.writeFileSync(file, mask(JSON.stringify(record, null, 2)) + '\n');
  return file;
}

export function loadPlaywright() {
  const {createRequire} = awaitRequire();
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch {
    const modules = process.env.NAUTILUS_ART_NODE_MODULES || path.join(home, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
    return createRequire(path.join(modules, 'playwright/package.json'))('playwright');
  }
}
import * as moduleNs from 'node:module';
function awaitRequire() { return moduleNs; }
