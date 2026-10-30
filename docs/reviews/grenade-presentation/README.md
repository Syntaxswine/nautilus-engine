# Farmyard grenade presentation: native source audit

**Initial artist checkpoint; integrated visual acceptance remains pending.** Published Farmyard source `251bf8094b5f9ebe44208443084c1a6d6658512a`, Nautilus baseline `f6caeef309e56423fea5e32eb717533f33b59cbb`. Start with the [builder card](component-handoff.md), [native measurements](measurements.json) and [Git-object/resource comparison](sources.json). This branch adds an audit tool and evidence, with no runtime import, donor edits, game pins or public API registration.

Prefer the existing native **horse worker, normal outfit**, existing painted grenade and original procedural throw. No new model, skin or bear redesign is needed. The horse and grenade already reside in Nautilus's immutable AFT `781246a668c723d5a4c5463e70534cc04b6a5641` snapshot. Fourteen selected model/data/paint/dependency paths were compared: both paint PNGs match Farmyard exactly; present code/data dependencies match after explicitly recorded line-ending/final-whitespace comparison. Original vendor bytes stay unchanged. The designer release table already matches Nautilus byte for byte; Farmyard's runtime AFT tree has no release-table file.

## What the published game actually does

The real [FieldView](https://github.com/Syntaxswine/farmyard-commando/blob/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/field-view.js) calls the runtime `grenadeTrajectory`, draws its 33-point line and a blast ring, and uses a 700 ms visual lifetime. Window effects have a 500 ms grenade offset. Actor pose samples contain gait, kneel, prone and down; this path does **not** invoke `createGrenadeThrow` or `BattleGrenades`. Throwing a utility grenade does not itself switch the actor's primary weapon to a grenade pose.

The [actual solo throw](https://github.com/Syntaxswine/farmyard-commando/blob/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/solo-game.js#L319) commits AP/ammunition, damage/windows and alert changes immediately, then records a presentation effect. Its trajectory begins at height **1.1 m**, interpolates to 0.08 m and adds a sine rise. It is not the designer's delayed release/flight/fuse driver. Preserve that distinction when comparing behavior; a shared animation must never spend or damage again.

The published embedded designer contains [the real throw driver](https://github.com/Syntaxswine/farmyard-commando/blob/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/designer/a20b343a0234/tactics/grenade-throw-motion.js), prepared balance tables and `battle-grenades.js`. Its provenance identifies AFT source `a20b343a0234b5d8b365a4e1668961ca1bf37653`. This is available workproduct, **not evidence that Farmyard FieldView already plays it**. The designer battle presenter uses the body driver, hides the held casing at release and renders a separate authoritative trajectory projectile. Copying that entire game-dependent presenter would import unnecessary world/combat/scenery dependencies.

The earlier [actor intake](../actor-height-intake/README.md) already distinguished live playback from the designer study using Misha/donkey. This audit confirms the distinction at the new requested Farmyard pin and measures the compatible horse throughout the throw.

## Native model, anchors and phases

Units are metres, native vectors `[X,height,Z]`, +X forward. The horse has a seventeen-bone procedural rig, rather than an AnimationClip bundle. Keep root scale `[1,1,1]` and foot datum zero. The prop has **820 triangles in five meshes**, a merged painted-panel mesh and separate `pull ring` / `curved safety lever` meshes. Its native assembled bounds are approximately **0.081733 × 0.111 × 0.074940 m**. The visual root-centred bounding radius is 0.072247 m assembled and 0.061492 m for the released casing without ring/lever. These geometry measurements do not change the source-authoritative collision profile; exact bounds are in the manifest.

| Binding | Source value / meaning |
| --- | --- |
| Grenade `grip` | Prop local `[0,0,0.016]`; the throwing palm is `hand1` local `[0.052,-0.010,0]` |
| Grenade `release` anchor | Prop local centre `[0,0,0]`; not a character-hand socket |
| Native carry | Position `[0.17,1.28,0.34]`, axis `[0.65,0.1,-0.7]`, hand side `1` |
| Pose ownership | Prop is a child of the worker root; the driver writes its root-local transform and solves the skeleton to it. Do not also parent it to a hand bone. |
| Pin pull / drop | 0.50 s / 0.70 s |
| Front foot planted | 1.60 s |
| Release | 1.92 s; local centre `[0.1245299924,1.5672673579,0.2563392314]` |
| Lever separation | 1.945 s |
| Study duration | 4.60 s, including follow-through/recovery |

`GRENADE_KEYS` supplies labelled display poses; those labels are not transaction callbacks. The source study includes its own demonstration flight, loose-part bounces and target at 5 m. Reuse the body/held-prop choreography, while the accepted headless grenade profile owns the actual target, collision, trajectory, fuse and impacts.

## Measurements and clearance findings

The audit evaluates original driver source linked to Nautilus's existing Three r180 and horse, with original geometry/data unchanged. At 30 Hz plus exact keys and both sides of semantic markers, **155 poses passed with no unreachable-pose failures**. Maximum held grip error was `4.48e-16 m`; planted/toe-contact mesh minima stayed at floor zero within `3.2e-16 m` numerical error. Out-of-order/repeated seeks match the same source states, and disposal restores original skin indices/weights. This is headless source evidence, not browser or biomechanical certification.

The complete body/held-action union is approximately `[-0.652674,0,-0.451083]`…`[0.818135,1.687291,0.608082]` m: **1.470809 × 1.687291 × 1.059165 m**. A native-axis root-centred AABB needs at least **0.818136 m half-extent**. This exceeds the earlier unarmed standing profile's 0.46 m half-extent; do not silently reuse its clearance for a throw. A grenade carry alone reaches 0.462201 m from the root. These are measured AABB requirements, not a circular radius or acceptance at every heading; an adopting query profile must select margins and validate rotated actions/nearby obstructions.

The native release is **0.467267 m higher** than Farmyard's current trajectory start and has horizontal offsets, for a **0.547317 m three-dimensional discontinuity**. The architect has fixed the parity policy: **retain the authoritative source arc and `[0,1.1,0]` local start unchanged.** Do not raise it or rescale the rig. Exact deltas are recorded in `runtimeDifference` in the manifest.

**Provisional presentation preference:** move one cosmetic released mesh from the native hand point toward the host's current authoritative projectile position over a short, explicitly labelled visual transition. The host still owns time/progress, collision, fuse and impacts; stop the cosmetic transition on an accepted impact/cancel and do not create another logical projectile or alter its path. UI owns the transition duration and comparable visual review. If that presentation adapter is unavailable, expose the visible hand-to-arc jump as a capability limitation; do not claim continuous physical release. Neither alternative changes the parity arc. Apply host position, heading and actual floor elevation to the native release. For heading θ and local `[px,ph,pz]`, world coordinates are `{x: ax+cosθ*px−sinθ*pz, y: ay+sinθ*px+cosθ*pz, h: floorHeight+ph}`. Source model yaw is `−θ`.

Prepared horse balance has 1,841 rows. Its release and eight probe poses match the calculated source path to about `4.8e-11 m`. One Node setup sample without prepared data was about 1.1 s; prepared creation plus eight poses was about 12 ms in the initial run. These are different audit workloads on this host, not comparable frame benchmarks or phone results; exact current values live in the manifest. Prefer prepared native balance and lazy selected content for the first integration. The original full twelve-animal table is 585,406 bytes; select a horse-only derived table only with explicit provenance/versioning, rather than claiming the whole archive is a required renderer dependency.

## Reproduce and next review

With the fixed Farmyard Git object available, run this from the artist branch in Node 24:

```powershell
node --experimental-vm-modules art/grenade-review/audit.mjs 'C:/Users/baals/Documents/ChatGPT/Tactical Animal'
```

The tool reads Git objects, checks pinned Nautilus bytes against the baseline, caches originals only under ignored `artifacts/grenade-review/source`, and writes the manifests. VM linkage is an audit mechanism for supplying the existing Three namespace, not a proposed game runtime. No preview browser/server was started; all probe commands are foreground and finite. [Validation evidence](checks.json) records gates and hashes.

After the architect supplies a fixed integrated candidate, compare native painted ready/pin/load/plant/release-before-and-after/follow-through/recovery captures, plus a moved/rotated elevated instance. Check hand contact, feet, actual trajectory continuity, cancellation/disposal, late loading and mid-animation restore. Real UI desktop/phone controls, visual counters and any device performance are that later review. No integrated animation, public provider, saved-state or consumer acceptance is granted by this source checkpoint.

**Accuracy:** prefer the measured native rig and hand/release anchors for the animated profile. They establish art/geometry consistency, not calibrated human or animal throwing physics. Preserve the source-authoritative Farmyard arc for parity; label a cosmetic transition or visible release mismatch honestly. A cosmetic blend does not prove physical continuity or change collision.

**Efficiency:** reuse the already pinned model, paint and Three closure. Add only the deliberately adapted driver/preparation needed by the selected actor. Five grenade meshes and 820 triangles are measured geometry; source byte counts and one-off Node setup timings are not GPU, draw-call or target-device benchmarks.

**Narrative:** the original painted grenade, pin pull, planted stride and follow-through make Farmyard/AFT throws readable. Prefer that animated presentation for the shared visual proof; retain an explicit reduced presentation when selected. The animation observes committed events and does not own costs, damage, fuse or game story.
