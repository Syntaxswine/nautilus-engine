# Road vehicles and the playable yard

Candidate API v1, `flat-low-speed-v1`; Architect review owns release. Artwork is the byte-preserved reviewed commit `5d8962e7764bce3fcfff8f4dfd4883bfec97b0ee`. The implementation starts at main `579706bf415a9664e4541db9ec6b5fe6adb334d7`. Package provenance identifies the actual packed engine source and payload, independently of the older player recipe compatibility identity. No game consumer is pinned or declared integrated by this example.

Open `examples/vehicle-yard/` directly. A native goat starts beside the hatchback's driver door; the pickup, an observer, a wall and a barrier share the open course. Approach a door, use the ordinary contextual Enter action, and drive with the visible shared joystick or WASD/arrows. Up is forward, down brakes to zero before reversing, left/right steer the front wheels relative to the car. Release stops; Exit requires confirmed zero speed and a clear supported side-door route. Passenger entry is on the other side. The ordinary Setup menu retains native model/camera/UI choices.

```js
import {mountVehicleYard} from '@nautilus-engine/map-core/vehicles/browser';
const yard = await mountVehicleYard(document.querySelector('#game'));
// Persistence belongs to the consumer. Store complete data, never held input.
const saved = yard.checkpoint();
await yard.dispose();
const restored = await mountVehicleYard(document.querySelector('#game'), {checkpoint:saved});
```

The reusable engine assembly supplies the ordinary setup, native actors, contextual actions, car actuator, retained services and one existing frame-clock implementation. The small consumer supplies scenery/content and policy. A retained game can instead create a headless `createVehicleSession` and call `retainVehicleYard` with its confirmed host, world, pose, surface, phased clock and UI pause gate. It must not create another clock or copy the example input handlers. `actors.transact(updates,accept)` validates all actor revisions and commits the proposed actor poses plus `accept()` synchronously before observers; refusal changes neither authority. `canReach` binds the game's actual ordinary walk/support queries. The included `createVehicleYard` composes the public world and interaction APIs as one such host.

The distinct `nautilus.road-vehicle-connector` service and `player.vehicles` component are optional. [Contract metadata](../packages/vehicle-core/contract.json) specifies service/schema/version, semantic role, units, frame, one-provider cardinality and borrowed lifetime. A car needs no train component. Mixed train/car setups choose one gameplay input owner from explicit confirmed connector/vehicle identity, actor and occupancy. Conflicting claims refuse and block input. Legacy train-only scenes retain their original compatibility path. Removing the occupied transport's controls refuses until a safe exit; routine UI/native replacement releases the old owner. The Architect approved this additive seam on 12 November 2026.

Every control carries the UI context and offer, and the connector revalidates actor, occupied vehicle/seat, occupancy revision and driver lease. Only a driver may acquire a lease. A passenger, stale offer, replaced widget or different lease owner cannot steer. The walking and car controls share the same vector gesture lifecycle; exactly one is enabled. Blur, lost pointer capture, pointer cancel, hidden document, pause, menu, replacement and disposal release the original owner. No button click changes native visibility: the accepted confirmed pose's driver/rider mode uses the existing native hide path, and an accepted safe on-foot exit restores it.

Local visual +Z is forward, +Y up, with the pivot at ground centre. World x/y is ground and h is height. Heading/steering positive turn right. Each body has its own approved native length/width/height, wheel radius and axle positions; no generic car is scaled. Two seats are declared: driver left and passenger right. Painted windows are opaque and contain no visible interior or seated character art. Art is presentation; support/collision use the explicit conservative vehicle envelope, including mirrors and steered wheel reach.

Motion is a bounded flat-ground bicycle model, host-stepped in seconds (maximum external step 0.1s, internal substep 0.05s). Forward limit is 8m/s, reverse 3m/s, acceleration 3m/s², maximum service braking 8m/s² and front steering limit 30 degrees. Normalised axes have a 0.08 dead zone and proportional remainder. Opposite throttle applies maximum braking until a confirmed step has zero speed, then accelerates in the held direction on a later step. This is symmetric. A held centred stick removes acceleration, centres steering and coasts at 2m/s²; releasing input/ownership centres steering and service-brakes at 8m/s². Steering at zero changes wheels without translating or yawing. Held inputs and leases are transient, so release cannot schedule a later unattended reversal.

Continuous swept conservative AABBs cover straight movement and corner arcs during turns/reversing, with an analytic sagitta bound. All car proposals are compared against one another before committing the substep, plus static world solids, dynamic door bounds and on-foot actors. The full envelope needs continuous flat support. Collision stops at the last safe pose; conservative angled/narrow clearances may refuse early. An exit begins at the declared outside door anchor and sweeps the whole native actor to supported nearby ground; a blocked route refuses atomically. Non-flat terrain, tire dynamics, suspension, crashes, fuel, damage and AI are unsupported capabilities. No performance or handset FPS measurement is claimed.

Presentation defaults to lightweight `game` for gameplay and `full` for authoring. Both allow an explicit override:

```js
import {createRoadVehicleKit} from '@nautilus-engine/map-core/vehicles/three';
const kit = createRoadVehicleKit(THREE, {bodies:['hatchback','pickup'], purpose:'authoring'});
await kit.ready;
const car = kit.createDriving('vehicle-hatchback-sage');
scene.add(car.root);
car.update(confirmedCarState); // wheel angle and front steering only
car.dispose(); kit.dispose();
await yard.setVisualProfile('full'); // prepares before replacing an accepted kit
```

Body/finish IDs, UVs, metre scale and gameplay/save meaning are identical across profiles. Full uses the original 2048² body/1024² gear skins and sculpt geometry; game uses deterministic 512²/256² skins and the approved reduced triangles. `tools/vehicle-art/derive.mjs` extracts raw colour and tint-mask channels before resizing them independently. Colour uses Lanczos3; the mask uses nearest neighbour to avoid tint bleeding across glass/trim boundaries. PNG alpha is a **finish tint mask**, never transparency. The bounded RGBA8 decoder preserves RGB beneath zero alpha. Browser/canvas premultiplication is unsuitable here. Original bytes and notices remain separate in `vendor/nautilus-road-vehicles/…`; no art was regenerated.

Selected kits request only the chosen body mesh/skin and one shared gear skin. Bodies are deduplicated and all finishes/instances share geometry and materials within the kit. Read `kit.read()` for readiness, failures and actual requested URLs. A failed/cancelled/late candidate releases its owned resources; it cannot retire the accepted kit. The explicit `createLegacyRoadVehicleKit` (also the empty-options `createRoadVehicleKit` compatibility path) lazily imports the historical eager all-body implementation; await `ready` before use. New consumers should select bodies. The efficient parked model uses two mesh submissions; the optional driving model uses six, sharing the approved attributes and partitioning every gear triangle into fixed details and four wheel groups. It adds no triangles. Front wheels use the bicycle steering angle; detailed Ackermann tire dynamics are outside this profile.

Session and complete-yard checkpoints are strict version1 data. They preserve native actor dimensions, exact resources/inventory, positions, signed speed, accumulated distance, occupancy and physical revisions. They do not refill or normalise character data. Unknown fields/versions or mismatched vehicle/body/paint/seat/pose identities refuse before exposing authority. Restored held controls/leases are empty; saved speed subsequently service-brakes under the host clock. Quality is saved separately under `visuals`, outside gameplay state. No one-shot action is replayed.

Measured encoded PNG sizes and separate GPU estimates for a single selected kit are:

| Selection | Profile | Texture requests | Encoded PNG bytes | Estimated RGBA8 + mip chain |
| --- | --- | ---: | ---: | ---: |
| Hatchback + pickup | game | 3 | 662,858 | 3 MiB |
| Hatchback + pickup | full | 3 | 9,383,123 | 48 MiB |
| All eight bodies | game | 9 | 2,408,674 | 11 MiB |
| All eight bodies | full | 9 | 33,726,336 | 176 MiB |

The game pair additionally requests two selected JSON meshes (748,438 encoded bytes); full loads the shared sculpt generator and builds only selected bodies. Game meshes contain 11,197–11,198 triangles per body. Full sculpts contain 55,680 triangles for the hatchback, sedan and vans, 63,104 for pickups and 62,592 for SUVs. Three finishes share each body's texture and geometry; tint uniforms do not allocate three skins. The driving presentation adds four submissions per car (six total) and no triangles. `tools/vehicle-art/costs.mjs` records each body's actual typed-array/index sizes separately from estimated GPU allocation. Driver overhead, timing, frame rate and handset performance were not measured.

For a general tactical game on this supported course, the provisional preference is the game profile and optional kinematic model: selected requests and smaller textures reduce encoded traffic and estimated texture storage, while finite braking and wheel steering improve the experience over a sliding prop. These are file measurements and code-based cost estimates. For close authoring inspection, full is preferable because it preserves the original brushwork and sculpt silhouette; that visual preference is subjective. Both profiles preserve identity/UV/physics meaning. A richer tire/suspension model needs a separate game-specific decision and measurements.

The full-default authoring inspection is `examples/vehicle-library.html`, with explicit body/detail choices and all three finishes. `tools/vehicle-art/intake.mjs --verify` checks the exact reviewed Git-object closure. Derivation uses the Sharp/libvips versions recorded in `profiles.json`; it requires a separately installed Sharp, while runtime and verification need no Sharp. Source browser checks use explicitly labelled candidate content until the implementation is committed. The normal built/installed playable page reads its **clean actual source pin** from package provenance. It needs no fixture harness, configuration edits or manual clock. A development caller must supply an explicit content definition rather than relabel uncommitted content as old main.

The independent package proof is `node tools/test-road-vehicles-package.mjs --typescript /path/to/typescript/lib/tsc.js`, followed by `node tools/review-road-driving.mjs --installed`. `--candidate` deliberately labels an uncommitted development proof and uses synthetic test content; it is excluded from the definitive pin claim. The normal browser collector verifies native occupancy/visibility, both car bodies, symmetric braking, real touch with the normal clock, input release, active-component retirement, independent visual quality, native attachment failure, reload, safe/blocked exit, actor obstruction and the acknowledged-but-unmoved negative control. Its mixed-component check uses an inactive train **UI contract fixture**, with no stock or train simulation; the real two-circuit train regressions remain separate. No mixed-game transport adoption is claimed.

Before adoption, verify actual board/drive/reverse/stop/exit movement, passenger refusal, obstruction and safe exit, ownership release, save/reload and the deliberate acknowledged-but-unmoved negative control. Source and fresh installed-package proofs must use only the public entries and record package/source identities, actual texture requests/dimensions/encoded bytes, estimated GPU cost, browser evidence and disposable-helper cleanup. The existing Night Ledger fixtures and two train circuits remain regression requirements. See `docs/reviews/road-driving/` for the finished candidate's evidence and limitations.

For callers that require the original synchronous Node geometry inspection, import `createRoadVehicleKit` from `@nautilus-engine/map-core/vehicles/legacy`. It retains synchronous `create`/`build`, both `lod:'game'|'sculpt'` choices and the original model handle. In a browser, await its `ready` before painting. This explicit entry eagerly imports all reduced geometry and loads all skins; the modern selected entry keeps that closure lazy. The empty-options modern shorthand is asynchronous and requires `ready` before `create`.
