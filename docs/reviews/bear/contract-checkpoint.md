# Bear provider and appearance checkpoint

Prepared for architect/Editor review on 29 October 2026. Engine base: `8c4670450cb2b38c1e1abd811d633c22de9e2b7c` / v0.8.0. Source: AFT `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`, read only through Git objects. Commission: `docs/intake/2026-10-29-bear-integration-proposal.md` at `1115871def96e8a9e5ddc239bf4ad5a5a7ff9829`. This checkpoint pins a bounded plan and audited closure; implementation and acceptance evidence follow separately.

## Audited closure and notices

`source-closure.json` records every source path, Git blob, byte count, SHA-256, static edge and dynamic resource. The executable source closure contains **54 modules / 509,190 bytes**. Eight resources total **11,312,307 bytes**: bear mesh, pig-foreman cap donor mesh, optional bear speaking head, regular/Red Hat bear paintings, cap painting, light weapon atlas and grenade surface. Ten reference/notice files bring the complete immutable archive to **72 files / 11,877,195 bytes**. The generic catalogue, generic all-animal paint loader, idle actor wrapper, source tests and study findings are reference evidence; they are not executable provider dependencies. Author meshes, review image boards, source HTML and unrelated animals' data/paint are excluded.

Snapshot layout: `vendor/aft-bear/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/<original source path>`, with `provenance.json`. Original bytes are never patched. `tools/snapshot-bear.mjs --repo <read-only donor>` audits by default; `--report` records the review and `--write` creates a new immutable archive, refusing replacement. It changes no donor checkout/config/index. Execution modules will be generated under `packages/actors-bear/adapted/` with exact source/hash/patch evidence.

The source README and embedded Three MIT notice are retained. Source provenance adds no blanket license grant. The old AFT pin and twelve existing visual rigs remain intact. New donor Three modules are **not** imported: adapted modules bind `packages/render-effects/three.js`, the existing shared r180 instance at `781246a668c723d5a4c5463e70534cc04b6a5641`. Dynamic URL resolution is manifest/module-relative, never relative to a host HTML document or a donor checkout.

## Optional provider contract

Planned public entries are `./actors/bear` (headless discovery/resource metadata), `./actors/bear/three` (optional presentation) and `./appearance` (headless appearance documents). Export/manifest registration will accompany implementation and package proof; this checkpoint does not advertise completed runtime support.

Discovery retains `people:bear` and model identity `bear`. Outfits are exactly `normal` and `red-hats`; equipment IDs are `hands`, `knife`, `pistol`, `rifle`, `assault`, `smg`, `hmg`, `shotgun`, `sniper`, `grenade`, `launcher`, `rpg`, `flamethrower`. Preserve `BEAR_PROFILE`, native metre scale, foot origin, eye/sight, cuff/tail paint, hand anchors and `redHatFit`. Red Hat uses its native bear painting plus fitted cap, with no generic uniform repaint. The standard kit remains 2 m walls plus 0.12 m slab; camera framing moves the camera, never rescales the body.

`createBearProvider({renderer, THREE?, loadJSON?, loadTexture?, ...})` will create an optional library with lazy asynchronous `create({outfit,weapon,speaking?,signal?,borrowedWeapon?})`, instance tracking and idempotent disposal. The supplied renderer and externally supplied textures are borrowed. JSON/raw texture caches belong to the provider; actor paint uses owned texture views and per-instance geometry/material/skeleton/equipment. A caller using an alternate Three namespace must receive an explicit error. Importing discovery/appearance starts no I/O, renderer, timer or clock.

An actor exposes an outer placement `root`, native `worker`, explicit pose/grey/equipment operations, owned motion handles, optional speaking control, bounds/diagnostics and idempotent `dispose`. The outer root keeps host world placement independent of local presentation motion. The host supplies sample time/distance/progress; motion emits no gameplay costs, attacks, damage, XP, fire simulation or movement commits.

Presentation coverage will be declared by family/equipment rather than guessed: neutral/carry, idle, locomotion, stance/aim/casualty posture, crawl, grenade throw, ladder, roof mantle/descent, unarmed chair, fire/casualty playback and optional speaking. Source rifle-specific mammal/prone sequences remain rifle-specific. Chair requires `hands`; grenade release playback requires explicit grenade equipment. Families with progress/distance inputs document those units. Unsupported combinations reject. No AFT game-world/traversal execution is imported as proof of gameplay support.

Ownership order: stop/dispose motion, dispose speaking/cap/paint, detach and restore borrowed equipment, then release actor resources. The bear wrapper owns its skeleton; `armed-idle-actor.js` redundantly calls skeleton disposal, so that wrapper is excluded. Borrowed HMG/RPG carry settings must be restored after motion stops. Concurrent actors receive distinct equipment/rig resources; one borrowed weapon cannot be attached to two actors concurrently. Failed/cancelled/late loads release newly owned results and leave other actors and borrowed resources alive. Library close releases owned actors and caches; it never closes a host renderer.

## Preserved appearance before placement

Use a separate engine-owned **`nautilus-appearance-document` v1** envelope with required **`nautilus-bear-appearance-v1`** capability, not a weakened legacy species enum:

```js
{
  kind: 'nautilus-appearance-document', version: 1,
  blueprint: /* exact existing aft-map-v2 or aft-block-v1 plain data */,
  actors: [{
    id: 'bear-guard-1', species: 'bear', outfit: 'red-hats', weapon: 'rifle',
    role: 'guard', x: 10, y: 11, z: 0, heading: 90,
    authored: { /* bounded, preserved host-authored character fields */ }
  }]
}
```

`actors` holds real bear identities separately from the unchanged legacy base. It never substitutes a legacy species or inserts a bear into the donor validator's nine-species array. Guard/NPC are authoring roles; no faction, cast, statistics, recruitment or AI policy is implied. Authored fields remain plain bounded JSON and are not normalized as portable statistics.

The headless appearance API will validate/negotiate the envelope and provide copied preview/apply, history, selection/rotation, exact save/load and explicit block capture/place/rotation. Base edits must revalidate bear placement atomically. Stable IDs, outfits, equipment, headings, roles and authored fields survive accepted transforms. Legacy bare export of a nonempty appearance document is refused. Consumers lacking the schema/feature reject before opening; ordinary old maps keep their existing loading path. The Tinderbox adapter must explicitly refuse this unsupported envelope. Editor owns discovery controls and workspace rendering/wiring against a reviewed full checkpoint.

## Acceptance and design

Implementation evidence must cover source hashes/notices and package bytes; all 26 outfit/equipment combinations; native bounds/contact/clearance; deterministic seeks; concurrent equipment and borrowed carry restoration; failure/abort/late completion; exactly-once disposal; headless imports; installed-package dynamic URLs; real-browser material/animation captures; and appearance editing/history/map/block/save/rejection fixtures. Required repository gates are `npm run check`, `npm test`, `npm run test:upstream`, `npm run build`. No disposable review server/browser survives completion.

Accuracy: prefer the source bear's native fits/paint over another animal stretched to resemble it. Query/clearance evidence remains separate from visual bounds. Efficiency: prefer the lazy 54-module presentation closure over importing game-world wrappers; byte totals above are measured source/resource counts, not frame-rate claims. Narrative: preserve regular worker and Red Hat identities and native equipment for AFT/Farmyard scenes, with optional visual borrowing by other games. The envelope is the preferred compatibility boundary because it preserves the existing formats and makes unsupported bear behavior negotiable. Adoption remains candidate work until the combined authoring/presentation checks and architect review pass.
