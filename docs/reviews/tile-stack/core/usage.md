# Gate A rectangle-stack planner

Private host helper, implemented for the fixed scope `5d69c2130eb64b6f4e31bc672e884bdc33bf47d2`. The unchanged public v1 `./tiles` core is the matching/repair authority. Runtime entry is `candidates/tile-stack/core/index.js`; complete types are in `api.d.ts`. No package export, provider, public schema, accepted host, C2a evaluator, game pin or deployment changes.

## Builder usage

```js
import * as tiles from '@nautilus-engine/core/tiles';
import {planTileStack} from './private-host/tile-stack/index.js';
const plan = planTileStack(tiles, {
  bundle: acceptedDocument.tileBundle,
  constraints: acceptedDocument.stackConstraints,
  context: capturedContext,
  expected: capturedExpected,
  intent: finiteIntent,
  limits: capturedLimits
});
if (!plan.ok) return showRefusal(plan.diagnostics);
const prepared = existingRetainedConsumer.prepare(plan.request);
// Host review then its existing single authority adopts BOTH prepared.next.bundle
// and plan.constraints, under the full captured document/context binding.
```

This is an integration example, not a newly implemented Editor adapter. Gate B owns that complete document policy, journal/history and presentation. `prepareTileStack(tiles,input)` is a headless proof convenience that plans then invokes public prepare once. Its plain result is never a committable retained handle. Do not call the convenience and then prepare again in the real host.

Input and output are copied plain data; no DOM, storage, Three, network, clock or ambient RNG is read. Failures return `request:null,constraints:null`. Planning success means a bounded request exists, not that clearance, joined interfaces or impact/gameplay are accepted. A failed public preparation has `next:null`. There are no retained resources in this helper.

## Accepted source and proposed intent

`constraints` is accepted saved source: `{kind:'nautilus-stack-constraints',version:1,floorProfileId,minimumClearanceM,owners:[{instanceId,primaryReservationId}],managedRelations:[{id,kind:'cross',a,b,clearanceM}]}`. Each managed record must exactly match its accepted source relation. A missing primary identity is never inferred from a family name, mesh, reservation order or ID convention. All extra reservations remain.

`context` captures `{contextToken,cancelled,sourceConstraintsDigest,floorProfile:{id,version:1,floors:[{id,elevationM}]}}`. `expected` binds revision, layout/catalogue digests, context token, source constraints digest and exact floor-profile digest. The ordered table must exactly match the bundle and cannot change. ID alone never binds a profile. The host must include this exact profile/constraints plus its actual mode/epoch/provider/finish catalogue in its authoritative context token; the pure helper cannot authenticate a caller that deliberately replaces both accepted source and its claimed tokens.

`intent.minimumClearanceM` is proposed source, at least the accepted minimum. It does not replace/re-token accepted constraints. Existing stronger managed pair requirements are retained. Proposed clearance applies to pairs touching the explicitly changed/new owners; unrelated accepted pairs retain their own saved requirements. The accepted workspace minimum remains unchanged. Global policy changes need another reviewed intent.

`place-stack` accepts one complete original local zero-base/zero-port-offset rectangle recipe, one primary reservation ID, shared `originXY` and D4 transform, and explicit `{id,floorId,locked,anchorIds}` members. A slot uses exactly one recipe/transform alternative. Heights come from the named predeclared floor, with no ordinal formula. Preserve original anchor subsets, including empty subsets.

`edit-owners` supplies complete source placements with named primary reservations, recipe updates, remove IDs and explicit join/relation deltas. Shared source changes need increasing content versions and cannot rewrite locked owners. Finish uses copy-on-write recipe identity on the editable owner, preserves old recipes/anchors/borders/seed and lets public core check the unchanged shared interfaces. Managed crossing IDs survive; obsolete managed crossings are removed when their contact disappears. Manual relations/joins remain unless explicitly edited, so removing a manually related owner also needs the explicit relation/join removal. No implicit geometry fitting or automatic manual-source pruning.

The result binds `sourceLayoutDigest`, `sourceCatalogueDigest`, `contextToken`, `sourceConstraintsDigest`, `nextConstraintsDigest`, `floorProfileDigest` and `requestDigest`. Inspection lists complete old/new closure owners and obligations; work reports deterministic planner units and a conservative serialized artifact preflight size. These are counts, not timings or heap measurements. Inspection records reserve 2,048 bytes each before allocation; the byte cap can refuse earlier than final JSON size alone would imply.

## Supported and refused geometry

Every affected old/new owner is validated as an original unclipped four-line level axis-aligned rectangle under an allowed existing D4 placement. Its named conservative primary reservation contains original geometry and thickness before and after public projection; the native source base equals its declared elevation exactly. No quantization/fitting changes the saved controls. Supported boundary line/cubic controls must remain level and inside the rectangle. All original ports, policies, profiles, anchors, seeds and additional reservations survive.

Conservative source hulls include original shapes, boundary controls, endpoints and every reservation, with a one-quantum discovery guard. Old/new hull and semantic closure has no height filter. Unchanged reservation-free paths/fields in that closure cannot disappear because public reservation discovery alone has no corresponding box. A conservative hull only discovers work; it does not certify curves. Unused and distant valid public source is retained unchanged.

Positive-XY-overlap members on different declared floors produce a persisted ordinary v1 `cross` for every required owner pair; public core checks every overlapping reservation pair. Same-plane overlap, wrong floor binding, absent/nonconservative primary envelopes and unsupported affected geometry refuse. Zero/short gaps and tall extras fail public preparation. Projected edge/radius-only contacts refuse with `STACK_FLOOR_SEPARATION_UNSUPPORTED`, both owners/reservations and `requiredCapability:'versioned-floor-separation'`. One positive axis without positive area is still an obligation. A future contract is proposed separately, not implemented.

## Limits and integration checklist

Existing reference caps remain 32 owners/recipes, 256 repair steps, 32 closure owners and 100,000 spatial/geometry units. Planner ceilings are 1,000,000 deterministic units, 4,000,000 bytes and 1,000 m maximum neighbour radius; callers choose their actual radius (acceptance fixtures use zero). All are finite and only lowerable. Complete input also retains inherited 4 MB/200,000-node/depth-32 limits. Collision allocation uses at most 257 actual digest probes; IDs are 74 ASCII characters regardless of owner-name length, collision checked without truncation.

1. Borrow the actual fixed public namespace; retain all source, unused recipes and explicit floor/finish catalogue bindings.
2. Capture authoritative accepted constraints, exact table/context and expected tokens before drafting; never let UI rewrite accepted state to satisfy a check.
3. Plan once, feed its ordinary request to the existing retained consumer once, and review the actual public result.
4. Bind target bundle AND next typed constraints in the one full checkpoint operation, final CAS, receipts, Undo/Redo and same-original-ID recovery. Never save/adopt constraints early or in a second write. Unknown acknowledgement freezes further edits/saves until the owning authority reconciles that ID.
5. Retire stale review/input before floor/mode changes. Refusals preserve accepted document, redo and views. Positive acknowledgements remain committed after a display failure; retry only presentation.
6. Charge accepted/candidate/acquiring/unverified-retiring views together: two roots, 50,000 triangles, 1,024 cells. The aligned fixture derives 480 cells per view, 960 for accepted plus candidate. Hidden floors still count. This helper allocates no view and makes no GPU/phone performance claim.
7. Keep the original three-layer map verbatim. Support/navigation, extrusion, live-game adoption and legacy export remain explicitly unbound. No new public registration is claimed.

Gate B must prove the real stacked session, full history/recovery and browser workflow after Architect accepts fixed components. The existing v1 session regression suite remains applicable, but its success does not prove new v2 persistence.
