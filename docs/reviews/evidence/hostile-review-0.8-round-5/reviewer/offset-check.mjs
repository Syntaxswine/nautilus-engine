// The running stage-c bash has parsed cpu-chain.sh's loop and will resume reading at the byte
// offset just after the old loop's "done". Reconstruct the old text by undoing the two edits,
// and print what lies at that offset in the new file.
import fs from 'node:fs';
const file = process.argv[2], now = fs.readFileSync(file, 'utf8');
const newHeader = "#  d. the editor-path survivors photographed (Walls and Roofs off; the library override on F4's copy),\n#     and the CI gate (review:asset-counts) built into Q5, F1, F3 and B3.";
const oldHeader = '#  d. the CI gate (review:asset-counts) built into Q5, F1 and F3.';
const start = now.indexOf('  d)\n'), ci = now.indexOf('    mkdir -p "$R/ci-gate"\n', start);
const old = now.replace(newHeader, oldHeader).slice(0, 0) + (() => {let t = now.replace(newHeader, oldHeader); const s = t.indexOf('  d)\n'), c = t.indexOf('    mkdir -p "$R/ci-gate"\n', s); t = t.slice(0, s) + '  d)\n' + t.slice(c); return t.replace('    for m in q5 f1 f3 b3; do', '    for m in q5 f1 f3; do');})();
const doneOld = old.lastIndexOf('\ndone\n') + 6, offset = Buffer.byteLength(old.slice(0, doneOld));
const buf = Buffer.from(now);
console.log('old length', Buffer.byteLength(old), 'new length', buf.length, 'resume offset', offset);
console.log('old text after the loop:', JSON.stringify(old.slice(doneOld, doneOld + 120)));
console.log('new text at that offset:', JSON.stringify(buf.subarray(offset, offset + 400).toString('utf8')));
