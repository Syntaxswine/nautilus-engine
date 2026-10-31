#!/usr/bin/env bash
# Round-3 mutation job, run from the clean sandbox root. Exit codes into summary.txt.
#  1. this round's 33 mutants, phase 1 (module tests);
#  2. round 2's 18 confirmed survivors (plus this round's G11, which needs that harness's refresh hooks) with the answer's own harness (copied outside the
#     tracked tree; null exits reported as errors), phase 1 (module tests, plus the check
#     where the harness asks for it);
#  3. every phase-1 survivor of both, against the whole suite and tools/check.mjs.
set -u
OUT="artifacts/r08-3/mutation"; mkdir -p "$OUT"; S="$OUT/summary.txt"
echo "started $(date -Iseconds) head $(git rev-parse HEAD) status [$(git status --porcelain | tr '\n' ';')]" > "$S"
node artifacts/r08-3/mutate-r3.mjs . "$OUT/r3-phase1.json" > "$OUT/r3-phase1.log" 2>&1; echo "r3 phase1 exit $? $(date -Iseconds)" >> "$S"
R2=B4-gross-key-swap,B8-dispose-leaks-batches,B12-uv-swapped,B13-normals-not-rotated,B14-exact-uv-dropped,W2-no-depth-material,W2b-no-distance-material,W3-depth-material-unpatched,W3b-distance-material-unpatched,W4-bounds-quarter,W6-widths-all-one,W7-matrices-slot-zero,G8-door-swing-rebuilt,G5c-glass-opacity-hash-and-registry,G7c-cutaway-shows-trim-rebuilt-and-registry,G9-stairs-refreshed-no-exports,D2-digest-ignores-matrices-refreshed,D3-digest-ignores-userdata-refreshed,G11-emissive-outside-key-refreshed
node artifacts/r08-3/r2rerun/mutate.mjs . --only "$R2" > "$OUT/r2rerun-phase1.log" 2>&1; echo "r2rerun phase1 exit $? $(date -Iseconds)" >> "$S"
cp artifacts/r08-3/r2rerun/mutation-extra.json "$OUT/r2rerun-phase1.json" 2>/dev/null
S3=$(node -e "const r=JSON.parse(require('fs').readFileSync('$OUT/r3-phase1.json','utf8'));process.stdout.write([...r.summary.survived,...r.summary.errors].join(','))")
echo "r3 phase-1 survivors/errors: [$S3]" >> "$S"
if [ -n "$S3" ]; then node artifacts/r08-3/mutate-r3.mjs . "$OUT/r3-confirm.json" --only "$S3" --confirm > "$OUT/r3-confirm.log" 2>&1; echo "r3 confirm exit $? $(date -Iseconds)" >> "$S"; fi
S2=$(node -e "const r=JSON.parse(require('fs').readFileSync('$OUT/r2rerun-phase1.json','utf8'));process.stdout.write([...r.summary.survived,...(r.summary.errors||[])].join(','))")
echo "r2rerun phase-1 survivors/errors: [$S2]" >> "$S"
if [ -n "$S2" ]; then node artifacts/r08-3/r2rerun/mutate.mjs . --only "$S2" --confirm > "$OUT/r2rerun-confirm.log" 2>&1; echo "r2rerun confirm exit $? $(date -Iseconds)" >> "$S"; cp artifacts/r08-3/r2rerun/mutation-confirm.json "$OUT/r2rerun-confirm.json" 2>/dev/null; fi
echo "finished $(date -Iseconds) head $(git rev-parse HEAD) status [$(git status --porcelain | tr '\n' ';')]" >> "$S"
