# Native grenade and horse throw: proposed handoff

Follow the [component handoff standard](../../component-handoffs.md). This is an artist source-audit card, not a registered runtime API or a released animation provider. [Guide](README.md), [measurements](measurements.json), [source/resource ledger](sources.json), [working source probe](../../../art/grenade-review/audit.mjs).

For the follow-on implemented optional provider and its exact constructor/frame/disposal ABI, use [the provider guide](provider.md). Public distribution registration and integrated browser/player acceptance remain architect-owned work.

| Field | Concrete handoff |
| --- | --- |
| Status / identity | Proposed source audit `farmyard-grenade-presentation-251bf809`; no public API/schema/capability identity invented |
| Fixed source | Farmyard `251bf8094b5f9ebe44208443084c1a6d6658512a`; embedded AFT designer `a20b343a0234b5d8b365a4e1668961ca1bf37653` |
| Nautilus baseline | `f6caeef309e56423fea5e32eb717533f33b59cbb`; existing AFT vendor `781246a668c723d5a4c5463e70534cc04b6a5641` |
| Native actor | Existing horse, normal paint, seventeen-bone rig, root scale one; body/held-action envelope in manifest |
| Original prop | Existing `grenade-model.js`, `grenade-surface.png`; 820 triangles/five meshes; no new sculpt/skin required |
| Source driver | Embedded designer `tactics/grenade-throw-motion.js`, 41,161 original bytes; bind to host Three deliberately |
| Prepared data | Designer `grenade-prepared.js`, 585,406 bytes for twelve animals; horse balance 1,841 rows. Do not load the entire designer game/archive. |
| Original paint | `assets/characters/lowpoly-proof/horse-worker-model-paint-v1.png` and `assets/equipment/painted-ui/grenade-surface.png`, under the existing pinned `dist/` root; exact SHA-256/bytes in ledger |
| Notices | Preserve [Nautilus notices](../../../NOTICE.md), original source attribution and existing Three MIT notice. Provenance adds no licence grant. |
| Owners | Artist: native anchors/art parity and review. Coder/Architect: public imports, profiles, authoritative grenade state and fixed integration. UI: presentation/controls and host binding. Game: inventory, AP/costs, permissions, balance and adoption. |

## Minimum connection sequence

1. Use the accepted installed actor/item provider and one host Three namespace/renderer. Those public entries remain pending; the source probe is the executable example for this stage. Both PNGs and the static model/data closure already exist in Nautilus. Byte comparisons distinguish exact resource reuse from line-ending-only source equivalence; no vendor files were rewritten.
2. Load the original normal horse paint through its projection provider. The native `createModelPaint` owns the supplied input texture and its own projection targets/materials; it is not safe to dispose that provider over a borrowed shared input texture. Give it the appropriate owned load, or implement an explicit accepted ownership adapter. The existing `createAnimalPaint` wrapper handles its asynchronous loads and failures.
3. Supply grenade paint explicitly. `createGrenadeModel(texture)` borrows that texture; no-argument browser creation starts its own texture load and owns it. The original function sets sampler/color-space parameters even on a supplied texture. Use a compatible dedicated/shared prop texture policy. Dispose model geometry/materials and release shared paint only through its owner.
4. The driver needs the named mammal bones, native foot meshes and a grenade with the real `grip`, `pull ring` and `curved safety lever` records. It poses the worker root at identity, changes foot skin weights temporarily, solves IK and writes prop-local transforms. Keep host world placement in an outer group, apply it after local sampling, and restore/suspend the normal locomotion/equipment controller while throwing. Do not drive both controllers or double-parent the prop to a hand.
5. Sample accepted presentation time with the measured 0.50/0.70/1.60/1.92/1.945/4.60 s markers. The runtime event/clip identity belongs to the authoritative host. Seeking, repeated frames and restore must not charge inventory/AP, emit another release, apply damage or replay one-shot effects.
6. At the accepted release, stop drawing the held casing and show one host-owned projectile on the accepted trajectory. Loose pin/lever are presentation only. The source driver's five-metre demonstration flight/bounce is not a replacement for the grenade kernel. **Keep the Farmyard source-authoritative arc and `[0,1.1,0]` local origin unchanged.** The native release is `[0.1245299924,1.5672673579,0.2563392314]`; use an explicit cosmetic transition on the single rendered projectile or expose the measured discontinuity. Do not move authoritative geometry, rescale the rig, retime gameplay or claim physical continuity. Cancel the cosmetic bridge on host impact/cancellation.
7. Before throwing, validate the selected action envelope and live obstructions; standing unarmed clearance is insufficient. Apply native position/heading/floor transforms consistently. Hidden actor/geometry visibility cannot disable collision. Exact query/profile policy remains Coder-owned.
8. On finish/cancel/replacement, stop further callbacks, dispose the motion to restore original skin weights, detach/dispose owned props, and restore presentation from accepted host equipment/locomotion state. Source motion disposal is idempotent but does not restore prior equipment/world placement or reject later `at()` calls; an adapter must own those guards. Clean partial/late loads without touching borrowed renderer/Three/services.

## Saves and game decisions

This source asset owns no game save, AP, damage, random stream, fuse, inventory or authoritative projectile. A future accepted checkpoint must preserve exact geometry/animation/profile IDs, clip/command identity, committed release/effect receipts and host presentation time alongside authoritative grenade state. Stage validation before replacing the session; restoring a pose does not replay a gameplay command. This source audit's repeated/out-of-order seeks prove source determinism only.

Keep original normal paint/native geometry for the first comparable review. Outfit/species variants, arbitrary heading clearance, reduced presentation, different throw timing, changed projectile radius or flight policy need explicit profiles and measurements. A pin-pull grenade driver is not a generic rock throw or a bear animation.

## Acceptance checklist

- [x] Inspect actual Farmyard FieldView/solo throw and distinguish designer-only drivers. Evidence: [guide](README.md) and fixed source ledger.
- [x] Identify real existing art/rig, complete minimal static dependency closure, original paint, native hold/release anchors and phase markers. Evidence: [sources](sources.json), [manifest](measurements.json).
- [x] Evaluate the original driver on native horse geometry/host Three; 155 samples, no unreachable pose, measured palm/feet/envelopes, deterministic seeking and restored skin weights. Evidence: source probe and manifest.
- [x] Preserve current functional-part, bear, Coldwell and title checkpoints; make no donor/runtime/pin/Sites changes. No preview helper started.
- [ ] Architect/Coder publish the fixed integrated candidate and public installed provider/resources/profile requirements; record accepted pins and rollback.
- [ ] Bind measured action clearance and exactly-once authority through the fixed profile. Preserve the source arc; visually review a declared cosmetic release transition or expose the discontinuity. Do not hide mismatches by scaling or duplicate logical projectiles.
- [ ] UI bind the actual normal horse/paint/grenade and source choreography; review matching native captures at all key phases and transformed/elevated placement.
- [ ] Prove load failure/cancel/late disposal and borrowed resource survival; verify actual desktop/phone controls, focus and reduced presentation.
- [ ] Save/reload mid-wind-up and after release; reject incompatible versions atomically; do not replay inventory, costs, audio, damage or release.
- [ ] Run combined package/player checks, report exact visual results/counters and helper cleanup, then adopt games separately. Initial source measurements are not integrated visual or consumer acceptance.

**Preference:** reuse existing painted geometry/rig and the published procedural choreography through one accepted shared presenter. Retain Farmyard's simpler playback as a declared compatibility option; keep all balance/authority with the headless/game hosts. The [guide's accuracy, efficiency and narrative assessment](README.md#reproduce-and-next-review) states the evidence and remaining limits.
