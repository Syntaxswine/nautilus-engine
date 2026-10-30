# Native-kit ABI/profile request

For Architect/Coder review under scope `04f915dd8b16c242d47b1e054b2406aedcbdefc8`. This is a concrete content fixture and provisional recommendation, not a new public API, capability registration or world-v1 extension. The [definitions](../../../art/functional-parts-kit/definitions.json), [two recipes](README.md) and [measurements](measurements.json) are ready to map to the fixed package-1 ABI when distributed.

## Geometry and stable bindings supplied

- Five definition IDs with exact content version 1; bounded local part IDs per assembly. Visual bindings use `(assembly instance ID, local part ID, local node ID)`, including the door pivot. Copies supply a fresh source instance ID; moving the same instance preserves it. Runtime namespacing and source-map ID policy belong to Coder.
- Local floor IDs `ground` and `upper`, stored elevations 0 and 2.12 m. Each slab exposes support `top` on visual node `slab`. Roof instances reuse the slab with support explicitly disabled.
- `native-door-bay`: static `jamb-left`, `jamb-right`, `lintel` and three outside trim nodes; aperture `opening`; dynamic `door` on `leaf-pivot`, node `leaf`, decorative `handle-inlay`. The leaf is absent from static nodes.
- Opening 1.20×1.90 m. Hinge `[0.4,0,-0.13]` m; closed yaw 0, open yaw π/2 about native +Y. The 0.13 m hinge standoff clears the front trim; all 91 sampled leaf poses clear the frame. Closed/open AABBs are exact for the box leaf; the motion AABB conservatively contains the whole arc. Handle inlay is visual-only, 0.4 mm outside the closed collision face.
- `native-stair-14`: route `route`, ports `lower-landing`/`upper-landing`, visual/contact nodes `tread-01`…`tread-14`. Both recipes explicitly connect each port to a named slab's `top`; no guessed room adjacency or mesh-index lookup.
- Native translation and 0/1/2/3 quarter turns only. No scaling, mirroring, free rotation or curves are requested. Pure data/mesh preparation and host-Three presentation remain separated from behavior.

## Stair support decision requiring the fixed ABI

The stair has 14 risers of `2.12/14` m and 14 goings of `4/14` m, with flat landing endpoints. Local route:

```json
[[0,0,-1.25],[0,0,0],[0,2.12,4],[0,2.12,5.25]]
```

Axes above are `[X,height,Z]`; the compiler must make the explicit world `{x,y,h}` mapping. Structural vertical rays against actual slab meshes give 2 m centreline headroom. The 2×5 m shaft starts one metre before the first riser, and the actor's complete footprint fits each named flat landing.

The line is not the exact stepped walking surface. At local `Z=1 m`, its height is `0.53 m`; visual/contact node `tread-04` is at `0.605714285714… m`, a `0.075714285714… m` difference. Immediately after a riser, the difference approaches one riser, `0.151428571429… m`. A plain upright-box sweep against every tread/landing volume can therefore reject its own route. Ignoring those volumes without an explicit support rule would be incorrect for ordinary walking and under-stair access.

**Provisional preference:** retain the scoped continuous authored-line traversal, with explicit shared handling of its own stair/landing support surfaces and generic contact-aware presentation. Preserve every actual tread/contact record. Foreign solids, actors and hidden-floor obstructions must still block; ordinary walking must not pass through the stair's occupied volume. This is one standard stair profile, never a branch for `native-longhouse` or `native-cross-workshop`. Coder owns whether that fits the bounded first ABI or requires a distinct declared profile; UI owns the generic foot/pose binder. A richer per-step mover can be a later profile if needed.

Until that decision is implemented and reviewed, this checkpoint does **not** claim a passing runtime stair sweep, animated ascent/descent or mid-stair save/reload. The supplied actors are shown on measured flat landing supports.

## Actor and door gates

The selected existing reviewed horse is unarmed, native root scale one. Actual standing body top is 1.65 m and the root-centred required half-extent is 0.430837 m. The proposed first mover is 1.70 m high, half-extent 0.46 m. It fails the original 1.65 m door and fits the new 1.90 m aperture/1.20 m width budget.

The same source horse carrying HMG has equipped root half-extent 0.627429 m. Its 0.64 m selected profile requires 1.28 m, so both 1.20 m width budgets refuse it. This is actual equipment geometry, without scaling either model or mover. Full movement/equipment animation envelopes must be validated against the eventually selected provider; these are fixed standing reference samples.

The source-measured bare bear at preserved artist commit `c1f3dbc427ae11bba51fb0ff8bc4715ce0b9f84e` fits a provisional 0.50 m / 1.72 m standing profile. Do not call that approved integrated bear support. Retain the horse path until the architect distributes the accepted bear/provider checkpoint.

## Mapping work still owned by the other packages

1. Coder maps these definitions, floors/supports/portals, source paths and all-pose bounds into the fixed schema/compiler. Return stable source-mapped diagnostics and real negotiated requirements; no unknown fields go into world-v1.
2. Compile static frame geometry once, and the leaf once as a dynamic record. Bind visual state, closed/open queries, conservative operation sweep and saved state to that same door identity.
3. Bind stair ports to the exact support records, settle the walking-support profile above, and preserve geometry/definition identity in the complete runtime checkpoint.
4. UI consumes named visual nodes and supplied host Three/atlas, poses from committed state and preserves borrowed resources. Editor places/transforms/copies all children/connections as one authoring transaction through the public compiler.
5. Architect combines fixed checkpoints and runs actual editor/player/installed-package checks, both directions, live obstructions, oversized refusal and mid-stair restore. Game owners adopt exact pins separately.

This artist branch changes no runtime core, schema/capability/export/distribution metadata, donor bytes, game pins, main or Sites settings.
