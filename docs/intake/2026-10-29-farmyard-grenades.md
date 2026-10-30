# Farmyard grenade workproduct intake

Authorized by the user on 29 October 2026. Reuse Farmyard Commando's existing grenade implementation, controls and presentation sources as an optional Nautilus component. Preserve the working design instead of introducing a new fuse, physics model, hit roll or balance pass.

## Fixed source and boundaries

- Donor: `https://github.com/Syntaxswine/farmyard-commando`, published main verified at `251bf8094b5f9ebe44208443084c1a6d6658512a`.
- Read-only source checkout: `C:/Users/baals/Documents/ChatGPT/Tactical Animal`. Read full Git objects; preserve original bytes, notices, hashes and resource closure in a separate immutable snapshot.
- Engine baseline: `f6caeef309e56423fea5e32eb717533f33b59cbb`, including the accepted [functional-parts scope](../projects/functional-editor-parts.md). Existing donor pins and candidate branches remain unchanged.
- Main source roots: `sites/tactical-animal/dist/solo-game.js`, `grenade-controls.js`, grenade/control/input tests, and the grenade-related `app.js`/`field-view.js` behavior. Distinguish actual runtime presentation from the separately committed designer throw studies.

Public modules use engine-owned interfaces. Full donor game code is frozen conformance evidence, not a runtime dependency or public API. Rules, input, optional rendering and static review resources remain separate entries. Do not import Farmyard's missions, cast, storage, scheduling or whole application as engine defaults.

## Preserved behavior

The source uses 5 AP, discounted to 2.5 only for an equipped pistol, offhand pistol or SMG. Throwing keeps the weapon and its ammunition intact while consuming one grenade and synchronizing grenade pack rounds. Invalid/cancelled actions spend nothing. Eligibility checks AP before an accepted exploration-to-combat transition; that transition can restore max AP before debit when guards remain. The no-living-guards exception does not refill AP.

Retain the source's 10 m range, 5 m blast, 33-point sinusoidal trajectory, explored landing rule, separate flight/landing/blast blocker policies, self-danger and fog-limited preview footprint. Blast visits all living units in source order, including the thrower and allies, applying the source damage falloff and resistance once. Ordinary fatalities include casualty/resource/movement/body consequences. Surviving guards within 20 m of the thrower alert and remember the thrower rather than the impact point.

The attack resolves authoritatively during the committed command. Flight and explosion playback are transient. Saved state preserves spent stock/AP, changed HP/casualties and command identity; loading must not replay presentation or grant another attack. There is no authoritative fuse, bounce or midflight save in this source profile.

## Supported first profile and dependencies

The first executable engine profile is explicitly planar, static and non-reactive. Implement the complete ordinary-grenade path in that profile, with strict copied state, revalidated staged actions and durable retry protection. The exact public contract and supported limits live in the component guide.

Farmyard's full game additionally handles windows, fire and loaded fuel carried in equipped or stowed weapons. Fuel can consume conditional RNG, replace ordinary damage and change later victims or geometry before the loop finishes. These effects cannot be appended as unordered cosmetic events. Preserve the full source and its tests, detect unsupported reactive/multilevel inputs before costs, and expose actionable capability/refusal diagnostics. A future versioned reactive host adapter must stage the ordered consequences before claiming those capabilities. The initial profile does not replace Farmyard's complete production implementation.

A game projection must validate actual supported source fields and features; it must not erase window, fuel, floor, fire or casualty facts to fit the bounded schema. Preserve source saves and other host-owned state behind explicit adapters. No game production pin or deployment changes as part of this intake.

## Implementation ownership

| Owner | Deliverable |
| --- | --- |
| Core helper, architect-coordinated | Optional headless grenade/aim entries, strict schemas, pure preview, staged costs/damage/alerts, state/receipt persistence and deterministic original-game conformance. |
| Provenance helper | Repeatable Git-object inventory/import, immutable closed source/test snapshot, notices and exact byte/hash evidence. |
| UI, Nautilus Engine | Reusable controls and reference presentation using the fixed public API: joystick/keyboard aim, preview, confirm/cancel, camera, feedback, loading/failure and lifecycle. Preserve its other branch checkpoints. |
| Artist, Nautilus Engine | Native model/rig/paint/throw audit and visual fit evidence. Reuse existing workproduct; label runtime versus designer-only motion accurately. |
| Coder and Editor, Nautilus Engine | Retain ownership of the generic functional-parts bridge and authoring. Consume the reviewed grenade capability/item definition through that registry; avoid a second grenade kernel or per-map copied gameplay. |
| Architect | ABI/source review, package/capability/pin metadata, installed/source browser proof, fixed-commit integration and release decisions. |

## Acceptance

- Run the frozen original grenade/control/input tests and compare engine results against the actual pinned game for supported scenes. Cover equipped-weapon discounts, stock/pack synchronization, self/allied casualties, guarded exploration and no-guard transitions, low blocked throws/high wall-clearing lobs, blast cover, fog and all rejection cases.
- Reject unsupported reactive/floor profiles before mutation. Validate data before invoking accessors, copying or normalizing. Revalidation catches changed actor/resources/geometry; accepted command replay cannot repeat costs, damage, RNG, alerts or presentation.
- Preserve exact injured/spent state and durable command identity through saves. Restoring poses must not replay one-shot flight/explosion/audio. Keep whole-game scheduling/visibility decisions explicit where they remain host responsibilities.
- Preserve original joystick dead zone, held neutral target, keyboard range, camera-safe framing and cancellation. Validate desktop/narrow-phone workflow and a public-import reference using existing native art and a supported throw presentation; a generic prop alone does not satisfy visual acceptance.
- Verify source/package resource parity, one borrowed host Three instance, independent instances, partial/late load cancellation, disposal and borrowed-resource survival. Keep headless imports free of DOM, renderer, storage, implicit clock/RNG and donor game internals.
- Run `npm run check`, `npm test`, `npm run test:upstream`, `npm run build`, installed-package and affected browser/visual checks. Record exact commits/results, source and package bytes, notices and helper cleanup. Do not advertise an integrated/released component until the combined candidate passes.

## Design choice

For **accuracy**, prefer source-exact Farmyard trajectory, blocker and damage semantics for the Farmyard-compatible profile; it is a tactical approximation, not calibrated shrapnel/acoustics or a multi-floor blast solver. For **efficiency**, preserve the bounded samples and load only selected code/content; measure package and runtime costs rather than assuming savings. For **narrative**, preserve Farmyard's familiar controls and outcome rules while other games select explicit costs/consequence providers. Richer fuel/fire behavior belongs to a declared compatible host profile. Follow [design evaluation](../design-evaluation.md), [rules](../rules.md) and [component handoffs](../component-handoffs.md).
