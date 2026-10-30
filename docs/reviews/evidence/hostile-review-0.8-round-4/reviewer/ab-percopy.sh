#!/bin/bash
# Round 4: the record's proposed next step, in its limit. "Batch only neighbouring copies, so
# sparse repeats draw as per-copy batches": for the 32 Gross houses (2-3 copies of each
# design, spread over the district) single linkage leaves nearly every copy alone, i.e. the
# editor's own instancing:false (per-copy display batches, round 3's E1). A = cb720d8 with
# that option (built copy), B = cb720d8. Paired by the answer's own instrument.
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; P="${R4_SCRATCH:?set R4_SCRATCH}/tree-p1"; O="$S/artifacts/r08-4/timing"
mkdir -p "$O"
load() { echo "$(date +%H:%M:%S) $1 load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')% free $(powershell -NoProfile -Command '[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)') GB" >> "$O/load.txt"; }
load start-percopy-vs-copybatch
node "$S/tools/bench-asset-rendering.mjs" --editor --a "$P" --b "$S" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only \
  --maps "$S/artifacts/bench/maps" \
  --scenes w0-blank,w4-32-gross,l1-32x-largest-lamps,l1-blank,l4-32-gross-lamps,l4-blank \
  --out "$O/percopy-vs-copybatch.json" > "$O/percopy-vs-copybatch.log" 2>&1
echo "EXIT $?" >> "$O/percopy-vs-copybatch.log"; load end-percopy-vs-copybatch
