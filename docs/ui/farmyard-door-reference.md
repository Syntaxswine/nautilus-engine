# Farmyard door reference: UI binding

Status: implemented source/static reference candidate for Architect review. API baseline: `a1981b3ec38071fda93a5e384b503fb5a618e9bc`, composed on Root `56d7813e0b5f178461856ad71ff9b8375ff34908`. The reference consumes the named Farmyard endpoint profile and the retained game host. Production registration, versioning, exports, schemas, CI and game adoption remain Architect-owned.

## Builder card

| Field | Binding |
| --- | --- |
| Behavior | `./adapters/farmyard/doors`, `farmyard-single-ground-leaf-endpoint-v1` v1. Read the [adapter guide](../adapters/farmyard-doors.md) and its installed retained-source example first. |
| Source content | Farmyard `251bf8094b5f9ebe44208443084c1a6d6658512a`. The original `interaction-view.js` creates a unit cube with the existing timber texture, tint `0xb5ad86`, roughness `.9`, native shadows, and the door interaction ID. It positions/scales that leaf directly from the current footprint. No fitted catalogue opening or replacement collider is inferred. |
| Native presentation | Public ./adapters/farmyard/doors/three, fixed Root checkpoint 3371859cac750b38e0161d6da43b208ae061fab6; async preparation, owned cancellation and a single canonical packaged source texture. |
| Retained authority | The reviewed complete game connection retains source movement, actors, HP/AP, inventory, ammunition, stamina, RNG, routes, fog and complete persistence. Door UI proposes explicit commands; it implements no cost, movement, geometry, fog or contact rule. |
| One target | A selected source door ID and displayed Open/Close action are captured on press with actor identity, original command ID, expected revision and reference-session identity. No target is selected by nearest-distance fallback. |
| One geometry | The current metadata-bearing geometry from the retained source host supplies movement, sight, projectile/grenade queries and the rendered leaf. An open leaf remains solid. Cached publication is presentation, not another collision authority. |
| Time/lifecycle | The page owns its view/input lifetime and borrows the retained connection. Pause, blur, load/replacement and disposal clear held input and pending target presses. Old scene targets/actions are retired before the new scene is adopted. |
| Persistence | Use the complete strict host-save loader and the reviewed retained-host persistence/reconciliation path. Preserve the original command on unknown outcomes. Quiet load/retry restores current poses without re-publishing an action. A known commit remains successful when presentation fails. |
| Scale/bounds | Metres `(x,y)` on ground, renderer `(x,height,y)`. Source leaf `1.12 × 2 × .16 m`; explicit edge axis and swing sign; source actor radius `.23 m`, profile reach `1.65 m`. These are this named source profile's bounds. |

## Required browser evidence

| Case | Evidence to retain |
| --- | --- |
| Closed / open / close again | Exactly one current leaf, rendered world bounds matching its authoritative collider. The same source geometry changes walking, sight, projectile and grenade obstruction consistently. The open leaf still blocks queries through its own footprint. |
| Reach and occupancy refusal | Exercise actual retained movement into and out of reach and a living destination-pose occupant. Compare complete host/state tokens, AP and saved record before/after refusal. |
| Combat and contact | Use the source profile's preview cost. Verify accepted debit and already-computed visibility/contact transition, including source debit-before-contact-refill ordering. No second refresh or inferred AP rule in the view. |
| Target lifetime | Change selection, delete the selected target, change its pose/revision and replace the scene between press and activation/preview. No command falls back to another nearby door; only a fresh press can select a new displayed action. |
| Persistence and retry | Complete save/load preserves retained state. Original-ID retry after an intervening action/load is quiet. Inject before-write, after-write and unreadable outcomes through the reviewed host; reconcile from authoritative storage without guessing or re-spending. |
| Presentation failure | A postcommit view/collider/visibility publication failure cannot undo a recorded action or report it as uncommitted. Restore the view from current authority without replay. |
| Desktop / touch | Native keyboard/pointer and emulated touch at 320 and 390 CSS pixels. Visible target/action and AP feedback, at least 44 px controls, usable focus and no horizontal overflow. Record synthetic fault/gesture probes separately from native input. |
| Teardown | Held input, pending press, blur, pause, load/replacement and disposal. No late command, animation frame or target survives retirement; borrowed movement/query/persistence services remain usable. |

Use the actual camera and UI root's client rectangle for world picking and target projection. A joystick, if used by the shared controls, retains its press-time rectangle through the gesture. The door action must not add a second movement, keyboard or game interaction handler.

## Unsupported bounds

This reference does not add pairs, locks/keys/difficulty, damage/breaching, upper floors, stairs, windows, active fire, fueled actors, reactive scenery or other geometry profiles. Use the adapter's explicit refusal and diagnostics; preserve unsupported source data instead of dropping it. The endpoint profile does not simulate the swept hinge arc. The bounded 128-receipt journal is preserved and never reset to hide capacity. Native mover-history is outside this adoption.

## Design recommendation

**Accuracy:** reuse the actual source leaf recipe and its current collision footprint, and present only authoritative action/cost outcomes. Source parity establishes consistency with Farmyard, not physical calibration. Prefer the native conservative motion provider for new authored rooms; this reference preserves the named Farmyard endpoint policy.

**Efficiency:** one current collider per leaf and event-driven action previews avoid a second mover or per-frame door adoption. This is a code-based design estimate; actual browser query, draw and load measurements remain to be recorded.

**Narrative:** retain Farmyard's timber leaf and readable explicit Open/Close action, with immediate refusal/cost feedback. This is a UI preference for a gradual Farmyard adoption; each new game still chooses its supported policy, art, costs and presentation.

## Use this reference

Open /examples/farmyard-door-reference.html in the source or built workshop. It uses the actual declared public door/world/interaction/grenade entries through its import map. The reference host, controls and view remain workshop examples; they are not new installed package exports. The renderer borrows the engine's existing Three instance. Native presentation comes only from the public ./adapters/farmyard/doors/three provider at 3371859cac750b38e0161d6da43b208ae061fab6 and its packaged original timber resource; the example contains no duplicated leaf recipe or PNG.

The native leaf binding prepares asynchronously, tracks each door identity, applies the newest current collider after load, aborts deleted/retired bindings and disposes late handles. Required native readiness gates the player controls; a failed view can be retried without a gameplay command.

The complete synchronous fixture owner is examples/farmyard-door-reference-host.js. Construct it with the generated fixture and synchronous getItem/setItem storage. Construction performs no write. command(doorId,action) creates a fresh intent; preview(intent) is pure; perform(theSameIntent) invokes the actual connection. Keep that intent for retry. The fixture owner compares complete state/context/host tokens, prepares and validates the entire strict joint save, checks candidate.canCommit() immediately before the synchronous write, then adopts. A CAS exception returns committed:null with recovery.command; the fixture transaction remains pending until reconcile() establishes the stored before/after outcome. A conflicting active record requires explicit validated adoptActive(). These methods belong to the private example, not the engine's door API.

save()/load() use the complete strict bundle. Load and active-record adoption restore poses quietly and retire UI targets. retry() retains the original command ID and payload. A known committed result with presentationErrors stays committed; repair the view from snapshot()/geometry() instead of re-spending AP or replaying effects. Returned snapshots and UI diagnostics are detached copies. Dispose the page's controls/view before its owned connection.

Movement supports the standing reference actor with a .23 m square footprint and 1.7 m upright query body; other stances require the retained game mover. It is a deliberately labelled reference step of .25 m per fresh directional press, without travel AP or a movement clock. It consumes the existing public upright AABB walking query against the same current geometry and checkpoints through the public context-adoption stage. It is not Farmyard's rounded source movement implementation and creates no native mover history. The installed Coder proof separately executes original source movement. Do not copy these reference movement choices into a game as an implicit policy.

The fixed static layout is protected by a source-layout fingerprint. The geometry bridge caches source leaf poses and obtains each current leaf from farmyardDoorColliders; it contains no footprint formula. Source NPC/fog/contact rules stay in the adapter. The reference's small read-only grenade projection is used only for query evidence at view/action boundaries; no grenade command is issued. Source-shaped inventory, injury, stamina, ammunition and RNG remain in the retained host.

## Smallest workshop consumer

Run this module beside the supplied example files through the workshop HTTP server. The installed engine-only service binding remains in the adapter guide; this snippet uses the complete private reference owner.

```js
import {createFarmyardDoorReferenceHost}
  from './farmyard-door-reference-host.js';
const response = await fetch('./farmyard-door-reference.fixture.json');
if (!response.ok) throw Error('Reference fixture unavailable');
const reference = createFarmyardDoorReferenceHost({
  fixture: await response.json(), storage: localStorage
});
const intent = reference.command('reference-gate', 'open');
const preview = reference.preview(intent);
if (preview.ok) {
  const result = reference.perform(intent);
  if (result.committed === null) {
    // Keep this owner and original intent. Show the explicit recovery action;
    // call reference.reconcile() when authoritative storage is readable.
    console.log('Reconciliation required', result.recovery.command);
  } else {
    console.log(result.committed, result.presentationErrors);
    reference.save();
  }
}
// Retire the owned view and controls, then reference.dispose(), on teardown.
```

## Decisions for the next game

- Supply actual retained movement, costs, clock, persistence and authority; decide the body/query profile explicitly. Keep this named Farmyard endpoint policy separate from the native conservative provider and Tinderbox movement retention.
- Bind exact authored source IDs and current geometry. Supply your own stable command allocator and preserve original IDs on retry. Never turn a stale selection into nearest-door fallback.
- Reuse the actual camera and UI root for projection; keep the selected target's lifecycle tied to its scene. Hidden presentation never removes authoritative obstacles or offscreen occupants.
- Use an accepted shared movement control once. This example delivers the frozen 39bc2bd568bbe152ebf57fff9542fcb15d70bb26 direction-button primitive with one import-path adaptation. There is no joystick here; its press-time rectangle case is inapplicable. The existing mouse/pen no-buttons recovery and touch semantics are retained.
- Choose art/style and supported accessibility settings deliberately. The timber leaf's source scale/collider agreement is preserved; actor cylinders are labelled reference markers, not a native animal-art acceptance.

## Deferred integration queue

Finish this fixed door reference and Architect review first. Subsequent UI discoverability, phone/accessibility and async-lifecycle work requires Root-distributed full fixed contracts for Coder's FC pane provider; Artist's independently loadable waterfront, three medicines and landmark catalogue; and completed AFT appearances behind the queued bear. Coldwell exact-provider and exterior-ghost work starts only when real controls change after their contracts exist. Actual editor undo/reload acceptance belongs to the accepted editor binding; this reference exercises the corresponding target/session retirement without inventing an editor handler. No physical-device performance claim follows from desktop/emulated-touch review.

Queue authority: deduplicated integration orders e773317cdf605262c0f714eb90154c22c9f0d64a and intake 69829f9afdd224b7f55f159b852ee16532b1861a. The TB-dc7f537 comparison contributes acceptance cases only; no Tinderbox source or moving pin is imported.

The injected writer is a trusted synchronous I/O boundary: write(key, wire, canCommit) runs fault/disposal hooks first, checks canCommit() last immediately before setItem, and returns false without writing when the fence closes. Successful synchronous writes acknowledge with true/void; exceptions leave an unknown outcome. No async writer is supported. The owner closes its write fence when the call returns, and can settle an already-pending durable outcome quietly after retirement without reviving commands or presentation. Native Enter remains one activation until keyup; Space keeps native keyup activation and assistive clicks remain usable. Query facades are frozen and cannot replace authoritative walking.

Validation commands: npm run check -- --tracked; npm test; npm run test:upstream; npm run build; node tools/review-farmyard-door-reference.mjs (built), or set NAUTILUS_REVIEW_SOURCE=1 for source. Reports include served/source hashes, native texture hash, negative-command classification and helper cleanup. Root adds offline installed-browser parity and final CI/publication.
