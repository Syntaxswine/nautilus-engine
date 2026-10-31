#!/bin/bash
# Round 5, stage d (split from cpu-chain.sh): the editor-path survivors photographed (Walls and
# Roofs off on F1/F2/F3; the library override on F4's copy), and the CI gate (review:asset-counts)
# built into Q5, F1, F3 and B3.
#   bash cpu-chain-d.sh <scratch>
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; R="$S/artifacts/r08-5"; SC="${1:?scratch}"; C=059e71a
for m in f2 f4 b3; do
  [ -d "$SC/r5/trees/$m" ] || ( cd "$R" && node make-tree.mjs "$S" "$C" "$SC/r5/trees/$m" --edits "edits/$m.json" ) >> "$R/trees.log" 2>&1
done
MAPS="$R/maps-all" node "$R/options-pixels.mjs" "$R/options-pixels.json" cand="$S" f1="$SC/r5/trees/f1" f2="$SC/r5/trees/f2" f3="$SC/r5/trees/f3" -- w3-32-distinct-most-triangles > "$R/options-pixels.log" 2>&1; echo "EXIT $?" >> "$R/options-pixels.log"
( cd "$S" && node artifacts/r08-5/preview-check.mjs artifacts/r08-5/preview-check-f4.json "$SC/r5/trees/f4" ) > "$R/preview-check-f4.log" 2>&1; echo "EXIT $?" >> "$R/preview-check-f4.log"
mkdir -p "$R/ci-gate"
for m in q5 f1 f3 b3; do
  ( cd "$SC/r5/trees/$m" && node tools/bench/workloads.mjs --quiet && node tools/bench-asset-rendering.mjs --editor --counts-only --backend swiftshader --expect --out "$R/ci-gate/$m.json" ) > "$R/ci-gate/$m.log" 2>&1; echo "EXIT $?" >> "$R/ci-gate/$m.log"
done
echo "$(date +%H:%M:%S) cpu-chain-d done" >> "$R/cpu-chain.txt"
