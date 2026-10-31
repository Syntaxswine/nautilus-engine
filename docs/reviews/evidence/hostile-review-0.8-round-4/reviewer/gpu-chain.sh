#!/bin/bash
# Round 4 GPU jobs, one after another on a quiet box: InstancedMesh vs CopyBatch, per-copy
# batches vs CopyBatch, the GPU-timer control, the memory probe.
set -u
S="$(cd "$(dirname "$0")/../.." && pwd)"; B="$(cd "$S/../ne-r08" && pwd)"; R="$S/artifacts/r08-4"; export R4_SCRATCH
bash "$R/ab-inst.sh"
bash "$R/ab-percopy.sh"
echo "$(date +%H:%M:%S) start timer-control" >> "$R/timing/load.txt"
node "$R/timer-control.mjs" "$R/timing/timer-control.json" main="$B" cand="$S" -- l1-32x-largest-lamps 1,3 > "$R/timing/timer-control.log" 2>&1; echo "EXIT $?" >> "$R/timing/timer-control.log"
echo "$(date +%H:%M:%S) start memory" >> "$R/timing/load.txt"
node "$R/memory-probe.mjs" "$R/timing/memory.json" main="$B" inst="$R4_SCRATCH/tree-1518afe" cand="$S" -- w1-32x-largest 40 > "$R/timing/memory.log" 2>&1; echo "EXIT $?" >> "$R/timing/memory.log"
echo "$(date +%H:%M:%S) chain done load $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor).LoadPercentage')%" >> "$R/timing/load.txt"
