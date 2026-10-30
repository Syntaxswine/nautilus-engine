# Native shared-part kit: artist checkpoint

The first content/measurement checkpoint for package 2 of the [functional-parts scope](https://github.com/Syntaxswine/nautilus-engine/blob/04f915dd8b16c242d47b1e054b2406aedcbdefc8/docs/projects/functional-editor-parts.md). **This is working native art and semantic evidence, awaiting the architect-distributed Coder ABI. It is not the completed editor/player integration.**

Start with the [builder handoff](component-handoff.md), [five definitions](../../../art/functional-parts-kit/definitions.json), [measurement manifest](measurements.json) and [specific ABI/profile request](abi-request.md). Original bear `c1f3dbc427ae11bba51fb0ff8bc4715ce0b9f84e` and Coldwell `82da2ccccbba20619059bef5000783bd685153fd` remain on their preserved branches.

The [validation receipt](handoff-checks.json) records the working source example, local links, capture/source hashes and completed checks. Public ABI adaptation and playable acceptance remain separate checklist items.

| Item | Concrete result |
| --- | --- |
| Fixed baseline | Documentation/main `78d37b6cd3ba5de5c25d4922b4ba301b13491caa`; runtime v0.8.0 / `8c4670450cb2b38c1e1abd811d633c22de9e2b7c` |
| Native parts | 2×2 m slab, 2×1 m slab, 2 m wall, real 2 m door bay, 14-riser stair flight; exact content version 1 and local node/support/portal IDs |
| Layout A | [8×10 m longhouse](../../../art/functional-parts-kit/longhouse.assembly.json), 97 part instances |
| Layout B | [10×8 m cross workshop](../../../art/functional-parts-kit/cross-workshop.assembly.json), 102 instances; relocated/rotated stair and a rear partition/second door |
| Reuse proof | [Quarter-turned second A instance](../../../art/functional-parts-kit/longhouse-quarter-turned-instance.json); same five definitions; all four quarter turns of both layouts tested |
| Floors / hole | Finished floors 0 and 2.12 m; roof top 4.24 m; real 2×5 m upper-slab void, 70 m² upper support in each layout |
| Door | 1.20 m clear width × 1.90 m clear height, 1.18×1.88×0.05 m leaf, 90° outward pose; hinge/standoff, exact closed/open boxes and conservative complete motion box |
| Stairs | 1.20 m width, 4 m run, 2.12 m rise, 14 actual treads; explicit walking centreline, contact surfaces and supported flat endpoints |
| Source / game prototypes | 1,036 / 780 triangles across one of each definition; 427,606 / 294,960 bytes of exported mesh JSON, not an installed package budget |
| Native visual actor | Existing reviewed AFT horse, normal/unarmed, root scale one; actual body height 1.65 m, selected standing mover 1.70 m high / 0.46 m half-extent |
| Oversized case | Same unscaled horse with HMG: actual equipped root half-extent 0.627429 m; selected 0.64 m profile needs 1.28 m width and fails the 1.20 m aperture/stair budget |
| Bear | Source-measured normal/Red Hat envelopes fit the proposed bare profile, but integrated bear review remains pending; it is not used as an approved provider here |

The old 1.65 m doorway rejects the 1.70 m mover. The new opening is authored at its real size; neither animal nor collider was shrunk. Standing bounds are not an all-animation/equipment guarantee.

## Visual and geometry evidence

[Twelve native captures](browser-review.json) show both layouts, real slab holes, door poses, actual animals and the oversized equipment case. [Door fit](native-door-open.jpg), [stair cutaway](longhouse-stair.jpg), [upper void](longhouse-shaft.jpg), [three reused instances](reused-parts-instances.jpg) and [HMG budget refusal](native-hmg-oversized.jpg) are useful starting views. The wire boxes annotate a measured profile; they do not replace the visible animal.

Seven focused checks in [the test source](../../../tests/functional-native-kit.test.mjs) use actual triangle raycasts for the door/shaft, verify leaf/frame separation over 91 angles, measure centreline vertical headroom against slab meshes, confirm complete landing footprints, compare native meshes through all quarter turns, retain source/game bounds and verify borrowed atlas ownership. The structural centreline clearance is 2 m. This is not a complete swept-body stair query.

The [source record](sources.json) pins existing paint, catalogue geometry and horse inputs. The atlas is reused unchanged; no new skin or donor import is needed. The optional renderer borrows one host Three namespace and the atlas, shares immutable geometries/materials across its instances, and owns only its own resources. Its pose setter is presentation, with no interaction/state/cost execution.

## The important stair boundary

The authored continuous route and physical stepped treads are both supplied. The maximum centreline-to-tread height difference is one riser, 0.151429 m. Treating every tread as an ordinary obstacle to a filled upright box is not the same as traversing an authored walking-support route. Conversely, dropping the stair/landing collision silently would make under-stair walking and foreign obstructions incorrect.

[The ABI request](abi-request.md) supplies the exact source points and support/contact IDs. Coder must settle the shared walking-support/own-surface rules, while UI's generic binder handles the declared foot contacts. No bespoke movement code keyed to either layout is proposed. The source views place real characters on the verified flat landings; they do not claim accepted stair animation, obstruction/save/resume behavior or gameplay.

## Bounded catalogue audit

[Rowan Family House](rowan-audit.json) is one audit target, not a conversion. Its 22 regular 1×1.65 m doorways, 1 m-wide/3 m-run stair, 1×3 m slab hole and descriptive room/door graph need deliberate actor-clearance, floor/landing, dynamic-leaf, route, state and source-map work. [The unchanged catalogue cutaway](rowan-existing-audit.jpg) is visual evidence. Defer its conversion until this smaller kit proves the shared compiler/profile. None of the 48 catalogue buildings is relabelled functional by this branch.

## Reproduce

```powershell
node art/functional-parts-kit/measure.mjs
node --test tests/functional-native-kit.test.mjs
node art/functional-parts-kit/review.mjs
./art/functional-parts-kit/verify-cleanup.ps1
```

The visual tool is source-only, uses an isolated browser and localhost server, closes both in `finally`, and has a real five-minute expiry. [Cleanup evidence](helper-cleanup.json) records exact PID/creation time/executable checks and released ports. No retained preview is needed.

**Accuracy:** prefer the enlarged real aperture, explicit slab void/landings and shared semantic geometry to scaling an animal or inferring a route from decoration. The continuous walking route is a declared approximation to stepped contacts, requiring a matching shared provider.

**Efficiency:** reuse five definitions, the existing atlas and shared immutable meshes; source/game reduction preserves native bounds. Prototype bytes, geometry counts and this bench's renderer counters are measurements. Native measurement-tool timings are not compiler/rebuild or device frame-time results. Public package bytes and practical movement/rendering performance await the fixed integrated candidates.

**Narrative:** the brick/concrete/timber service-building kit reuses existing painterly art and works for AFT/Farmyard-style scenes without importing factions, inventory or game rules. Keep the original catalogue and Coldwell/bear work available; use separate declared profiles for richer curves, fire or additional parts.
