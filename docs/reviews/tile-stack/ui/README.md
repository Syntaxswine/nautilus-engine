# Gate A tile-stack UI component

Status: proposed source component, not a public entry or completed Editor workflow.
Base: 5d69c2130eb64b6f4e31bc672e884bdc33bf47d2; runtime equals reviewed
2502646482218524fd5129641da769bb82462e4d. The identity/projection target is fixed
Editor 4b0499cc776fcd85fdd415fa7344982b75fbf8fb, read through Git objects.
Architect must reconcile/freeze the final Editor/Coder/Artist/UI contracts at Gate A.
No protected Smart Tile/title file, source fence, version, pin or registry changes.

## Usage card and mount

Entry: candidates/tile-stack/ui/panel.js, export mountTileStackUI.
Load its styles.css and the existing packages/floor-navigation/style.css.
Source hashes, fixed imports and coordination inputs are in source.json.

~~~js
import {mountTileStackUI} from './candidates/tile-stack/ui/panel.js';
const panel = mountTileStackUI(container, editorV2Adapter, {
  floorController: actualFloorController,
  keyboardTarget: ownedWorkspaceElement,
  floorElement: existingFloorWidget?.element, // optional already-mounted real widget
  onError: error => reportUIFault(error)
});
const cleanupErrors = panel.dispose();
~~~

The caller supplies the real controller with an immutable declared table and actual
selected ID. UI never creates another controller or calculates heights. If no
floorElement is supplied it mounts the actual existing DOM widget on that borrowed
controller. With floorElement it borrows the existing widget without another key
listener. PageUp/PageDown belong to the supplied element, not document/window.
Inherited form/dialog/composition/modifier/repeat guards remain. Selector wheel
steps floors; canvas wheel stays with the host. At most five actual labels show.

The literal fixture tables match the fixed Editor proposal: F00–F14 / labels 1–15,
aft-native-fifteen ending at 29.68 m and nonuniform-fifteen ending at 42.7 m.
The latter's fourth floor is 6.75 m. First three references are real legacy layers;
the rest are authored tile-only records. These are supplied data, not a universal
storey interval or forged additions to the retained original map.

## Exact proposed adapter/data needs

Explicit v2 snapshot discriminator:

~~~text
version:2
interface:{kind:'nautilus-tile-stack-editor-adapter',version:2}
~~~

The same fifteen own methods from Editor's fixed proposal are required.
Version 1 is not silently upgraded. No new setStackDraft/setFinishDraft methods
remain. The UI sends closed v2 intent through setDraft:

~~~text
stack: {
  tool:'stack', ownerId:null,
  origin:[x,y], widthM, depthM, seed,
  floorIds:[declared IDs in table order],
  minimumClearanceM:<exact positive requested input>,
  lockPolicy:'all-except-highest',
  finishId:<captured catalogue ID>
}
finish: {tool:'finish',ownerId,finishId}
~~~

Stack copies original planar dimensions/origin/seed/finish from the current Editor
rectangle/stack draft. It creates no recipes, owners, primary reservations, locks,
105 crossing relations, constraints or matching decisions. Two to fifteen declared
IDs and the explicit requested minimum are intent only; feasibility belongs to the
fixed public-core planner and one Editor transaction.

Optional setInspection is feature-detected and uses actions.setInspection:

~~~text
{mode:'selected-floor',cutawayFloorId:null}
{mode:'overview',cutawayFloorId:null}
{mode:'cutaway',cutawayFloorId:<actual selected declared ID>}
~~~

Visibility never alters source, contacts, support or budgets. lockOwner remains an
optional Editor method; this component labels locks and does not implement locking,
unlocking or another lock policy.

Snapshot workspace/floors/finishCatalogue/inspection/limits follow the actual fixed B1 projection 4b0499cc.
workspace binds its identity/policy, raw source hash, exact floor-table token and
finish catalogue id/version/digest. Catalogue entries are {id,version,label,
available,reason}, with null reason for available entries and nonempty unavailable
reasons. Exactly one active version per ID is accepted. The fixed mapping and
workspace binding cannot change inside a mounted component; a change requires an
explicit host rebind/new session. Versions are displayed, but drafts emit finishId.
No extra independent version selection or local catalogue upgrade is permitted.

The UI does not infer a finishId from owner.skinId. It uses a host-supplied v2 draft
finishId where available, otherwise a deliberate user selection. If the host wants
a preselected current-owner finish, it must supply the corresponding v2 draft or
another frozen presentation field; mapping physical/cosmetic identities is not UI work.

One remaining **optional presentation request** is acceptedMinimumClearanceM:
positive number for the accepted saved requirement, null for no accepted requirement,
or omitted when not reported. It is read-only. It is not part of the frozen v2
proposal yet and must be reconciled by Architect. Requested minimum and accepted
saved minimum are shown separately; UI never derives accepted state from draft,
mesh gaps or cross records. Coder a2eaa70a616e7bd17336435422db5602dfb2e38d was read
as provisional coordination input only; its constraints/digests are not imported.

## Focused workspace-identity correction

This checkpoint corrects the eight independent witnesses against UI
5b0d06ce93977addd438d3ad43f887fcd3278817. Custom contract
4d1e5da37031b89afbcb7b6fb47e6a03a606de25 remains on its separate branch.

The workspace, floor profile, finish binding and catalogue identity records must be
own, enumerable plain data (ordinary or null prototype), with their explicit fields.
Inherited/accessor/missing fields, malformed IDs/digests and unknown versions refuse.
The supported identity projection is:

~~~text
workspace: {
  id, checkpointVersion:2, policyToken,
  floorProfile:{id,version:1},
  floorTableId, floorTableToken, floorProfileDigest, sourceSha256,
  finishBinding:{id,version:1,digest},
  sourceDocumentDigest, sourceConstraintsDigest
}
~~~

IDs follow the fixed Editor ASCII identity shape (1–96 characters); policy/table/profile
tokens, raw-source SHA, current document/constraint digests and finish digests are exact lowercase 64-character SHA-256
strings. This checks the supplied representation, not the source geometry, hash
provenance, saved document or policy. Names remain supplied by Editor: UI has no
profile-name whitelist or duplicate native-height/constraint evaluator. Existing
labelled fixture hashes already meet this shape; they remain explicitly UI-only.

The mounted key includes every immutable workspace/profile/table/finish field,
including checkpoint/profile versions, profile ID, table ID and floorProfileDigest.
The current sourceDocumentDigest and sourceConstraintsDigest are validated diagnostic
fields and deliberately excluded from mount identity. A valid identity
change permanently retires that mount's action reads and outstanding UI replies.
Restoring an old identity does not revive its draft/review. The host must dispose
and explicitly remount with the intended session. UI never cancels/replaces the
borrowed authority, rewrites its state, or reuses an old review across the rebind.

Pure tests cover the original eight witnesses, all valid identity changes, own data,
getter non-invocation, strict digests and null-prototype compatibility. Mounted checks
exercise all eight against host flags that still permit stack/finish/apply, and prove
zero draft/apply calls from stale form/click events. The two valid renamed identities
require a fresh mount; the new mount has no old review to Apply. Pending replies from
the retired binding cannot restore actions or overwrite the binding fault.

These are source component/adapter-double tests. Actual v2 input routing and the
real Artist finish catalogue remain Gate B obligations. No saved geometry, live
v2 workspace, history/CAS, installed host or production integration is proved here.


## State, focus and authority

Action availability comes from Editor flags. Stack requires actions.stack and
setDraft; finish requires finish and setDraft. The phase is status text, not another
permission machine. Review/Apply/cancel/recover/retryPresentation call the original
methods. Unknown acceptance freezes host-disabled actions, uses the original
recoveryId, and cannot be cancelled into a fresh edit. Retry is presentation-only.

The snapshot's floor/table must exactly agree with the borrowed controller's ID,
native elevation, label and mode. Malformed, stale, render-refused or superseded
refreshes cannot authorize an action. Rendering/reading reentry is bounded, old
async replies are discarded, and only exact owned fields can regain focus.
Native Enter/Space stay native; a panel-local repeat guard prevents repeated native
activation without creating tool shortcuts or global/canvas handlers.

Numbered diagnostics display supplied path, owner/reservation/port references and
required capability as text; UI does not fabricate repair actions.
Source/saveability, visual, query/support/navigation/fire/water/game remain separate.
Host-reported allocation counts include all charged states. UI does not subtract
hidden floors or increase the two-root/50,000-triangle/1,024-cell ceilings.
No actor/contact service is manufactured; unbound actions and families show reasons.

The component owns DOM, transient form values and subscriptions. Stack membership
is distinct from floor inspection, not another floor/navigation state. It owns no
checkpoint namespace, journal, save policy, CAS, recipe authority, resolver, camera
router or physics/actor controller. dispose retires first, attempts all owned
cleanup and returns errors without disposing adapter or floor controller.

## Fixture and known Gate B input/presenter gaps

fixture.html is explicitly labelled component proof only. Its v2 double logs intent;
it implements no source map/checkpoint/recipe authority, storage, history or planner.
Catalogue identities for brick/stone/timber/concrete are synthetic fixture records;
painterly/slate/sandstone are compatibility labels. No new material/art is bound.
Artist's actual fixed catalogue/resource projection still needs Architect relay.

The fixture imports the exact unchanged accepted bindSmartTileInput. Its native
touch proof establishes UI-first ownership, second-finger quarantine, capture-loss
and held floor-change cancellation, all-up/fresh-primary recovery. It does not
establish real v2 drawing: the frozen input owner has no stack drawing branch and
emits v1 Rectangle intent without finishId. Such calls are logged and explicitly
refused as UI_FIXTURE_V1_INPUT_NEEDS_V2_FINISH_BINDING. No field is silently added.

The fixture predeclares a complete v2 rectangle for independent stack-form proof.
Rectangle source mode is requested through setTool. Gate B needs Architect's
approved adaptation of the existing input owner/session, not a new router or an
unreviewed edit to the fifteen protected files. Same-floor mode changes must retire
input/draft/review before changing context; borrowing the widget alone does not
implement that session coordinator.

Native-height inspection buttons are present but unavailable in the fixture because
no presenter is bound. The blank canvas is an input probe, not a debug-box tower,
tile world, slab, underside or support demonstration. Actual selected-floor/
overview/cutaway surfaces at authored heights remain Artist/Editor Gate B proof.

## Builder checklist

- [ ] Architect reconciles the exact adapter, planner, constraints, accepted-minimum
      presentation and Artist catalogue commits; freeze one v2 binding.
- [ ] Start a new explicit workspace/profile with its complete native floor table.
      Retain old workshop/source/checkpoints/journals without migration/restamping.
- [ ] Borrow one actual floor controller/widget and one existing input owner.
      Supply owned key scope; approve v2 finish/stack routing at Gate B.
- [ ] Route closed draft intent through Coder's fixed planner, public preparation
      and one Editor CAS/history/recovery coordinator. Never create crossings in UI.
- [ ] Bind immutable catalogue id/version/digest and one version per finish ID.
      Preserve dimensions/controls/seed/locks/boundaries and requested clearance.
- [ ] Bind actual native-height tile surfaces for selected/overview/cutaway.
      Visibility cannot change source, contacts, support or charged allocations.
- [ ] Prove real Review/Apply, finish, undo/redo, complete save/reopen and same-ID
      recovery; reject failures without changing accepted source/redo/view.
- [ ] Gate B repeats the old 27-check workflow and source/built/actual-installed
      host proof. Review actual desktop and named physical phones separately.
- [ ] Stop helpers and retain exact identity, restart and cleanup receipts.

## Component checks and evidence

~~~text
node --test tests/ui-tile-stack.test.mjs
node tools/ui-tile-stack-review.mjs
npm run check
npm test
npm run test:upstream
npm run build
~~~

The source-only runner serves the candidate HTML explicitly. No root example,
public export or normal build registration is added. evidence/ retains exact source
hashes, scope, controlled synthetic wheel clocks versus native input, captures,
helper restart identity, cleanup receipt and independently verified released ports.
Phone evidence is browser touch emulation at 320/390 CSS px, not physical-device or
frame-rate proof. Gate B actual host and installed component parity remain outstanding.

Helper code and restart arguments are preserved in the committed role runner and
candidate closure. Bounded disposable browser/server helpers stop immediately after
review. No service, daemon, automation or extended lifetime is retained.

Accuracy: explicit native records, original intent and requested clearance are
preferred; the component fixture establishes no physical/structural floor.
Efficiency: reuse the actual widget/input owner, bounded catalogue and UI subscription.
These are code-based observations, not CPU/GPU measurements.
Narrative: compact stack/finish controls and Farmyard-compatible presentation are
the preferred first component direction, a subjective usability/style judgment.

## Final verification and separate CLI follow-up

The identity correction passes 21 focused pure tests and 12 mounted browser groups,
including all eight original witnesses. Final standard gates passed: npm run check,
**npm test (933/933, zero skips)**, npm run test:upstream (32/32), and npm run build
(519 module paths). The fifteen frozen host files remain unchanged. The new disposable
browser/server pair exited and released its port; no helper is retained.

The separate orchestration checkpoint is f826afb1e73175961777ae1792d9ec7fc786d8f2. Architect explicitly
authorized only the adjacent guard/declaration reorder in tools/test-tile-v2-package.mjs,
from fixed baseline 2502646482218524fd5129641da769bb82462e4d. The unchanged disabled-path
refusal now precedes checkTileV2 and registration-request loading. Its imports, exact
error, --candidate path, tests, 20-second timeout and source fences remain unchanged.
This is not a UI validator or private-core change.

Before that reorder, two default full-suite runs failed the unchanged CLI assertion;
the isolated file passed and all 933 tests passed with four workers. All three original
logs are preserved byte-for-byte as gzip archives. After the reorder, standard npm test
and the other required gates passed. The full [validation record](identity-correction.json)
links each exact log/hash and the separate guard checkpoint. No failed run is discarded.

## B1 eleven-field workspace completion

The actual fixed B1 projection adds three explicitly named own SHA-256 fields.
sourceDocumentDigest and sourceConstraintsDigest describe the current accepted revision;
Apply/Undo/Redo can change them without retiring the component or cancelling accepted
state. They remain strictly validated, but are excluded from workspaceUIBinding.
floorProfileDigest identifies the predeclared geometric floor/profile and remains in
the immutable binding. A changed valid value retires the mount and requires a fresh
session mount. No field is an alias and no extra metadata bag is accepted.

The labelled UI-only adapter now provides all eleven fields. The mounted proof keeps
its forms, selected finish and readable diagnostics across each source-digest update,
without a cancel/authoring call. It reruns all eight original witnesses plus the new
immutable profile-digest witness. Unknown fields, inherited/accessor fields and malformed
versions/digests still refuse. UI computes none of the host geometry/policy digests.

The separate actual-object proof loads fixed B1 4b0499cc776fcd85fdd415fa7344982b75fbf8fb
through Git objects and borrows public modules from fixed foundation
cae053d3afcd2a10d2226e06b387db76ab102dd5. Both profile snapshots and the actual ordinary
Apply/Undo/Redo snapshots pass the UI reader with one stable immutable binding. All
owned harnesses are disposed. The proof uses B1's explicitly resource-only view and
compatibility finish fixture; it is interface evidence, not acceptance of B1 authority,
native rendering, actual B2 browser wiring or installed host behavior.

~~~text
node --experimental-vm-modules tools/ui-tile-stack-b1-proof.mjs
~~~

The manual fixed-object proof requires those two immutable commits locally. It is
kept separate from default tests so ordinary checkouts do not acquire unapproved peer
code or require moving worker branches. Its complete 141-module source/hash inventory
and five snapshots are in [actual-b1.json](evidence/b1-digests/actual-b1.json).
The earlier component proof remains archived beside it; current results are recorded
in [b1-digest-completion.json](b1-digest-completion.json). Public/host source fences,
consumer pins and custom contract 4d1e5da remain unchanged.

Current completion verification: 23 focused tests, 13 source browser groups, all eight
original witnesses plus the immutable profile-digest witness, and actual fixed B1
snapshots for both floor profiles/Apply/Undo/Redo pass. Standard required gates pass:
935 tests (zero skips), 32 upstream tests, check and 519-module build. The fifteen
protected hosts and separate custom checkpoint remain unchanged. The new browser/server
pair exited and released its port; no disposable helper is retained.
