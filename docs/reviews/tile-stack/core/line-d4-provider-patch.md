# Private derived-angle patch for line D4

Status: narrowly bounded private PATCH for Architect review/integration. Runtime baseline is `2502646482218524fd5129641da769bb82462e4d`; task branch starts from docs-only blueprint `b850e20e2fdd85435d33f16327482b80380af728`. Approved planner `45ecaef16bb39424c8b885d53acb4371654b4fa0` and separate custom contract `7772910059d86c00c84475af489be812ff225c5d` remain fixed. No shipped provider/core/mesh/schema, source fence, version, consumer pin, audience or normal export changes.

The exact patch is `candidates/tile-stack/core/line-d4-provider-patch/derived-start-zero.patch`. Its SHA-256 is **c7eac2b728479132a4badd9ab2fc819fead29530e6fe2dee07f862289cbe6173**. It changes one expression in packages/tile-visuals/prepare.js, inside pathOutline's GENERATED offset-arc descriptor:

```diff
-startRad:start
+startRad:Object.is(start,-0)?0:start
```

The full patch retains surrounding code/context and applies one removed/added source line. Source preimage SHA-256: `eaaee23e079ed9e0d0f91454b1ffcbe732f053f6f44cc63ef612db15dd7e287e`. Exact patched-file SHA-256: `fb6ec8359a1ca2c3bfd739861cb7734d70f65a7ec5fe57375c357c536998d7e3`.

## Cause and scope

Valid level line source in two D4 poses reaches Math.atan2 with signed-zero components. The helper creates art-offset-1 with startRad IEEE negative zero (`8000000000000000`). The ACTUAL public core correctly rejects that generated descriptor under its existing finite-number contract. The original recipe/placement/controls are valid and unchanged; the defect is in representation of the derived helper angle.

The correction canonicalizes ONLY that derived start angle immediately before actual core sampling. Every other value passes through exactly. No authored source normalization, relaxed number validation, alternative sampler, retry, curve refitting, mesh change or new geometry profile is introduced. Authored -0 remains rejected by actual sampleTileCurve, compileTileRecipe and provider input handling, with input -0 retained after failure.

## Immutable reproduction

Artist's exact `a536cfec20e609a6c507f000791d8d7e71ae6d18:docs/reviews/tile-stack/art/line-d4-refusal.json` is copied byte-for-byte as original-artist-witness.json, with source commit/hash in manifest.json. The exact old prepare.js is retained as prepare.baseline.js.txt, a pinned source-evidence fixture, not a registered runtime. This preserves the original failure after Root later applies the correction.

Generation reads fixed Git objects. Reproduction copies the actual20-file public closure into two disposable ESM trees and authenticates EVERY source file against the fixed manifest. The prepare.js preimage is the exact pinned source fixture; the current checked-in provider must match either that original or the one exact declared patched hash. This supports shallow CI and subsequent application of this patch without fetching a moving branch or substituting a fake public package. The remaining19 files must match the baseline exactly. Tests import actual copied public core/prepare/example entry files; their code and API are not replaced by mocks.

The one declared patch is applied to only the second disposable tree using git apply --check then git apply. Per-command core.autocrlf=false/core.eol=lf preserves exact source bytes without changing user Git configuration. Hash guards catch line-ending or other drift. After application, prepare.js alone has the declared new hash; all other copied files remain identical. Checked-in working provider remains the original source for this delivery.

Both exact original Artist sources reproduce the original INVALID_NUMBER /startRad refusal with unchanged source hashes. A separately labelled call-through observer forwards arguments/returns/errors unchanged and reobserves the actual generated IEEE -0. The repaired success uses the direct copied patched provider with its actual copied public core; it does not use the observer or a substituted result.

The deterministic line matrix covers all8 D4 poses at details0/1/2:24 patched successes. Six cases (two poses times three details) newly succeed; all18 formerly good projections are deeply equal AND equal UTF-8 JSON bytes. The actual mixed canonical public example (paving/join, field, annular region and cubic source) also stays deeply/byte equal at each of the three details. Every test preserves authored source. No rendered-browser/phone/GPU/installed-release claim is made by this headless copied-source proof.

## Reproduction and ownership

```powershell
node tools/tile-stack-core-line-d4-proof.mjs
node --test tests/tile-stack-core-line-d4.test.mjs
node tools/tile-stack-core-line-d4-audit.mjs
npm run check
npm test
npm run test:upstream
npm run build
```

The optional --generate mode rebuilds PRIVATE patch/preimage/witness/manifest from the exact reviewed Git objects, never the shipped provider. The normal proof/test path does not require those historical commits in a shallow checkout. After commit, audit --verify-commit checks exact Git/raw bytes.

Root owns review, applying this exact patch to public prepare.js, source-fence/provenance updates and stack integration. Use the declared patch hash/preimage/new-file hash to guard application; preserve old witnesses. A direct integration command is git -c core.autocrlf=false -c core.eol=lf apply <path-to-reviewed-patch>, after independent --check in Root's integration checkout. This document does not apply or authorize unrelated provider changes.

All proof copies are task-owned temporary directories. Finally cleanup validates their resolved absolute temp parent/prefix, removes only those exact directories and verifies absence. Foreground Git child PID/start/end/exit receipts, exact deleted directories and zero-server/port/retained-helper status are archived. No browser, renderer object, watcher, storage backend or retained helper is created.

## Design assessment

Accuracy: prefer canonicalizing this internal IEEE representation at the derived descriptor boundary while retaining strict authored-number/source semantics. The tests show valid source remains unchanged and its previously missing presentation path is restored; this is not physical calibration or a new shape capability.

Efficiency: one Object.is/conditional per generated offset arc is a code-based operation count, with no retry or added sampling. Runtime/GPU timings and device performance were not measured.

Narrative: the existing level line/finish family can use its already allowed D4 poses consistently. This preserves the intended authoring appearance and is a subjective product benefit; support, navigation and game effects remain unchanged/unbound.
