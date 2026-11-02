# C1 rectangle-library UI component checkpoint

Early component checkpoint on accepted stacked main
d869410625b246cfff2b51089e7878c31951775c. Normative inputs: Core
43227894c50ec62b71806978195fff2c650eb388 and UI
678ceb609d05d2bc13e2a1f83cc7ab7e0e3c5cf2.

The accepted component checkpoint is fac180e2909ba499146bb8e4560c79cf4794ca93.
The focused field/bounds alignment uses actual approved public Core construction
from 3df11ce6e62fb94806e30652b87168949f8ef4dd and final documentation
from eedfc0149cbaa5715445ed2dc909c2d694a81d50. The UI branch does not vendor or
register that package. The explicit constructor tool imports only fixed Git bytes.

Controller protocol tests still use labelled HostService doubles. A separate proof
calls the actual public producer/sealer through the UI field mapping and command
builder. Its snapshot/Expected is from Core's fixed C1 test fixture with unbound
test authority; the six packets are construction evidence and are NOT executed.
There is no production Editor HostService, ledger, retained write, persistence,
native browser, decoder, installed-package or game acceptance here.

## Components and proposed Editor binding

The three UI files assemble finite canonical packets and render borrowed state.
They own DOM listeners and UI busy/observer fences only. They do not own a journal,
authority, private preparation handle, hash implementation, rectangle producer,
history, renderer, floor controller or gesture owner.

~~~js
mountTileAuthoringUI(container, {
  service,                 // SAME production HostService used by JSONL
  getSnapshot,             // atomic derived view below, not a Core method
  subscribe,               // listener(derivedView), returns unsubscribe
  collectCommand,          // existing Editor canonical draft collector
  discardDraft,            // existing Editor draft-discard hook
  allocateIds,             // reserve explicit IDs once per Stage
  borrowedFloorController,
  history: {undo, redo, save, open, retryPresentation}
}, {
  tiles, authoring,        // actual reviewed public namespaces
  rectangleSpec,           // map fields to the accepted public constructor spec
  onError
});
~~~

The atomic derived view contains snapshot:HostService.snapshot(),
presentation:EditorDraftView from UI678, commandJSON:Editor-retained exact staged
bytes or null, and optional Editor-owned separate readiness display data.
EditorDraftView owns command/scope/targetOwnerIds, selected-default capture:false,
selectedCaptureMarkIds:[], review, retainedApplyRequest, outcome and actions.
Action entries are {enabled:boolean,diagnostics:Diagnostic[]}; keys are the six
canonical operation names plus review/apply/cancel/recover/undo/redo/save/open/
retryPresentation. Missing flags disable controls.

These borrowed UI ports are outside the seven-method Core HostService. Their names
are an explicit proposal awaiting the Editor seam checkpoint, not new Core methods.
The UI consumes createRectangleDefinition(tiles,spec)->{definition,pin} and
sealTileContentRecord(tiles,input)->{record,pin}. It implements neither hash domain.
Supplied digest failures propagate without repair or fallback.

The exported UI helper rectangleSpecFromFields maps fields to the exact reviewed
RectangleSpec. The existing rectangleSpec option can bind its captured finish:

~~~js
rectangleSpec: (fields, context) => rectangleSpecFromFields(fields, {
  ...context, finishId: capturedFinishId
})
~~~

Creation sends identity:{id,revision:1,recipeId}, explicit sourceIds:{prefix,
surfaceId,gridId}, dimensions, label and the captured declared finish ID.
Clone/revise send the full immutable base, a new recipe ID and explicit edits.
Clone supplies label only. Revision keeps the base ID and next revision; omitted
width/depth/finish/seed inherit through Core. No source anchors, notices or hashes
are reconstructed by UI. The finish comes from the existing captured workspace
profile, without another snapshot read during construction.

allocateIds(kind) supplies requestId/opId and, as appropriate, definitionId,
recipeId, sourceIds:{prefix,surfaceId,gridId} for initial creation, presetId,
ownerIds[2] and chunkIds[2]. IDs are explicit before Review.
Upgrade selects an existing target pin and does not manufacture a definition.

## Actual six-step proof after runtime binding

1. Create A1: validated 8 by 4 m rectangle.
2. Clone A1 to independent B1, preserving controls/anchors.
3. Revise B1 to B2: 8 by 5 m. Retain B1; changed recipe bytes use a distinct
   bounded public recipe ID.
4. Explicitly select B1 and save P1 pinned to B1, with defaultLayers:[],
   defaultMarks:[] and preserved requirements/notices.
5. Place P1 twice: explicit owner/chunk IDs, supplied native floor/elevation,
   original anchor subsets, identity D4 and empty mark/layer remaps;
   defaults is explicitly empty.
6. Select only owner one and B2. Stage placement.upgrade with exact from/to pins,
   ownerIds:[ownerOne], explicit new recipe anchors, and no decoration decisions
   only when no marks target that owner. Other copies and P1 stay pinned.
   Existing decoration decisions outside C1 refuse rather than silently deleting.

Stage uses the current complete twelve-field Expected from Editor, including the
full C0 floor-binding digest. It emits canonical kind/version/requestId/expected/
operations/budgetProfile and opId/kind/body, without historical aliases.
A shape-valid packet is not runtime acceptance.

Stage constructs a packet once, then rechecks its captured connection, epoch,
ticket, live displayed view and unknown outcome before the collector. Invalidated
construction returns without collection, snapshot reread, Expected refresh or
producer replay. Dispose clears UI pending state without cancelling the borrowed
host. The collector function belongs to the same fixed Editor connection.

Stage calls only the draft collector. Review forwards the existing command to the
same service.prepare once. Apply forwards the exact Editor-retained request,
without reconstructing authority from displayed JSON or preparing again.
Unknown acceptance freezes mutation/overwrite saves and recovers the same ID.
Confirmed commits with failed presentation use the existing Editor retry hook.
NO_CHANGE/refusal never triggers automatic writes/history/reprepare.
Draft discard and cancellation of an existing review use their distinct host hooks.

Library-only revisions keep exact tileBundle/layout revision/constraints and must
skip geometry preparation/preview allocation. The UI displays source-unchanged;
only actual Core/Host proof can establish that behavior. Lists never automatically
follow latest or choose an upgrade target. Presets retain exact definition pins.

## Persistence, default protection and presentation

Save/Open/Undo/Redo are borrowed whole-document hooks. Save authority is full v3:
all six B1 fields, contentRevision, one authoring module and exact typed
resourceRefs. Source is read-only. No implicit v1/v2 migration/reset/normalization,
partial save or second library exists. Unknown state also blocks erroneous
enabled flags for overwrite actions.

Existing B2 UI, drawing/view/source controls, v1 paths, protected hosts and public
registration remain byte-identical. A v3 snapshot cannot masquerade as v2.
A new explicit Editor v3 mount is required. Only nine authorized role-owned paths
belong to this checkpoint; no historical C0 runtime trees are imported.

Only rectangle/library/preset/place/selected-upgrade controls are shown.
Paths, overlays, artwork import and decoration capture are unavailable text.
Locked owners are labelled and further restrict local Stage. Host diagnostics
remain authoritative. Support/navigation/gameplay readiness stays separate.

Source width/depth fields use Core's inclusive 0.1 through 64 metre bounds.
Library and preset labels accept 120 Unicode code points, including supplementary
characters. No UTF-16 maxlength, trimming, normalization or truncation is used.
Invalid labels refuse with field feedback. Noncanonical negative zero also refuses
before JSON serialization can change it to zero.

Scoped CSS uses the established green/gold palette, 44 px minimum buttons,
wrapping pins/command text, and single-column forms at 320/390 px.
This is a code/layout proposal until native captures exist. Subscription refresh
does not move focus or replace focused select elements. No global keyboard,
canvas handler, floor widget or gesture owner is added.

## Evidence and remaining gates

~~~text
node tools/ui-review-tile-authoring-c1.mjs --protocol
node tools/ui-review-tile-authoring-c1.mjs --constructors 3df11ce6e62fb94806e30652b87168949f8ef4dd
~~~

Protocol tests cover constructor/sealer forwarding, explicit pins and scopes,
Stage without prepare, once-only Review/Apply, retained requests, stale/malformed/
render/reentry fences, tri-state recovery, NO_CHANGE forwarding, borrowed history
and permanent connection retirement. They are not Core transaction/history proof.

The constructor-only tool verifies all six actual public export names and invokes
the producer/sealer through UI assembly: fresh/derived field shapes, inherited
anchors/notices/finish/seed, P1 pinned to B1, exact returned pins, 120-point Unicode
labels, 0.1/64 boundary dimensions, out-of-bound and 121-point refusal, supplied
digest refusal and negative-zero refusal. It authenticates 133 fixed modules,
including the explicitly labelled C1 test fixture, without checkout fallbacks.
It constructs six canonical packets but does not plan/apply them or use a fake
HostService. Those packets are not portable review authority; run the UI afresh
on an authorized Editor connection for executable commands.

Next actual Host/native proof needs the reviewed fixed Editor Host/ledger SHA. Use actual public
exports and one authorized UI/JSONL service; retain bytes/IDs and apply once.
Alternate transports without duplicate prepare for parity. Prove the six steps,
library-only zero allocation, metadata-only revision, NO_CHANGE/redo preservation,
exact whole-v3 history/save/reopen, locks/stale/refusal/unknown, unsupported
preservation and nominal 320/390 widths. Source/built/installed must authenticate
complete inputs and block checkout/private-fixture fallbacks. Root owns
build/navigation/source-fence review and promotion. C2 remains unavailable.

Accuracy favors exact pins/targets/full documents. Efficiency favors one borrowed
authority and no library-only geometry allocation (required behavior, unmeasured
here). Narrative favors the existing palette and clearly separated reusable versus
placed scope (subjective). No device/performance claim or retained helper.

## Stable select accessible names

The shared select helper gives each control an explicit name matching its visible
label: Definition revision, Preset revision and Selected upgrade target. Dynamic
option text cannot change these accessible names. Existing htmlFor, styles and
deliberate empty selection remain intact; P1 is never chosen automatically.

~~~text
node tools/ui-review-tile-authoring-c1.mjs --select-labels
~~~

This focused mode mounts the production component in isolated Edge with explicit
render-only document/service/constructor doubles. It executes no Core/Host command.
It checks exact label lookup, role name and native AX tree across empty, populated,
selected, changed, removed and restored options (18 control observations), plus
selection/focus preservation and disposal. The same harness first reproduced the
unfixed failure. Forty protocol tests also pass. This DOM evidence does not replace
the separately gated actual Host/native/source-built-installed proof above. All three
short-lived browser/server runs closed and their ports were verified released.
The f94 validation fields remain unchanged; the follow-up is additive.
