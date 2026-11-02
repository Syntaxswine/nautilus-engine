# Editor reconciliation with fixed proposed planner fdd0601

Planner reference: `fdd06015525a3e1df5c46c05b3efce3e92092b7f`, relayed by Architect for API/constraint reconciliation. Editor parent: `a6a472069846be26ceb03bdd905af3497ed749b3`. This supersedes the unresolved digest/clearance notes and `targetConstraintsDigest` naming in the earlier [checkpoint proposal](checkpoint-policy.md). The planner's independent proof correction remains pending. This is not full Gate A acceptance or authorization for protected/live host changes.

## Captured source and tokens

`capturePlannerSource(policy,actualTiles,acceptedDocument,hostContext)` accepts the actual captured `{floorId,mode,floorEpoch,providerToken,cancelled}`. Cancellation must be supplied explicitly; cancelled input refuses. It produces detached frozen data:

```text
{
  sourceDocumentDigest,
  context: {contextToken,cancelled:false,sourceConstraintsDigest,
            floorProfile:{id,version:1,floors:[{id,elevationM}]}},
  expected: {revision,layoutDigest,catalogueDigest,contextToken,
             sourceConstraintsDigest,floorProfileDigest}
}
```

The geometric profile is projected from the exact saved floor table. Labels and legacy-layer/tile-only metadata remain in Editor's full workspace policy/context. The context token binds the complete accepted document, exact profile/table/source/catalogue identity, workspace minimum and actual mode/epoch/provider. It cannot be replaced with a profile ID.

Constraint/profile/request/layout tokens use **the actual public `tiles.tileLayoutToken`**, matching the fixed planner implementation. Complete Editor document digests retain `smartTileDigest`; raw source uses its raw UTF-8 hash. No inference from two same-length strings substitutes for the token ABI. `policy.bindTarget` now names its prospective constraint token `nextConstraintsDigest`; the earlier `targetConstraintsDigest` name is retired from the current proposal. No saved v1 or noninitial v2 file is converted.

For the proposed v2 UI snapshot, use `workspace.sourceDocumentDigest`, `workspace.sourceConstraintsDigest` and `workspace.floorProfileDigest`, superseding the earlier generic `workspace.constraintsDigest` name. `stackPolicy:{minimumClearanceM,managedOwnerCount,managedRelationCount}` remains a read-only projection of accepted source. Next tokens stay in the review/operation binding until one actual acceptance.

## Accepted requirement versus requested clearance

`validateRequestedClearance(acceptedDocument,draft.minimumClearanceM)` preserves the explicit request, requires it to be at least the accepted minimum, and never changes accepted constraints. Copy that value into the finite Coder `intent.minimumClearanceM` field. Both place-stack and edit-owners carry it.

The workspace `constraints.minimumClearanceM` is immutable in this tranche and participates in the policy binding. Per-intent requirements apply to pairs touching changed/new owners. Each stronger existing managed pair remains at least as strong, and unrelated pairs retain their own saved requirement. A global policy change needs another reviewed intent. History cannot accidentally convert a per-intent requirement into a new global minimum.

The witness uses three aligned surfaces on F00/F01/F14: the locked lower pair requires 2 m, while the upper pairs initially require 3 m. A finish-only upper edit requests 4 m. The prospective source keeps the workspace minimum at 2 m and retains crossing IDs with requirements `[2,4,4]`. It is prepared by the **actual public core**. This is a manually specified binding fixture, not execution or endorsement of the proposed functional planner, and not its independent interval oracle.

## Atomic target proposal

`bindPlannerTargetProposal(policy,actualTiles,currentDocument,currentHostContext,capturedFrame,plan,preparedBundle)` rechecks complete source/context against the captured frame, the fixed seven-field planner binding, ordinary repair-request expectations, prospective revision/joins/relations, unchanged global minimum and non-weakened retained managed identities. It returns:

```text
{
  targetDocument: <one complete document with bundle AND next constraints>,
  binding: {sourceDocumentDigest,targetDocumentDigest,
            sourceLayoutDigest,sourceCatalogueDigest,contextToken,
            sourceConstraintsDigest,nextConstraintsDigest,
            floorProfileDigest,requestDigest},
  request: <original ordinary public repair request>,
  committable:false
}
```

This checks plain-data consistency only. It does not plan, prepare again, create a retained handle, write a checkpoint or authenticate the origin of a plain bundle. Gate B must obtain the bundle from its **one actual retained-core preparation**, retain that capability/lease with the complete paired target, and verify it again in the existing final CAS. The shared codec must use one policy-defined target interpretation in validation, adoption, receipt chaining and same-ID recovery. Undo/Redo restores both source components; no sidecar write or separate constraint history is added. Existing v1 recovery controls remain useful but do not prove a fifteen-floor v2 journal.

The usage example in Coder's card calls a host property `stackConstraints`; this Editor schema keeps `document.constraints` and maps it explicitly to planner input `constraints`. It is not a rename or migration of an old save.

## Referenced source identities and boundaries

Public tile IDs and the fixed planner contract permit `/`; the frozen Editor transaction/workspace-ID helper does not. Constraint owner/reservation/relation identities are therefore verified by exact references into the already public-core-validated bundle, rather than incorrectly treating them as workspace IDs. A fixture retains slash-containing names byte-for-byte. Workspace/storage IDs keep their existing stricter rules. Constraint minima below one micrometre refuse, matching the referenced data contract.

The [source/installed proof](reconciliation/proof.json) imports only fixed standalone plain-data contract validators from the exact Git object and records their hash. It never loads or calls the functional planner entry. It needs complete local Git objects for the brief base and planner reference, and performs no automatic moving-ref fetch. The actual public package exports and every openly copied Editor helper are recorded separately. New evidence is written under `reconciliation/`; the original a6a4720 proof/validation files are preserved as historical checkpoints.

Meaningful controls include requested-clearance rejection, preserved unrelated/stronger pairs, global-policy update refusal, actual-core-accepted weakening rejected at the Editor binding, valid opaque source identities, stale full source/floor/mode/epoch/provider/cancellation, each altered binding token and partial-target refusal. The same source and actual-installed Node witnesses must agree. No browser/server is needed for this candidate-only tranche; helper ownership, exact lifetime and install-stage cleanup are recorded.

Builder checklist: Architect reconciles this fixed API with Coder's corrected proof and Artist/UI metadata; then explicitly authorizes the shared codec/session/source-fence adaptation. Feed one planned request into one retained consumer, atomically adopt bundle plus constraints through one history/authority, preserve the old 27 workflow checks, and add actual fifteen-floor persistence/browser proofs. No protected host, export, pin, version or Sites changes are included here.

[Validation and exact helper cleanup](reconciliation/validation.json): all four gates pass, with 933 tests, 32 upstream regressions, 519 built module paths and 21 focused checks. Source/installed results agree through four public exports, 118 installed files and 15 openly copied host helpers. The finite proof process lifetime is absent and its verified installation stage is removed; no browser/server/port is retained. These results do not approve the functional planner or close its independent proof finding.
