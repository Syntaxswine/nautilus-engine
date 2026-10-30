#!/bin/bash
# Round 4 re-measure of the answer's GPU tables: main 0.10 (A, the baseline worktree)
# against the candidate (B, this sandbox at cb720d8), the answer's own instrument and
# options (formal3.sh), on a subset of maps: unlit w1/w4 (+ w0 blank) and lamp-lit
# l1/l4/l7 (+ their blanks). Load is sampled before and after each series.
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; B="$(cd "$S/../ne-r08" && pwd)"; O="$S/artifacts/r08-4/timing"
mkdir -p "$O"
load() { echo "$(date +%H:%M:%S) $1 load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')% free $(powershell -NoProfile -Command '[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)') GB" >> "$O/load.txt"; }
echo "candidate $(git -C "$S" rev-parse --short HEAD) status [$(git -C "$S" status --porcelain | grep -v '^?? artifacts' )] baseline $(git -C "$B" rev-parse --short HEAD) status [$(git -C "$B" status --porcelain)]" >> "$O/load.txt"
load start-gpu
node "$S/tools/bench-asset-rendering.mjs" --editor --a "$B" --b "$S" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --expect \
  --maps "$S/artifacts/bench/maps" \
  --scenes w0-blank,w1-32x-largest,w4-32-gross,l1-32x-largest-lamps,l1-blank,l4-32-gross-lamps,l4-blank,l7-mixed-13-gross-19-largest-lamps,l7-blank \
  --out "$O/gpu-subset.json" > "$O/gpu-subset.log" 2>&1
echo "GPU_EXIT $?" >> "$O/gpu-subset.log"; load end-gpu
