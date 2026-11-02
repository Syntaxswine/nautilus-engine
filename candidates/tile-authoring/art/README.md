# Local surface graphics — Artist contract proposal

Base: immutable brief `b850e20e2fdd85435d33f16327482b80380af728`. This pack
proposes artwork data and a clipped borrowed-Three interface. It implements no
shared overlay renderer, editor workbench, authoring service, command schema,
journal, capability, public export or migration. Those decisions stay with
Architect/Coder/Editor. All images and data are private contract samples.

## Sample families and immutable resources

`resources.json` binds 30 artwork IDs in nine families to two original atlases.
Each artwork has ID/version/content digest, fixed resource ID/version/SHA-256,
frame ID, metre frame size, pivot, rotation convention, mask/blend profiles,
opacity/tint and availability state. One active version exists per stable ID
in a bound immutable manifest; duplicate IDs across versions are ambiguous and
refuse. The workspace pins the whole manifest ID/version/digest.

| Family | Sample | Default graphic frame, metres |
| --- | --- | --- |
| `organic.blood` | dried blood | 1.6 × 1.6 |
| `organic.scorch` | charcoal soot | 2 × 2 |
| `organic.apparent-crater` | painted depression/rubble | 3 × 3 |
| `organic.leaves` | fallen leaves | 1.8 × 1.8 |
| `organic.flat-plants` | flat clover/grass | 1.2 × 1.2 |
| `surface.detail-textures` | dust/grime/scratches | 2 × 2 |
| `road.numbers` | digits 0–9 | 0.8 × 1.2 |
| `road.arrows` | forward/left/right/U-turn/merge | 1.5 × 2 |
| `road.lines` | stop/solid/dashed/double/crosswalk/symbols | 1.5 × 2 |

Frame size includes transparent margins; it is not a calibrated paint width.
Pivot is `[0.5,0.5]`. Marks may override size/pose explicitly. Atlas rects are
top-left pixel coordinates; image top maps to source-local +Y. Rotation is
counterclockwise radians in source XY. For pixel-normalized `(u,v)`, the
unrotated local offset is `[(u-pivotU)*width,(pivotV-v)*height]`. Apply mark
rotation/translation, then the owner's supported placement/D4 transform once.
Reflection follows the owner, including mirrored glyphs. A world-fixed or
automatically upright-text profile is excluded until explicitly defined.

The organic PNG is exact built-in imagegen output; the road PNG is an original
vector-master Canvas export with no external font. See `PROVENANCE.md` and the
saved full prompt. Both are RGBA8, with declared sRGB RGB and linear alpha.
The 1536×1024 and 1024×1536 atlases total **12 MiB decoded base artwork**. This
is dimension arithmetic, not measured RAM/GPU overhead or performance.

Raw organic gutters have alpha 1–2/255. The immutable resource profile declares
`zeroAtOrBelow8:2`; the proposed sampler removes only those declared low-alpha
samples before premultiplication. Road gutters use cutoff zero. Stored bytes
are never rewritten. `alpha-audit.json` independently reads all 30 frame gutters
and binds the measurements to exact hashes. Consumers lacking that profile
must refuse complete presentation, preserve source and report the reason.

The initial custom image profile is bounded PNG/WebP RGBA; these samples prove
only PNG data/export. WebP decoding still needs host validation. Proposed input
bounds are 2048 px per edge and 8 MiB encoded bytes per image, subject to Root
review. SVG is an authoring companion, not an extra runtime image format.
Portable packs include referenced PNG bytes, manifests and notices; a sibling
checkout, absolute machine path, moving URL or thumbnail alone is insufficient.

## Persistent source and command boundary

`example.json` includes a complete actual-public-v1 canonical tile bundle with
two adjacent 8×4 m owners at declared F03 = 7 m. The recipe/connection controls
and shared recipe reference remain original. Its **proposed typed sidecar**
puts scorch, blood, a road arrow and a grid-clipped grime mark on `owner-a`;
locked `owner-b` stays clean. Nothing is smuggled into strict recipe `interior`
or functional `extensions`. Surface ID `top`/frame `top-frame` are explicit
proposal IDs, not inferred public capabilities. Coder must freeze this mapping.

Persist `{ownerId,surfaceId,floorId}`, source frame ID/profile, owner-local metre
position, rotation/size/pivot, immutable artwork reference, layer/order, tint/
opacity and mask. Do not persist transient triangle/GPU/chunk/derived-cell IDs.
The grid mask stores authored origin/cell size/version and integer cells,
independent of derived sampling. The first masks are whole-target-surface and
authored-grid-cells. Actual surface edges/holes also clip every mark.

LOD/re-tessellation/streaming and base-finish changes cannot move source marks.
A geometry revision that orphans an anchor must refuse preserving source or
include an explicit reanchor/delete decision in the same transaction. No
automatic stretching, dropping, source normalisation or sample refitting.

Editing one placement changes only its sidecar. Preset defaults are empty unless
explicitly captured by Save as preset; placed instances remain pinned copies.
Copy/stamp allocates fresh owner/mark IDs with deterministic reference remapping.
A multi-owner seam stroke lists all targets on one floor, one shared phase/group
identity and one batch operation. Compile phase into each local frame; never
discover neighbours by projection or silently omit locked targets. Independent
owner movement follows each local mark; world-fixed phase needs another profile.

The illustrative `candidate.add-decoration-batch` in the example is not a live
endpoint. Coder/Editor own the same human/agent JSON/CLI prepare/apply service,
source/context tokens, Review/Apply lease and one coherent workspace history.
Its operation adopts definitions/map/constraints/decorations/resource refs
together. Unknown commit outcome retains potentially adopted resources until
same-ID recovery. The appearance provider has no blob deletion, writer,
journal, damage, fire, cost, clock, expiry or RNG service.

## Proposed clipped provider

`contract.d.ts` describes the interface; it exports no implementation.
The host supplies actual public-provider surface mesh handles, exact source/
context/frame/footprint tokens, owner/surface/floor identity and a core-derived
world-to-owner transform. No ray projection onto a scene or neighbouring floor.
The proposed 16-value column-major matrix maps the current public provider's
render world `[x,height,y]` to native owner `[u,v,height]`; it includes one axis
swap and inverse D4. Bind that exact frame profile instead of guessing from UVs.
The provider refuses missing/mismatched bindings and unsupported base kernels,
grades, wrapped 3D decals, physical displacement or arbitrary blends.

The preferred first renderer evaluates source graphics in the **owning opaque
surface's albedo pass**, after base-map/vertex paint and before lighting. It
borrows the existing surface triangles; their coverage clips edges and holes
without changing canonical positions/normals/tangents/UV/physical intervals.
There is no second coplanar quad, invented Z offset, slab or underside. Masks
intersect that coverage in source space. Binary fields/regions/level paths are
eligible only when the actual public geometry and an accepted base compositor
support their exact source; no blanket geometry promise comes from this pack.
The proposed semantic top surface uses `front-facing-only-v1`: the overlay is
evaluated on its declared front face only. A double-sided thin base may remain
visible from below without copying top graphics to a second semantic surface.
Validate source orientation through the frame/footprint binding; do not flip
normals or change winding to make a mark appear. Other face policies need an
explicit reviewed profile.

The accepted finish candidate at `a536cfec20e609a6c507f000791d8d7e71ae6d18`
refuses arbitrary custom shaders. Root must accept a shared, explicit **albedo
composition port** before finishes and overlays can be combined. Do not
overwrite or implicitly chain a borrowed `onBeforeCompile`. Standard/custom
base kernels need deliberate exact-profile bindings. Frozen hosts/providers
and the finish checkpoint remain untouched in this tranche.

For correct soft alpha, fetch each source texel as sRGB-decoded linear RGB plus
linear alpha; apply its declared alpha floor, premultiply, then perform four-tap
bilinear interpolation. Tint is explicitly converted from sRGB to linear;
opacity and mask multiply both premultiplied RGB and alpha. Compose in ascending
layer order, then explicit mark order (unique within a layer/target), using
`Cnext=Cmark+(1-Amark)*Cprevious`. Intersect with the opaque base; preserve base
lighting/normal/roughness/physical semantics. No implicit loader premultiply,
gamma-space blending, arbitrary blend mode or alpha-test substitution.
Core supplies complete per-target `paintOrder` mark IDs compiled from persisted
layer/mark order. Every projected mark occurs exactly once; the provider never
sorts by textual layer IDs or atlas. This draft stores opacity on marks. A
layer-wide opacity field needs explicit Core/Editor agreement rather than an
implicit global render control.

First sampling proposal uses frame-clamped texel fetch, transparent gutters and
no mipmaps. This avoids neighbour-frame bleed and straight-alpha dark fringes,
but minification quality/performance is unmeasured. Prefiltered premultiplied
mips need an explicit derived-resource profile and charged allocations.

Use shared immutable atlas pages and finite source-local spatial bins. The bin
grid is a disposable acceleration structure, never an authored target. Each
bin retains complete layer/mark order. Proposed first shader bound: eight
candidate contributors per bin, hence at most 32 colour texel fetches per
fragment before masks/indexing. Overflow refuses rather than dropping marks.
This is a code/design bound, not measured frame time. The 480-mark fixture has
one authored cell mark per cell; it does not establish shader efficiency.

Batch atlas/page/material state where order permits. The design adds no draw or
texture **per cell/mark** and reuses base surface buckets. Two sample atlases
are shared across views; per-owner state may use borrowed composition leases
and charged derived buffers. Actual native Three uniform/upload behaviour,
custom kernels, draw counts and PC/phone costs still require implementation
proof. Do not advertise zero extra draws as a measured result.

## Proposed budgets and lifecycle

The brief's ceilings remain proposals: 8 layers/surface, 4096 stored marks/chunk,
1024 aggregate resident marks and 32 MiB unique additional decoded artwork.
`budget-fixture.json` lists 480 source-local marks across fifteen explicit
floors; accepted plus candidate = 960. Every hidden, acquiring and unverified
retiring allocation stays charged. It is arithmetic/source data, not a renderer
or a second stack planner. Existing two-root/50,000-triangle/1024-cell limits
remain shared, including any future decal geometry.

Additional proposals requiring Root approval: 8 contributors/bin, 32,768 total
bin references, 4 MiB derived buffers, at most four bound atlas pages. Reject
overflow with an actionable bound. Decoded bytes and padded/mipped GPU bytes
are reported separately; transient decode/upload duplication and retiring
lifetimes count. Shared identity can count once only when one actual allocation
is leased; calling a texture borrowed does not make its cost disappear.

The one host budget grants a current ticket **before acquisition**. Offscene
preflight checks exact data/resource/service bindings. Stage complete material/
artwork/buffer leases, recheck currentness, then bind atomically. Failure or
cancellation rolls back all owned bindings and new allocations. An empty channel
acquires no decoration texture/material/draw allocation.

Borrow Three, base geometry/material pools, verified textures and host services.
Own only explicitly newly created buffers/variants/hooks or their leases.
Restore a borrowed binding only while it is still this provider's binding;
preserve later host overrides and unrelated neighbours. Exhaust retirement
despite native throwing/reentrant listeners; transfer counters before callbacks,
latch disposal, refuse nested mutation and keep unverified retirement charged.
`retired()` supplies the final receipt. View release never prunes durable image
blobs or resources that an uncertain commit may reference. Visibility has no
effect on source, reference adoption or allocation accounting.

## Usage card and builder checklist

Inspect data without a renderer:

```sh
node tools/art-tile-authoring-check.mjs
node --test tests/art-tile-authoring-contract.test.mjs
```

The sample builder uses actual public core/example source for its canonical
bundle, not a fake core. `--masters` verifies/reproduces original vector source;
`--manifests` creates contract metadata. The export tool uses an isolated,
short-lived browser only for SVG→PNG and a static alpha preview. It does not
exercise an overlay provider. Pixel inspection is read-only Pillow. No normal
distribution includes this candidate or preview HTML.

1. Architect freezes Coder/Editor surface/frame/mask/command contracts and this
   immutable artwork binding; resolve ART-Q1…Q4 in the handoff.
2. Implement an explicit shared finish/albedo composition port and public
   geometry bindings only after review. Keep exact known D4 refusals until a
   separately reviewed provider correction; do not normalise loaded controls.
3. Bind verified resource leases and one aggregate budget; keep source marks,
   preview allocations and durable resource adoption distinct.
4. Prove exact clipping/holes/floors/D4/LOD/seam phase, empty channels, colour/
   alpha parity, locks, counts and throw/cancel/retirement using actual Three.
5. Prove source/installed public-package parity and one real UI/agent operation
   path, brush-batch history, save/portable import and same-ID uncertain recovery.
6. Benchmark representative PC/phone scenes before approving ceilings or
   quality/speed claims. Physical crater/plant/gameplay capabilities stay separate.

Contract evidence, comparison and interface questions are under
`docs/reviews/tile-authoring/art/`. No helper is retained after static review.
