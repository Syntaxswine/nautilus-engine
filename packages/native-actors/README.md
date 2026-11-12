# Public native actor startup

Headless entry: `@nautilus-engine/map-core/native-actors`. Visual entry: `/native-actors/three`. The adapter hides source catalogue, data, paint and native IK behind a public startup boundary; consuming scene code has no donor/editor imports. Implementation is reviewed at `62f2fe90210b10985f80d75d9e4425f424a51c6b`; recipe compatibility baseline `7f50cb2a48aef87a16fc0465997549be9ed88dc2` is separate from this new API's source/package provenance.

```js
import {prepareNativeActor} from '@nautilus-engine/map-core/native-actors/three';
const view = await prepareNativeActor({renderer, actorId:'player', model:'goat'});
// Staging is inactive. Attach to the existing shared Three scene at acceptance.
scene.add(view.root);
view.updateConfirmed(confirmedHostPose);
view.setActive(true);
// Each confirmed host update (settle permits idle after movement stops):
view.updateConfirmed(confirmedHostPose, {settle:true});
// Retire this view only; the renderer and game state are borrowed.
view.dispose();
```

Prefer the supplied player setup recipe when starting an ordinary player: it handles this staging, lifecycle, confirmed-pose wiring, camera and UI automatically. A standalone caller owns attachment and the acceptance boundary.

Only goat/donkey, normal paint and idle/walk roles are supplied. `nativeActor(model,roles)` refuses unknown models or missing roles; outfit/combat/hen/roof-mantle roles are not inferred. `motion` is `native-gait` or `neutral-only`. Confirmed pose is `{actorId,revision,position:{x,y,h},mode:'on-foot'|'driver'|'rider'}` in metres. World `(x,y,h)` maps once to Three `(x,h,y)`. Heading and native stride derive from confirmed on-foot displacement; boarding/riding/driver input cannot create a speculative walking step. A discontinuous on-foot move over two metres requires an explicit matching staged restore. Driver/rider native bodies are hidden inside the existing opaque rolling stock.

`checkpoint()` preserves model, motion, identity, accepted pose, distance, heading and blend. The first restore update must match the authoritative pose/revision/mode exactly. It restores procedural gait phase without replaying commands or one-shot effects. The same-pose first update does not erase the saved pose; an actual subsequent idle clock step may settle it.

Models retain original scale and source dimensions: goat height **1.64951753616333 m**, donkey **1.7619365453720093 m**. Their bounds come from the accepted actor-intake binding, not a visual size guess. Rendering bounds are not collision policy. The new flat-yard mover is 0.28 m radius/1.8 m height; the legacy train-yard mover's retained 0.22 m/1.6 m policy remains unchanged. Native visual width/height can exceed that older body. A game decides its clearance policy explicitly; this adapter does not certify mesh clearance or resize either model or collision body silently.

Data/factories/paint use the existing AFT pin `781246a668c723d5a4c5463e70534cc04b6a5641`. Mammal gait equations come from reviewed Farmyard commit `279d2d34786b3e6e5c5baeeac6898e60030afdbe`. Its exact original is preserved in the repository under `vendor/farmyard-native-gait/279d2d34786b3e6e5c5baeeac6898e60030afdbe/sites/tactical-animal/dist/aft/tactics/worker-locomotion.js`; the old `source/worker-locomotion.js.original` is a labelled source-only review duplicate. Both reference copies are excluded from deployed/installed runtime code. Packaged vendor notice/provenance and `source.json` retain the blob/hash/purpose. The adapted file uses shared Three, removes the unsupported hen branch, and selects neutral unarmed posture instead of equipment/roof-mantle callbacks. `catalogue.json` and `NOTICE.md` record model/resource provenance. Intake tools read immutable Git objects and never edit the donor worktree.

The visual entry uses the one existing Nautilus Three namespace and requires that namespace's real `WebGLRenderer`. It verifies data/PNG byte length and SHA-256 before use and permits only the installed package's origin. `resourceURL` can remap URLs within that origin; it does not relax hashes. Preparation can be cancelled; any failure disposes the candidate. Painting restores the borrowed renderer target, viewport and scissor state. Geometry, materials, skeleton, paint targets and blob URLs belong to the view; scene, renderer, game clock and resources do not. Disposal is idempotent and attempts remaining owned cleanup even if one release throws.

**Accuracy:** the source native geometry, paint projection and mammal IK preserve identity and gait more faithfully than a placeholder (code/source evidence); physical calibration is not claimed. **Efficiency:** one namespace and selected model data/paint avoid a second renderer; CPU/GPU savings are unmeasured. **Narrative:** preserve each model and offer neutral-only motion as an explicit simpler profile. New combat/equipment roles need a game-specific reviewed provider.
