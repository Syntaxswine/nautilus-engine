# Shared stealth and painted foliage

This optional checkpoint supplies AFT movement/noise/exposure rules, immutable
foliage queries and one native goat crawl binding. It does not adopt a game,
change a consumer pin or complete the Editor/UI application handoff.

## Interfaces and owners

| Public entry | Supplies | Retained host supplies |
| --- | --- | --- |
| `./stealth` | Pure previews, confirmed movement/posture/awareness staging, hearing eligibility and strict saves | Atomic world/character/state commit, command sequences, clocks, AP policy, injury/load factors, body exposure, lighting, guard decisions |
| `./stealth/foliage` | Separate concealment, cell blocking, nearest sight/shot contact and early boolean queries | Complete map identity/revision; combine with authoritative terrain, doors, actors and other solids |
| `./native-actors/crawl` | Plain flat-plane/sample validation and durable signed travel cursor | Confirmed straight segment, heading, action/stance/floor and logical pose revision |
| `./native-actors/crawl/three` | Optional native goat hands/rifle preparation, paint, mutually exclusive walk/crawl pose and cleanup | Existing shared Three renderer, activation, host placement and other action poses |

The first three entries load in Node without DOM, renderer, storage or clocks.
Three stays behind the fourth. The old native catalogue, idle/walk API, native
pose v1/v2 saves and portable character/map/block versions stay compatible.
Use the optional entry for crawl; asking the old catalogue for a crawl role
still refuses. Editor owns application authoring/history; UI owns application
controls/presentation; Artist owns subsequent rig/outfit/weapon coverage.
Architect reviews this checkpoint before those follow-ons.

## Movement and confirmed boundaries

Inputs are plain versioned records. Positions `{x,y,h}`, distances and speeds
use metres, metres/second; elapsed time uses seconds. Heading is degrees:
0 points along world +x, 90 along world +y (Three +z). No function reads a clock
or random stream. A host must not call staging from a preview/render refresh.

`previewStealthMove(character, specification)` preserves AFT's walk/run/sneak
speed factors 1/2/0.5 and AP multipliers 1/0.5/1.5. Stance AP per metre is
2 standing, 4 kneeling, 8 prone. Mode applies before the explicit host injury
multiplier. The host supplies terrain cost, load multiplier, base walk speed
and whether this mode charges AP. These are not inferred from artwork or HP.

Flat movement stamina per metre is 1 walking, 2 sneaking, 4 running, or 3 prone,
times load. AFT ordinary upright walking can reach zero stamina and continue;
run/sneak/prone require enough. Injury, HP and AP are never refilled or rounded
on load. Current character HP remains unchanged by movement. Speeds are game
tuning; these ratios have no physical calibration. The fixture uses 3.6 m/s
upright and a deliberately explicit 0.35 m/s prone base, before mode factors.

```js
import {previewStealthMove, stageStealthMove} from '@nautilus-engine/map-core/stealth';
const specification = {version:1, mode:'sneak', stance:'standing', distanceM:1,
  terrainCost:1, injuryMultiplier:1, loadMultiplier:1, walkSpeedMps:3.6, chargeAP:true};
const preview = previewStealthMove(character, specification);
// First stage collision and permissions with the existing host movement owner.
const staged = stageStealthMove(state, character, {
  version:1, id:'move-17', sequence:17, expectedRevision:state.revision,
  actorId:character.id, specification,
  confirmation:{accepted:true, worldId:'yard', worldRevision:mapRevision,
    floorId:'ground', from:oldPosition, to:acceptedPosition}
});
// Commit acceptedPosition + staged.character + staged.next together, or none.
// Dispatch staged.events only after that commit. A stage itself mutates nothing.
```

Only nonzero, same-plane accepted segments stage costs and movement noise.
Slopes/floor changes retain the host's separately bound traversal policy and
are refused here. Movement noise has radius 3 m when sneaking, 10 otherwise,
including prone walk. The movement owner chooses its confirmed segment/step
boundaries; this module introduces no animation-driven footstep timer.
`evaluateStealthNoise` borrows explicit audibility, permission, visibility,
hearing scale and listener eligibility. It returns heard data, never guard AI
or an approximate fix. This shares the rock module's borrowed hearing pattern;
a footstep is deliberately a separate event, not a forged rock impact.

Every staging command has a monotonic sequence per engine-derived stream
(posture per actor, movement per actor, awareness per observer/target pair).
The latest sequence/fingerprint is saved. Exact retry returns no effects;
an older sequence refuses with `STEALTH_COMMAND_RETIRED`, even after a save.
Reusing the latest sequence for different input refuses. There is one receipt
per stream, bounded by the 64-actor profile, rather than an ever-growing frame
history. Hosts own command ordering and atomic persistence.

Footstep IDs are opaque deterministic strings derived from the event kind,
version, world ID, actor ID and retained movement sequence, bounded to 320
characters. Caller command labels may repeat across actors or higher sequences
without aliasing their events. Staging the same confirmed boundary after reload
produces the same identity; a committed retry emits no event. Hosts preserve
stream high-water marks and use a distinct world ID for a fresh world lifetime.
Geometry revision changes do not restart those sequences. Earlier v1 saves and
already emitted shorter event IDs remain valid.

## Exposure and awareness

`previewAwareness` consumes actual visible body zones, ambient light, contrast
and eligible spotlight results from the current host geometry snapshot.
Concealment comes from the same foliage snapshot used for movement and shots.
The source AFT range cap is **60 m**; its separate rate falloff uses **70 m**.
Raw Sneak enters acquisition skill. Sneaking's effective +20 (clamped at 100)
belongs to the range cap and must not enter the rate a second time.

The rate preserves exposure weights (head/legs .25, torso .5), movement/run,
posture, light, perception, alert and concealment factors. Recognition retains
the 25/100 hysteresis and last known position. Ordinary eligible lit targets
and source close/spotlight cases retain immediate identification. The host
must supply eligible spotlight/body-ray facts, not renderer brightness.

`stageStealthAwareness` accepts a confirmed `{kind:'time',seconds}` boundary
(0–60 s), or `{kind:'action',round}`. Action timing preserves AFT's AP-derived
fraction of a 60-second round, its per-round spent cap and remaining-round
transition. The first combat observation seeds counters without elapsed time.
Repeated refreshes/previews do not advance scores. This profile uses no
legacy acquisition roll or combat RNG. Legacy Farmyard range-only policies
remain in their existing adapters until explicitly migrated.

`exportStealthSave` / `openStealthSave` require complete v1 state and all retained
portable characters exactly once. They preserve damage, exhausted resources,
posture/mode, travel, contacts and stream receipts. They do not save the world,
inventory, host clock, native renderer or camera; the host saves those beside
this record atomically. There is no inferred migration from an AFT unit or
Fighters temporary presentation cache.

## Foliage geometry and invalidation

`createFoliageStore().replace({mapId,revision,map})` accepts the complete portable
map. A new revision builds a detached, lazy query snapshot; old snapshots never
change. Reusing a revision with changed bytes refuses. Undo/redo, clear, reload
and any relevant terrain/prop/environment/edge edit require a new revision.
A replacement map can start its own revision sequence under a new identity.
Caller mutation and values returned by `exportMap`, `cell` or `volumes` cannot
change the retained snapshot. Unsupported map/preset/version data refuses.

`cell({x,y,level}).blocked` means **foliage blocking only**, not whole-world
passability. `depth(from,to)` uses integer-centred metre cells and tactical
layer-centre integration, exactly as AFT's woodland depth. `trace` returns
nearest contact; `occluded` returns a boolean. Both require explicit unit
direction, purpose (`sight`/`shot`) and height space (`native-world` or
`aft-simulation`). Native floor interval is 2.12 m; tactical interval is 3 m;
native silhouette conversion is 1.65/1.8. No floor index is guessed from `h`.

The four presets and known 2/3/4-element encodings retain the original meanings:
open woodland offers concealment and isolated blocking trunks; thicket and
wetland screens block walking/sight while leaves pass shots; solid wood stops
shots. Open bog blocks walking without gaining a leaf screen. Decorative
density does not weaken an opaque screen. Source habitat, occupancy, tree mix,
upper-floor and legacy-ground behavior remain in the pinned geometry.

Painted `map.foliage` requires `nautilus-foliage-queries-v1` through both public
capability paths. An empty feature list refuses with an actionable diagnostic.
Declaring the capability promises a host actually binds concealment, foliage
blocking and shot obstruction; importing the package is insufficient. Plain
unpainted maps and existing legacy terrain profiles retain their compatibility.
The bounded Tinderbox game adapter still refuses its unsupported foliage.

## Native goat proof

```js
import {prepareNativeCrawler} from '@nautilus-engine/map-core/native-actors/crawl/three';
const view = await prepareNativeCrawler({renderer, model:'goat', actorId:'goat',
  equipment:'rifle', surface:{kind:'flat-plane',floorId:'ground',heightM:0}});
// One confirmed host sample, not an intent or a frame-derived displacement:
view.updateConfirmed({kind:'nautilus-native-crawl-sample',version:1,
  actorId:'goat',revision:poseRevision,mode:'on-foot',position,heading:0,
  stance:'prone',action:'locomotion',travelM:acceptedTotalM,floorId:'ground'});
```

Only the existing source goat/normal outfit and empty hands/native rifle are
supported. Other rigs/weapons, non-foot transport, kneeling, slopes, stairs and
other floors refuse. The low-level `createNativeCrawlBody` requires the original
goat JSON from `nativeActorResources`; browser preparation authenticates SHA-256.
It borrows the same Three and full-resolution native body paint (native rifle geometry/default materials), never resizes the
model, rifle or collision separately. Default legacy actors are not opted in.

Signed crawl phase follows accepted travel and world displacement relative to
heading. Each confirmed straight segment is at most 2 m and cumulative travel
must match its displacement. Counter rewinds, position jumps and same-revision
changes refuse. Stance/action changes require stationary boundaries. Turning
in place and blocked input advance no phase. Standing uses the existing native
walk solver and authored rifle carry. Other actions suspend crawl and take pose
ownership; subsequent suspended frames do not overwrite their bones/surfaces.
The host outer root places the actor once; study root translation is compensated
once inside it. No new controller, movement solver or animation clock is added.

The strict native cursor stores signed/walk distance, blend and exact last host
sample. A new binding seeds at zero phase even if host total travel is nonzero.
Restore requires the identical first confirmed sample, preserving moving blend
and exact bones before further travel. The rifle/hand anchor error is also measured. Nautilus retains phase across standing
and suspension; it does not copy Fighters' temporary counter-reset policy.
Dispose restores borrowed source surfaces before releasing owned geometry,
materials, skeleton, equipment and paint. Activation issues no gameplay command.

## Reference and evidence

`examples/shared-stealth/` is **one contract fixture**, with bare y=4 and authored
brush y=10 routes. It uses actual public map-document paint/export and separate
source/installed public imports, not a captured Editor application export.
Ground density marks and the observer marker are diagnostic presentation, not
completed foliage art or guard AI. The standard player UI/input, existing
frame clock, camera and interaction collision remain the only respective owners.
The fixture uses a conservative 1.4 m body radius / 1.8 m clearance for both
stances; this is not a prone underpass or arbitrary-world collision profile.
Its composition identity records the approved engine baseline; the final packet/SDK provenance identifies the actual checkpoint bytes. Its whole save also includes host geometry identity, resources, native cursor,
clock and UI configuration. Browser keyboard/touch proofs use captured input
and the existing clock. Static native inspection views are labelled separately
from ordinary camera behavior. Physical handset/FPS acceptance remains unclaimed.

Focused checks: `node --test tests/shared-stealth*.test.mjs tests/native-crawl.test.mjs`.
Package proof: `node tools/test-shared-stealth-package.mjs`.
Native browser proof: `node tools/review-shared-stealth.mjs` (also `--rifle`,
`--installed`, `--touch`). The task packet records exact frozen source/installed
hashes, captures, required gates and helper closure. No preview is retained.

## Source selection and tradeoffs

Original bytes and exact Git blobs/SHA-256 are recorded in
[the source ledger](reviews/shared-stealth/sources.json). AFT semantics use
`781246a668c723d5a4c5463e70534cc04b6a5641`; completed motion was reviewed at
`25d0e91858be0fa5ea7d54132a4a642624bd9aa7`. Fighters' live five-file binding is
`541b0facc0597eaa719fd78cf391b417f12473da`; ordered query traversal is reviewed
at AFT `a20b343a0234b5d8b365a4e1668961ca1bf37653`. New originals are separate
`.original` reference slices under `vendor/shared-stealth/`, excluded from runtime
distributions. Adapters are under `packages/`. Source notices and the existing
Three notice remain applicable. Provenance supplies no new license grant.

* **Accuracy:** Prefer AFT exposure/foliage semantics for comparable tactical
  stealth, because posture, light, cover depth, sight and solid wood remain
  distinct. These are game abstractions, not calibrated human perception.
  Prefer Fighters' accepted-travel binding plus explicit Nautilus restore state
  over a clock-driven study loop for a retained native actor.
* **Efficiency:** Prefer the reviewed ordered 4 m buckets and boolean early-out
  after parity. In this task's fixed 3,000-ray Node workload, original versus
  ordered nearest medians were 15.2/9.2 ms sparse and 48.4/16.4 ms dense; boolean
  medians were 7.6/7.9 ms. These are local Node measurements (one warmup, three
  timed batches), not browser/FPS/phone findings. The same geometry had 546 and
  6,157 volumes. Queries share one revision-built index. Farmyard's old range
  multiplier remains cheaper by code inspection where that simpler policy fits.
* **Narrative:** Subjectively prefer visible low crawl and readable bare/brush
  choices for tactical games. Preserve legacy Farmyard outcomes and the richer
  Tinderbox fire policy until their own consumers explicitly adopt these seams.

No production host, second compatible game, Editor application workflow,
additional rig/outfit/equipment, general slopes/floors or fire-material mapping
is represented as finished by this checkpoint.
