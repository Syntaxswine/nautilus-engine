# Floor navigation

The optional engine-owned controller lives in `packages/floor-navigation/index.js`. It has no DOM, renderer, storage, game clock, movement, attack or resource dependencies. The separate `dom.js` view and `style.css` supply the five-label selector. The [reference](../examples/floor-navigation.html) demonstrates six legacy layers and a declared thirty-two-floor range; it does not extend the editor or integrate tall gameplay.

## Host contract

Pass an ordered, nonempty array of `{id,label,elevationM}` records and an explicit available `selectedId`. IDs are unique strings or safe integers. Labels are presentation data; native elevations are finite metres and may differ from the legacy story interval. The controller copies these fields, retains their declared order and never calculates a floor from an animated actor height. It does not import world-core or interpret its optional `index` field. A host can pass the reviewed world floor records directly once its height capability is integrated.

```js
import {createFloorNavigation} from './packages/floor-navigation/index.js';
import {mountFloorNavigation} from './packages/floor-navigation/dom.js';

const floors = [
  {id:'ground', label:'G', elevationM:0.37},
  {id:'upper', label:'1', elevationM:3.42}
];
const navigation = createFloorNavigation({
  floors, selectedId:'ground',
  cancelPreview: () => authoring.cancelUncommittedPreview(),
  onFloorChange: ({to,mode,source}) => camera.setWorkingPlane(to.elevationM),
  onTrackingLost: ({id,lastKnownFloorId}) => showContactLost(id)
});
const view = mountFloorNavigation(container,navigation);
// Include packages/floor-navigation/style.css in the page.
navigation.setCharacter({id:'player',floorId:'ground'});
navigation.followCharacter();
// Only a confirmed support/traversal transition updates this floor:
navigation.setCharacter({id:'player',floorId:'upper'});
// The host establishes eligibility/detection; this is not a perception query:
navigation.inspectContact({id:'guard',floorId:'upper',detected:true});
navigation.updateContact({id:'guard',detected:false});
// Teardown or a different declared map range:
view.dispose();
navigation.dispose();
```

All callbacks finish synchronously. A floor change calls `cancelPreview`, then `onFloorChange`, then publishes the new immutable view state. Returning `false` from either callback vetoes the change. Exceptions leave the selected floor unchanged. Callbacks must not reenter the controller. Asynchronous preparation belongs before requesting a selection; do not return a promise from these callbacks.

`select(id)` and `step(1|-1)` enter manual mode and end contact tracking. Manual mode retains the current view while later character reports arrive. `followCharacter()` uses the most recently reported confirmed character floor. `inspectContact` requires `detected:true`; subsequent reports must identify the same inspected contact. Detection loss clears that contact immediately, without reading its new floor, then attempts character-follow. If no character exists or the host rejects the fallback, the last view remains manual. Late reports from the lost contact cannot resume tracking. Consumers decide when another inspection is permitted.

The controller exposes immutable `state`, `visibleFloors`, `subscribe(listener)` and `dispose()`. Subscription immediately delivers current state. Recreate it when a host changes the declared floor range; explicitly choose the replacement selection rather than clamping an unavailable identity. Selection does not create a geometry command or undo entry. The host owns the working plane/cutaway/camera and must never turn a view request into a move, attack, clock tick, resource spend or knowledge reveal.

## View and inputs

The view displays at most five actual labels, keeps the active floor centered where possible and clamps the strip at both ends. Previous/next buttons move one declared position; a label selects directly. The full selected label and native metre elevation remain in the readout. Button focus follows the active label when the sliding window changes.

Page Up/Page Down operate from the document by default. Text/select/editable fields, visible menus/listboxes, open dialogs, modifiers, composition, previously handled events and key repeats do not change floors. A host should install one keyboard owner; `keyboardTarget` can select another event surface. `showModes:false` retains manual authoring controls without character buttons.

Wheel events are handled only on the selector. Pixel/line/page deltas are normalized, a 40-pixel threshold selects one step and the gesture stays latched until a 180 ms idle gap. The headless gate accepts an explicit monotonic event time; it starts no timer. Selector scrolling cannot also zoom the scene or scroll the page. Scene wheel handlers remain host-owned. Ctrl-wheel retains browser zoom. Reduced motion disables button transitions; the module starts no camera animation. The host must apply reduced-motion preferences to its own camera transitions.

At narrow widths, the five labels retain a row and the two arrows move below it, preserving 44-pixel targets at the reviewed 320-pixel phone width. The default skin is CSS; a host may supply an absolute `--fn-switch-image` URL. The reference uses the existing pinned Farmyard paint without adding an asset dependency to the module.

## Legacy editor binding

`apps/editor/floor-navigation.js` exports an explicitly installed adapter. Root integration owns the call and package/build exports. It takes the existing native selector's available options as its authority; it does not widen validation, rewrite a map or enable extended gameplay.

```js
const binding = installEditorFloorNavigation({
  editor: window.editor3d,
  getLabel: option => String(Number(option.value)+1),
  getHeight: id => Number(id)*2.12 // explicit inherited renderer mapping
});
// binding.dispose() restores the original controls and listeners.
```

Install after the inherited workbench and editor are ready. Keep the legacy renderer mapping explicit: its 2.12 m spacing differs from inherited tactical height conversions. The native select/change path still updates the plane, clears selection and synchronizes Land height. Original numeric-key buttons remain hidden but functional. Captured native changes and widget requests cancel the inherited pointer preview, stop brush work and invalidate the separate exact-roof preview ticket before the next placement. The adapter displays cancellation feedback. Phone authoring always retains manual buttons; it has no character-follow dependency.

The adapter deliberately requires explicit label/height mappings. It neither imports a moving worker nor claims thirty-two playable floors. Reviewed world-core integration, map migration and each game's supported height capability remain separate work.

## Verification

Run `node --test tests/floor-navigation.test.mjs` and, after `npm run build`, `node tools/review-floor-navigation.mjs`. The browser runner uses the bounded isolated Edge/Chromium harness, records its exact source commit/build hash and closes its browser/server in finally. Source-only reference review is available with `NAUTILUS_REVIEW_SOURCE=1`; it skips the built editor. The [review](reviews/2026-10-29-floor-navigation.md) distinguishes controller acceptance from world/game integration.

The browser review records native wheel delivery timestamps and resulting state in `artifacts/floor-navigation/wheel-events.json`, even on assertion failure. Native events prove floor/scene/page scope and a later gesture after an observed idle gap. A separate disposable DOM fixture supplies explicit synthetic timestamps for a continuous burst, inertia and the exact 179/180 ms boundary; synthetic and native clocks never share a gate. See [the timing review](reviews/2026-10-29-floor-wheel-review.md) for the earlier automation-gap failure and evidence limits.
