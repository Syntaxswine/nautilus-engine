#!/bin/bash
# Formal measurements for the answer to round 3, on a quiet box, one after another.
# GPU: main 0.10 (A) against the candidate (B), every map, assets only, --expect.
# SwiftShader: pixels (captures on runs 0 and 1, run 1 the repeat control) and the
# triangle-bound proxy, on the maps this answer changes plus their controls.
set -u
T="<author>"; B="<baseline>"; M="<measured>"
S="<scratch>"
mkdir -p "$S"
# The measured tree: the clean mutation worktree at the answer's last code commit, built.
git -C "$M" checkout -q --detach d7b38bf && (cd "$M" && node tools/build.mjs > "$S/build-m.log" 2>&1) && echo "measured tree $(git -C "$M" rev-parse --short HEAD) status [$(git -C "$M" status --porcelain)]" >> "$S/load.txt"
load() { echo "$(date +%H:%M:%S) load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')%" >> "$S/load.txt"; }
load
node "$T/tools/bench-asset-rendering.mjs" --editor --a "$B" --b "$M" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --expect --maps "$T/artifacts/bench/maps" --out "$S/editor-gpu.json" > "$S/editor-gpu.log" 2>&1
echo "GPU_EXIT $?" >> "$S/editor-gpu.log"; load
node "$T/tools/bench-asset-rendering.mjs" --editor --a "$B" --b "$M" --runs 2 --backend swiftshader --opens 1 --maps "$T/artifacts/bench/maps" \
  --scenes w0-blank,w1-32x-largest,w4-32-gross,w7-mixed-13-gross-19-largest,l1-32x-largest-lamps,l1-blank,l7-mixed-13-gross-19-largest-lamps,l7-blank \
  --out "$S/editor-swiftshader.json" > "$S/editor-swiftshader.log" 2>&1
echo "SWIFT_EXIT $?" >> "$S/editor-swiftshader.log"; load
