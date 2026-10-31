#!/usr/bin/env bash
# Round-3 GPU timing, run from the sandbox root. The answer's own instrument
# (tools/bench-asset-rendering.mjs --editor, two pages of one Edge, ABBA blocks),
# main 0.10 as the A arm. Exit codes and load go into summary.txt (a pipe would
# swallow them).
#   timing.sh <baseline tree> <out dir>
set -u
BASE="$1"; OUT="$2"; mkdir -p "$OUT"; S="$OUT/summary.txt"
load() { powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Processor).LoadPercentage" 2>/dev/null | tr -d '\r\n'; }
echo "started $(date -Iseconds) cpu $(load)%" > "$S"
echo "head $(git rev-parse HEAD) status [$(git status --short | tr '\n' ';')]" >> "$S"
run() { local name="$1"; shift; echo "$name start $(date -Iseconds) cpu $(load)%" >> "$S"; "$@" > "$OUT/$name.log" 2>&1; echo "$name exit $? end $(date -Iseconds) cpu $(load)%" >> "$S"; }
# 1. The record's claims on the plain workloads: a subset, assets only, with --expect.
run plain node tools/bench-asset-rendering.mjs --editor --a "$BASE" --runs 4 --backend gpu --frames 30 --blocks 4 --opens 1 --assets-only --expect --scenes w0-blank,w1-32x-largest,w4-32-gross,w5b-walls-free-angle,w6-roofs-144 --out "$OUT/plain-gpu.json"
# 2. The same instrument on lamp-lit copies of the workloads (six fire lamps; blank with the same lamps).
for id in w1-32x-largest w7-mixed-13-gross-19-largest w4-32-gross w5b-walls-free-angle w6-roofs-144; do
  run "lamps-$id" node tools/bench-asset-rendering.mjs --editor --a "$BASE" --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --maps "artifacts/r08-3/lamp-maps/$id" --out "$OUT/lamps-$id-gpu.json"
done
echo "finished $(date -Iseconds) cpu $(load)%" >> "$S"
