# Private PNG decoder and CPU sampler proof

Private candidate on codex/tile-png-decoder-proof. All 69 focused controls,
1,099 normal tests, 32 upstream tests, the source check and 552-path build pass.
All four normal package plans remain exact and exclude every candidate byte.
Exact upstream sources and all notices reside in this candidate’s nested vendor/
test fixture. The initial root-vendor failures remain preserved in
evidence/delivery-fence.json and evidence/initial-root-vendor-validation.json;
evidence/validation.json records the successful repeated checks after relocation.

TEST ONLY. This checkpoint prepares a decoder/sampler option for tile authoring.
It adds no public export, engine integration, graphics allocation, renderer hook,
editor tool or package dependency. Main base is
8184f06aa587542b026352a739f3766d1794c4fe. Pako 2.1.0 is deliberately pinned to
3c06216518c259b569a5168dee867e6dabbe5160; exact source bytes and notices live in
this candidate’s vendor/pako/, separate from these adapted copies. This is a
test-only vendored fixture, not a production dependency or runtime pin.

The original ignored preparation spike, its failed 63-control report, corrected
69-control reports, source audit and public-artwork plan remain intact. Compact
historical evidence is in evidence/. inputs.json records their hashes. Original
PNG paths and accepted Artist hashes are reused from
57c651fb0a7ed0b01c1435ba18e87efde290443a; no raster is copied or regenerated.

## Run the focused proof

From this worktree on Windows, with Node and a Python environment containing
Pillow 12.3.0, run:

    node candidates/tile-authoring/art/c2-decoder-proof/run-proof.mjs --python <absolute-python.exe>

The recorded oracle runtime is Python 3.12.14 with zlib 1.3.2. The oracle enforces
those versions and its committed code hash. Node evidence was prepared on
24.15.0 win32 x64. Pillow is an independent TEST HOST dependency; it is not added
to package.json and is not part of any engine package. The ordinary npm suite
does not invoke this Windows/Pillow harness.

Each run gets a new ignored artifacts/art-c2-decoder-proof/runs/ directory.
The Node launcher leaves the Windows script policy unchanged. It checks the raw Git blobs, hashes, notices and all mechanical adapter
changes, then generates independent oracle bytes and executes 69 controls.
Both originals compare every decoded RGBA byte against Pillow: 12,582,912 bytes
in total. golden-oracle.json commits compact hashes and runtime/code identities;
the 12 MiB raw buffers and synthetic fixtures stay ignored. Previous runs are
never overwritten.

Helpers are hidden and finite. Python has a 30-second self-exit watchdog plus a
45-second launcher deadline; the suite has an 85-second self-expiry and 90-second launcher deadline. A cancellation
probe has a separate 8-second self-expiry. Timeout/stop operations validate PID,
creation time and executable, then verify the original lifetime exited. Receipts
record owner, purpose, paths, restart arguments and port-free scope. No helper is
retained and no preview server is needed.

## What the 69 controls establish

- Thirteen positive decodes, including the two original pages, all five PNG row
  filters, split IDAT, ancillary, stored, fixed and dynamic compressed streams.
- Twenty-five refusals for malformed streams, checksums, truncation, trailing or
  concatenated data, output/dimension bombs and unsupported PNG/zlib profiles.
- Twelve descriptor, quota and output-window controls; five actual AbortSignal
  or native-process cancellation controls; a private input snapshot mutation
  control; two real-copy/reservation controls; one source-preservation control;
  and ten CPU sampling/coordinate/compositing controls.

The initial 63-case run had one incorrect expected refusal: 20,000 valid empty
stored blocks consumed 140,109 logical work units, below the 150,000 threshold.
The corrected suite keeps that stream as a positive control at 150,000 and
requires an inflate-phase refusal at 125,000. The original failure is preserved
in evidence/initial-63-control-run.json and the ignored source report.

## Accounting and limits

The caller supplies one exact 16 KiB output backing store, reused for every
inflate call; a subview of a larger buffer is refused. Compressed input slices
are at most 2,048 bytes and hash/CRC slices at most 16 KiB. The wrapper validates
static noninterlaced RGBA8 PNG structure, original hashes/dimensions, chunk CRCs,
zlib/Adler and exact scanline output before copying/unfiltering.

Actual typed backing stores, complete borrowed Buffer backing stores and every
instrumented copy are charged. The asynchronous private encoded snapshot is a
real allocation/copy, charged alongside the borrowed input. Strong references
keep stores cumulative for the finite ledger lifetime; GC is not retirement.
Same-hash physical copies cost memory separately. Unknown native staging stays
charged, and production native-retirement receipts are deliberately unbound.

The preparation caps are 4 MiB scratch, 32 MiB additional image/scratch/staging/
unknown memory, 64 MiB encoded backing and 64,000,000 logical work units. These
are test refusal limits, not new Core grammar. VM/JIT/object heap, crypto/FS and
Pillow memory are outside the typed-codec ledger. Logical work is not a CPU
instruction count or a portable wall-time guarantee.

The Node VM/CommonJS loader accepts only the pinned trusted dependency closure.
PNG bytes never execute. This does not prove browser/CSP/worker packaging, native
GPU allocations, compositor equivalence, phone performance or the C1 Host ABI.
The native stop control proves only the disposable Node process lifetime ended.
The independent 480-mark mixed atlas case and public C2 renderer remain held.

## Delivery fence

Run node candidates/tile-authoring/art/c2-decoder-proof/check-profile-exclusion.mjs
to inspect the actual core, renderer, assets and compatibility delivery lists.
All must match the frozen original plans and exclude every candidate byte,
including the nested source and licenses. The initial root-vendor fixture hit
the existing license collector; Root directed relocation into this private
fixture. No shipping-code filter, license deletion, global distribution rule,
package file, export, upstream.json, Core/Host/finish code or registry changed.
A deliberate production root-vendor import and its license closure remain
deferred to the actual C2 renderer handoff.

Run npm run check, npm test, npm run test:upstream and npm run build before
committing or pushing. A failed delivery fence or required gate holds delivery.
See NOTICE.md, inputs.json, adaptations.json and golden-oracle.json for pins and
provenance. Nothing here authorizes public artwork/runtime promotion.

## Provisional design evaluation

Accuracy is measured here: every RGBA byte from both original pages matches the
independent Pillow result, while the ten CPU sampling controls preserve typed
frames, current D4 poses, raw alpha thresholds and grouped layer opacity. Native
browser decode and compositor equivalence remain unmeasured.

Efficiency evidence covers actual typed stores/copies and bounded logical work.
The instrumented Pako option gives the preparation proof observable allocation
control; its CPU and object-heap cost versus native decode is not measured. Keep
this option private until the Host allocation and capture contracts are fixed.

For the painterly game appearance, the unchanged authored marks and finite frame
sampling preserve the existing brush detail and gutters. This is an appearance
judgment supported by CPU samples, not a new rendered visual acceptance. The
provisional recommendation is to retain this reusable decoder option for tests
and defer choosing a public renderer implementation until native evidence exists.
