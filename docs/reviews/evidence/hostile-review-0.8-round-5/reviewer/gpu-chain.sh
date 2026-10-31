#!/bin/bash
# Round 5 GPU timings, one after another on the quiet box (RTX 3080, ANGLE D3D11), the answer's
# instrument and formal options (20 frames x 4 blocks, A B B A, assets only):
#  1. main 0.10 (A) against the candidate (B): a subset of the benchmark, unlit and lamp-lit,
#     with --expect (every map's blank is its null control);
#  2. main against the candidate on the densest cluster the editor allows (32 copies of one
#     Gross design in a grid; unlit, and ringed by 12 night lamps) - maps from massive-maps.mjs;
#  3. the candidate's per-copy build (instancing:false, A) against the candidate (B) on every map
#     that batches: the answer's own per-copy table (w1, w8, l1, l8) and the grid;
#  4. edit and view-toggle latency, main against the candidate (round 4's edit-timing.mjs).
# Usage: bash gpu-chain.sh <baseline> <per-copy tree>
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; R="$S/artifacts/r08-5"; O="$R/timing"; B="${1:?baseline}"; P="${2:?per-copy tree}"
mkdir -p "$O"
load() { echo "$(date +%H:%M:%S) $1 load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')% free $(powershell -NoProfile -Command '[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)') GB" >> "$O/load.txt"; }
echo "sandbox $(git -C "$S" rev-parse --short HEAD) status [$(git -C "$S" status --porcelain)]; baseline $(git -C "$B" rev-parse --short HEAD) status [$(git -C "$B" status --porcelain)]; per-copy $(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).method)" "$P/.bench-tree.json")" >> "$O/load.txt"
load start-1
node "$S/tools/bench-asset-rendering.mjs" --editor --a "$B" --b "$S" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --expect --maps "$R/maps-all" \
  --scenes w0-blank,w1-32x-largest,w4-32-gross,w8-gross-rows-of-8,l1-32x-largest-lamps,l1-blank,l4-32-gross-lamps,l4-blank,l8-gross-rows-of-8-lamps,l8-blank,l4n-32-gross-12-night-lamps,l4n-blank \
  --out "$O/main-vs-candidate.json" > "$O/main-vs-candidate.log" 2>&1
echo "EXIT $?" >> "$O/main-vs-candidate.log"; load end-1
node "$S/tools/bench-asset-rendering.mjs" --editor --a "$B" --b "$S" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --maps "$R/maps-all" \
  --scenes w0-blank,g1-gross-grid-32,n1-gross-grid-32-night,n1-blank \
  --out "$O/main-vs-candidate-grid.json" > "$O/main-vs-candidate-grid.log" 2>&1
echo "EXIT $?" >> "$O/main-vs-candidate-grid.log"; load end-2
node "$S/tools/bench-asset-rendering.mjs" --editor --a "$P" --b "$S" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --maps "$R/maps-all" \
  --scenes w0-blank,w1-32x-largest,w8-gross-rows-of-8,l1-32x-largest-lamps,l1-blank,l8-gross-rows-of-8-lamps,l8-blank,g1-gross-grid-32,n1-gross-grid-32-night,n1-blank \
  --out "$O/percopy-vs-candidate.json" > "$O/percopy-vs-candidate.log" 2>&1
echo "EXIT $?" >> "$O/percopy-vs-candidate.log"; load end-3
for m in w8-gross-rows-of-8 w1-32x-largest g1-gross-grid-32; do
  MAPS="$R/maps-all" node "$R/edit-timing.mjs" "$O/edit-$m.json" main="$B" candidate="$S" -- "$m" 10 > "$O/edit-$m.log" 2>&1; echo "EXIT $?" >> "$O/edit-$m.log"
done
load end-4
echo "$(date +%H:%M:%S) gpu-chain done" >> "$O/done.txt"
