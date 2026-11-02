# Editor stacked authoring: Gate B1

Architect explicitly authorized the first headless shared-codec/session tranche after accepting Editor `ce3a1afa02f70a478356de45c64364bb460b9c25` against Coder `45ecaef16bb39424c8b885d53acb4371654b4fa0`. The fixed [baseline inventory](inventory.json) records every candidate source file and all fifteen unchanged historical host files. It is source evidence, not live workflow acceptance. Reproduce that fixed inventory with `node tools/editor-tile-stack-inventory.mjs`.

Custom recipe/library/overlay work was preserved separately at `845f72389743ebc37e02b21183c49d523faf3180`, branch `codex/tile-authoring-editor`. None of those proposed fields enter a v1/v2 document in B1.

## Refactor inventory and boundary

| Path | B1 change | Retained behavior |
| --- | --- | --- |
| `apps/editor/smart-tile/checkpoint.js` | One codec factory contains the existing open/create/stage/settle/receipt/recovery algorithm. Capture immutable format and validation/complete-target hooks. Keep existing v1 exports as facades. | Closed v1 grammar, whole checkpoint tokens, same operation IDs/receipts, no pruning, migration or restamping. |
| `apps/editor/smart-tile/authority.js` | Inject the same bound codec. | One synchronous authority, complete-record CAS, reentry guard, final write lease and original-ID recovery. |
| `apps/editor/smart-tile/storage.js` | Inject codec and explicit key policy; v2 wrapper validates an occupied record before reuse. | One native record, last synchronous `canCommit` fence, old v1 key available, no resets or second save key. |
| `apps/editor/smart-tile/session.js` | Private immutable profile hooks cover context, drafts, planning, paired operations/history targets and snapshot projection. | One retained public consumer/prepared capability, journal, resource coordinator, generation fence, accepted/unknown transaction and observer retirement. |
| `candidates/tile-stack/editor/floors.js` | Bound two-entry exact-string validation cache per real map-core binding. | Literal table, original source bytes, exact floor/profile identities and explicit legacy references. |
| `candidates/tile-stack/editor/policy.js` | Cache only internally validated, detached, deeply frozen outputs per exact map/tiles binding. | New/mutable/shallow-frozen caller inputs still validate. No complete document or constraint weakening. |

`contract.js`, `intents.js`, `input.js`, `presentation.js`, `views.js`, all old panels/styles, old seed/example, the public tile/art/provider modules, floor controller/widget and shared journal stay unchanged in B1. No second input router or view coordinator is added. Source fences, their manifests, build/distribution whitelists, public schemas/exports/versions, CI, upstream/consumer pins and Sites settings remain Root-owned and unchanged.

New `apps/editor/tile-stack/` files are private host policy/wrappers, not registered public package entries. The seven files under `candidates/tile-stack/core/` are exact Git-object bytes from accepted `45ecaef…`; they remain openly private. No peer filesystem or moving worker branch was imported. The ordinary workshop/build does not mount this headless host.

## Typed target and transaction

The explicit v2 operation has closed fields:

```text
{kind,version:2,id,documentId,action,expected:{token,contextToken},request,
 target:{tileBundle,constraints},
 binding:{sourceDocumentDigest,targetDocumentDigest,sourceLayoutDigest,
          sourceCatalogueDigest,contextToken,sourceConstraintsDigest,
          nextConstraintsDigest,floorProfileDigest,requestDigest}}
```

Whole document digests use `smartTileDigest`; the exact layout/catalogue/constraint/profile/request token ABI uses the actual public `tiles.tileLayoutToken`. Original source remains a verbatim string. The complete target interpreter is used by operation validation, pending staging, receipt replay, committed adoption, history restoration and same-ID recovery. A partial pair refuses. The inherited first committed receipt has no duplicated initial document; its explicit operation/target bindings and final document are checked, and later receipts additionally bind their complete preceding source/token, retaining the v1 algorithm's boundary.

For edits, the profile calls accepted `planTileStack(actualTiles,input)` once. The existing session calls its one actual `consumer.prepare(plan.request)` once and retains that exact private capability. The prospective target binds the actual returned bundle to the planner's next constraints. At the real final writer fence, the session rechecks current source/context, ordinary public packet expectations, retained prepared data and the whole paired target. It never calls the plain-data convenience `prepareTileStack`, prepares again, or treats a proposed plain bundle as authority.

Undo/Redo uses the existing history ticket's complete saved document, validates/acquires its exact pair, then commits one history operation. It does not run repair again. The workspace minimum stays immutable; per-edit requirements never replace global policy. Finish clones the selected owner's recipe and retains geometry controls, origin, transform, floor bindings, anchor subset, locked neighbours and stronger/unrelated managed requirements.

Unknown write acknowledgement retains the original operation, pending checkpoint and original history ticket. Edits, Undo/Redo and overwriting save/open stay frozen. Recovery settles that same ID; cold pending/unwritten recovery needs no retained preparation. Positive acknowledgement remains committed through presentation failure; retry rebuilds presentation without repeated prepare/write/history. No gameplay provider is claimed.

## Private usage

```js
const document = createTileStackWorkspace(deps, {
  workspaceId, sourceJSON, profileId: 'nonuniform-fifteen', finishBinding
});
const binding = createTileStackCheckpointCodec(deps, document);
const initialCheckpoint = binding.codec.create(document);
const authority = createTileStackStorage(deps, {
  binding, storage, initialCheckpoint
});
const session = await createTileStackSession(deps, {
  binding, finishCatalogue, authority, floorController, presentation,
  providerToken, retireInput
});
session.setDraft({tool:'stack',ownerId:null,origin:[20,20],widthM:8,depthM:4,
  seed:771,floorIds:binding.domain.floorRecords.map(f=>f.id),
  minimumClearanceM:2,lockPolicy:'all-except-highest',finishId});
const review = await session.review();
if (review.ok) await session.apply(review.reviewId);
```

Import these factories from the explicit private `apps/editor/tile-stack/{seed,checkpoint,session}.js` paths. `deps` borrows actual public map-core/tiles/examples. Supply the one actual floor controller built from `binding.domain.floorRecords`, synchronous input retirement before floor/plane/mode changes and the existing presentation acquisition port. New stack owners deliberately start with empty anchor subsets; saved recipe anchors remain intact. One-floor rectangle source uses the same planner; level paths in the v2 B1 profile return a named unbound-profile refusal and remain available in the unchanged v1 workshop. No UI/Artist API change is needed for this headless tranche.

The B1 tests use a **resource-only presentation stand-in** and a clearly named compatibility finish fixture. Its counts reserve 32 cells and two triangles per 8×4 test owner; they are test allowances, not measurements of native geometry. The two-root/50,000-triangle/1,024-cell coordinator is unchanged. Native mesh/material/provider acquisition and truthful visual readiness require B2. Tests do not certify phone performance, support, solids, navigation, fire or game adoption.

## Gate B2 inventory after B1 acceptance

- Bind corrected fixed UI and Artist commits only after Architect relays acceptance. Current review references are UI `5b0d06ce93977addd438d3ad43f887fcd3278817` and Artist `a536cfec20e609a6c507f000791d8d7e71ae6d18`; the Architect returned focused workspace-identity/material-subtype defects. These are not silently fixed or rebound here.
- Adapt draft construction inside existing `input.js` so v2 rectangle/path intents retain `finishId`, original controls and seed. Retain UI-first contact accounting, second-contact cancellation, all-up/fresh-primary recovery, held-contact quarantine, keyboard guards and pointer-down ownership. No parallel router.
- Adapt the one existing `presentation.js` acquisition, composing actual public geometry with accepted Artist leases. Preserve native cells/selection, exact source profiles, boundaries/UV and all aggregate accounting. Retire appearance before geometry while exhausting cleanup failures and preserving borrowed resources.
- Map Editor `selected-floor` to Artist `selected`; use declared `cutawayFloorId` and exact native elevations. All hidden/acquiring/retiring geometry remains charged. Inspection does not mutate the checkpoint or imply a thick/supporting floor. No study fixture or second geometry acquisition should replace the live provider.
- Bind the immutable catalogue ID/version/digest, one active version per stable ID, actual borrowed atlas/base materials and exact geometry-context availability. Preserve the known public rotated-line `INVALID_NUMBER /startRad` refusals pending a separate approved provider correction; do not normalize saved controls or remove guards.
- Root chooses the isolated host/build closure, adapts strict provenance to the fixed accepted B1 diff, then owns registration and CI. Preserve the old 27 source/built/actual-installed workflow cases and add real fifteen-floor/nonuniform/finish/recovery/browser cases. The current UI's intended adapter/finish APIs remain the target; no unreviewed peer fix is consumed.

## Assessment

Accuracy: prefer full native tables and atomic bundle-plus-constraints persistence; flat painted geometry still represents a thin surface. Efficiency: one codec/coordinator and bounded exact-source/owned-snapshot caching avoid duplicate authority and repeated validation of identical immutable source by code inspection; there is no measured native/device performance claim. Narrative: tall authoring with selectable finishes is the preferred building workflow, while the existing tactical workshop remains available. This is provisional headless implementation pending Architect review and native B2 acceptance.

Validation, exact local commit delivery status and the unchanged-fence failure scope are recorded alongside this card. A local B1 candidate with expected hash-fence failures is not pushed; Root must review its fixed Git objects and update strict provenance before combined delivery.

Current [validation](validation.json): all eleven headless B1 cases pass; the full test run has 943 passed and one expected source-fence failure. `npm run check` fails at the same unchanged Root-owned authority-file record (current 3,349 bytes versus recorded 3,054). The complete [scope audit](scope.json) identifies all four authorized host differences, eleven unchanged historical host files, 131 unchanged public runtime files, ten unchanged UI files and eleven unchanged fence/registration files. The 32 upstream tests and 519-module build pass. The [focused cases](headless-cases.txt) and [exact failure excerpts](expected-source-fence.txt) keep this result distinct from a green delivery claim. The two collector tools read and record these results; they do not replace checks, rewrite fences or permit a push.
