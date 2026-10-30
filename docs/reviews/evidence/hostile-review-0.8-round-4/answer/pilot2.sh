#!/bin/bash
set -u
W="<author>"; R4="<scratch>"
load() { echo "$(date +%H:%M:%S) load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')% $1" >> "$R4/pilot-load.txt"; }
load start-rows
node "$W/tools/bench-asset-rendering.mjs" --editor --a "$R4/trees/p" --b "$R4/trees/h" --runs 2 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --maps "$R4/rows-maps" --out "$R4/pilot-rows-percopy-vs-hybrid.json" > "$R4/pilot-rows-percopy-vs-hybrid.log" 2>&1
echo "EXIT $?" >> "$R4/pilot-rows-percopy-vs-hybrid.log"; load end-rows
