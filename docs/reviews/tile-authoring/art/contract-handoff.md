# Artist custom tile / overlay contract handoff

Branch `codex/tile-authoring-art-contract` starts at fixed brief
`b850e20e2fdd85435d33f16327482b80380af728`. Work is restricted to
`candidates/tile-authoring/art/`, role-prefixed tests/tools and this evidence
directory. No runtime, frozen host/provider, source fence, public export/schema/
capability registry, version, donor/consumer pin or publication changes occur.

The prior tile-stack checkpoint is preserved and pushed at
`a536cfec20e609a6c507f000791d8d7e71ae6d18` (early API:
`84bcb886a25826ba710b9c285316bee5582fa7ef`). Its [exact D4 witness](https://github.com/Syntaxswine/nautilus-engine/blob/a536cfec20e609a6c507f000791d8d7e71ae6d18/docs/reviews/tile-stack/art/line-d4-refusal.json)
preserves the valid public source, derived `-0` cap angle, provider/core hashes
and unchanged before/after source. No correction or normalization is hidden.
The [GitHub checks](https://github.com/Syntaxswine/nautilus-engine/actions/runs/41387611095)
for that checkpoint completed successfully. It stays separately reviewable;
this branch imports none of its private implementation.

This proposal supplies 30 original graphics in nine families, two immutable
RGBA atlases, metre frame/pivot/mask/alpha/sRGB/atlas metadata and complete
provenance. The organic atlas uses built-in imagegen with a saved full prompt;
the road atlas uses original vector paths and browser PNG export. The portable
sample has an actual-public-v1 two-owner tile bundle plus a proposed typed
sidecar: one owner has four marks, its locked shared-recipe neighbour is clean.
An additional data fixture lists 480 local marks and 960 two-view marks.
This is arithmetic, not a renderer or measured budget approval.

`contract.d.ts` is a proposed clipped borrowed-Three/service interface.
`resources.json` is the immutable art mapping. The usage card is the candidate
README; `design-comparison.md` evaluates all three renderer options under
accuracy, efficiency and narrative. Preferred first method is on-surface
linear-premultiplied compositing plus shared-atlas batching. No shared renderer,
workbench, public commands/schema, journal, save upgrade or game effect is
implemented. The static browser review is clearly labelled as artwork only.

The artwork binding is `nautilus.local-graphic-art-samples@1`, digest
`ef2daf8b205bae3ca14baa093be85fa46e46b769f645c95327a6bf72f2152d33`.

## Concrete questions for Architect reconciliation

1. **ART-Q1 — surface/frame identity and reflection.** Freeze Coder's exact
   semantic surface/frame and authored-grid record shape. This draft uses
   `{ownerId,surfaceId,floorId}` plus `frameId`, metre XY, size/pivot/CCW rotation
   and full owner D4 including mirrored road glyphs. Recommendation: keep that
   simple local-follow, front-face-only top profile first; world-fixed/upright-text/path-parameter
   profiles remain unavailable. Confirm orphan edits require explicit preserving
   refusal or reanchor/delete in the same command.
2. **ART-Q2 — finish/compositor seam.** Approve the provisional on-surface albedo
   composition port after base paint and before lighting, with atlas batching;
   defer clipped decals. The fixed finish pool rejects arbitrary custom shaders.
   Which shared host-owned albedo port will combine base finish and overlays
   without overwriting/chaining arbitrary callbacks or editing frozen sources
   during this tranche? Recommendation: one opt-in exact-profile compositor
   service, separately authorized for implementation.
3. **ART-Q3 — alpha/filter and work limits.** Freeze exact straight-sRGB resource
   interpretation, per-resource alpha floor (organic 2/255; road 0), linear
   premultiply-before-bilinear sampling and initial no-mipmap profile. Are the
   additional proposed 8 contributors/bin, 32,768 aggregate bin references,
   4 MiB derived buffers and four atlas bindings the right first refusal bounds?
   Recommendation: retain these as unmeasured candidate caps alongside the
   brief's 8 layers/4096 stored/1024 resident/32 MiB artwork until PC/phone proof.
4. **ART-Q4 — resource/budget/retirement leases.** Freeze Editor/Coder's verified
   artwork and one aggregate budget-ticket ports. Recommendation: the provider
   may release view leases only, never durable blobs; unknown commit outcomes
   retain document resources until same-ID recovery. Use explicit retirement
   receipts and keep unverified allocations charged. Confirm this one authority
   also owns layer reorder, multi-owner shared-phase batches and preset-default
   capture, so no artist-local history/store appears.

The fixed contract and questions are left in this chat and committed artifacts
for Architect review. Implementation/registration starts only after interface
reconciliation, as requested by the brief. No extra user approval is requested.

## Current evidence and next gates

Eight focused Node checks verify exact art hashes/portable references, immutable
version mapping, stable targets, authored masks/order, declared alpha, actual
public-core reopen and honest 960-mark arithmetic. Negative fixtures corrupt
actual resource bytes/targets/versions/bounds, not expectation markers. The
checker is an artifact consistency tool, not Coder's authoritative validator.

Read-only Pillow inspection verifies 30 actual frame gutters against the pinned
PNG hashes. The isolated browser exported the vector master and reviewed true
alpha on a checkerboard. Its supported finally-close and exact helper identity/
released-port receipt are retained. No preview/service is retained.

Later implementation must prove actual native/installed shader clipping on
supported fields/regions/holes/paths and nonuniform floors, D4/LOD/phase stability,
empty-channel cost, all aggregate bounds and throwing/cancelled retirement.
Then prove one real UI/agent batch → history → save/portable reopen → uncertain
same-ID recovery flow. Physical craters/3D plants and gameplay effects need
separate capabilities. No device-performance or public-support claim exists.

Final validation passed: `npm run check`, `npm test` (920/920),
`npm run test:upstream` (32/32), and `npm run build` (519 module paths).
Node's type-stripping syntax check also accepted the proposed declaration file.
The final source manifest records task/dependency hashes, prior witness hash,
public-distribution exclusion, gate-log hashes and exact helper retirement.
