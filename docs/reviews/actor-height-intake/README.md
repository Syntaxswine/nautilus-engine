# Existing actor and tall-building binding intake

29 October 2026. Review baseline: **Nautilus `ddfd43cf4b156eeb82b5c27772fe977ec10b0633`**, version 0.7.0. This checkpoint supplies proposed binding data and reproducible evidence. It adds no actor loader, public export, gameplay capability, cast, donor runtime, vendor update, root build change or consumer pin.

**Recommendation:** retain the existing vendored bodies/paint and prepare one lazy binding for Farmyard's existing **Misha**, using a deliberately adapted body-throw driver. Accept the Administration Building as a high-building/void candidate, with its native surfaces and decoration separate. It does **not** establish fifteen connected playable stories. Architect review and runtime/consumer acceptance remain separate.

## Reviewable data and source pins

| Record | Contents |
| --- | --- |
| [Actor binding proposal](../../../packages/assets/bindings/actor-intake-v1.json) | Twelve existing factories/data/skins, actual native bounds and rigs, thirteen weapons/anchors, procedural APIs, release semantics and ownership |
| [Tall-building proposal](../../../packages/assets/bindings/tall-building-intake-v1.json) | Seven real plate regions/holes, four stair pods, native elevations, plinth, roofs/galleries and separate crown |
| [Immutable source inventory](sources.json) | Every reviewed Git blob, raw SHA-256/byte count, module/resource edge and five bounded dependency closures |
| [Headless measurements](measurements.json) | Native model counts/bounds, skin weights, carry contacts, Misha poses/throw boundaries, building scale and resource disposal |
| [Acceptance](acceptance.json) | Local gates, focused checks, scope and evidence digests |

The actor source already present in Nautilus is AFT **`781246a668c723d5a4c5463e70534cc04b6a5641`**, preserved under `vendor/aft/` in the baseline. Additional reference-only sources are Farmyard **`279d2d34786b3e6e5c5baeeac6898e60030afdbe`** and Tinderbox Administration artist commit **`43337a33ddfe4dff6849654c827c56e1f24e1acc`**. The latter is an artist candidate, not evidence of main integration. Its engine geometry dependency is the already nested Nautilus **`90054d07134116a5d9661f8318a76fe68f922aad`** wall-run module. The seven-file closure records that module's actual bytes; it does not change current Nautilus vendor or pins.

All donor content was read through immutable Git objects. The optional ignored probe cache holds exact source bytes for local audit only. No source image or donor runtime is added to the tracked delivery. Embedded notices, the Three MIT notices and provenance references are inventoried separately from runtime resources. Mixed/unspecified art and code rights remain as recorded; this review grants no new redistribution license.

## Actor inventory and first workflow

The existing identities are horse, goat, bull, cow, donkey, sheep, skunk, pig foreman, pig director, rabbit, dog and hen. Measured native bodies have **9,988–10,476 triangles**, eleven mammal rigs have seventeen bones, and the hen has eleven. Authoring source counts remain in the binding; the horse's recorded source was 856,076 triangles. No model was replaced, reduced again, stretched or rescaled.

The factory roots contain zero `AnimationClip` entries. Their movement is authored procedural skeleton/IK code, rather than a ready-made glTF/FBX clip bundle. The data identifies native carry, Farmyard distance gait and stance drivers, armed idle, mammal motion, the explicitly **horse-only** prone study, and the committed designer throw study. Only the Misha gait/stance/throw combinations were sampled in this review; source discovery is not visual or gameplay acceptance of every species/weapon combination.

Existing painted appearances include the normal turnaround with species-specific repair/layer masks, shared or tailored red-hat outfits, and the donkey's blue-Hawaiian/straw-hat guide cosmetic. The foreman's red-hat selection deliberately does not apply a new uniform. The hen has no native `equipWeapon` method; reject the generic mammal attachment path until a reviewed wing/prop adapter is supplied.

**Misha** is the existing Farmyard `demolition` preset, species donkey, with pistol/grenade equipment in `quickplay-presets.js`. The pose/throw probe used that real donkey model and the existing pistol and grenade props. The detailed source is `designer/a20b343a0234/tactics/grenade-throw-motion.js` **inside the fixed Farmyard commit**. Farmyard's live `FieldView` uses simpler grenade trajectory/effect playback and does not invoke that detailed body study.

The study lasts **4.6 s**. Its semantic prop markers are pin pulled **0.50 s**, pin dropped **0.70 s**, front foot planted **1.60 s**, release **1.92 s**, and lever released **1.945 s**. Twelve pose times, immediately before/at release, repeated seeking and direct-rock rejection were exercised. The maximum measured held palm/grip error was below `1e-5 m`. These are procedural evaluation checks, not observed physical throwing accuracy.

The existing function requires a grenade prop and includes grenade-specific handling and demonstration flight physics. **Do not relabel a rock as a grenade.** A future driver must extract/adapt the body and held-hand presentation, omit grenade pin/lever behavior, and let rock-v1 own its authoritative swept flight and confirmed impact. `throwRock` already stages one inventory delta and release receipt. Align animation with that one host-committed release; never make a seek, repeated frame, load or marker notification commit another throw, AP charge, impact or noise. Bind command/clip-instance IDs and keep durable event deduplication in the host.

Two measured constraints require follow-up: Misha's neutral height is **1.76194 m**, exceeding a standard **1.65 m** leaf, and the sampled prone surface reaches **Y = -0.12160 m** before separate grounding. Farmyard's live caller explicitly grounds down/casualty poses, not this sampled prone path. Finite pose evaluation therefore passes while prone support/ordinary-door clearance remains unresolved. Keep native scale and validate stance, support, swept volume and actual aperture geometry in the future adapter.

## Dependency cost and material differences

These are **measured uncompressed Git byte counts** for runtime code/resources, excluding separately inventoried notices/research records. They are not transfer size, GPU residency, frame time or a shipping approval. Literal-image envelopes for complete libraries conservatively include optional referenced paints; the selected Misha profile includes only its declared normal data/paint resources.

| Closure | Files | Raw bytes | Bytes excluding its source Three modules |
| --- | ---: | ---: | ---: |
| Already vendored Nautilus actor library / outfit envelope | 72 | 53,416,641 | 51,409,775 |
| Farmyard actors and inspected motion / outfit envelope | 88 | 53,584,166 | 51,500,272 |
| Farmyard Misha normal body, paint, equipment, gait and stance | 34 | 4,699,844 | 2,615,950 |
| Farmyard detailed throw study and its source Three | 3 | 2,125,055 | 41,161 |
| Administration native runtime, host Three supplied | 7 | 56,856 | 56,856 |

Do not add the Misha/throw rows blindly as a shipping budget: the live and designer source trees contain byte-identical Three copies at different paths. Both source families report **r180**, but relative URLs create distinct module identities. A future optional provider must deliberately use one shared Three namespace. Raw and CRLF-to-LF comparison are separate fields; normalization equivalence is evidence, not permission to rewrite vendor bytes. Of fifty Farmyard files having a matching baseline tactic path in this bounded inventory, forty-nine match after that explicit normalization. The remaining difference is Farmyard's added RPG shoulder `stock` anchor at `[-0.18,-0.019,0]` in `weapon-models.js`.

| Choice | Accuracy | Efficiency | Narrative and recommendation |
| --- | --- | --- | --- |
| Existing vendored models versus importing the whole Farmyard actor closure | The inspected factory/data/paint correspondences preserve native geometry; the normalized comparison does not pretend raw bytes are identical. | A full optional closure is ~53.6 MB. Prefer existing bodies and lazy selected resources; no device speedup is claimed. | **Prefer existing art identities and narrow adapters for the first Farmyard workflow.** Preserve species/outfit distinctions; a new cast offers no requirement benefit. Subjective visual preference: retain the existing broad painted folds, species silhouettes and equipment readability. |
| Detailed grenade study versus live trajectory-only playback for rock | The study has articulated planting, trunk/arm follow-through and a measured release, but grenade props/flight are inappropriate for a rock. No human/animal biomechanics calibration is supplied. | The body source adds 41,161 non-Three bytes; setup solves a balance path. One Node setup sample is recorded, not a phone/frame budget. Cache prepared data deliberately; measure first-use latency before adoption. | **Prefer a bounded body-motion adapter with rock-v1 flight for Farmyard.** Keep trajectory-only presentation as a compatibility/low-cost option. Longer authored wind-up and timing need gameplay approval. |
| Farmyard RPG stock anchor versus baseline attachment | The added anchor locates the actual authored shoulder saddle; it avoids a guessed shoulder contact for that weapon. | One extra `Object3D` is a code-based constant-cost estimate, not a benchmark. | **Prefer the explicit source saddle anchor when an RPG binding is reviewed.** This intake does not patch the current weapon or promote the whole closure to obtain it. |
| One generic rig versus mammal/bird providers | Hen anatomy and missing equipment API make the generic mammal route inaccurate and unsupported. | A narrow bird provider avoids forcing unrelated IK/props into every actor; cost unmeasured. | **Preserve the bird-specific profile and reject unsupported attachments.** A misleading armed hen preview would obscure an incomplete binding. |

## High-building semantics

The existing **1893 Administration Building** has an 80 × 80 m body footprint and approximately X `-46..46`, Z `-6..86`, Y `0..76.32 m` full bounds. Source origin is ground at the front-footprint centre, +Y up and +Z rear. The raised first plate is **2.12 m** above ground; it is not a zero-height floor. Native walls are 2 m high, slabs 0.12 m and the datum interval 2.12 m. Preserve placement/quarter-turn transforms without scaling.

| Source datum | Surface elevation | Role |
| ---: | ---: | --- |
| 1 | 2.12 m | First pavilion floor, raised approaches and rotunda |
| 3 | 6.36 m | Second pavilion floor |
| 5 | 10.60 m | Third pavilion floor |
| 7 | 14.84 m | Fourth pavilion floor |
| 9 | 19.08 m | Combined pavilion roofs and lower gallery; split regions for runtime policy |
| 19 | 40.28 m | Upper colonnade terrace; no source access route |
| 23 | 48.76 m | Narrow dome spring ring; no source access route |
| 36 | 76.32 m | Decorative crown only; **no occupied floor** |

The source has thirty-seven datum records, not thirty-seven stories. The binding preserves seven actual surface polygons and holes. Four spiral pods each connect `1 → 3 → 5 → 7`: seventy-two treads per pod, 288 total, rise `2.12/12 m`, 24 treads per 4.24 m pavilion rise, outer radius 3.4 m and inner radius 1.3 m. Their art landings/holes are identified; collision, head clearance, crossing links and usable access still require validation. No stair to 9/19/23 is invented. Roof/canopy policy must be per region, independent of the global highest floor.

**Accuracy:** prefer those explicit plates, voids, plinth and source roles over counting wall bands or decorative tiers as stories. The source adapts a published front-half plan and contemporary photos; rear rooms, upper subdivisions, historical colours and hidden joins remain unverified. This high candidate exercises native height and large voids, but no existing fifteen-connected-story asset was verified in this bounded review. A separate real fifteen-story connected fixture remains required for extended-world acceptance.

**Efficiency:** the measured factory reports **412 mesh nodes, 229 instance batches, 411 retained geometries, ten materials and 614,274 triangles**. Constructor and graph observation covered **1,246 resources**, including released intermediates; repeated disposal released each observed owned identity once, while borrowed host material and texture remained untouched. This is a resource-lifecycle check, not a GPU/phone benchmark. Prefer an optional detailed landmark and demand-loaded views/quality profiles; do not make it the default phone performance fixture.

**Narrative:** the gilded dome, open rotunda and widely spaced pavilion stories support Tinderbox's architectural landmark role (subjective visual judgment). Preserve that vertical experience. A compact fifteen-story gameplay stack is better for testing repetitive circulation; it should be a distinct authored/test asset, not a rescaled landmark. The highest actual surface datum 23 fits a proposed 32-position range, while crown datum 36 needs a finite decorative-height envelope independent of floor selection.

The pinned donor's front-isometric and structural-cutaway pictures and the donkey turnaround were visually inspected here. The landmark silhouette/ornament, open rotunda and distinct pavilion plates are legible; the donkey paint retains broad cloth folds, patches and species detail. These are existing donor pictures/texture evidence, **not a new browser render** or confirmation of actor clearance. No WebGL paint, new selector, gameplay traversal, roof access, high-floor impacts or physical-phone performance was accepted by this review.

## Loader ownership and remaining acceptance

The actor proposal explicitly separates host renderer/scene/camera, authoritative state, placement/support transform, clock and ledger from per-instance meshes/materials/skeletons. Mammal disposal owns its default rifle; replacement equipment is caller-owned. The native mammal body disposer does not uniformly dispose its skeleton. Stop/restore drivers before releasing modified weights/tails and release each resource identity once. `createModelPaint` disposes its input texture; `createAnimalPaint` also tracks/disposes its loads. Shared host textures therefore require a reviewed lease/clone boundary, including cancellation, late-load disposal and partial-failure rollback. Projection target dimensions and mask cost are recorded as a code-based allocation estimate, not measured GPU memory.

The Administration factory takes the host Three namespace, clones/defaults its own materials, borrows maps/textures, owns generated geometry/instancing, and has idempotent disposal. Physical structure/finish remain unassigned: its legacy validator's `wood` token is a geometry requirement, not a combustion policy. Its five local six-layer wall fragments with offsets are an art assembly, not one valid legacy map. Future query/traversal/height providers must validate actual surfaces and reject unsupported capabilities before play.

Remaining work belongs to deliberate architect/coder intake: optional demand-loading/ownership implementation, one shared Three identity, a presentation-only rock body adapter, Misha support/clearance, capability/height mapping, stair/door queries, persistence/event replay, comparable WebGL views and device cost. No edits to current public exports or shipped package files are needed to review these JSON proposals.

## Reproduction and scope

From this checkout, with local Git databases supplied as arguments:

```text
python docs/reviews/actor-height-intake/inventory.py --farmyard-repo <farmyard-git-checkout> --tinderbox-repo <tinderbox-git-checkout> --cache artifacts/actor-height-intake/pinned
node docs/reviews/actor-height-intake/measure.mjs
node docs/reviews/actor-height-intake/bindings.mjs --write
node docs/reviews/actor-height-intake/bindings.mjs
node --test docs/reviews/actor-height-intake/verify.test.mjs
npm run check
npm test
npm run test:upstream
npm run build
```

The inventory reads full committed Git objects, never a working tree or moving branch. It copies only the stated review closure into an ignored audit cache; no browser/server/helper is retained. Node probes are foreground, short-lived and headless. No editor interactions changed, so manual editor undo/save/import/generation review is outside this data-only checkpoint; repository and GitHub workflow gates still apply.

Earlier artist integration remains separate: bathrooms **`4e1b7f0f04868770ca3226280fd1679ca9c2ccf4`** on `codex/bathroom-art`, castle/modern corrections **`65c06735396e14b8774ae1e7d5ad61969692963f`** on `codex/fort-era-variants`, and frontier kit **`6d9dfeca7e47a4bded6497472f46f49f8ce14a5b`** on `codex/frontier-stockade-art`. Those checkpoints are preserved; this new branch starts from reviewed main and does not merge their art into the runtime.
