#!/bin/bash
# Round 4 follow-up: per-copy display batches (instancing:false) against CopyBatch on the
# unlit 32 copies (w1), the case batching copies was built for. Same instrument and options.
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; P="${R4_SCRATCH:?set R4_SCRATCH}/tree-p1"; O="$S/artifacts/r08-4/timing"
load() { echo "$(date +%H:%M:%S) $1 load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')% free $(powershell -NoProfile -Command '[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)') GB" >> "$O/load.txt"; }
load start-percopy-w1
node "$S/tools/bench-asset-rendering.mjs" --editor --a "$P" --b "$S" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only \
  --maps "$S/artifacts/bench/maps" --scenes w0-blank,w1-32x-largest \
  --out "$O/percopy-vs-copybatch-w1.json" > "$O/percopy-vs-copybatch-w1.log" 2>&1
echo "EXIT $?" >> "$O/percopy-vs-copybatch-w1.log"; load end-percopy-w1
