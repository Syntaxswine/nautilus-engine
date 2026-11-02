// Compare a fresh review:integration record with the author's committed answer/acceptance.json:
// capture hashes, the handoff and host records, errors, and the whole record minus commit/browser.
// Usage: node compare.mjs <fresh acceptance.json> <committed acceptance.json>
import fs from 'node:fs';
const [fresh, committed] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const by = list => Object.fromEntries(list.map(c => [c.file, c.sha256]));
const a = by(fresh.captures), b = by(committed.captures), strip = o => { const c = structuredClone(o); delete c.sourceCommit; delete c.browser; delete c.buildProvenanceSha256; return JSON.stringify(c); };
console.log(JSON.stringify({freshCommit: fresh.sourceCommit, committedCommit: committed.sourceCommit, browser: [fresh.browser, committed.browser],
  captures: [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().map(file => ({file, identical: a[file] === b[file], sha256: a[file]?.slice(0, 16)})),
  handoffIdentical: JSON.stringify(fresh.handoff) === JSON.stringify(committed.handoff), hostIdentical: JSON.stringify(fresh.host) === JSON.stringify(committed.host),
  buildProvenanceIdentical: fresh.buildProvenanceSha256 === committed.buildProvenanceSha256, errors: fresh.errors, failedRequests: fresh.failedRequests,
  wholeRecordIdenticalExceptCommitAndBrowser: strip(fresh) === strip(committed)}, null, 1));
