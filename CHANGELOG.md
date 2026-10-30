# Changelog

## Unreleased

- Strengthen editor/game-host handoff, actual-page bridge, clearance, persistence and import-limit coverage while retaining current floor controls.
- Share the deployed Send patch with headless tests and build guards; diagnose browser loading and host-await failures.
- Assert Settings feedback placement and bound the module CI job to 15 minutes, retaining the reviewed test timing margins.
- Render editor assets in far fewer and cheaper draws: original and Gross buildings draw from display batches (one draw per material per view), a design placed more than once draws as instances, wall panels draw as one width-scaled instance set per material, sloped roofs merge into one draw per slot material, and double-sided glass draws as two fixed-side copies, so its two halves no longer re-derive their shader programs every frame. The original building generator is about 3.5 times faster with bit-identical output.
- `./assets/three`: `loadBuildingAssets(THREE, {shared: true})` opts into batched instances that share one design's geometry, materials and view; the default remains one independent model per instance.
- `./roofs/three`: add `createRoofMaterial(THREE, id, options)`, the material the adapter generates for one slot, so hosts can share slot materials across roofs.
- Pin the editor asset layers' exact draw counts per benchmark workload and view, and add the paired asset-rendering benchmark (A/B editor frames, SwiftShader pixel captures with depth-tie masks, direct assets-only timing).

## 0.10.0 — 2026-10-30

- Add optional Farmyard single-leaf door interactions with source reach, endpoint occupancy, AP/control/fog transitions and one current collider shared by dependent systems.
- Add the real public-import retained-host door reference with latched desktop/touch actions, complete save recovery and source/build/installed browser gates.
- Add the optional source-native painted timber leaf with one shared Three, packaged original paint and explicit owned/borrowed resource retirement.
- Keep retained game movement/resources, strict complete saves, fresh-context adoption, full host/state/context comparisons and durable quiet retries. Publish schema/capability identifiers and an installed builder card/checklist.
- Integrate the separate native door/stair/title foundation and native-quarter-turn functional part compiler/runtime with strict geometry/content identities; retain native art/editor/production adoption boundaries.
- Repair starter result ownership, save validation, New game persistence ordering and retirement; preserve all grenade entries and existing profiles.

## 0.9.0 — 2026-10-29

- Extract Farmyard Commando's ordinary same-floor grenade rules into optional headless grenade and aiming entries, pinned to reviewed source with original conformance tests and hashes.
- Preserve source AP discounts, finite stock, held equipment, authored trajectory, wall/fog protection, damage, casualties and contact transitions; refuse reactive and multilevel scenes before spending.
- Add strict versioned grenade state, transactional host-context updates and durable retries that preserve injuries and spent resources through reload.
- Add optional desktop/touch controls, a borrowed-scene preview overlay, shared item discovery and original painted grenade/horse choreography with explicit resource ownership.
- Provide a real public-import reference player with quiet save/load, interrupted-write recovery and exact-input offline installed browser parity.
- Preserve the source gameplay arc while bridging the measured native hand-release gap cosmetically; native playback never reapplies authority.
- Keep complete game inventory, body registries, scheduling and persistence behind explicit host bindings. No production game pin changes.

## 0.8.0 — 2026-10-29

- Add optional headless module planning and explicit prepare/start/stop/dispose ownership, host-provider bindings, version diagnostics and rollback.
- Add a Farmyard stat-v2 calculation adapter and pinned real-game parity tests; retain host actors, resources and all production pins.
- Add extended-world v1: sparse native metre heights, stable floor/support identities, static AABB queries, authored traversal endpoints and preserving legacy refusal reports. Support up to 32 declared positions without changing legacy map/block formats.
- Add a separate fifteen-story native-height authoring workshop with measured/dragged edits, revision-bound previews, bounded history, JSON import/export, browser saves and explicit legacy refusal.
- Add five-label floor controls with arrows, scoped wheel/Page keys, explicit follow/contact/manual modes and legacy editor preview cancellation.
- Record existing actor, throw-marker and tall-building binding evidence without adding a new runtime asset closure or claiming a complete actor loader.
- Register separate configuration/world schemas, keep browser floor views outside headless core, and extend installed-package and browser checks. The modular blueprint remains an active programme; see docs/modular-foundation.md for boundaries.

## 0.7.0 — 2026-10-29

- Add basic character progression with increasing XP requirements, 15 assignable stat points per level and slower, separate practice gains using the existing 14 stats.
- Add a strict versioned progression bundle, atomic reward/allocation receipts, pure previews and save/reload preservation of injured or exhausted characters.
- Add a character-development reference UI with staged allocation, derived-effect previews, banked points and import/export.
- Keep species/class perks deferred, character-v1 and portable maps unchanged, and all consumer adoption pins unchanged.

## 0.6.0 — 2026-10-29

- Add a versioned recoverable rock item with staged pickup/throw deltas, deterministic aimed lobs, saved fixed-step flight and one sound cue at the first confirmed impact.
- Add explicit hearing eligibility and investigation requests while preserving combat/confirmed threats; consumers own inventory transactions, collision, audibility and guard movement.
- Add an original native-scale shared rock model, public item exports and discovery, plus a playable reference yard and automated browser workflow.
- Keep portable map/block formats and all three games’ adoption pins unchanged.

## 0.5.0 — 2026-10-28

- Remove the renderer dependency from public headless map document/inspection imports; preserve the reviewed portable editing profile.
- Add engine-owned schema/capability manifests, actionable negotiation, explicit legacy migration and stamped saves with golden compatibility fixtures.
- Add a bounded Tinderbox flat-yard adapter with lossless map sidecars, deterministic replay and tests against its pinned compiler/simulation; production adoption remains a separate game change.
- Add procedural sloped roof data, geometry and editor authoring with explicit consumer capabilities.
- Separate headless, renderer and optional building-asset distributions; whitelist default package files and test an installed external consumer.
- Expose shared asset discovery and a public building renderer facade for independent use by all three games.

## 0.4.0 — 2026-10-28

- Unified editor library: 61 whole buildings, native AFT structure stamps, mixed seeded settlements and source-aware previews.
- Transactional walls/prefabs, original catalogue capability enforcement, save/history preservation and responsive asset/building libraries.
- Automated isolated real-browser authoring, import/export and persistence acceptance.

## 0.3.0 — 2026-10-28

- Measured native-scale angled wall runs and optional contour rendering effect.

## 0.2.0 — 2026-10-28

- Portable headless character, skill, combat and saved-roll contracts.

## 0.1.0 — 2026-10-28

- Standalone map workshop, inherited portable map/block formats and deliberate donor source pins.
