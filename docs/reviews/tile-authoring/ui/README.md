# Tile workbench C0: UI contract realignment

Status: **design/types/metadata/examples only**. This separate branch starts at
historical UI draft `4d1e5da37031b89afbcb7b6fb47e6a03a606de25`. Accepted stack UI
`8622c77234036d786474689f7e70671ecf01136b` remains untouched; actual B2 review has priority.
Runtime C1 waits for stacked main acceptance.

The fixed Core input is recorded in [input provenance](../../../../candidates/tile-authoring/ui/inputs/provenance.json).
Its schema is the sole command/query/pack grammar. UI types import the exact Core
declarations; UI metadata maps labels to precise schema/discovery pointers. There is
no second command registry, alias parser, executor, authority, gesture owner or runtime
projection. Historical wrappers and their browser proof belong to the original draft.

[Usage card](usage-card.json) · [UI metadata](../../../../candidates/tile-authoring/ui/presentation.json) ·
[types](../../../../candidates/tile-authoring/ui/contract.d.ts) ·
[canonical examples](../../../../candidates/tile-authoring/ui/example-index.json) ·
[static design](../../../../candidates/tile-authoring/ui/specimen.html).

## One service and exact grammar

Both authors and agents use the same Editor-owned Core HostService:
describe, snapshot, query, prepare, apply, cancel, recover. Core discovery currently
declares executorImplemented:false/publicRegistration:false. Static controls are
disabled. A schema-valid packet or artwork descriptor is not a working tool/provider.

Commands have exactly kind/version/requestId/expected/operations[]/budgetProfile.
Each operation is opId/kind/body. Pins are exactly **id/revision/contentDigest**;
record version describes the grammar while revision names immutable content.
Queries are requirements.inspect and content.export. Packs use the canonical
kind/version/manifest/blobEntries/requires shape. The original draft's nested command,
payload, binding and id/version/sha256 wrappers are historical, not accepted aliases.

The full Expected capture includes revision, derived workspace digest, full host-document
digest, authority/context tokens, content/decorations/resources, complete floor binding,
constraints and tile layout/catalogue digests. Clients never recompute authority tokens
to make a modified proposal look accepted. Core C0 Expected.floorProfileDigest binds the
**full floorBinding**, unlike the narrower historical B1 geometric snapshot digest.
The existing Editor draft collector/history/save hooks remain Editor-owned; UI C0 does
not assign new service methods or a second permissive state machine.

## Stage, Review and Apply

Stage collects one finite canonical command in the existing Editor draft. It does not
prepare, write, spend or acquire commit authority. Pointer release cannot Apply.

Review calls service.prepare(command) once. Editor retains the actual prepared result,
resource/geometry bindings and review authority on the authorized connection. Display
the complete targetDocument/source diff, targets/locks, pin changes, anchor decisions,
required capabilities, resource staging/adoption and aggregate proposed costs.

Apply forwards the canonical request retained by that same Editor connection:
requestId, reviewToken and expectedTargetDigest. The UI does not reconstruct it from
serialized review JSON or prepare again. An exported token/command is not a portable
capability. Reopening a process requires inspection/reconciliation, not token replay.

Outcomes are distinct: committed:true remains committed after presentation failure;
retry only presentation. committed:false rejects without changing accepted state/history/
redo. committed:null is unknown: freeze mutation and overwriting saves, retain potentially
adopted references/leases and recover the SAME original requestId. No fresh-ID retry.

NO_CHANGE writes nothing and preserves redo. Metadata/library/decoration-only work
preserves exact tileBundle/layout revision and constraints, skips geometry preparation
and reports source-unchanged. Ordinary nonempty acceptance increments contentRevision
once. Exact Undo/Redo restores the historical full document and its contentRevision;
freshness belongs to the checkpoint/journal/context tokens.

## Author scope and library workflow

| Author intent | Canonical operation | Required distinction |
| --- | --- | --- |
| New or cloned tile | recipe.create / recipe.clone | Fresh immutable definition/pin; original controls and anchors remain explicit. |
| Revise library source | recipe.revise | Append an immutable revision against an exact base pin. Existing placements stay pinned. |
| Save reusable defaults | preset.save | Selected decoration capture starts **off**. Explicit selection creates new default layers/marks; it does not update placed copies. |
| Stamp twice | preset.place | Exact preset pin, explicit fresh owners and mark/layer remaps; empty versus copy-explicit defaults is deliberate. |
| Edit selected placement source | clone/revise plus placement.upgrade | One atomic ordered batch, explicit owners/from/to pins, locks, anchor decisions and original anchor subsets. Another copy stays unchanged. |
| Paint / move / erase | decoration.add/update/remove | Default scope is this placed instance, owner/surface/floor/binding identity. Explicit whole-group or detach policy; no accidental preset edit. |
| Layer order / opacity | surface.layers | Stable order and grouped opacity are source. Mark removals are explicit; base finish remains separate. |
| Multi-owner stroke | stroke.group and finite mark operations | Explicit same-floor membership/phase/pose bindings; every lock and target participates. Current controls remain unbound. |

The examples show clean preset capture, explicit selected capture, two fresh owners and
one selected upgrade with a review-visible deletion decision. A separate atomic
clone + selected-owner upgrade example preserves an identical local mark binding. They are independent
unbound packets against the fixed source fixture, not a sequential executed session.
Clones/revisions retain complete closed public-v1 recipe controls. Different recipe bytes
cannot silently reuse a retained recipe ID. Old versions, dependencies and notices remain.

## Full v3 save authority

Saved authority is nautilus-tile-workbench-document@3 with all six B1 fields:
id, sourceJSON, full floorBinding, finishBinding, tileBundle and constraints; plus
contentRevision, exactly one AuthoringModule and typed resourceRefs.
The module owns library/decorations/ownerPins once. resourceRefs names exact artwork pins
and imageViewDigest; no second mutable artwork catalogue, URI, decoder status or lease.

Source is a read-only derived view for planning/queries. Snapshot returns both the full
document and consistent Source, but only the full document is saved. The reduced floor/
finish views cannot replace full native bindings. Old v1/v2 journals are not silently
migrated, reset or restamped. Complete definitions/map/constraints/decorations/resource
references share one transaction, history and same-ID recovery.

Bulk encoded bytes and decoder/resource leases stage through host ports **outside**
finite command JSON. Adoption belongs to the same complete targetDocument operation.
Unknown acceptance retains possibly committed resources, including history/redo/pending
obligations. Cleanup requires confirmed unreferenced state, not age alone. A pack query
returns an export plan; portable completion still needs verified bytes, paths, lengths,
hashes, complete dependencies and notices.

## Appearance, coordinates and unavailable capabilities

Show the exact immutable blob/frame/sampler descriptors. PNG is the first required actual
bounded decoder; none is implemented here. Optional WebP remains unbound without its own
decoder proof. Metadata, a signature or a thumbnail cannot establish decoding/clipping.

Tint is linear RGB. Composite ordered marks with source-over linear premultiplied alpha,
then attenuate the layer group; multiplying layer opacity into each mark is different.
Stamps have finite transparent support; detail repeats within its own frame/mask, not
the atlas page. Local marks follow current source frame, owner D4 and declared floor;
derived triangles/cells/streaming addresses are not saved anchors.

Root clarified that stored image UV and pivot UV both use **top-left** coordinates.
Image-to-local uses position + rotation * [mirrorSign*(u_i-p_u)*width,
(p_v-v_i)*height], then the named surface origin/basis, current owner D4+origin once,
and native-to-render axis conversion once. Pixel Y is frame.y + v_i*height - .5.
A derived local-up UV also requires pivotV_up=1-p_v. Do not assume a zero surface origin,
hide a noncentral-pivot flip or add floor height twice. Original centre-pivot artwork
bytes/pins need no recreation. Efca's superseded sampling vectors are not copied here;
the corrected Core coordinate input is pinned at 43227894c50ec62b71806978195fff2c650eb388.

All ceilings are unmeasured refusal proposals, copied from Core discovery. The shared
64 owned appearance-material ceiling includes existing finishes **plus** compositor
across accepted/candidate/acquiring/unverified-retiring views. Hidden targets, real
decode/upload copies, atlas pages, bins, marks, geometry and resource allocations all
remain charged. No processor/frame-rate/phone claim is made.

Unknown/unsupported source, missing decoder/clip/provider, stale bindings, locks and
budget failures need actionable host diagnostics and preserving refusal. Apparent
craters/flat plants remain graphics. Physical terrain/props, gameplay effects,
world-fixed paint, grades, arbitrary JS and unproved clipping are not acquired by
drawing a mark or appearing in a menu.

## Builder checklist and checks

- [x] Pin corrected Core 43227894c50ec62b71806978195fff2c650eb388 schema/types/discovery and mathematical vectors.
- [ ] After stack main acceptance, bind one actual Editor HostService and its existing
      draft/history/save/input/floor owners; no synthetic button-click agent adapter.
- [ ] Capture full v3 document/Expected and exact immutable pins; exercise both local
      and reusable scope with selected-default capture initially off.
- [ ] Stage actual verified bytes/decoders outside commands; bind explicit frame/pivot/
      sampler/source origin/current D4/floor/clipping and one aggregate allocation ledger.
- [ ] Prove real create/clone/revise → preset → place twice → upgrade one, with explicit
      remaps/anchor decisions and unchanged other copies.
- [ ] Prove source-unchanged metadata, NO_CHANGE/redo, exact whole-document Undo/Redo,
      save/reopen/export/import, failed/unknown writes and same-ID resource recovery.
- [ ] Verify actual returned outcomes/targets, source/build/installed human/agent parity,
      cancellation/focus/input, clipping, budgets and desktop/phone evidence at C1/C2.
- [ ] Stop disposable helpers; keep public registration, pins, Sites and promotion
      Architect-owned.

~~~text
node --test tests/ui-tile-authoring-contract.test.mjs
python -B tools/ui-tile-authoring-c0-validate.py --dependencies artifacts/ui-tile-authoring-c0/schema-validator
~~~

The checks validate canonical schema examples, negative old aliases/versions, pin/resource
hash closure, metadata pointers and scope/outcome semantics. They establish no executor,
decoder, shader, history implementation or device performance. Validation/source receipts
will accompany the fixed C0 checkpoint. No preview or background helper is retained.

For the shared workbench, prefer canonical finite operations plus explicit local/reusable
scope. Accuracy: exact pins/full bindings preserve authored meaning; graphics supply no
physical proof. Efficiency: one service/authority and sparse shared resources avoid
duplicated work by code inspection, with no timing claim. Narrative: local wear gives
reused parts individual histories while immutable presets support reuse; this is a
subjective product preference.

Current contract verification: all nine focused checks, 21 canonical schema examples
and 22 negative alias/version cases pass. Declaration syntax passes. Repository gates
passed: check, all 921 tests with four workers (zero skips/timeouts changed), all 32
upstream tests, and the 519-module build. [Validation](validation.json) records exact
commands/log hashes. This branch retains its original draft baseline; the bounded
worker count avoids duplicate high-load runs while leaving source and assertions intact.
No preview, server or background helper was started. The historical draft is preserved
separately and the accepted stack UI ref remains exact.
