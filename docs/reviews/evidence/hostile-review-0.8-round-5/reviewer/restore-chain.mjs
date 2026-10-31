// Put cpu-chain.sh back to the bytes the running stage-c bash parsed (so it resumes at its old
// trailing echo), after saving the edited stage d as cpu-chain-d.sh. Never edit a script that a
// running bash is executing: bash re-reads it from a byte offset.
import fs from 'node:fs';
import path from 'node:path';
const file = process.argv[2], now = fs.readFileSync(file, 'utf8');
const newHeader = "#  d. the editor-path survivors photographed (Walls and Roofs off; the library override on F4's copy),\n#     and the CI gate (review:asset-counts) built into Q5, F1, F3 and B3.";
const oldHeader = '#  d. the CI gate (review:asset-counts) built into Q5, F1 and F3.';
let old = now.replace(newHeader, oldHeader);
const s = old.indexOf('  d)\n'), c = old.indexOf('    mkdir -p "$R/ci-gate"\n', s), dNew = now.slice(now.indexOf('  d)\n'), now.indexOf('    ;;\n', now.indexOf('  d)\n')) + 7);
old = old.slice(0, s) + '  d)\n' + old.slice(c);
old = old.replace('    for m in q5 f1 f3 b3; do', '    for m in q5 f1 f3; do');
if (Buffer.byteLength(old) !== 5686) throw Error('reconstruction is ' + Buffer.byteLength(old) + ' bytes, not 5686');
const d = '#!/bin/bash\n# Round 5, stage d (split from cpu-chain.sh): the editor-path survivors photographed (Walls and\n# Roofs off on F1/F2/F3; the library override on F4\'s copy), and the CI gate (review:asset-counts)\n# built into Q5, F1, F3 and B3.\n#   bash cpu-chain-d.sh <scratch>\nset -u\nS="$(cd "$(dirname "$0")/../.." && pwd)"; R="$S/artifacts/r08-5"; SC="${1:?scratch}"; C=059e71a\n' +
  dNew.replace('  d)\n', '').replace(/\n    ;;\n$/, '\n').split('\n').map(l => l.replace(/^    /, '')).join('\n') + 'echo "$(date +%H:%M:%S) cpu-chain-d done" >> "$R/cpu-chain.txt"\n';
fs.writeFileSync(path.join(path.dirname(file), 'cpu-chain-d.sh'), d);
fs.writeFileSync(file, old);
console.log('restored', Buffer.byteLength(old), 'bytes; wrote cpu-chain-d.sh', Buffer.byteLength(d), 'bytes');
