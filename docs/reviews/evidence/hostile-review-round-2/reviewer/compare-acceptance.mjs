// Compare a fresh review:integration record with the committed reusability-roofs record:
// capture hashes, host handoff, page errors and failed requests.
// Usage: node compare-acceptance.mjs <root>
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2]);
const fresh = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/engine-integration/acceptance.json'), 'utf8'));
const committed = JSON.parse(fs.readFileSync(path.join(root, 'docs/reviews/evidence/reusability-roofs/acceptance.json'), 'utf8'));
const byFile = list => Object.fromEntries(list.map(c => [c.file, c.sha256]));
const a = byFile(fresh.captures), b = byFile(committed.captures);
const files = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
console.log(JSON.stringify({sourceCommit: fresh.sourceCommit, browser: fresh.browser, host: fresh.host, versionedUnsupportedHostRejected: fresh.versionedUnsupportedHostRejected,
  errors: fresh.errors, failedRequests: fresh.failedRequests,
  captures: files.map(file => ({file, identical: a[file] === b[file], fresh: a[file]?.slice(0, 12), committed: b[file]?.slice(0, 12)}))}, null, 1));
