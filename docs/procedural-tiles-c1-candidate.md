# Private C1 planar Boolean evidence

Architect-approved implementation base:
`e4b5106f6967614ddc60661a6cdddde5d37b5c2b`. This is a private candidate beside
the preserved A/B source. The public `./tiles` entry, four v1 schemas, registry,
capability, version and normal distributions are unchanged. No donor/game pin,
Sites setting, mesh or full-layout adoption is introduced.

`inspectTilePlanarBoolean(recipe, options)` returns immutable, source-bound
inspection. Import it from the existing private candidate entry only. It accepts
an explicit `regularized-planar-lines-c1` profile, complete caller limits, native
XY `queries`, a D4 `transform`, and a three-component metre `origin`. The fixture
`tests/fixtures/procedural-tiles/c1.mjs` supplies concrete options and examples.

## Source and resolution

Global v2 validation remains descriptor-first, bounded and unchanged in semantics.
All nodes, source identities, cycles, drafts and anchors are checked. The original
Number-valued source and existing content digest are retained, never reconstructed
from normalized fractions. Distinct saved graphs/IDs/controls keep distinct source
bindings even when they describe the same mathematical set.

The root closure may use union, intersection and ordered difference of compatible
region leaves. Supported regions have exactly closed original straight-line rings,
common exact base/thickness and endpoints at that base height. Each ring must be
simple with nonzero area; forward collinear source events are preserved. Rings
within one leaf must be disjoint or strictly nested without contact. Their inherited
nesting parity is preserved regardless of winding. Overlapping outlines within one
legacy region are not silently interpreted as a union: use explicit graph unions
for Rectangle-tool combinations.

Canonical-grid coincidence cannot close a native endpoint gap. Present clips,
arcs/cubics (including apparently straight ones), fields, profile/ribbon/section
sweeps, stairs, graded geometry, incompatible bases/thicknesses and independent
per-leaf placements are outside this profile. Valid unsupported source remains
saveable and unresolved, without sampling, epsilon welding or fallback. Every
reachable leaf must be supported even in `unsupportedA-unsupportedA`. Unreferenced
drafts remain saved and individually `unrequested-unresolved`.

Regularized operations take the closure of the ordinary result's interior.
`A-A`, and point-/edge-only intersections, resolve to an explicit empty set.
Overlapping rectangle union keeps the overlap; it is not parity/XOR. Closed
point contacts remain boundary contact with distinct occupied sectors, never
an invented interior bridge. This follows the
[primary regularization definition](https://doc.cgal.org/latest/Boolean_set_operations_2/index.html);
no CGAL or other third-party runtime is used.

## Exact construction and limits

The evaluator interprets used binary64 values as exact dyadic rationals. Intersections,
ordering and classification use bounded BigInt rational arithmetic. No operation
first rounds to the inherited position grid. Exact constructions are needed as
well as exact predicates; see the
[primary geometry kernel discussion](https://doc.cgal.org/latest/Kernel_23/index.html).
This is exactness in the source-value model, not real-world physical calibration.

One arrangement overlays reachable original segments. Exact pair tests split proper
crossings, endpoint/T contacts and complete/partial coincident intervals. Coincident
atomic spans retain all covering source records. Angular order uses exact cross
products. Leaf membership immediately beside each atomic span uses a formal positive
infinitesimal, not a finite probe. Memoized DAG decisions label both sides. Only
root occupancy transitions become boundaries, with occupied area on the left.

Neighboring source-membership and occupancy sectors must agree. Boundary successors
must form a permutation and close without entering another visited cycle. Both
occupied-side and empty-side walks are extracted: a tangent hole can occur in a
single occupied weak walk while its empty-side walk still encloses a bounded void.
Exact containment groups positive/negative walks into interior components, voids
and unbounded exterior walks. Repeated vertices and touching sectors remain explicit.
Any unproved incidence/traversal/grouping invariant returns unresolved evidence.

| Hard ceiling | Value |
| --- | ---: |
| Global graph nodes / depth / operands | 128 / 12 / 16 |
| Reachable leaves / rings per leaf / original segments | 16 / 8 / 128 |
| Original pair tests / event vertices | 8,128 / 2,048 |
| Atomic undirected edges / halfedges | 4,096 / 8,192 |
| Total walks, both sides / emitted distinct boundary spans | 128 / 4,096 |
| Provenance links, including cancelled internal spans | 16,384 |
| Native point queries / complete serialized evidence | 256 / 4,000,000 bytes |
| Reduced input / computed-emitted rational / intermediate bits | 128 / 512 / 4,096 |
| Shared deterministic work units | 10,000,000 |

Every limit is explicit and callers may only lower it. Arithmetic checks a
conservative size bound before allocating an intermediate; a computation that
would need a larger temporary can refuse even if later cancellation could reduce
it. GCD/division iterations, limb-weighted exact operations/comparisons, pair/event
tests, sorting, membership, DAG references, topology, provenance and serialization
consume reported work. Saved source/options copying and validation have the inherited
global bounds; `source` units model three traversals of their resulting data, not
CPU instructions. No global cache, clock, RNG, DOM, storage or network is used.

JSON preflight counts escaping/UTF-8 before creating the full serialized string.
It reserves a conservative maximal counter record, so `maxSerializedBytes` reports
an upper bound; actual bytes are measured separately. Failed artifact budgets
return a bounded failure receipt, not a partial geometry. The receipt has only the
original source digest, null source/artifacts/options and reasons/work counters;
the caller retains its unchanged complete source. Extremely long diagnostic text
is explicitly truncated. The artifact-byte limit does not apply to that small
failure receipt. Invalid source, invalid options and valid-but-unresolved evaluation
are distinct states.

## Evidence and boundaries

Success is `resolved-nonempty` or `resolved-empty` **root geometry only**. Evidence
includes complete original source, native plane, exact rational vertices, oriented
spans, all coincident provenance, occupied/empty contour walks, components/voids,
incidence sectors and exact area. Rational values serialize as `[numerator,
positive-denominator]` decimal strings; BigInts never enter saved source or JSON.

`holeWalks` lists negative cycle attachments, not a universal hole count. A tangent
hole can be folded into an occupied `outerWalk` marked `weak`, with no separate
negative occupied walk. Its bounded void still has a positive empty-side walk and
an explicit `surroundingComponent`. Consumers must retain the void/incidence records;
they cannot infer all holes from `components[].holeWalks.length` or treat a weak
walk as a simple mesh polygon.

Each output span retains all original node/shape/outline/primitive IDs, exact source
parameter ranges/directions and left/right leaf membership masks. `sourceLeafIds`
defines the deterministic sorted mask order. Empty results keep complete cancelled
source, with no ghost vertices/queries. No arbitrary owner or exponential DAG-path
enumeration substitutes for that provenance.

`geometryDigest` binds canonical native mathematical boundary cycles/plane/profile;
it can ignore redundant collinear source events. Emitted evidence preserves those
events. Native edge/contour IDs bind actual source spans. `sourceDigest` retains the
existing authored digest contract; `sourceBindingDigest` additionally binds the
complete captured options. Source/operand reorder can preserve geometry while
changing its source binding. A topology edit need not preserve an old contour ID.

D4/translation evidence performs exact rational affine operations after decoding
source/origin values. It does not insert an intermediate Number addition. Native
geometry/provenance remain separate from exact world vertices and `worldDigest`;
mirror orientation is explicit. A world-frame source rejects a second placement.
This is not a rounded render projection. C1 emits no mesh; a later Number/grid
projection needs its own error and topology-preservation proof.

Point queries use native XY and report interior/boundary/exterior against the
regularized result. Cancelled internal source seams are interior; empty results
are exterior everywhere. This is neither a signed-distance nor gameplay/support
query. Floor/material/UV binding, port/reservation consistency, full layout/repair,
presentation, navigation, support and fire remain unbound/unresolved.

Leaves carry no independent floor/material fields. C1 never invents them or
infers a material from `interior.skinId`. A later resolver must prove compatible
captured placement/floor/elevation/channel/layer/material/UV contracts. Ports,
profiles, material intervals, anchors and reservations stay unchanged; a hole or
empty footprint does not delete an AABB, infer a port or enable a transition.
`requireResolved`, compile, repair/prepare and retained-host v2 adoption gates stay
closed. An inspector result cannot become a committable handle.

## Validation and design preference

The manual acceptance matrix checks L/H silhouettes/areas, overlap versus parity,
identity/cancellation, courtyards, split/nested islands, full/partial coincident
edges, T contacts, point contacts, tangent holes/weak walks and edge notches.
Additional checks cover exact sub-grid slivers, near-parallel lines, native-open
rings, source/digest/provenance/D4/save behavior, descriptor safety, every lowered
ceiling and unsupported cases. The original eighteen v1 hashes/golden corpus remain
the compatibility authority.

`tools/verify-tile-c1-oracle.py` independently uses Python Fraction vertical slabs
and interval Boolean decisions. Equality at two interior x values proves the affine
interval boundaries agree throughout each slab; closed event-line limits check
contacts. Open-band adjacency requires positive-length overlap, independently
checking occupied components and bounded voids. It also checks exact areas, queries,
all coincident owners/parameters, side membership decisions and affine placement.
Raster/dense sampling is not a topology certificate. Private schemas check structure;
runtime/oracle/provenance checks establish the supported mathematical result.

Accuracy preference: exact native topology and explicit uncertainty over parity
substitution or epsilon healing. Efficiency preference is provisional for small
authoring graphs: one bounded quadratic overlay avoids repeated intermediate
polygonization. Work is a model, not elapsed time. Measurements record device,
runtime and workload separately; no mobile/per-frame claim is made. Narrative
preference is subjective: predictable L/H footprints, courtyards and no accidental
bridges suit Farmyard, AFT and Tinderbox authoring. Curved, vertical, mesh and game
bindings need their own later acceptance. Review plots are diagnostic projections
of exact evidence, not meshes or adoption certificates.
