#!/bin/bash
# Round 4: lamp workloads the record did not measure (18 fires; 12 electric lamps at 22:00;
# 6 spot lights), main 0.10 (A) against the candidate (B), the answer's instrument and
# options, assets only (whose isolated frames also give both arms' culled draws and
# triangles). Maps from beyond-maps.mjs, each with its own blank.
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; B="$(cd "$S/../ne-r08" && pwd)"; O="$S/artifacts/r08-4/timing"; M="$S/artifacts/r08-4/beyond-maps"
mkdir -p "$O"
load() { echo "$(date +%H:%M:%S) $1 load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')% free $(powershell -NoProfile -Command '[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)') GB" >> "$O/load.txt"; }
load start-beyond
node "$S/tools/bench-asset-rendering.mjs" --editor --a "$B" --b "$S" --runs 2 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only \
  --maps "$M" --out "$O/beyond-gpu.json" > "$O/beyond-gpu.log" 2>&1
echo "EXIT $?" >> "$O/beyond-gpu.log"; load end-beyond
