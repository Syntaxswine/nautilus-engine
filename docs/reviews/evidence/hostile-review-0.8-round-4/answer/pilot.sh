#!/bin/bash
# Pilots for the answer to round 4, one after another on a quiet box, the formal
# instrument's pairing (two pages, A B B A), 2 runs: the threshold (per-copy against the
# clustered hybrid) and the runs (no runs against runs), on the copies and the rows of three.
set -u
W="<author>"; R4="<scratch>"
load() { echo "$(date +%H:%M:%S) load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')% $1" >> "$R4/pilot-load.txt"; }
MAPS=w0-blank,w1-32x-largest,l1-32x-largest-lamps,l1-blank,w8-gross-rows-of-3,l8-gross-rows-of-3-lamps,l8-blank
load start-threshold
node "$W/tools/bench-asset-rendering.mjs" --editor --a "$R4/trees/p" --b "$R4/trees/h" --runs 2 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --maps "$W/artifacts/bench/maps" --scenes $MAPS --out "$R4/pilot-percopy-vs-hybrid.json" > "$R4/pilot-percopy-vs-hybrid.log" 2>&1
echo "EXIT $?" >> "$R4/pilot-percopy-vs-hybrid.log"; load end-threshold
node "$W/tools/bench-asset-rendering.mjs" --editor --a "$R4/trees/n" --b "$R4/trees/h" --runs 2 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --maps "$W/artifacts/bench/maps" --scenes $MAPS --out "$R4/pilot-noruns-vs-runs.json" > "$R4/pilot-noruns-vs-runs.log" 2>&1
echo "EXIT $?" >> "$R4/pilot-noruns-vs-runs.log"; load end-runs
