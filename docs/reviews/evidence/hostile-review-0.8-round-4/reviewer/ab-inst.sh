#!/bin/bash
# Round 4: round 3's InstancedMesh build (1518afe, A) against CopyBatch (cb720d8, B), paired
# in one browser by the answer's own instrument, on the maps where the record says
# CopyBatch is slower than instancing (Gross houses, lit and unlit) and where it says it is
# faster (32 copies, lit). The record compared ratios against main from different sessions.
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; I="${R4_SCRATCH:?set R4_SCRATCH}/tree-1518afe"; O="$S/artifacts/r08-4/timing"
mkdir -p "$O"
load() { echo "$(date +%H:%M:%S) $1 load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')% free $(powershell -NoProfile -Command '[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)') GB" >> "$O/load.txt"; }
load start-inst-vs-copybatch
node "$S/tools/bench-asset-rendering.mjs" --editor --a "$I" --b "$S" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only \
  --maps "$S/artifacts/bench/maps" \
  --scenes w0-blank,w4-32-gross,l1-32x-largest-lamps,l1-blank,l4-32-gross-lamps,l4-blank \
  --out "$O/inst-vs-copybatch.json" > "$O/inst-vs-copybatch.log" 2>&1
echo "EXIT $?" >> "$O/inst-vs-copybatch.log"; load end-inst-vs-copybatch
