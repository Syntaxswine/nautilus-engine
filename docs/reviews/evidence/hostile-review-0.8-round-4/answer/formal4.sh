#!/bin/bash
# Formal measurements for the answer to round 4, on a quiet box, one after another.
# 1. GPU: main 0.10 (A) against the candidate (B), every map, assets only, --expect.
# 2. GPU: the candidate's per-copy build (instancing:false, A) against the candidate (B),
#    on the maps that still batch (round 4's MF-C: measure against instancing:false).
# 3. SwiftShader: main against the candidate, pixels (captures on runs 0 and 1, run 1 the
#    repeat control) and the triangle-bound proxy, the lit Gross district included.
set -u
T="<author>"; B="<baseline>"; M="<measured>"
R4="<scratch>"; S="$R4/formal-r4"; P="$R4/trees/p2"
mkdir -p "$S"
echo "measured tree $(git -C "$M" rev-parse --short HEAD) status [$(git -C "$M" status --porcelain)]; per-copy arm $(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).method)" "$P/.bench-tree.json")" >> "$S/load.txt"
load() { echo "$(date +%H:%M:%S) load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')% free $(powershell -NoProfile -Command '[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)')GB $1" >> "$S/load.txt"; }
load start-gpu
node "$T/tools/bench-asset-rendering.mjs" --editor --a "$B" --b "$M" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --expect --maps "$M/artifacts/bench/maps" --out "$S/editor-gpu.json" > "$S/editor-gpu.log" 2>&1
echo "GPU_EXIT $?" >> "$S/editor-gpu.log"; load end-gpu
node "$T/tools/bench-asset-rendering.mjs" --editor --a "$P" --b "$M" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --maps "$M/artifacts/bench/maps" \
  --scenes w0-blank,w1-32x-largest,w8-gross-rows-of-8,l1-32x-largest-lamps,l1-blank,l8-gross-rows-of-8-lamps,l8-blank \
  --out "$S/percopy-gpu.json" > "$S/percopy-gpu.log" 2>&1
echo "PERCOPY_EXIT $?" >> "$S/percopy-gpu.log"; load end-percopy
node "$T/tools/bench-asset-rendering.mjs" --editor --a "$B" --b "$M" --runs 2 --backend swiftshader --opens 1 --maps "$M/artifacts/bench/maps" \
  --scenes w0-blank,w1-32x-largest,w4-32-gross,w7-mixed-13-gross-19-largest,w8-gross-rows-of-8,l1-32x-largest-lamps,l1-blank,l4-32-gross-lamps,l4-blank,l7-mixed-13-gross-19-largest-lamps,l7-blank \
  --out "$S/editor-swiftshader.json" > "$S/editor-swiftshader.log" 2>&1
echo "SWIFT_EXIT $?" >> "$S/editor-swiftshader.log"; load end-swift
