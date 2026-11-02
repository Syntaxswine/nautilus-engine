# Gate A checkpoint policy and planner reconciliation

Historical proposal at `a6a472069846be26ceb03bdd905af3497ed749b3`. The [fdd0601 reconciliation](planner-reconciliation.md) supplies the current token names, immutable workspace minimum, requested-clearance mapping and captured-source binding. Its current evidence supersedes the validation counts below; the prior Git checkpoint remains preserved.

This follows the first fixed Editor proposal `cfd5a3226a687b9b166e240666a34c75ef3e7972` and the Architect-relayed Coder contract `a2eaa70a616e7bd17336435422db5602dfb2e38d`. The first [API card](api.md) and [source record](contract-source.json) remain historical and unchanged. This document replaces its incomplete v2 document/operation proposal with the atomic constraint interpretation below. Coder's first checkpoint is types/data validation, not an accepted functional planner. No peer implementation is imported here.

## Complete source and atomic target

```text
document v2 = {id,sourceJSON,floorBinding,finishBinding,tileBundle,constraints}
constraints = {
  kind:"nautilus-stack-constraints",version:1,floorProfileId,
  minimumClearanceM,
  owners:[{instanceId,primaryReservationId}],
  managedRelations:[{id,kind:"cross",a,b,clearanceM}]
}

operation v2 = {
  kind:"nautilus-smart-tile-editor-operation",version:2,
  id,documentId,action:"edit"|"undo"|"redo",
  expected:{token,contextToken},
  request:<original public repair request or exact history-restore request>,
  target:{tileBundle,constraints},
  binding:{sourceDocumentDigest,sourceConstraintsDigest,
           targetDocumentDigest,targetConstraintsDigest,requestDigest}
}
```

The v2 paired `target` is closed and requires both fields. `policy.targetDocument(before,target)` assembles and validates one **complete** target document, preserving immutable source, floor/catalogue binding and document/layout identity. `policy.bindTarget` exposes explicitly named old/next document and constraint digests. It returns data only, never a prepared/committable handle. This avoids copying the large immutable map into every operation while retaining a full-document target digest. There is no independent constraint write or acceptance callback.

For the reconciled v2 UI snapshot, add read-only `workspace.sourceDocumentDigest` and `workspace.constraintsDigest`, plus `stackPolicy:{minimumClearanceM,managedOwnerCount,managedRelationCount}` projected from accepted constraints. Draft clearance remains a separate proposed value. UI may show the accepted requirement and counts; it cannot construct or edit the underlying constraints. These additions supersede the provisional v2 snapshot in the first card; frozen v1 remains unchanged.

The existing shared codec must use the policy's complete target interpretation in **all** operation validation, committed adoption, receipt-chain validation and recovery expectations. The v1 policy continues its exact `targetBundle` interpretation. V2 uses the required bundle/constraint pair. Refused operations keep the complete old document. `beforeToken` binds the complete checkpoint including accepted constraints and journal; `afterDocumentDigest` binds the complete accepted document; operation digest binds the original request, pair and named bindings. A missing, altered, partial or foreign pair must not be committable.

The one serialized history records complete document text, so one accepted stack advances one entry containing both bundle and constraints. Undo/Redo restores both from the exact saved target document digest; it must not independently regenerate constraints, re-plan a reverse edit or lower requirements as a convenience. Immutable workspace/profile/catalogue fields cannot change through history. Unknown acknowledgement keeps the exact original operation/pair and history ticket; recovery reconciles only that request ID. A committed receipt adopts both once, even if the preview then fails; retry changes presentation only. No old v1 receipt is converted or restamped.

## Current policy implementation and limits

`policy.js` validates the full original three-layer JSON, two explicit fifteen-floor profiles, canonical public v1 bundle/table equality, fixed finish binding and typed constraint references. Managed crosses must exactly match actual saved relation records, reference named managed owners and retain at least the saved minimum. These are referential/source checks, **not** complete old/new geometric obligation evaluation. Coder's final accepted planner/constraint validator must supply that proof; Editor does not add a resolver.

The workspace policy token binds document/layout identity, raw source-byte hash, full floor table/profile/legacy-reference metadata and catalogue identity. `contextToken(context,acceptedDocument)` additionally binds the **current complete accepted document** and its constraints digest, actual selected floor/mode/epoch and presenter/pool identity. It is recalculated after Apply/Undo/Redo; a copied profile ID or the initial document is insufficient. Supplying no second argument is only a convenience for the initial proposal fixture, not permission for a live host to ignore its accepted source.

Editor document/constraint digests use the existing `smartTileDigest`: SHA-256 over bounded JSON with canonical object-key ordering. `sourceSha256` binds raw UTF-8 source text instead. Final planner digest interoperability must use the fixed Coder token contract when relayed; two 64-character strings are not evidence of the same digest interpretation.

The Coder geometric profile is projected from the exact saved table as `{id:floorBinding.profile.id,version:1,floors:[{id,elevationM}]}`. Labels and typed legacy references stay with Editor. No index supplies height, and neither table nor profile is edited during a session/write.

Draft `minimumClearanceM` is the **proposed requested** requirement. Accepted `document.constraints` stays unchanged during editing/review/preparation. Do not rewrite it before planning to make the draft appear accepted. The first Coder `StackIntent` lacks an explicit proposed-clearance field, and `binding.constraintsDigest` source-versus-target naming is being clarified by Architect/Coder. This candidate uses unambiguous `sourceConstraintsDigest`/`targetConstraintsDigest` but does not guess a live mapping to that provisional field. Existing stronger crossings and complete required-clearance source must survive the final planner; schema reconciliation is a Gate B prerequisite.

`createInitialCheckpointProposal`/`openInitialCheckpointProposal` support only empty new-workspace proposals with journal v2 serial 0, no receipts and no pending operation. Noninitial v2 records explicitly refuse with `STACK_SHARED_CODEC_REQUIRED`, retaining their bytes. V1/unknown versions refuse. `planNewWorkspaceStorage` requires an actual `null` absence observation; existing, empty-string or uninspected namespaces refuse. It performs no storage write. The old workshop/key stays available. This is not completed v2 checkpoint recovery or a saved fifteen-deck workflow.

## Finish menu reconciliation

The provisional decision is one active version per stable finish ID in a catalogue. Workspace `finishBinding:{id,version,digest}` is immutable and captured in context. `validateFinishMenuProjection` rejects duplicate ID rows even when their versions differ. Rows display the active version, friendly label and explicit unavailable reason. `draft.finishId` is therefore unambiguous; future multiple-version selection needs another explicit contract.

This validator checks the UI projection only. It cannot certify that an annotated digest matches resources or that a finish supports geometry. The actual catalogue/resource mapping must be supplied by the fixed Artist metadata and verified before an entry is available. The candidate fixture declares compatibility IDs only; the proof's brick row is honestly unavailable. Artist's forthcoming metadata still needs to be compared with this decision through Architect.

## Focused shared-policy seam required at Gate B

1. Extract the existing checkpoint algorithm into one codec factory. Policy hooks cover format discriminators, document validation, action-specific request/binding validation and complete target-document interpretation. Use the same interpretation in validation **and** adoption/recovery, not only when serializing.
2. Parameterize existing authority/storage by that codec. Keep the final synchronous writer fence, entire-record comparison, same-ID recovery and positive-ack semantics unchanged. No second CAS/history/recovery engine is introduced.
3. Parameterize the one existing session's codec, draft/planner mapping, context and snapshot projection. Capture the fixed planner's next constraints together with its request and actual retained-core prepared handle. Verify source document/constraint tokens, request digest, public expected source/layout/catalogue/context and prospective target bundle/pair before the final CAS. Never accept a plain proof-only `prepareTileStack` result as a retained handle or invoke a second prepare to simulate authority.
4. Add stack draft gesture construction through a policy hook in the existing input owner. Preserve pointer-down ownership, UI-first accounting, held-contact quarantine, all-up/fresh-primary and capture-loss behavior. Add no second input router. Existing floor controller/widget and retirement-before-plane/mode behavior remain.
5. Bind the accepted Artist catalogue and v2 UI once, with actual native-height inspection. Visibility cannot remove hidden cells from budgets; flat skin/thickness metadata is not extrusion/support. Keep all old 27 workflow checks and add the fifteen-floor/105-crossing/nonuniform/finish/unknown-ack cases using actual components.

Likely focused protected-file adaptations are codec extraction/imports in `checkpoint.js`, `authority.js`, `storage.js`, `session.js`; draft/context/action/input policy hooks in `intents.js`, `contract.js`, `input.js`; and the isolated host entry's component binding. Architect decides exact locations, source-fence changes, build closure and CI at Gate B. Candidate code changes none of those files or their fences.

## Evidence and builder card

Run `node --test tests/tile-stack-editor-*.test.mjs` and `node tools/tile-stack-editor-proof.mjs`. The [Node proof](proof.json) compares source with a real offline-installed core package through four declared exports, checks installed provenance/bytes and openly lists copied candidate/frozen Editor helpers. It does not overlay a fake public core or claim public registration. There is no renderer/browser proof at this gate.

Recovery fixtures instantiate the unchanged real v1 authority/session/history and real floor controller, with a clearly labelled resource-only presentation stand-in. They cover original-ID lost-commit acknowledgement, cold unwritten pending recovery and committed-state presentation retry without repeated writes/history. They deliberately do not claim fifteen-floor v2 recovery. Tests also cover raw-source/table/identity drift, malformed bindings, partial target refusal, old/next digests, context changes, namespace protection, version rejection, duplicate finish IDs and browser/storage/clock/RNG-free validation.

Helper/restart records are [proof-helper.json](proof-helper.json) and [proof-cleanup.json](proof-cleanup.json); the proof uses a finite Node CLI and bounded synchronous npm child, removes only its verified install stage in `finally`, and retains no browser/server/port. Final validation records also verify the exact process lifetime is absent after exit. All four repository gates remain required before this fixed follow-up is delivered.

[Delivery validation](validation.json): all four gates pass, including 928 engine tests, 32 upstream regressions and 519 built module paths. Sixteen focused candidate checks pass. Source/installed results agree across four public bindings and 118 installed files, with all 14 copied host helpers explicitly listed. Protected runtime/host/fence changes are zero; exact proof-process lifetime is absent and its install stage is removed. This remains a Gate A proposal, not Gate B workflow acceptance.

Accuracy: complete source and native table identity are preferred; only the public planner/core can prove geometric obligations. Efficiency: one paired target avoids repeated immutable map copies and preserves one coordinator; this is a code-based assessment, not timing evidence. Narrative: friendly stable finish choices and fifteen-floor inspection are the preferred authoring experience, with physical/game services explicitly unbound.
