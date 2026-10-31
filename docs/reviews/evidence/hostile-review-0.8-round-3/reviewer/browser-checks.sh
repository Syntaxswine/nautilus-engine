#!/usr/bin/env bash
# Round-3 browser checks that read built dist/ folders only (safe beside the mutation
# job, which edits sandbox sources): SwiftShader pixel probes, then the answer's bench
# on built mutant copies (counts and refusals; timings not used). Run from the sandbox.
#   browser-checks.sh <baseline> <mutant trees dir>
set -u
BASE="$1"; TREES="$2"; OUT="artifacts/r08-3/browser"; mkdir -p "$OUT"; S="$OUT/summary.txt"; P=artifacts/r08-3/pixel
echo "started $(date -Iseconds)" > "$S"
run() { local name="$1"; shift; local t0=$(date +%s); "$@" > "$OUT/$name.log" 2>&1; echo "$name exit $? $(( $(date +%s) - t0 ))s $(date -Iseconds)" >> "$S"; }
# 1. Pixels, main 0.10 (A) against the candidate (B), strong oracle, classes, components.
run pixels-lights node $P/pixel-probe.mjs --a "$BASE" --b . --cases $P/cases-r3-lights.json --out "$OUT/pixels-lights.json" --reduced-motion
run pixels-instancing node $P/pixel-probe.mjs --a "$BASE" --b . --cases $P/cases-r3-instancing.json --out "$OUT/pixels-instancing.json" --reduced-motion
run pixels-new node $P/pixel-probe.mjs --a "$BASE" --b . --cases $P/cases-r3-new.json --out "$OUT/pixels-new.json" --reduced-motion
# 2. The candidate (A) against its culling mutants (B): what does a far view show?
run pixels-I1 node $P/pixel-probe.mjs --a . --b "$TREES/tree-I1-instance-bounds-template-only" --cases $P/cases-r3-culling-mutants.json --out "$OUT/pixels-I1.json"
run pixels-I10 node $P/pixel-probe.mjs --a . --b "$TREES/tree-I10-copy-1-offset-1cm" --cases $P/cases-r3-i10.json --out "$OUT/pixels-I10.json"
run pixels-R1 node $P/pixel-probe.mjs --a . --b "$TREES/tree-R1-merged-bounds-first-roof" --cases $P/cases-r3-culling-mutants.json --out "$OUT/pixels-R1.json"
# 3. The answer's bench with --assets-only --expect, candidate (A) against each mutant (B), GPU.
for m in I1-instance-bounds-template-only E1-editor-never-instances; do
  run "bench-$m" node tools/bench-asset-rendering.mjs --editor --a . --b "$TREES/tree-$m" --runs 2 --backend gpu --frames 5 --blocks 2 --opens 1 --assets-only --expect --scenes w0-blank,w1-32x-largest --out "$OUT/bench-$m.json"
done
for m in R1-merged-bounds-first-roof E2-editor-never-merges-roofs; do
  run "bench-$m" node tools/bench-asset-rendering.mjs --editor --a . --b "$TREES/tree-$m" --runs 2 --backend gpu --frames 5 --blocks 2 --opens 1 --assets-only --expect --scenes w0-blank,w6-roofs-144 --out "$OUT/bench-$m.json"
done
echo "finished $(date -Iseconds)" >> "$S"
