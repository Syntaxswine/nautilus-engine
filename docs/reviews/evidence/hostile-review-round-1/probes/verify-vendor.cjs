// Independent provenance check: compare every vendored file's Git blob ID with the donor
// repository's own object at the pinned commit. Read-only (git ls-tree).
// Set AFT_REPO, FARMYARD_REPO and TINDERBOX_REPO to local clones of the three donors.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), {execFileSync} = require('child_process');
const root = path.resolve(__dirname, '../..');
const repos = {
  aft: process.env.AFT_REPO,
  farmyard: process.env.FARMYARD_REPO,
  tinderbox: process.env.TINDERBOX_REPO
};
for (const [name, repo] of Object.entries(repos)) if (!repo) throw Error('Set ' + name.toUpperCase() + '_REPO to a local clone of the ' + name + ' donor.');
const blob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
function treeBlobs(repo, commit) {
  const out = execFileSync('git', ['-C', repo, 'ls-tree', '-r', commit], {maxBuffer: 1 << 28}).toString();
  const map = new Map();
  for (const line of out.split('\n')) { const m = /^\d+ blob ([0-9a-f]{40})\t(.*)$/.exec(line); if (m) map.set(m[2], m[1]); }
  return map;
}
const upstream = JSON.parse(fs.readFileSync(path.join(root, 'upstream.json')));
const plan = [['aft', 'aft'], ['aftAssets', 'aft'], ['farmyard', 'farmyard'], ['searchHalo', 'farmyard'], ['tinderboxPrefabs', 'tinderbox'], ['tinderboxConformance', 'tinderbox']];
const report = {};
for (const [key, repoKey] of plan) {
  const pin = upstream[key], folder = path.join(root, pin.root), manifest = JSON.parse(fs.readFileSync(path.join(folder, 'provenance.json')));
  const tree = treeBlobs(repos[repoKey], pin.commit);
  let match = 0, mismatch = [], missingUpstream = [], hashMismatch = [];
  for (const entry of manifest.files) {
    const bytes = fs.readFileSync(path.join(folder, entry.path));
    const upstreamPath = entry.sourcePath || entry.originalPath || entry.path;
    const want = tree.get(upstreamPath);
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== entry.sha256) hashMismatch.push(entry.path);
    if (!want) { missingUpstream.push(upstreamPath); continue; }
    if (blob(bytes) === want) match++; else mismatch.push(upstreamPath);
  }
  report[key] = {commit: pin.commit.slice(0, 10), files: manifest.files.length, gitBlobMatches: match, gitBlobMismatches: mismatch.slice(0, 10), mismatchCount: mismatch.length, missingUpstream: missingUpstream.slice(0, 10), missingCount: missingUpstream.length, manifestHashMismatches: hashMismatch.length};
}
console.log(JSON.stringify(report, null, 2));
