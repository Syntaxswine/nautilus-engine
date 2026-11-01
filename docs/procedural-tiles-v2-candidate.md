# Tile v2 A/B candidate

Reviewed A/B candidate available in the source repository. Public v2 registration
and native evaluators remain deferred. The registered `./tiles` still points
to the accepted v1 entry. The candidate entry is
`packages/tiles-core/candidate-v2.js`; the offline proof temporarily maps it to
`./tiles` inside an explicitly private package. Four v2 schema URNs are separate
from the unchanged v1 documents. No public v2 capability has been assigned.

Initial approved base: `708ed1c14e69699e4baa4483cbc5a50901d5be4e`. The exact
reviewed main `69115f6c283c4c60588d8462b943ea944ab17aca`, including the verified
starter screenshot harness correction, was incorporated after a durable task
checkpoint and byte-verified restoration. The correction branch at
`bdda3da7cdde3b155c76c661721d5b9d4aff542e` remains preserved.

## Authored records and honest readiness

The candidate entry delegates v1 operations to the accepted implementation.
All fourteen original runtime modules and four original schemas remain unchanged;
the golden fixture fixes their hashes and a save/compile/requirements/field corpus
against the reviewed main. Opening a v1 save does not upgrade it.

V2 recipes retain common metadata, original controls, explicit exposure intent and
closed typed future shapes. A mixed v2 bundle embeds complete v1/v2 recipes and a
v2 layout whose instances bind `recipeVersion` and exact content digests. Anchors
name actual source identities/control indices. Templates keep their pinned hashes;
native sections are inline complete data. Layout annotations contain only bounded
`label` and `description` display strings. Functional controls are typed fields.

| Shape | Retained controls | A/B evaluator state |
| --- | --- | --- |
| shape-graph | Root, stable nodes, leaves, union/intersection inputs, ordered difference | Unimplemented |
| ribbon-sweep | Original curve, independent left/right stations, explicit parameter/arc-length metric, caps/corners | Unimplemented |
| section-sweep | Original curve, native section contours/vertices/materials, frame, authored scale/caps | Unimplemented |
| stair-run | Plan, explicit count convention, per-step or total rise/run, base/landings, lower-riser/first-tread/top interfaces | Unimplemented |
| graded/multi-surface evaluation | Graded original controls remain source | Unimplemented |

Graph validation audits all nodes, including unused drafts, for missing operands,
cycles and maximum dependency depth using a memoized linear graph traversal.
Limits include 128 graph nodes, depth 12, 16 operands, 128 width stations, 128 total
section vertices and 128 steps, alongside the existing bounded plain-data input.
These are authored-object/control limits, not one-metre scene limits.

Optional `clip` is checked by property presence in both v2 root shapes and graph
leaves: omission or a valid bounds object is supported; `null`, `false`, `0` and
`""` refuse. The frozen v1 executable historically accepts those four falsy values
as absent, although the v1 structural schema rejects them. This inherited v1
discrepancy remains documented and unchanged; it does not carry into v2 syntax.

Every v2 recipe/layout is **saveable but unresolved** in this checkpoint, including
a v2 layout containing only legacy recipes. `openTileBundle(...,{requireResolved:
true})`, complete compilation, projection, interface matching, cell derivation and
requirements/live editing refuse v2. Pure prepare returns `next:null`; retained
host preparation cannot produce a committable v2 handle. Structural schemas never
stand in for evaluator availability. The metadata-only private view used to reuse
accepted common-field validators is never returned, hashed as authored intent or
compiled as v2 geometry.

Repair dispatch keeps the complete accepted v1 result contract, including malformed
JSON/plain-data inputs, context-first diagnostics, zero-work failures and successful
requests. It does not invoke accessors or mutate source/history. Malformed identified
v2 bundles also return structured failures with `next:null`, rather than escaping
through dispatch as an exception.

No Boolean/ribbon/section/stair evaluator is implemented. In particular the saved
`A-A` graph is not falsely evaluated as a zero-width boundary or an empty result.
Regularized Boolean reasoning and native stair geometry remain later C/D work.

## Shared render-edge plans

`planTileRenderEdges({bundles,windows},options)` recompiles complete resolved v1
bundles and v1 cell sources. It never trusts incoming compiled fragments or uses a
candidate native shape as a fallback. Input windows keep their original native
controls, coordinates, floor/channel/layer, UV policy and <=16 canonical cuts.
Additional render sampling is separate from the original compiled v1 record.

Options are all explicit: densityPerM, maxChordErrorM, maxSegmentM,
rootToleranceM, maxCutNodes, maxPortNodes, maxTotalNodes, maxEdges, maxBindings,
maxWork, maxRootTests, maxRootDepth and maxEventsPerEdge. The fixture
`tests/fixtures/procedural-tiles/v2.mjs` supplies a concrete 32/m review workload.

| Budget ceiling | Value |
| --- | ---: |
| Final nodes per derived cut, including events | 129 |
| Final nodes per public port | 4,097 |
| Final shared nodes across the selected workload | 65,536 |
| Edges / source bindings | 16,384 / 65,536 |
| Work / root tests / root depth / events per edge | 10,000,000 / 200,000 / 32 / 128 |

All original canonical positions, normals, parameter tangents, UVs and canonical
material intervals are retained exactly. Non-grid material boundaries and
conservative contour events enter the full union. Incompatible mandatory
attributes, collapsed new spans, unresolved numeric conditioning and every budget
incompatibility refuse. The function never truncates a public port, drops a
mandatory event, relaxes v1 limits or changes the caller's window.

Straight cuts use a shared world-anchored density phase. Analytic port refinement
retains the original primitive boundaries/schedule. Common keys bind world border
and evaluator data, floor/channel/layer/profiles, UV and sampling policy. Primitive,
instance, owner, window and cosmetic interior IDs do not enter those keys. Real
interior variation still affects an internal cut when it changes its evaluator.
Bindings retain provenance outside shared identity. `planDigest` binds the complete
node attributes, events, materials and error bounds. Both providers must agree on
that full plan; retaining coarse vertices alone cannot justify unilateral curved
refinement. There is no second join/contact/support authority.

Line/arc/cubic second-derivative bounds cover interpolation between final nodes.
All retained nodes and both original compound sides are measured against the
common analytic descriptor. The total includes analytic error, measured node
deviation, arc direction encoding and conservative floating-position guards.
Translation can move the quantization phase; omitted compound starts stay in the
bound. Declared chord and final segment lengths must both pass.

Compound side selection compares retained primitive interval boundaries directly;
it never recovers an integer index from `t*partCount`. Exact knots retain both
original endpoint limits, while adjacent representable parameters stay on their
own side. Endpoints are read directly from original descriptors. Interval search
is charged to analytic work, and derivative bounds use the retained interval span.

Added public normals/tangents interpolate the retained canonical directions.
Their angular accuracy is not analytically certified. Original attributes remain
exact and both sides get the same added attributes. Field cuts use shared
polynomial scalar/height/gradient restrictions. Field-cell scalar authority is
the retained whole shape, including its actual variation; a separately varied
normal evaluator cannot replace it on an inset border. Level region/sweep cuts retain the
reviewed polyline-distance approximation and its native-curve uncertainty; a
finer cut does not turn an approximated curve into exact geometry.

Polynomial restrictions use bounded Bernstein subdivision; level distance cuts
use conservative Lipschitz enclosures. Contour events are possible-zero brackets,
not exact roots or connectivity certificates. Their final spatial uncertainty must
fit the caller's tolerance; flat/ill-conditioned restrictions refuse rather than
invent topology. Analytic coefficients, evaluations, source recompilation, root
tests, mandatory-node merging and sorting consume reported work units. Event
position uncertainty includes the parameter bracket plus the actual returned
vertex deviation, encoding and floating guards. Native-curve scalar approximation
is reported separately; the bracket concerns the shared evaluator model. Units model
bounded work; they are not processor timings. Hashing/data parsing also remains
bounded by the input, edge, binding and node ceilings.

For a one-metre n by m grid, E=2nm+n+m shared edges require 33E base samples at
32 intervals/m, before additional events. A 16x16 request uses 17,952; 31x31 uses
65,472; 32x32 uses 69,696 and must refuse the fixed aggregate ceiling. This does
not make 16x16 a scene-size cap. Callers explicitly select and compose compatible
windows. The original 32-border artist studies remain unchanged; temporary v1
providers use actual canonical cuts with independently stitched interiors and
fresh visual/error evidence.

## Independent full-edge zero/exposure evidence

`inspectTileZeroExposure({a,b},options)` accepts authored source/placement/floors/
portId records, with optional absent side b=null. It recompiles both sources and
uses the existing strict port matcher. Options capture collarM, residentA,
residentB and maxWork. Returned evidence is immutable inspection, not a live token.

Supported whole-interval proof: an actual native field border has both relevant
corner scalar values exactly zero, and its perturbation/fade is exactly zero along
the entire analytic border. The complete original line/cubic control hull must
also be proved inside the native field domain. Interior/near-border controls and
two zero samples cannot substitute. The side proof separately verifies the true native outward
after D4, then bounds the entire inward collar. With normalized inward s and
tangential t, the scalar factors as:

`F(s,t) = s² * [(3-2s) O(t) + A*256(1-s)²*t²*(1-t)²]`.

O is a convex smooth blend of the two opposite corners. For every allowed seed,
`abs(A)<=abs(fieldAmplitude)` and the variation term is bounded by
`16*abs(fieldAmplitude)`. These bounds describe the analytic model and appear as
`side.analyticState`. They do not by themselves prove the frozen native floating
evaluator's classification. For example, a 1,000 m field with corners `[1,0,0,1]`,
amplitude `.01` and seed `1` has a positive analytic collar interval, but the frozen
v1 evaluator at `(u,v)=((1000-.000001)/1000,.5)` returns
`-7.019295376133343e-20`: `smooth(u)` rounds to 1, removing the positive bilinear
term while the negative fade term survives.

`side.state` is native certainty. Any nonzero scalar amplitude is **unknown** for
this correction, over the whole collar and all allowed seeds. Analytic outside
also remains native unknown because rounded/underflowed zero is positive in v1.
No sparse probes, width threshold or rewritten evaluator authorize suppression.

The meaningful retained native inside proof requires zero scalar amplitude and
all four native scalar corners nonnegative. The numerical premise is that
`S(u)=RN(RN(u*u)*RN(3-2*u))` stays in `[0,1]` for every valid binary64 `u` in
`[0,1]`, with round-to-nearest/ties-to-even arithmetic. For `u<.5`,
`RN(u*u)<=.25` and `RN(3-2*u)<=3`, so `S(u)<=.75`. For `.5<=u<=1`, `2*u` and
`3-2*u` are exact and the latter is in `[1,2]`. Positive rounding error of `u*u`
is at most `2^-54` (`u=1` is exact), so the unrounded final product is at most
the exact smooth value plus `2^-53`, hence at most `1+2^-53`. Ties-to-even rounds
this midpoint to 1. All factors are nonnegative. The four native bilinear weights
and products with nonnegative corners therefore remain finite and nonnegative;
there is no saddle bias, and zero amplitude removes the perturbation for every
seed. Rounded or underflowed zeros stay inside under `zero-positive-v1`.
`side.nativeProof` names that whole-domain argument; it is null when unproved.
Tests of endpoints, near-one cancellation, subnormals and each bilinear basis
exercise the frozen evaluator but do not replace the numerical argument.

An identically zero source retains its separate unchanged zero-positive proof.
Tiny scalar scales and collars extending beyond the native cell remain unknown.
Heights and normals still come from the accepted matched interface; this is not
physical calibration or a gameplay occupancy query.

Skirt suppression is only eligible when both independent zero/inside proofs pass,
actual ports and floor definitions agree, and both sides are explicitly resident.
Absent sides, steps, material/floor mismatches, wrong native orientation or unknown
side evidence retain exterior geometry. Each side keeps its own boundary. The host
must recheck its complete context/residency before presentation changes. Support,
navigation and other game bindings remain unbound.

The existing finite axis-aligned lateral repair/contact proof is unchanged. Broad
shape syntax or a render plan does not authorize curved/diagonal/cap contacts.

## Evidence and handoff

The [Architect integration record](reviews/procedural-tiles/v2-integration.md)
accepts fixed correction e5329f0f525f1ad652de5a989c5e43dde9e800a1 for
A/B source only. From a source checkout, npm run test:tiles:v2:candidate runs the
explicit private installed proof. Normal published package profiles exclude the
candidate entry, its helper modules and v2 schemas; no public v2 capability or
required host service is advertised. The default candidate package tool still
refuses registration. Native C/D evaluators need separate review.

Run `node tools/tile-v2-schemas.mjs`, the focused A/B tests, the independent Python
eight-schema cases and `node tools/test-tile-v2-package.mjs --candidate`, then the
four required repository gates. The private installed proof removes inherited
NODE_TEST_CONTEXT and requires a positive test count with pass===tests and zero
failure/skip/cancel/TODO counts. Its default mode refuses pending registration.
The exact unapplied request is
`docs/reviews/procedural-tiles/v2-registration-request.json`.

Accuracy preference: retained native controls, separate approximation/zero/exposure
evidence and explicit unresolved states. Efficiency preference: bounded shared
edge work and parameterized records rather than a Cartesian asset catalogue;
this is a code-based expectation, with device timings still pending. Narrative
preference is subjective: reusable painterly terrain/roads/water/kerbs/walls/fences/
ramps/stairs/bridges for all three games, retaining legacy behavior where needed.
Renderer meshes and gameplay adoption need their own later acceptance. This
headless checkpoint starts no server/browser/watcher and retains no helper.
