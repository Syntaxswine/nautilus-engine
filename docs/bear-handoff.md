# Bear and appearance: builder usage card

This card follows the [shared handoff standard at its fixed documentation checkpoint](https://github.com/Syntaxswine/nautilus-engine/blob/1c2b94c0cf0c86947c4e5f3da78c7d2d8404ea66/docs/component-handoffs.md). It explains existing public contracts. Its examples are consumer code, not new runtime services, manifest fields or an automatic game adoption.

## Identity and readiness

| Field | Value |
| --- | --- |
| Content / component | `people:bear`, native species `bear`; presentation contract `nautilus-bear-presentation` v1 |
| Status and fixed runtime | Reviewed worker candidate `ef62d12662535389e7d0bed74f16370c9983712f`; architect/Editor integration and game adoption remain separate |
| Engine/package | v0.8.0 candidate based on `8c4670450cb2b38c1e1abd811d633c22de9e2b7c`; these are package versions, not appearance schema versions |
| Public entries | `./actors/bear` discovery, `./actors/bear/three` optional presentation, `./appearance` authoring |
| Profiles | `@nautilus-engine/core`: headless discovery/appearance; `@nautilus-engine/renderer`: optional Three entry and bear resources; `@nautilus-engine/map-core`: compatibility package with all three entries. Core users need no renderer/editor. The two examples below identify their actual package names |
| State / capability | `nautilus-appearance-document` v1; required `nautilus-bear-appearance-v1` v1 when actors are present; unchanged `aft-map` v2 / `aft-block` v1 base |
| Motion capabilities | `bearMotionCapabilities()` supplies `nautilus-bear-motion-<family>-v1`, each version 1, with supported equipment, speaking dependencies and units |
| Source and notices | AFT `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`; [source notices](../NOTICE.md). Eight package-relative resources; original bytes and existing twelve rigs retained |
| Owners | Coder: provider/appearance contracts and this guide. Editor: controls/workspace bindings. Artist: native visual evidence. Architect: combined fixed-checkpoint review. Adopting game: retained services and gameplay decisions |

Successful adoption displays the native bear with the chosen outfit/equipment, preserves its real authored identity through edits/saves and retires owned presentation resources. It does not by itself implement movement, combat, inventory, doors, stairs, fire simulation or a cast. The [full contract](bear-provider.md) gives the supported motion matrix and limits. [Fixed runtime acceptance and captures](https://github.com/Syntaxswine/nautilus-engine/blob/ef62d12662535389e7d0bed74f16370c9983712f/docs/reviews/bear/acceptance.md) record its evidence.

## Connections supplied once by the game

Bind a retained game scene/renderer and one placement resolver to the example adapter once, then reuse it for every appearance actor. `id`, `species`, `outfit`, `weapon`, `role`, coordinates and heading come from the standard appearance record; there is no donor wiring per character. Direct public imports remain supported. The optional module planner is not required and accepts no extra card metadata.

| Connection | Interface / version | Responsibility and readiness failure |
| --- | --- | --- |
| Required consumer manifest | Existing capability negotiation `contractVersion:1` | Publish the adopting adapter's actual schema/capability versions. `UNSUPPORTED_SCHEMA` / `UNSUPPORTED_REQUIRED_FEATURE` means select a compatible adapter; do not unwrap or discard bear records. The library manifest alone does not establish game adoption |
| Required renderer | Borrowed WebGL renderer on Nautilus shared Three r180 | Reuse `THREE` from `./actors/bear/three` in the compatibility package, or the renderer profile's same entry. A different namespace rejects with `Bear presentation requires the engine shared Three namespace.` A missing renderer reports `Supply the borrowed host Three renderer.` Bind the shared namespace before allocating a view |
| Required scene for the view example | Retained same-Three `Object3D` scene/root | Adapter checks `isObject3D` and `instanceof THREE.Object3D`; a missing/mismatched scene rejects before loading or attachment. Renderer creation, camera, lights and drawing remain host-owned |
| Required `placement(record)` for the view example | Example-local callback, not a registered Nautilus service | Return `{position:[sceneX,heightM,sceneZ],yawRadians}` using the host's known floor identity/height and heading convention. Unknown floors must throw a message naming the floor and its remedy. Nonfinite transforms reject before resource acquisition. Bind this conversion once; do not treat legacy `z` as metres |
| Required advancement when visible | Host calls `view.frame(seconds)` | Supply finite nonnegative presentation seconds, including restored host time. This adapter intentionally uses idle only. Other families use their declared seconds/metres/progress; no internal timer or gameplay clock is started |
| Required persistence/authoritative actions | Existing game services; no new provider interface version | The host commits and persists complete game state and deduplicates durable command/event IDs. `view.save()` only serializes appearance. Costs, inventory and projectiles are not functions of a rendered sample |
| Optional loaders | Existing `loadJSON(url,{key,signal})`, `loadTexture(url,{key,signal})` callbacks | Defaults use package-relative URLs. Inject retained asset transport/cache once. Returned textures transfer ownership; use the provider's explicit borrowed texture option when the host retains ownership. Load/network failures preserve the old attached view in this example; retry after repairing transport |
| Optional cancellation | Standard `AbortSignal`; creation boundary | An aborted preparation rejects with `AbortError` and closes staged actors. After creation, use explicit `view.dispose()`. A stale asynchronous view must be disposed rather than attached |
| Optional equipment / speech | Existing provider v1 options | Owned equipment is the simple default. Borrowed compatible native assets require exclusive leases; dynamic-hose borrowing rejects. Speaking is opt-in with its own resource. Use the full provider contract for these choices; the example does not invent an attachment or dialogue provider |

Missing cast, gameplay queries, swept clearance, floor conversion, release-event routing and authoritative actions are game/Editor/Coder integration work, not hidden defaults. No automatic door/stair recipe is supplied by this candidate. Review any later UI/behavior candidate at a fixed commit before binding it.

## Working headless authoring and save example

This complete example targets the installed **core** profile. It starts no renderer, fetch, clock or storage. The manifest here represents only this authoring example; an adopting game must declare its own capabilities.

<!-- example:appearance -->
```js
import {blankMap, engineManifest} from '@nautilus-engine/core';
import {
  createAppearanceDocument, AppearanceDocument, assertAppearanceCompatible
} from '@nautilus-engine/core/appearance';

export function appearanceExample() {
  const document = createAppearanceDocument(blankMap('Bear handoff'));
  const command = {type:'place', expectedRevision:document.revision, actor:{
    id:'bear-handoff-1', species:'bear', outfit:'red-hats', weapon:'rifle',
    role:'npc', x:12, y:12, z:0, heading:90,
    authored:{resources:{hp:37,ap:0,stamina:6.5},future:{retain:true}}
  }};
  const preview = document.preview(command);
  if (!preview.ok) throw Error(preview.error);
  const result = document.apply(command);
  if (!result.ok) throw Error(result.error);
  const wire = document.export(); // pass this whole string to host persistence
  const staged = assertAppearanceCompatible(wire, engineManifest());
  const restored = new AppearanceDocument(staged); // validate before replacement
  return {document, restored, wire};
}
```

No empty or injured resource is refilled. Invalid versions, unsupported appearance, stale `expectedRevision`, occupied/unsupported anchors and full history refuse the edit without changing the prior document/history. Unknown root/actor fields reject; bounded opaque `authored` JSON and supported unknown legacy base metadata are preserved. No nonempty envelope has a bare legacy export. Map/block capture/placement/rotation uses the appearance API; appearance-bearing generation is unsupported.

## Working retained-scene view example

This complete module targets the installed **compatibility** package and only public imports. A renderer-only user can use its own `@nautilus-engine/renderer/actors/bear/three` import and the core appearance import when composing those separate profiles. The example is packaged as this guide; the offline proof extracts and runs this exact block. It has no dependency on an editor, sibling checkout or moving worker branch.

<!-- example:bear-view -->
```js
import {createBearProvider, THREE} from '@nautilus-engine/map-core/actors/bear/three';
import {AppearanceDocument, assertAppearanceCompatible} from '@nautilus-engine/map-core/appearance';

export function bindBearViews({renderer, scene, consumer, placement, loadJSON, loadTexture}) {
  if (!scene?.isObject3D || !(scene instanceof THREE.Object3D))
    throw Error('Bear handoff: bind a scene using the engine shared Three.');
  if (typeof placement !== 'function')
    throw Error('Bear handoff: bind placement(record) with known floor heights and heading units.');
  const provider = createBearProvider({renderer, THREE, loadJSON, loadTexture});
  const views = new Set(), pending = new Set();
  let closed = false;

  async function prepare(input, {signal} = {}) {
    if (closed) throw Error('Bear handoff: create a new binding after disposal.');
    const document = new AppearanceDocument(assertAppearanceCompatible(input, consumer));
    const records = document.actors.map(record => {
      const transform = placement(record);
      if (!Array.isArray(transform?.position) || transform.position.length !== 3 ||
          !transform.position.every(Number.isFinite) || !Number.isFinite(transform.yawRadians))
        throw Error('Bear handoff: placement for '+record.id+' needs finite metres and yaw radians.');
      return {record, transform};
    });
    const group = new THREE.Group(), actors = [], motions = [];
    let disposed = false, view;
    function dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      for (const actor of actors) actor.dispose();
      group.clear();
      views.delete(view);
    }
    try {
      for (const {record,transform} of records) {
        const actor = await provider.create({outfit:record.outfit,weapon:record.weapon,signal});
        actors.push(actor);
        if (closed || signal?.aborted)
          throw Object.assign(Error('Bear handoff preparation cancelled.'),{name:'AbortError'});
        actor.root.name = record.id;
        actor.root.position.fromArray(transform.position);
        actor.root.rotation.y = transform.yawRadians;
        group.add(actor.root);
        motions.push(actor.motion('idle'));
      }
      if (closed || signal?.aborted)
        throw Object.assign(Error('Bear handoff preparation cancelled.'),{name:'AbortError'});
      view = {
        group,
        attach() {
          if (disposed || closed || signal?.aborted) throw Error('Bear handoff: prepare a current live view before attachment.');
          scene.add(group); // presentation attachment; no authoritative game commit
        },
        frame(seconds) {
          if (disposed || closed || !Number.isFinite(seconds) || seconds < 0)
            throw Error('Bear handoff: sample a live view with nonnegative seconds.');
          for (const motion of motions) motion.sample(seconds);
        },
        save() { return document.export(); },
        dispose
      };
      views.add(view);
      return view;
    } catch (error) { dispose(); throw error; }
  }
  return {
    prepare(input, options) {
      const task = prepare(input, options);
      pending.add(task);
      task.then(()=>pending.delete(task),()=>pending.delete(task));
      return task;
    },
    async dispose() {
      closed = true;
      for (const view of [...views]) view.dispose();
      provider.dispose();
      await Promise.allSettled([...pending]);
      await provider.whenIdle();
    }
  };
}
```

Bind once with retained `renderer`, `scene`, actual `consumer` manifest and `placement`. Call `await binding.prepare(completeAppearanceJSON,{signal})`, sample the returned view at the host's restored seconds, then attach it after the host confirms the corresponding state. Retire the old view only after replacement preparation succeeds. Caller selection/revision tokens decide which asynchronous result is current; dispose stale results. Finally `await binding.dispose()`. Every host value/callback is named in the table; camera, draw loop and persistence remain the host's existing functions. The installed proof supplies a real Three scene, deterministic test renderer/loaders, an explicit floor resolver and actual consumer manifest. Real WebGL evidence for the unchanged provider remains separate.

## Native semantics, units and ownership

- Appearance `id` is the stable authored actor identity. `role` is `guard` or `npc`, not an AI/class/faction policy. `species:'bear'`, the two exact outfits and thirteen equipment IDs are validated by public discovery; do not substitute legacy species.
- Authoring coordinates are integer-centred map `(x,y)` plus legacy layer index `z`. Three coordinates are `(mapX,heightM,mapY)` with +Y up, one unit per metre and the foot origin at the floor. Native kit stories are 2.12 m. A game resolves floor identity to actual elevation; the example deliberately requires that binding. Authoring `heading` is degrees; the resolver supplies Three yaw in radians once according to the game's convention.
- `actor.root` is the host's world placement. Native motion/diagnostics and `bounds()` are actor-local, isolated from that transform. Body, visual and equipped bounds differ. A standing body tops 1.67085 m, Red Hat visual 1.69190 m; RPG equipment can extend beyond a tile. AABBs/placement anchors do not prove swept clearance, support or an ordinary 1.65 m doorway fit. Keep the actual geometry provider authoritative.
- Motion IDs, units and restrictions come from `bearMotionCapabilities()` and the [existing motion table](bear-provider.md). Idle/aim/throw/chair/fire/burn use seconds; walk/crawl use supplied metres; ladder/mantle/descent use progress; jaw uses radians. The view example selects idle once and samples it; it starts no authoritative action.
- Native weapon anchors are inspected through `actor.worker.weapon.anchors` (for example rifle `grip`, `support`, `stock`, `muzzle`). This is advanced binding to this exact native pin, not a generic socket-resolver service. Check a selected weapon's actual anchors before using one. Use managed motion diagnostics and `actor.root.localToWorld(point)` for local-to-world muzzle points.
- The source grenade study has release at 1.92 s within a 4.6 s clip. The provider emits **no public release event, command ID or authoritative projectile**. A reviewed host action/marker adapter must relate presentation to one already committed release and deduplicate its gameplay ID. Seeking past a marker, restoring a pose, retrying a command or replaying a clip must not spend inventory/create effects again. A general event/attachment recipe remains Coder/game work.
- Host services are borrowed. The binding owns its provider, staged groups, views and actor/motion resources. Dispose only those; do not close the renderer/scene, host cache or app runtimes. Optional borrowed assets/textures follow the provider's explicit lease rules. Failed/aborted/late creation closes staged actors, restores borrowed renderer state and preserves the old attached scene; raw provider caches retire when the binding closes.

The appearance envelope owns authored state only. It stores no motion timeline, flight, turn or in-progress game action. The host saves those under its own existing schema and restores a chosen presentation sample without replaying effects. Stage and validate both saves before replacing the live game; reject unsupported versions rather than normalizing resources or stripping unknown game data. Full history has explicit limits and cannot act as a durable gameplay event journal.

Games choose casting/faction, inventory ownership, permissions, balance/AP/time, collision/support, path/traversal, speaking/dialogue, timing, event deduplication and persistence atomicity. Select supported paint/equipment/motions through the provider; arbitrary body rescaling, guessed floor heights and replacing the Red Hat fit are not equivalent compatibility substitutions. Source prototype roof/descent local heights require deliberate host geometry binding.

## Builder checklist and proof

The completed items below establish the component/example boundary. They do not certify an unmodified game. Record the adopting game, exact engine/card commit, package profile and rollback pin beside the remaining items.

- [x] Locate the packaged card from [the public provider guide](bear-provider.md), public entries, source notices and both complete examples. Profile/URL/resource closure is checked by `tests/bear-source.test.mjs` and the offline package proof. Runtime pin: `ef62d12662535389e7d0bed74f16370c9983712f`; the containing follow-up commit identifies this card and example test.
- [x] Bind a retained renderer/scene once and reuse one resolver/provider for multiple views. Installed example proof covers preparation, attachment, clock sampling, missing placement, unsupported capabilities, bad floor transforms and preservation of an existing view on rejection. Native wrong-Three checks are in `tests/bear-provider.test.mjs` at the fixed runtime pin.
- [x] Match actual semantic IDs/units and native bounds. Fixed runtime tests/captures cover both outfits, all thirteen equipment choices, native contacts and a translated/yawed/parented actor. Unsupported combinations reject; dynamic geometry/support and fifteen-story actor traversal are not established here.
- [x] Exercise pure preview, stale authoring revision, rejected imports/history, saved opaque resources and block transforms in `tests/bear-appearance.test.mjs`. The headless example round-trips `hp:37, ap:0, stamina:6.5`. Installed view sampling/restore emits no gameplay effects because it has no gameplay callbacks.
- [x] Check cancellation/retry, concurrency, borrowed ownership and exactly-once disposal at the fixed runtime pin. Installed example proof also retires a staged cancelled view and verifies the retained scene/renderer remain usable after binding disposal.
- [x] Review provider visuals at desktop 1600 × 1100 and narrow 390 × 844 on Edge 156 / Windows / SwiftShader; fixed runtime acceptance records zero console/resource errors and source/package pixel parity. This is not physical-phone performance evidence. The card has no controls/focus loop; those are inapplicable to this presentation-only example and belong to actual host UI review.
- [x] Stop temporary review helpers; fixed runtime `docs/reviews/bear/cleanup.json` records exact helper identities, exit and released port. The follow-up examples use foreground Node package proofs and start no server or browser.
- [ ] In the adopting game, prove its actual renderer, floor/heading mapping, camera, geometry clearance and gameplay capability manifest; record failures/remedies and exact content fixtures.
- [ ] Connect input/authoritative commit, deduplicated durable event IDs and complete game save/restore, including mid-action state. Test repeated/stale commands and failed persistence without duplicate inventory, costs, projectiles or rewards. Appearance alone owns none of these effects.
- [ ] Review actual desktop/phone controls, focus/loading/errors/accessibility and physical-device costs. Run engine plus game checks, integrate accepted Editor/UI fixed checkpoints, then adopt the exact engine commit in a separate game change. Roll back to the game's prior exact pin and preserve the complete unsupported envelope; no lossy automatic downgrade exists.

Prefer this native provider and explicit appearance semantics for AFT/Farmyard bear scenes: retained scale/contacts and preserved data support **accuracy**; one shared host binding avoids repeated donor wiring, although CPU/time savings are unmeasured (**efficiency**); the original regular/Red Hat paint and game-owned policies preserve each game's **narrative**. Native bounds/package sizes are measurements, lifecycle/mapping behavior is code/test evidence, and the visual preference is a judgment. Production adoption remains unclaimed.
