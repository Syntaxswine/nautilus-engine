#!/bin/bash
# Round 4 SwiftShader jobs (load-independent: pixels and counts), one after another.
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; R="$S/artifacts/r08-4"; SC="${R4_SCRATCH:?set R4_SCRATCH}"
mkdir -p "$R/pixels" "$R/gate-mutants"
echo "$(date +%H:%M:%S) start pixels" >> "$R/cpu-chain.txt"
node "$R/pixels.mjs" "$R/pixels/result.json" cand="$S:counts" nomd="$S:nomd" inst="$SC/tree-1518afe" q1="$SC/tree-q1" -- l4-32-gross-lamps,l1-32x-largest-lamps,w4-32-gross,w1-32x-largest > "$R/pixels/run.log" 2>&1; echo "EXIT $?" >> "$R/pixels/run.log"
echo "$(date +%H:%M:%S) start upper-check" >> "$R/cpu-chain.txt"
node "$R/upper-check.mjs" "$R/upper-check.json" "$S" > "$R/upper-check.log" 2>&1; echo "EXIT $?" >> "$R/upper-check.log"
echo "$(date +%H:%M:%S) start drive-path" >> "$R/cpu-chain.txt"
node "$R/drive-path.mjs" "$R/drive-path.json" cand="$S" q5="$SC/tree-q5" -- w4-32-gross > "$R/drive-path.log" 2>&1; echo "EXIT $?" >> "$R/drive-path.log"
for t in q5 k3; do
  echo "$(date +%H:%M:%S) start counts gate $t" >> "$R/cpu-chain.txt"
  node "$S/tools/bench-asset-rendering.mjs" --editor --counts-only --b "$SC/tree-$t" --backend swiftshader --expect --maps "$S/artifacts/bench/maps" --out "$R/gate-mutants/$t.json" > "$R/gate-mutants/$t.log" 2>&1; echo "EXIT $?" >> "$R/gate-mutants/$t.log"
done
echo "$(date +%H:%M:%S) start memory" >> "$R/cpu-chain.txt"
node "$R/memory-probe.mjs" "$R/timing/memory.json" main="$(cd "$S/../ne-r08" && pwd)" inst="$SC/tree-1518afe" cand="$S" -- w1-32x-largest 40 > "$R/timing/memory.log" 2>&1; echo "EXIT $?" >> "$R/timing/memory.log"
echo "$(date +%H:%M:%S) cpu chain done" >> "$R/cpu-chain.txt"
