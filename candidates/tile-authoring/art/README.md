# Artist C0 appearance contract alignment

**CONTRACT PROPOSAL ONLY.** No renderer, decoder, shader, command executor,
public registration, editor authority or new material implementation is supplied.
The fixed coordinate-corrected Core contract is
`43227894c50ec62b71806978195fff2c650eb388`. It supersedes efca's mixed UV/pivot
wording; the original thirty frame mappings/pins and document bytes are unchanged.
B2 native-host visual review takes priority when its fixed source arrives.

The original Artist checkpoint is `f5bfda9ec0f639018ccfee2415b1f70502e77cae`.
Its two PNGs, SVG master, thirty atlas frames, prompts, notices, `resources.json`
and manifest identity remain exact. No bitmap is regenerated, edited or copied.
The historical `example.json`, `budget-fixture.json` and original review files
remain f5 art/proposal evidence; they are not a Core command/document parser.
The new derived rendering contract is `contract.d.ts` → `c0/packet.d.ts`.

## One grammar, two distinct identities

Core's canonical types/schema are copied byte-for-byte as metadata-only fixed
inputs under `inputs/`, with source commit/path/byte hashes. They are the sole
command/query/pack/document grammar, not a second implementation. The packet
imports Core Pin, ImageView, ImageBlob, Graphic, Mark, Layer, Surface,
ResourceRef and WorkbenchDocument types rather than redefining aliases.

- Core content pins are exactly `{id,revision,contentDigest}`. A record's grammar
  version is not its immutable content revision. No implicit latest lookup.
- Original Artist `{id,version,digest}` references remain a separate imported
  manifest binding: `nautilus.local-graphic-art-samples@1`, digest
  `ef2daf8b205bae3ca14baa093be85fa46e46b769f645c95327a6bf72f2152d33`.
  They cannot be parsed as Core pins or silently restamped.
- The exact thirty-row Core import mapping resolves every original artwork,
  resource hash and frame ID to one immutable Core Artwork pin and ImageView
  digest. Core records retain complete original provenance. Two pages are shared;
  selecting a different frame does not crop/rewrite the page or mutate the f5
  manifest. See `c0/artwork-views.json` and `c0/frame-selection-cases.json`.
- Durable Core ResourceRef contains only its closed kind/version, artwork pin and
  ImageView digest. The full blob/view descriptor lives once in library.artwork.
  No URI, decode status, epoch or runtime lease is added to durable ResourceRef.

The public finish library remains `nautilus-tile-finish-library@1`, digest
`5b4c25105568a1f99569dbb6bd2d6308c067bbb41763c4bd6bfddfa3552bc0e1`.
No finish ID, appearance, source, digest or cached material body is changed.
The copied Core document uses its explicitly labelled compatibility finish
fixture; that fixture is not relabelled as the registered public library.
A live C1/C2 host must supply its actual exact finish binding and supported base.

## Saved authority versus derived packet

WorkbenchDocument@3 is the saved authority: all six full B1 fields, original
sourceJSON bytes, canonical tile bundle, typed constraints, contentRevision,
authoring module and typed resourceRefs. Core.Source is a read-only planning
view and must never be parsed/saved as a reduced document alias. A revision
alone is not freshness; exact checkpoint/authority/context bindings are required.

AppearancePacketProposal@2 is derived, read-only and unregistered. It captures
whole-document/checkpoint/context digests, current resource/geometry epochs,
lease-set digests, presentation profile and the one allocation-ledger digest.
It contains current owner/surface/floor/definition bindings, the complete named
source frame including origin, current owner pose, world-to-surface matrix,
geometry lease identity and complete ordered layer groups. Each layer retains
its full Core header and complete ordinal-ordered Core marks. Every Graphic
keeps artwork pin, form/wrap, position/size/rotation, mirrorU, pivotUV, mark
opacity, LINEAR tint and authored-grid or all-surface mask. No flattened list
may erase a layer boundary or its opacity.

The static packet example is explicitly UNBOUND. Its tokens/epochs are fixture
values, not live geometry, decoder, resource or budget capabilities. Its source
is the complete copied Core document; no new authoring operation was executed.
Thirty independent Graphic selection examples show the imported Core pins and
full stamp/detail fields. They are not accepted marks or a runtime importer.

## Coordinates and sampling

Stored imageUV and pivotUV are TOP-LEFT. For image coordinates (u_i,v_i), pivot
(p_u,p_v), width/height and mirrorSign=(-1 when mirrorU, otherwise +1):

`surfacePoint = position + R(rotationRad) * [mirrorSign*(u_i-p_u)*width, (p_v-v_i)*height]`

Add the named Surface.originM and its basis, then apply CURRENT owner mirrorX,
quarterTurns and origin once. Convert native [x,y,h] to render [x,h,y] once.
Owner origin.h already includes floor height; validate floor identity/offsets
without adding floor elevation again. A derived local-up UV is valid only with
v_up=1-v_i AND pivotV_up=1-p_v. Captured stroke phase is historical construction
data, not a substitute for current owner pose/context. Noncentral pivots and
nonzero surface origins require explicit mathematical and later native proofs.

For ImageView frame (x,y,w,h), pixel-centre coordinates are
`[x + u_i*w - .5, y + v_i*h - .5]`. Stamp coverage is transparent outside finite
inclusive [0,1]^2, even when edge taps clamp inside. Detail repeats UV and every
bilinear tap inside this exact frame, clipped by its mask and actual source
surface; it never repeats across the atlas page. No second V flip, guessed
frame, implicit pivot correction or neighbour/floor projection is allowed.

Blob bytes are straight-alpha sRGB PNG; saved tint is already linear RGB.
Apply alphaFloor8 per texel BEFORE premultiplying/filtering: original organic=2,
road=0. Convert image RGB to linear, premultiply each texel, then bilinearly mix
four constrained taps with no mipmaps. Apply saved linear tint directly; do not
convert it again. WebP metadata remains unbound without an actual proven bounded
optional decoder. PNG header/hash checks are not decoder or GPU evidence.

Within each layer, source-over marks in ordinal order into transparent colour.
Multiply the resulting layer's premultiplied RGB/alpha by layer opacity ONCE,
then source-over ordered layers. Two alpha-.5 marks give .75; layer opacity .5
then gives .375. Multiplying each mark by the layer opacity would give .4375
and is invalid. All ordering, boundaries, masks and opacities remain source.

## Controlled owned kernel and one budget

Only an opt-in host-owned appearance/kernel seam is proposed. A nonempty channel
acquires an OWNED COMBINED lease directly. Do not first acquire a shared cached
finish and then patch/clone/chain its onBeforeCompile or sampler hooks. Existing
finish hooks/materials remain untouched. The controlled owner creates and owns
its own accepted base-plus-overlay kernel/profile and retires view leases.

An empty channel means no source marks on that target. It uses the existing
base-finish path with ZERO additional overlay material/texture/geometry/buffer
allocations. Hidden targets, zero opacity or off-mask marks are not grounds to
silently drop source, skip locks or subtract charged allocations.

There is ONE aggregate cap of 64 owned appearance materials TOTAL across
existing finish caches and combined/staged/acquiring/unverified-retiring
materials in all views. It is not 64 extra compositor materials. Other
unmeasured reference refusal caps remain 2 roots, 50,000 triangles, 1,024 cells,
1,024 resident marks, 32 MiB additional decoded allocations, 32,768 bin references,
4 MiB derived buffers, 4 page bindings and 8 contributors/bin. Stored-source
limits remain 8 layers/surface and 4,096 marks/logical chunk. All are proposals,
not measured GPU/phone performance or registered support.

Count actual decoded copies even when their encoded hash is equal; share a
charge only with an attested identical physical allocation/epoch. Padding,
upload/transient copies and retiring lifetimes stay charged. The original two
atlas dimensions imply 12 MiB for one base RGBA copy each, not an upper bound on
actual decoding/provider allocations. GPU bytes are separately reported.

The one host budget reserves before acquisition. Real verified geometry,
resource and budget handles are supplied separately from serialized packets.
Recheck current frame/pose/context/epochs before binding. Exhaust rollback and
retirement despite native throwing/reentrant observers, preserve later host
material overrides and borrowed resources, retire appearance before geometry,
and retain unverified charges until a positive receipt. View disposal cannot
prune durable blobs referenced by accepted/history/redo/pending or unknown
commits; the one Editor authority reconciles the same original request ID.

## Initial scope and next gates

The first proposed compositor scope is supported level rectangles and isolated
level line/arc/cubic paths, with actual accepted base/clip bindings. Holed
regions and fields remain unavailable without an actual clipping/base proof.
A public geometry load or a family label does not grant overlay support. No
wrapped decals, walls/roofs, grades, extra channels/blends, displacement or
physical crater/plant/gameplay effect is implemented or implied.

C0 checks cover exact fixed metadata, all thirty pin/frame/sampler mappings,
full graphic/layer/frame fields, grouped-opacity/coordinate contract vectors,
source/asset preservation and honest aggregate-cap arithmetic. They are not
native sampling, decoding, installed renderer or human/agent workflow proof.
Those follow stacked-main acceptance and explicit Root C1/C2 handoff. B2 live
native-height/finish/resource review remains the active integration priority.
