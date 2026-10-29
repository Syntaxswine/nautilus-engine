# Native bear presentation and preserved authoring candidate

Source is fixed at AFT `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`; engine baseline is v0.8.0 / `8c4670450cb2b38c1e1abd811d633c22de9e2b7c`. This is a reviewed-worker candidate, not a released editor integration. Editor owns application controls/workspace wiring; the architect owns combined review and release. Existing AFT bytes, twelve visual rigs, nine-species legacy validator, production game pins and Sites publishing are unchanged.

## Public boundaries

`./actors/bear` is headless discovery: `bearAsset()`, `bearSelection()`, `bearResources()`, `bearResourceURL(key)`, `bearMotionCapabilities()` and `bearPresentationManifest()`. Shared asset discovery adds `people:bear`. Species identity is `bear`, outfits are `normal` / `red-hats`, and the thirteen exact equipment IDs are hands, knife, pistol, rifle, assault, smg, hmg, shotgun, sniper, grenade, launcher, rpg and flamethrower. Headless/core profiles contain metadata and authoring; native binary resources and the renderer are selected through the optional renderer/compatibility profile. Asset metadata alone is not a game or rendering adoption claim.

`./actors/bear/three` exports `createBearProvider` and `THREE`, the existing Nautilus r180 namespace. A different supplied namespace rejects. No import starts rendering, a timer, a fetch or a game clock. Resource URLs are based on the installed module, independent of the hosting document. The cap's mesh load is injected; the grenade path receives its explicit texture rather than fetching relative to an HTML page.

```js
import {createBearProvider, THREE} from '@nautilus-engine/map-core/actors/bear/three';
const provider = createBearProvider({renderer: hostRenderer, THREE});
const actor = await provider.create({outfit: 'red-hats', weapon: 'hmg', signal});
hostScene.add(actor.root); // outer root is the host's placement transform
actor.root.position.set(mapX, floorIndex * 2.12, mapY);
const idle = actor.motion('idle', {mood: 'guard'});
idle.sample(hostSeconds);
// On preview/scene replacement:
actor.dispose(); // idempotent; motion stops first
provider.dispose();
await provider.whenIdle(); // settle ignored/late asynchronous results
```

The accepted native kit is 2 m walls plus a 0.12 m slab. Models retain native scale, feet, eye/sight, head/cuff/tail paint and weapon anchors. Camera fitting changes the camera. Normal/Red Hat use their own source paintings; `BEAR_PROFILE.redHatFit` supplies the cap fit without generic uniform repaint. `actor.bounds()` returns separate native-local body, visual and equipped AABBs, plus outer scale. AABBs are conservative measurements, not swept collision or proof that an armed bear fits every one-tile opening. Source prototype roof/descent clips use their own two-metre local ledge frame; a game must deliberately bind its actual 2.12 m/world-floor heights and committed transitions.

Actor API: `root`, `worker` (native inspection/advanced binding), copied `selection`, `pose('neutral'|'carry',headingDegrees)`, `setGrey(boolean)`, asynchronous `setEquipment(id,{borrowedWeapon?})`, `motion(family,settings)`, optional `setJaw(angleRadians)`, `capabilities()`, `bounds()`, `diagnostics()` and `dispose()`. One managed motion is active at a time. Changing equipment or disposing stops it. Returned motion handles expose `sample`, `diagnostics`, optional source duration and idempotent `dispose`; callers should use the managed handle for ownership. Samples drive local presentation, never authoritative world position, attacks, release events, damage, XP, fire simulation or resources.

Managed native operations run synchronously in an isolated local frame, then restore the worker under the host's unchanged outer placement root and refresh skeleton matrices. No actor is detached across an asynchronous load. This accommodates donor IK that mixes world-space joint positions and local rest vectors. Bounds and motion diagnostics use actor-local coordinates even after host translation/yaw or parenting; transform a local muzzle point with `actor.root.localToWorld(point)` for world coordinates. Direct calls through `worker` bypass this managed frame. Motion teardown also restores original skeleton inverse-bind matrices: the donor rifle sequence's default rebind otherwise recalculates them from its last pose and corrupts later equipment/idle playback.

| Family | Input and supported equipment |
| --- | --- |
| idle | Seconds; all thirteen equipment choices; source idle moods |
| walk / crawl | Supplied distance in metres; all equipment; no world/path execution |
| posture | Explicit `{heading,distance,blend,pose:{kneel,prone,down,...}}` sample; all equipment. `{ground:true}` grounds the native surface. Each sample starts from native carry; repeated samples do not accumulate stance |
| aim-fire | Source rifle sequence in seconds; rifle only; no speaking-head rebinding |
| throw | Seconds; grenade only; native source release pose/ball/ring/lever are presentation, not a committed throw |
| ladder / roof-mantle / descent | Progress in `[0,1]`; all equipment; source ladder definition or local origin/heading options. No game traversal eligibility/costs/support are inferred |
| chair | Seconds; hands only; no speaking-head rebinding |
| fire | Seconds; flamethrower operator presentation only |
| burn | Seconds; all equipment; `motion('burn',{points:[{x,y,z},...],terminal?})` takes 1–4 explicit local Three-coordinate route points. Source route validation requires adjacent same-height steps. No navigation/damage is executed |
| speaking | `create({speaking:true})`, then `setJaw(0…0.0969)` radians; optional pinned bear head data. Other compatible motions may run while the host supplies jaw pose |

Families have stable `nautilus-bear-motion-<family>-v1` capability IDs/version 1 and explicit equipment/dependency restrictions. `actor.capabilities()` filters its equipment/speaking mode. Unsupported combinations reject. **Implementation finding after the first checkpoint:** `animal-prone-motion.js` is a horse-only study. It is retained in the initial immutable audit archive as comparison evidence but is not in the executed/package module closure and is never offered as a bear fallback. Bear prone motion uses its supported posture/crawl paths. The actual provider reaches 53 of the 54 generated/adapted source modules; game-world/journey wrappers remain excluded.

## Ownership, failure and concurrency

The host renderer is borrowed. `loadJSON(url,{key,signal})` and `loadTexture(url,{key,signal})` are optional injected loaders; returned textures transfer ownership to the library. `borrowedTextures:{weaponAtlas?,grenadeSurface?}` retains host ownership. Actors receive owned texture views and independent geometry, materials, skeletons and equipment. Shared image/mask data is read-only. The provider owns bounded caches; actor disposal releases its resources, and library disposal releases remaining actors/caches. Host textures and renderer survive. `stats()` reports actors, pending requests and owned resources; `whenIdle()` settles late results after cancellation/close.

An instance `signal` cancels pending creation. Once creation resolves, the returned actor has an explicit lifetime; aborting the old loading signal does not replace `actor.dispose()`. Closing the provider aborts its own pending fetches and releases late transferred textures, even when an injected loader ignores cancellation. Failed resource loads are evicted for retry. Failed projections restore borrowed render target, clear color/alpha, viewport/scissor, color space and tone mapping; partial targets/materials/masks are released.

Borrowed weapon assets must have the exact selected ID and compatible native root/anchors/carry contract. They are leased exclusively; the caller must suspend other owners for the lease. Another bear lease rejects. Motion stops before native HMG/RPG carry settings and parent/transforms are restored. Borrowed weapons are never disposed. Dynamic-hose borrowing is explicitly unsupported; owned flamethrowers support their native hose updates. Per-instance resources and motion restore snapshots keep two bears from modifying each other. The bear wrapper is the original skeleton owner; the redundant skeleton disposal in `armed-idle-actor.js` is excluded. Cap donor skeletons are explicitly released.

## Appearance before placement

`./appearance` exposes schema **`nautilus-appearance-document` v1** and required capability **`nautilus-bear-appearance-v1`**. Root fields are `{kind,version,blueprint,actors}`. The `blueprint` is unchanged `aft-map-v2` or `aft-block-v1` JSON. Bear actors live separately as `{id,species:'bear',outfit,weapon,role:'guard'|'npc',x,y,z,heading,authored}`. `authored` preserves bounded opaque host character data, including empty resources; it is never normalized as species-dependent statistics. Top-level appearance is authoritative for this binding. No species substitution or weakened donor enum is used.

`createAppearance`, `openAppearance`, `serializeAppearance`, `validateAppearance`, `appearanceRequirements` and `assertAppearanceCompatible` provide copied, strict plain-data validation and standard schema/capability negotiation. The schema is `schemas/appearance-document-v1.schema.json`. Limits: 256 actors, 8,000,000 UTF-8 bytes for the whole envelope (legacy base retains its own 4 MB limit), 65,536 bytes per authored object, stable 1–96 character IDs, canonical outfits/weapons, finite heading `[0,360)`, and legacy map/block coordinate/layer bounds. Duplicate actor IDs/anchors, overlap with legacy starts/guards, blocked/void anchors and unknown fields reject. Placement anchors do not promise full native-body/head/weapon clearance or game reachability.

`new AppearanceDocument(envelope)` / `createAppearanceDocument(blueprint,actors=[])` provide copied `snapshot`, `blueprint`, `actors`, `export`, `preview/apply`, `inspect`, `rotate`, `undo/redo`, `replace/open`, `capture` and `place`. Commands are `{type:'place',actor}`, `{type:'update',id,patch}`, `{type:'remove',id}`, `{type:'base',command:legacyCommand}`, `{type:'replace',document}` and `{type:'place-block',document,sx,sy}`, with optional `expectedRevision`. Preview has no history/content side effects. Failure preserves state, revision and redo. Returned commit data cannot mutate the private live state. Actor-only edits reuse a private validated base; base changes fully revalidate support before commit.

Block capture/placement/rotation preserve real bear species, outfit, weapon, heading, role and opaque authored data. Rotation transforms only top-level anchors/headings. Copying a block into an already occupied identity namespace reports a deterministic `idMap`; opaque authored references are preserved rather than guessed/remapped. Consumers own their authored-data semantics. History is explicitly bounded to 32 entries, with the live document plus retained undo/redo states within 16 MB of serialized JSON. Including the live state keeps accepted undo/redo transfers within the same byte budget. Further edits fail closed at capacity; `clearHistory()` is deliberate. It is not a gameplay reward/transaction journal.

`exportLegacyAppearance` refuses a nonempty envelope. Legacy map/document/block functions and the bounded Tinderbox adapter reject appearance envelopes explicitly. Old maps retain their ordinary path and requirements without a bear capability. Appearance-bearing generation has no implementation in this tranche; do not unwrap bear blocks into legacy generators. Editor must consume a reviewed appearance/provider checkpoint for its own UI, history and workspace integration. A preview-only catalogue entry does not complete placement integration, and this worker candidate is not a production game adoption.

## Evidence and design assessment

The immutable source audit/checkpoint, adaptation records, native measurements and acceptance reports live in `docs/reviews/bear/`. Golden appearance/block and deterministic authoring recipes are in `tests/fixtures/bear/`. `tools/check-bear.mjs` verifies all archived bytes and generated adapter hashes; `tools/adapt-bear.mjs` verifies exact generation. `tools/prove-bear-package.mjs` tests an offline installed package using public entries, all eight real resource byte streams, all 26 outfit/equipment combinations, optional speaking, preserved appearance and cleanup. Its test renderer covers geometry/lifecycle; real WebGL captures are separate evidence. The package source excludes donor author meshes, HTML studies, review boards, game engine and unrelated animal paint/data.

Accuracy: prefer native bear fits/paint/anchors to stretching a different animal. Keep physical clearance, game collision and rendering distinct. Efficiency: the lazy provider avoids the AFT game/world closure and leaves optional portrait/resources unloaded until requested; byte counts and scoped measurements are reported, not frame-rate claims. Narrative: preserve regular and Red Hat identities and original equipment for AFT/Farmyard scenes while keeping factions, statistics, fire and turn rules host-owned. The negotiated appearance envelope is preferred for compatibility because it preserves both original legacy data and real bear identities. Integration/release requires architect and Editor acceptance; no consumer pins or hosting audience are changed here.
