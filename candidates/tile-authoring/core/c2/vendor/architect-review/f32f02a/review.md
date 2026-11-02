# Private C2 Stage A f32 review

Hold acceptance for four reproducible ledger-consistency defects. All four forged
capture records return `ok:true` from the fixed pure binder; the unchanged positive
capture also passes. These are data-validation witnesses using explicitly
synthetic capture fixtures, not evidence of native/decoder/Host ownership.

1. **A live owned allocation can shrink without retirement.** At
   `candidates/tile-authoring/core/c2/ledger.js:103`, previous newly owned rows need
   only remain present by identity. A decoder-scratch row changes from1,000,000
   to1 charged byte across acquire/admit while still live, referenced and lacking
   a retirement receipt. Preserve physical metadata/charges through each adjacent
   trace step; only explicit validated retirement may release them.
2. **A newly owned material can disappear.** The same trace transition has no
   previous-material continuity check. A request-owned cache-idle material present
   at acquire vanishes at admit without a retired row or positive receipt. The
   source-only material comparison at line74 does not cover it. Retain each owned
   material through its explicit retirement, including idle caches.
3. **Accepted-source mark residency can disappear while its native view stays
   live.** `preserveSource` at line61 preserves geometry/allocation/material rows
   but not residency. Updating a painted source retains the exact accepted root
   and native IDs, removes its existing residency row, and charges only the
   candidate copy:1 resident mark instead of2. The final candidate-only check at
   line115 does not protect the still-live source. Preserve residency for each
   retained view until its proved retirement.
4. **Extra known sampled artwork pages escape their RGBA lower bound.** Lines117–121
   apply the width×height×4 minimum only to IDs named in decoded observations. A
   separate sampled GPU artwork-image row tied to the complete1536×1024 canonical
   page is accepted at1,024 bytes instead of6,291,456 when omitted from that list.
   The committed “four sampled allocations fit” positive at
   `tests/tile-authoring-core-c2-stage-a.test.mjs:115` uses this same bad assumption;
   its original bytes are preserved. Enforce the full known-page minimum for
   every applicable live physical image copy, not only the required observation
   subset, and correct the positive fixture without raising caps.

`ledger-counterexamples.json` indexes four complete input/plan/capture/response
files and hashes. `probe-ledger.mjs` reconstructs them from exact fixed source.
No candidate source was modified.

The26 committed controls pass. All37 changed paths are role-owned additions;
13 private runtime inventory entries and83 accepted dependencies authenticate.
The amended ABI manifest is exactly07b20b0c1916551027250a98a66e20a4a159e918ab8e06c2b68c240c959690cb.
All30 canonical Artwork records/pins/frames/notices and two page dependencies match
Core432; the persisted C0 schema remains exact. Actual four normal distribution
inventories/exports match8184: core303,renderer145,assets224,compatibility366, with
all candidate bytes excluded. No package/export/global license exception exists.

No additional f32 probes follow these findings. Full correction acceptance is
pending. This does not approve Stage B/C, decoder/native/readiness/resource
authority, public integration or performance. No browser/profile/pack/broad gate
ran. The26-test foreground process exited0 and session99737 completed; no server,
port or background helper was created or retained. No tracked Root/worker file
changed. C1 integration remains separate and higher priority.
