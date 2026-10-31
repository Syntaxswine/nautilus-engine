#!/bin/bash
# Round 5, the load-independent work, after the GPU timings and one job at a time, in stages:
#  a. built copies (make-tree.mjs: git archive of the commit + one edit + build, outside any work
#     tree): the half-radius copy spheres (the pixel probe's must-differ control), and Q5, F1, F3
#     for the CI gate; pixels (SwiftShader): the candidate, the candidate again (the repeat
#     control), its per-copy build, main 0.10 and the half-radius control on every map that
#     batches, in five views; the layer audit (place, move, turn, delete, undo, a pending load,
#     the override); undo/redo through the UI; the library preview batched and per copy; the
#     CopyBatch setups per frame (D3D11, draws stubbed);
#  b. mutation phase 1 (in place on the sandbox, restored after each mutant), then the survivors
#     and the bench's mutants against the whole suite and tools/check.mjs;
#  c. SF-G: the digest escapes through the documented refresh (refresh-check.sh; G11 the control,
#     round 4's Q7 the reproduction), then each refreshed copy photographed against the candidate;
#  d. the CI gate (review:asset-counts) built into Q5, F1 and F3.
# Usage: bash cpu-chain.sh <baseline> <scratch> <stage> [<stage> ...]
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; R="$S/artifacts/r08-5"; B="${1:?baseline}"; SC="${2:?scratch}"; shift 2; C=059e71a
log() { echo "$(date +%H:%M:%S) $1 load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')% free $(powershell -NoProfile -Command '[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)') GB" >> "$R/cpu-chain.txt"; }
for stage in "$@"; do
  log "start-$stage"
  case "$stage" in
  a)
    for m in half q5 f1 f3; do
      [ -d "$SC/r5/trees/$m" ] || ( cd "$R" && node make-tree.mjs "$S" "$C" "$SC/r5/trees/$m" --edits "edits/$m.json" ) >> "$R/trees.log" 2>&1
    done
    mkdir -p "$R/pixels"
    MAPS="$R/maps-all" node "$R/pixels.mjs" "$R/pixels/result.json" cand="$S" cand2="$S" pc="$SC/r5/trees/percopy" main="$B" half="$SC/r5/trees/half" -- w1-32x-largest,w8-gross-rows-of-8,g1-gross-grid-32,l8-gross-rows-of-8-lamps,n1-gross-grid-32-night > "$R/pixels/run.log" 2>&1; echo "EXIT $?" >> "$R/pixels/run.log"
    node "$R/compare-px.mjs" "$R/pixels/result.json" cand:cand2 cand:pc cand:main pc:main cand:half > "$R/pixels/compare.log" 2>&1; echo "EXIT $?" >> "$R/pixels/compare.log"
    ( cd "$S" && node artifacts/r08-5/layer-invariants.mjs artifacts/r08-5/layer-invariants.json ) > "$R/layer-invariants.log" 2>&1; echo "EXIT $?" >> "$R/layer-invariants.log"
    ( cd "$S" && node artifacts/r08-5/undo-check.mjs artifacts/r08-5/undo-check.json "$S" ) > "$R/undo-check.log" 2>&1; echo "EXIT $?" >> "$R/undo-check.log"
    ( cd "$S" && node artifacts/r08-5/preview-check.mjs artifacts/r08-5/preview-check.json "$S" ) > "$R/preview-check.log" 2>&1; echo "EXIT $?" >> "$R/preview-check.log"
    ( cd "$S" && MAPS=artifacts/r08-5/maps-all node artifacts/r08-5/setups.mjs artifacts/r08-5/setups.json "$S" -- w1-32x-largest,l1-32x-largest-lamps,w8-gross-rows-of-8,l8-gross-rows-of-8-lamps,g1-gross-grid-32,n1-gross-grid-32-night ) > "$R/setups.log" 2>&1; echo "EXIT $?" >> "$R/setups.log"
    ;;
  b)
    mkdir -p "$R/mutation"
    node "$R/mutate-r5.mjs" "$S" "$R/mutation/phase1.json" > "$R/mutation/phase1.log" 2>&1; echo "EXIT $?" >> "$R/mutation/phase1.log"
    SURV=$(node -e "const r=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(r.summary.survived.join(','))" "$R/mutation/phase1.json")
    # The bench's mutants have no module test; they go straight to the whole suite and the check.
    ALL="${SURV}${SURV:+,}B1-own-flag-always-true,B2-open-wait-dropped,B3-cutaway-no-wait"
    node "$R/mutate-r5.mjs" "$S" "$R/mutation/confirm.json" --confirm --only "$ALL" > "$R/mutation/confirm.log" 2>&1; echo "EXIT $?" >> "$R/mutation/confirm.log"
    ;;
  c)
    bash "$R/refresh-check.sh" "$C" "$SC/r5" g11-control q7 s1-atlas-unused s2-hook-with-renderer s2b-hook-under-lamps s3-inherited-onBeforeRender s4-glass-sphere-shrunk s6-glass-morph-up s7-floor-offset-flipped s8-atlas-colour-space > "$R/refresh-check.log" 2>&1
    # Are the escapes visible? Each refreshed copy's editor against the candidate's, SwiftShader, on
    # the 32 distinct originals and the lamp-lit mixed district (overview, close, level-0 cutaway).
    mkdir -p "$R/pixels-mutants"; T="$SC/r5/trees"
    MAPS="$R/maps-all" node "$R/pixels.mjs" "$R/pixels-mutants/result.json" cand="$S" g11="$T/refresh-g11-control" s1="$T/refresh-s1-atlas-unused" s2="$T/refresh-s2-hook-with-renderer" s2b="$T/refresh-s2b-hook-under-lamps" s3="$T/refresh-s3-inherited-onBeforeRender" s4="$T/refresh-s4-glass-sphere-shrunk" s6="$T/refresh-s6-glass-morph-up" s7="$T/refresh-s7-floor-offset-flipped" s8="$T/refresh-s8-atlas-colour-space" \
      -- w3-32-distinct-most-triangles,l7-mixed-13-gross-19-largest-lamps overview,close,cutaway > "$R/pixels-mutants/run.log" 2>&1; echo "EXIT $?" >> "$R/pixels-mutants/run.log"
    node "$R/compare-px.mjs" "$R/pixels-mutants/result.json" cand:g11 cand:s1 cand:s2 cand:s2b cand:s3 cand:s4 cand:s6 cand:s7 cand:s8 > "$R/pixels-mutants/compare.log" 2>&1; echo "EXIT $?" >> "$R/pixels-mutants/compare.log"
    ;;
  d)
    mkdir -p "$R/ci-gate"
    for m in q5 f1 f3; do
      ( cd "$SC/r5/trees/$m" && node tools/bench/workloads.mjs --quiet && node tools/bench-asset-rendering.mjs --editor --counts-only --backend swiftshader --expect --out "$R/ci-gate/$m.json" ) > "$R/ci-gate/$m.log" 2>&1; echo "EXIT $?" >> "$R/ci-gate/$m.log"
    done
    ;;
  esac
  log "end-$stage"
done
echo "$(date +%H:%M:%S) cpu-chain $* done" >> "$R/cpu-chain.txt"
