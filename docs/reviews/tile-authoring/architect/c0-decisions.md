# Custom tiles and overlays: accepted contract decisions

Status: C0 contracts accepted. Stacked authoring reached main at
`d869410625b246cfff2b51089e7878c31951775c` through PR #32. C1 custom-tile
implementation is authorized from that commit; C2 overlay runtime follows C1
acceptance. The private C0 records themselves implement no executor or renderer.

| Role | Accepted immutable input |
| --- | --- |
| Core grammar and corrected coordinates | `43227894c50ec62b71806978195fff2c650eb388` |
| UI types and command bindings | `678ceb609d05d2bc13e2a1f83cc7ab7e0e3c5cf2` |
| Artwork, frames and appearance contract | `57c651fb0a7ed0b01c1435ba18e87efde290443a` |

[The source selection](c0-sources.json) records 149 role-owned private files.
Their earlier proposals and measurements remain labelled historical. Editor's
older `845f7238` grammar is superseded by the canonical Core contract.

## One document and one command path

Use Core's finite `operations` command, complete Expected bindings, immutable
`{id,revision,contentDigest}` pins, and explicit true/false/null commit outcomes.
No command aliases or second mutation journal are accepted. A serialized review
is data; the Editor privately retains actual preparation authority.

The fresh `nautilus-tile-workbench-document@3` retains the six B1 fields in full
and adds `contentRevision`, one typed authoring module, and typed durable
`resourceRefs`. The module owns its library, decorations and owner pins once.
Derived Source/query views never replace that complete saved document.
V1/v2 loading keeps its existing semantics and namespace.

Humans and JSONL agents share the same HostService, codec, authority, history,
source/context validation and CAS. New geometry commands use one actual public
preparation. Metadata commands prove bundle/constraints unchanged and acquire
no view; they retain the actual accepted geometry/appearance witness without
restamping its lease or clearing presentation errors or retirement debt.
Existing validated whole-document history restoration preserves exact revisions.
NO_CHANGE preserves redo and creates no operation/write. Unknown commit outcomes
freeze further writes and retain potentially adopted resources until recovery of
the original request.

Definitions and presets are immutable revisions. Library changes do not update
placed copies. Upgrades explicitly name selected owners and exact from/to pins;
other owners and presets remain unchanged. Referenced old versions are retained.

## Artwork, frames and appearance

Artwork/ImageView binds the complete encoded page, dimensions, immutable pin,
frame, sampler and digest. Stored image UV and pivot both use top-left V.
Source Surface origin/basis and the current owner D4/origin participate exactly
once in the world-to-surface mapping. Persistent source anchors exclude transient
mesh/cell indices and cosmetic definition identity.

Sample sRGB texels into linear premultiplied colour before interpolation; tint is
linear. Marks compose within their layer before applying layer opacity once.
Two half-alpha marks under half layer opacity produce 0.375. Finite stamps stay
transparent outside their frame; repeating detail wraps within its own frame.
Geometry/frame/grid/floor changes require explicit preserve/reanchor/delete
decisions for affected marks. Visual marks retain geometry and gameplay meaning.

The future renderer uses one owned combined albedo seam and the existing total
material budget. Cached shared finish hooks and borrowed resources retain their
ownership. Empty channels add no overlay allocation. PNG needs an actual decoded
pixel/resource proof; WebP remains unavailable until its provider is reviewed.

Frozen reference ceilings are eight layers/surface, 4,096 stored marks/chunk,
1,024 aggregate resident marks, 32 MiB of additional decoded physical copies,
two roots/50,000 triangles/1,024 derived cells, eight contributors/bin,
32,768 aggregate references, 4 MiB derived data, four atlas pages across all views, and
64 TOTAL owned appearance materials. Accepted, candidate, acquiring and unverified
retiring allocations remain charged. These are refusal ceilings, not device
performance measurements.

## C1 implementation boundary

The first real workflow creates A1, clones B1, revises B2, saves P1 pinned to B1,
places P1 twice atomically and upgrades only one owner to B2. Rectangle placement
is first; path placement, overlays and artwork import require later providers.

The optional headless `./tiles/authoring` entry is assigned to Core. Its pure
planner and target binder own validation and complete target construction, while
the actual Editor retains commit authority. Shared public rectangle construction
and record sealing own the original controls, anchors, surfaces and hash domains
for both UI and agents. Supplied hashes are verified rather than repaired.
Actual source/built/installed and human/agent proof remains required before C1
acceptance; these assignments do not declare that runtime implemented.
