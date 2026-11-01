# Procedural tiles: authored shapes and canonical boundaries

Status: bounded headless candidate for Architect review. Proposed public entry
./tiles is unregistered in this checkpoint. The private installed overlay is
partial availability. Family rendering, gameplay/query/support/navigation,
Editor/UI adoption and release are separate work.

Use tileUsageCard(), this guide, packages/tiles-core/example.js and the executable
retained-host proof in tests/fixtures/procedural-tiles/consumer.mjs. The
[source audit](reviews/procedural-tiles/source-audit.json) and
[decision record](proposals/procedural-tiles-v1.md) identify fixed references.

## Public seam

| API | Meaning |
| --- | --- |
| createTileCatalogue(rawRecipes) | Validates complete descriptors; opaque resource-free handle for this actual core instance. Insertion order does not affect selection. |
| validateTileRecipe / compileTileRecipe | Copy raw v1 data exactly; validate explicit analytic border schedules. |
| sampleTileCurve / sampleTileField / tileFieldTopology | Analytic line/arc/cubic/compound data, shared-corner fields, separate approximation/position bounds and explicit saddle/D4/complement metadata. |
| transformTileRecipe(recipe,placement,floors) | Authored source plus derived boundary inspection; no accepted joins or gameplay authority. |
| validateTileLayout / compileTileLayout / inspectTileLayout | References and complete actual joins/reservations/relations; distinct authored and resolved/unresolved output. |
| matchTileInterfaces(layout,catalogue,join) | Inspects one named interface; complete layout readiness is still checked separately. |
| deriveTileCells(recipe,options) | Bounded whole-shape sampling windows and shared internal cuts; canonical external ports remain join authority. |
| prepareTileRepair(bundle,request,{contextToken,cancelled?}) | One pure finite-slot resolver and old/new spatial discovery; prepareTileEdit is the same function. |
| tileBundle / serializeTileBundle / openTileBundle | Complete recipes, deduplicated pinned templates and layout. Reopening revalidates joins; requireResolved:true refuses unresolved live adoption. |
| tileRequirements / tileLayoutToken | Standard engine-only requirements and complete authored-layout digest. |
| createRetainedTileConsumer(host) | Small borrowed read/CAS example; host owns persistence and one atomic history entry. |
| assertLegacyTileExport | Preserving refusal for unsupported strict legacy map/block/world export. |

Runtime imports are headless Node data/math. No DOM, renderer, storage, network,
internal clock, game RNG, mover, guard policy or physics engine is imported.
Saved curves are serializable records, never callbacks. Unsupported versions,
features, malformed data and budgets refuse without mutating input.

## Source and derived records

Four adjacent generated schemas define the closed structural records:

- tile-recipe-v1: stable recipe/content version; frame; tagged shape; reservations;
  ports; allowed D4 transforms; interior seed/detail/skin; editable anchors and
  pinned template references.
- tile-layout-v1: explicit floors, catalogue digest, stable instances, exact origins,
  floor bindings, transforms, locks, anchors, named joins/relations, saved selection
  seed/policy and bounded retained authoring extensions.
- tile-bundle-v1: complete recipes/templates/layout. Reopening a unique drawn
  curve does not require Artist cache, a volatile catalogue or a sibling checkout.
- compiled-tiles-v1: derived layout-boundary or cell-window inspection. Persist
  the authored bundle; compiled fragments are never trusted saved proofs.

Coordinates x,y are horizontal metres and h is vertical metres. Local world
position is D4(localPoint) + instance.origin, so height is origin.h + local.h.
A port checks worldEndpoint.h = boundFloor.elevationM + port.floor.offsetM.
Floor elevation is checked, never added again. Floor IDs are identities, not
layer indices treated as metres. World-frame controls/clips require zero origin
and identity placement; a second transform is refused, not silently ignored.

Field-cell describes native bounds, NW/NE/SE/SW values/heights/paint, bounded
interior amplitudes/seed and explicit saddle choice. Region describes closed
line/arc compounds, base/thickness and optional clip. Profile-sweep describes a
line/arc/cubic/compound path, native width/thickness and optional clip. Clip uses
the descriptor's frame and remains an instruction for a reviewed family provider;
it is not permission to discard the original path.

Provisional field limitation: ambiguous checkerboard masks 5/10 support exactly
[1,-1,1,-1] and [-1,1,-1,1]. Unequal magnitudes, small positive values and zeros
in a checkerboard refuse with UNSUPPORTED_FIELD_CONDITIONING; input is preserved,
never normalized. General finite corner values remain supported for all other
masks. This applies equally to whole shapes and embedded field normal evaluators,
recipe/bundle loading, schemas and topology operations. It does not restrict the
separate line/arc/cubic/compound curve families.

Shapes/paths/primitives retain stable IDs. Anchors retain region/path/segment/node
IDs; a node parentId/controlIndex identifies an original control. Controls, widths,
angles, layer choices, locks and seeds are saved exactly, not replaced with samples.
Changed recipes need a strictly newer contentVersion; template references retain
exact version/content digests.

The mixed proof includes paving, different-width path, an explicit boundary
material transition, water/waterfront, kerb, barrier, raised bridge and cubic
intent. These are authored/boundary data. Mesh/Boolean/interior tessellation and
building/roof/game providers remain staged. The first interface profile supports
planar faces, including diagonal cuts and horizontal top/bottom faces; nonplanar
interfaces refuse. An available descriptor or mesh cannot grant gameplay support.

## Geometry, precision and continuity

Metres-q1e6-v1 applies only to derived positions. Authored values are copied exactly.
Reject collapsed spans, fields, reservations, chords and degenerate sampling.
This quantum is not an approximation-error or real-world-accuracy guarantee.

Unit-q1e12-v1 is a separate dimensionless direction policy: authored unit vectors
within 1e-9 norm tolerance are normalized and encoded on a 1e12 grid. UV uses
world-linear-exact-v1: explicit orthogonal axes, metre scales and exact
dimensionless phase/mapping agreement. Periodic equivalence is not guessed.

Sampling declares segmentsPerPart, maxChordErrorM, maxSegmentM and maxWork.
Line interpolation is exact; arc sagitta and a conservative cubic second-
derivative bound limit interpolation. Node quantization is measured separately
and included in the chord-error test. Compound starts must meet on the local
canonical position grid, but their original controls can differ within a quantum.
Every original start is evaluated, including starts omitted from output nodes.
compoundJunctionDeviationBoundM measures each such start against the actual
retained previous node after placement; translation can change the rounding phase.
The full returned interpolation bound is analyticErrorBoundM plus the maximum of
positionQuantizationBoundM and compoundJunctionDeviationBoundM. It must satisfy
maxChordErrorM. Sampler and aggregate layout/repair work include the extra start
evaluations. A fixed schedule is not silently increased.
Complete analytic/evaluator identity remains in matching: sparse coincident
samples do not prove two cubics equal. Canonical numeric order is world x, then y,
then h, preserving AFT N/S west-to-east and E/W north-to-south offsets. Compound
corners use the same deterministic one-sided tangent convention in that order.

Ports contain endpoint, outward direction, boundary-parameter tangent, optional
route flow policy/vector, width/thickness, floor slot/offset, channel/layer,
required/open/terminal policy, surface/edge/boundary-material/border profiles,
analytic curve, normal evaluator, material intervals and UV mapping.
Outward normals oppose. Canonical boundary tangents agree. Route tangents follow
none/same/opposed/unoriented separately; they are not all negated for opposing faces.

Boundary material identifies the interface contract, independently of cosmetic
skin or physical material. Interior skins/detail may share a border. Direct
joins require full analytic identity, actual canonical samples/normals/UVs,
schedule, profiles, material intervals, floor/channel/layer and spans to agree.
Transitions are explicit recipes exposing different contracts at their ends.

Several spans/layers can share a face. Joins may name explicit port subsets, but
the completed layout must cover every required port once. Open ports may remain
exterior, terminal ports cannot join, empty joins refuse. Saved joins are
recomputed and diagnostics identify the bad join and instance/port.

WorldEdgeId derives from actual accepted geometry/profile/floor/channel/layer,
not instance ID. Both ports retain their geometry. Lexicographic instance ID is
only a dedup hint. Internal skirts may be suppressed only at an accepted matched
interface with both sides resident; otherwise retain exterior boundaries.
Streaming/culling/deletion cannot own or retire authoritative game support.

Field perturbation and its first derivative are exactly zero on borders, without
sin(pi) residue. Ports use their whole shape's boundary-relevant corner data.
Shared field edge scalar/height/paint and analytic normals agree, and a world
corner registry validates corner-only contacts as well as accepted edge joins.
Zero is positive. Supported binary checkerboards save connect-positive or
connect-negative. Along the selected full diagonal the bilinear term equals
sign * (1 - 2*smooth(t))^2. The bubble coefficient has that same sign with
magnitude at least 2 for every allowed amplitude/seed: its signed bias is
2 + abs(fieldAmplitude), and the bounded noise contribution cannot cancel it.
The fade is strictly positive in the interior. This proves a strict-sign path
joining the selected corners and a barrier separating the other corners; a
centre-sign check alone would prove neither. D4 and value-negation/saddle-flip
operations revalidate the resulting conditioning. Derived negated zero is kept
as positive zero. For example [0,1,0,1] is valid, but negation produces an
unsupported zero-valued checkerboard and explicitly refuses. Literal negation
with zero-positive classification is not automatically a Boolean land/water
complement. Corner connectivity or point contact does not grant walkability.

## Semantic objects, derived windows and work

The 128 recipe/instance bounds count semantic authored objects in an atomic chunk,
not one-metre cells. One shape can cover many cells: proofs generate 1,600 cells
from one 400 x 4 m region and 256 cells from a 64 m cubic across separate windows.

DeriveTileCells receives a valid placement/floors, explicit floor/channel/layer/
boundary profile, positive cell size, aligned world window, fixed border segment
count, curve schedule/error policy, count/work bounds and UV mapping. The selected
floor must actually occur in the placement's floor bindings. Each window
samples the same whole-shape/world evaluator. Tile-cell-cut-v1 keys describe
internal clipping aids within that shape; they are not public join/support tokens.
The canonical external port records are retained as mandatory constraints.
Providers stitch interiors to every external border sample/normal/UV or refuse.

The initial cell evaluator supports shared-corner fields and level region/sweep
distance approximations, retaining full analytic controls and reporting uncertainty
near contours. Graded descriptors remain saveable/boundary-inspectable, but graded
cell evaluation refuses pending a reviewed family evaluator. Interior topology,
tessellation, mesh manifold and physical queries are not certified by cell cuts.

Explicit bounds include 4 MB / 200,000 nodes / depth 32 authored input, 128 semantic
recipes/instances per chunk, 32 parts, 64 ports/reservations, 128 samples per part,
65,536 aggregate catalogue/layout samples, 4,096 derived cells and 65,536 cut
samples per window. Search, spatial discovery and aggregate geometry evaluations
have independent work limits. CompileTileLayout also accepts optional {maxWork}
up to one million point/tangent/normal, reservation and interface work units;
repair debits actual per-candidate work, including failed candidates. These are
deterministic model units, not CPU/GPU benchmarks. Automatic cross-chunk gameplay
adoption is not implemented.

## One prepare/repair and retained transaction

Requests contain version/id; expected revision/layout/catalogue/context tokens;
saved selection seed/policy; explicit replaced/removed IDs; finite slots and
alternatives; complete intended joins/relations; recipe updates; maxSteps,
maxClosure, maxSpatialTests, maxGeometryWork and neighbourRadiusM.
Slots contain stable ID, origin, floor bindings, recipe/transform alternatives,
lock and anchor IDs. Shared updates cannot bypass manual locks.

The kernel discovers old and new spatial reservations over all finite alternatives,
alongside semantic links. New neighbours and old locations enter bounded closure.
Only unchanged individual geometric contacts carry forward: fingerprints include
exact authored shape/interface/reservation/template data, effective origin/D4,
floor identities/elevations and each actual projected reservation pair including
height. Cosmetic interior skin/detail/seed, anchors, locks and content-version
bookkeeping do not change that identity. A previous east/west contact cannot
authorize a new north/south contact, and one unchanged contact cannot waive an
additional contact between the same instances.

Changed/new contacts each need covering join/cross/alongside/transition semantics;
incomplete repair refuses with the discovered pair and exact reservation records,
including floor/channel/layer and intervals. One valid named link elsewhere on
the instance pair grants no exemption. Editor supplies intent/finite choices,
uses these diagnostics and owns no second matching or selection algorithm.

Crossing requires explicit positive vertical clearance for every XY-overlapping
reservation pair. Alongside requires overlapping length/height at the exact
lateral gap. Transition requires an actual accepted interface. Tags/layer names
never waive positive-volume geometry conflicts.

A relation names two instances without reservation selectors. During repair its
measured condition must hold separately for each contact it covers: cross covers
only XY-overlapping intervals at the declared vertical clearance; alongside
covers only exact-gap intervals with overlapping length/height. Explicit
relations can describe different floors/channels/layers (for example bridge over
water), but cannot waive a different contact that fails their measured condition.
Transition adds no coverage beyond its actual joined boundary.

Automatic join coverage currently proves a continuous straight axis-aligned
lateral boundary covering the full finite contact interval, declared width and
vertical thickness above the boundary base. Each side's actual reservation
floor/channel/layer must match the joined port. It uses attained analytic
endpoints, not an infinite line, sparse samples or cubic control-hull extents.
An otherwise valid curved, diagonal, cap or nonexactly continuous compound join
remains saveable and compilable; it does not by itself prove repair contact
coverage. INCOMPLETE_REPAIR explains this limitation and requests a measured
relation covering the specific contact or a supported finite joined boundary.
Additional proof shapes require later review; no curve data is discarded.

Pure SHA-256 ranks stable content/slot/transform identities with the saved uint32
seed. No game random stream advances. Failure returns next:null and preserves
accepted/redo-equivalent input. Cancellation is a captured boolean; later async
cancellation/staleness changes the retained context/final write lease. Success
returns the complete next bundle/compiled inspection, exact affected/added/
replaced/removed IDs, old and new affected anchors, recipe/join changes and tokens.
No write, undo, resource debit or publication occurs in the resolver.

The executable consumer binds read() -> {bundle,token,contextToken,cancelled?}
and compareAndSwap({expected,nextBundle,changes,requestId,canCommit}) -> boolean.
The host compares its COMPLETE retained token/context plus layout revision/digest/
catalogue and checks canCommit immediately before the atomic write. It saves the
whole candidate and exactly one host-owned undo entry including neighbours.
Apply uses an actual unused handle from that same connection. False is stale/
cancelled; thrown/nonboolean acknowledgement is unknown and needs authoritative
host recovery. The host owns durable command deduplication. Positive
acknowledgement stays committed. Dispose retires only resource-free local handles;
borrowed services/history/game resources remain owned by the host.

## Consumer checklist

1. Select exact engine/content pins and actual declared ./tiles plus all four
   schemas; an overlay is partial availability.
2. Save the complete authored bundle, original controls/anchors/templates/locks/
   seeds and bounded extensions, not sampled meshes/fragments.
3. Bind one real core and explicit floor identities/metre heights.
4. Prepare finite intent with current complete context/revision/content tokens.
   Display lock, unsupported, budget, clearance and named join diagnostics.
5. Commit the whole candidate and one neighbour-inclusive history entry atomically
   with full retained comparison and final active write fence.
6. Reopen and revalidate joins; requireResolved:true gates live geometry adoption.
7. Separately review family meshes across D4, LOD, culling and materials, retaining
   every canonical external constraint.
8. Bind actual query/support/navigation/fire/consumer adapters independently.
   Saveable data, resolved boundaries and mesh availability grant none of them.

Reproduce with tests/procedural-tiles.test.mjs and
tests/procedural-tile-corrections.test.mjs, tools/tile-schemas.mjs, independent
schema cases and the explicit private installed proof, then the four repository
gates. The installed proof runs the correction suite through its installed entry.
This headless checkpoint needs no server/browser/watcher.
