# Smart Tile panel — Editor interface v1

Status: UI-layer review candidate against fixed Editor interface
5c4e6964fdccf3b7df79a87dd1cefd8e82ee9e1a. This component is not a public
engine entry, a completed authoring workflow, a new checkpoint schema or game adoption.
The host checkpoint remains under Architect/Editor review independently.

## Mount and ownership

Use apps/editor/smart-tile/panel.js and panel.css together with the exact adjacent
contract.js. The module imports no renderer, geometry kernel, persistence or floor
implementation. The host supplies an actual adapter with the contract's own methods.

~~~js
import {mountSmartTilePanel} from './apps/editor/smart-tile/panel.js';
// Load apps/editor/smart-tile/panel.css in the host document.
const panel = mountSmartTilePanel(panelContainer, editorSession, {
  floorElement: existingFloorBinding.element,
  onError: error => reportPresentationFault(error)
});
// Editor owns the session, its floor binding and their lifetimes.
const cleanupErrors = panel.dispose();
~~~

floorElement is optional and already mounted by the host. The panel's button moves
focus to those borrowed controls; it never moves their DOM, creates a floor model,
installs their listeners or disposes them. Host supplies actual IDs/native heights.
The panel displays the supplied floor snapshot without converting indices to metres.
Construction/manual mode and any real Follow/Eye bindings belong to Editor.

The panel owns its root, its listeners/subscription, numeric form text and transient
save output. dispose retires ownership first, unsubscribes and removes the root even
if cleanup throws, returning errors. It never calls adapter.dispose. An async result
after cancellation/disposal cannot update the panel. Observer reentry is coalesced
and bounded; error-observer exceptions cannot escape into authoritative acceptance.

Current build.mjs copies only top-level apps/editor files, not this nested contract
or UI. Source conformance runs directly from the repository. Root/Editor must add
the exact nested module/style closure in their reviewed integration; this UI patch
does not change build wiring, registries, package exports or normal Editor mounting.

## Controls and command boundary

Search filters Rectangle, Path and Finish whole surface. This is a compact
operation/family direction within the fixed v1 interface, not a selectable general
catalogue: v1 defines no family/profile selection field or catalogue method.
A later fixed contract must supply those capabilities before enabling broader
family selection. Geometry Paint/union, overlap, grade and unsupported repair are
explicitly unavailable; C1/C2a/private providers are not dependencies.

Rectangle submits origin, native width/depth and a deliberate saved uint32 seed.
Path submits original line/arc/cubic controls, origin, width and seed. Fields use
native metres and radians, with no sample reconstruction, snapping, randomization
or dimension stretching. Existing IDs and local height controls are retained.
Unknown curve types and type changes that would flatten saved heights refuse.
The host validates geometric/profile/repair support; this form is not a matcher.
A null draft starts numeric defaults (8 x 4 m rectangle; 8 m line, 2 m width,
seed 0), explicitly submitted with Update draft. Existing-owner editing uses only
a draft supplied by Editor; selecting an owner does not synthesize its dimensions.

Finish submits only selected whole-owner ID and the entered cosmetic skin ID.
Editor supplies known skin identities through its content/usage guidance and
validates them; this UI cannot manufacture a palette or select boundary materials.
Locked owners are named in selection. Shared-recipe cloning, locks, native material
bindings and neighbour preservation are entirely Editor/core responsibilities.

All enablement uses snapshot.actions, never a second phase permission table.
Phase supplies presentation text only. Method calls re-read the adapter immediately,
and a local in-flight guard prevents duplicate activation without granting actions.
Update draft changes intent; Review (Finish path & review for paths) requests
preparation; Apply sends the current exact reviewId once. Recovery passes the
original supplied recoveryId. Retry accepted preview calls retryPresentation only.
Malformed snapshots/read/render failures disable controls without resetting Editor.
Only a completely rendered stable snapshot can authorize an action. Refreshes
that fail, are superseded during reading or reenter rendering cannot dispatch;
a later successful stable action remains available. Apply/recovery identities come
from that same stable snapshot. Field replacement restores focus only when the
previous active element was an exact field owned by this panel; same-named host
controls keep their focus.

Save/open go only through adapter.save/open. Saved JSON is shown verbatim in a
read-only field; pasted JSON is forwarded unchanged, never parsed or normalized
by UI. Recovery-required state hides stale save output and disables overwriting
actions through host flags. Late save output is discarded if acceptance became
unknown or accepted revision/serial changed. History count/bytes are readouts;
Undo/Redo go to the sole Editor journal. Opening starts whatever history the host
declares; UI never creates a parallel stack.

Diagnostics show bounded numbered code/message/path/owner/port text and the host's
repair guidance. No diagnostic button invents a repair or Alongside workaround.
All content is DOM text, never HTML. Authoring/saveability, shape, visual, query,
support, navigation, fire, water and game readiness remain separate; absent fields
say Not reported. Visible surfaces and numeric thickness imply no gameplay support.

## Input and responsive contract

The component installs no document/window/canvas router, camera handler, pointer
recognizer, floor keyboard owner or tool shortcut. Native buttons activate with
Enter/Space or assistive click. A panel-local key guard suppresses native repeat
activation; it does not map keys to Editor actions. Forms use their native focus/
validation and Enter updates draft only. Editor's existing input owner must suppress
tool shortcuts in forms/dialogs and never route button Enter as a second action.

Canvas integration remains an Editor acceptance obligation: pointer-down chooses
one owner; release finishes a draft rather than accepting; Finish requests review;
Apply accepts explicitly. A second finger cancels/consumes the entire construction
sequence until all lift. Blur/hidden/lost capture retire input; old releases cannot
resume a stroke. Floor or mode change invalidates the draft/review before plane
changes, including same-floor mode changes. Camera wheel, selector wheel,
Ctrl-browser zoom and existing controls outside this panel remain host-owned.

Buttons, inputs, selects, summary controls and the borrowed real floor widget have
44 CSS px minimum targets. The skin follows Farmyard green/paper/brass without new
bitmap assets. Layout supports 320 px, wraps labels/diagnostics, respects safe-area
insets, visible keyboard focus, reduced motion and forced-colour focus/selection.
There are no auto-focus jumps to Apply, animated previews or toast-only errors.

## UI conformance and integration acceptance

Run:

~~~text
node --test tests/smart-tile-panel-fields.test.mjs tests/smart-tile-panel-boundaries.test.mjs
node tools/review-smart-tile-ui.mjs
npm run check
npm test
npm run test:upstream
npm run build
~~~

tests/fixtures/smart-tile-ui is a versioned fake adapter/page, prominently labelled
UI conformance only. It logs routed actions and supplies snapshots; it implements
no checkpoint, CAS, persistence, kernel, authored scene, renderer or history.
The source-only browser report under artifacts/smart-tile-ui records interface
pin, actual content hashes, browser, checks/captures and helper cleanup. Phone
coverage is touch emulation at 390/320 px, not physical-device performance.

UI checks cover action flags/all phases, exact controls/seeds, whole-owner routing,
diagnostic text safety, native single activation, exact review/recovery identities,
presentation-only retry, cancelled late replies, unknown-outcome save races,
checkpoint/history method routing, borrowed floor/input scopes, malformed reads,
callback reentry, throwing cleanup and phone layout. Seven focused control-flow
counterexamples also cover render-refused dispatch, same-click recovery rejection,
superseded reads, bounded reentry, external/owned focus and disposal during refresh.

Actual Editor browser acceptance still must prove real finite preparation and
shared-recipe finishing, source/redo retention, sole-history undo/redo, complete
save/reopen, same-ID authoritative recovery and presenter cleanup with real borrowed
materials/neighbours. The fake cannot establish any of those facts. Test the actual
shared gesture router, second-finger quarantine and named physical phones separately.

## Design choice

Accuracy: explicit controls, owner scopes and actual floor records preserve authored
intent; no geometric or physical truth is inferred from a UI fixture.
Efficiency: one subscription, coalesced rendering and bounded diagnostics are
code-based cost observations, not CPU/GPU/phone benchmarks.
Narrative: compact construction controls and Farmyard-compatible presentation are
the preferred first-proof direction; that usability/style preference is subjective.
Preserve the AFT profile and legacy controls outside the session.
