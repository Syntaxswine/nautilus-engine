# Private first-surface target producer

Architect froze the separate data-only contract at 6d30535589ebdae0110199a324b324ecbe7d674f. This private checkpoint implements deriveTileSurfaceTarget only. Import it from this candidate's index.js; it is not registered in normal packages. The frozen proposal remains byte-exact historical evidence under proposals/surface-target.*. Combined Plan3 remains proposal-only; existing capture and accounting profiles, caps, command/query grammar and persisted formats are unchanged.

## Calling the producer

Supply the actual borrowed public tiles module and a complete current WorkbenchDocument@3. Select explicit ownerId/surfaceId and the exact current owner definition Pin. expectedSource comes from the existing snapshot's full hostDocumentDigest/workspaceRevision, captured before staging. For example:

```js
const result = privateCore.deriveTileSurfaceTarget(tiles, {
  document: snapshot.document,
  expectedSource: {
    hostDocumentDigest: snapshot.expected.hostDocumentDigest,
    workspaceRevision: snapshot.expected.workspaceRevision
  },
  selection: { ownerId, surfaceId, definition: currentDefinitionPin }
});
```

The existing public module does not export this function. The private surface-target.d.ts and surface-target.schema.json are the implemented narrow shapes. The function throws typed diagnostic errors on invalid input; it does not manufacture a command/request ID. Its whole result is detached frozen data with committable:false. A live consumer must also prove its complete current snapshot still matches sourceDocumentDigest/workspaceRevision before using the result. A matching serialized digest alone is never commit authority.

The result contains the exact saved semantic Surface, an eight-field bindingSeed WITHOUT layers, the canonical MarkTarget and SourceGridRef. state is prospective when there is no decoration binding, with existingBinding:null. A seed is not a persisted SurfaceBinding: C0 requires explicit layers. For state:existing, existingBinding preserves every existing layer and its array order exactly. No surface/layer/mark is inserted, and no current source object is mutated or frozen in place.

Stage the unchanged canonical surface.layers and decoration.add batch with result.target and explicit layer/mark/chunk IDs; a grid mask can use result.grid. Add content.import explicitly when needed. The actual planner/binder and retained consumer still validate current original Expected, source/resource/context/geometry/visual/history owners and all nineteen bindings. This producer does not acquire resources, run a decoder, construct a mesh, make an operation/ticket, alter history or Apply anything.

## Validation and work

Full validation covers the original portable map/native floor table, resolved public bundle, complete library and exact immutable records/notices/pins, owner content, current decorations and resource closure. All known records must use supported private profiles. The selected owner must be unlocked and bind one supported local, zero-base, four-line rectangle surface to its exact native floor/elevation. Unsupported geometry, profiles, frames, level offsets or grids refuse. No renderer UVs, defaults or moving definitions are inferred. Nondefault VALID saved surface XY origins and authored grids are preserved exactly.

Hash domains are identical to the frozen proposal: definition excludes only contentDigest; recipe content uses the actual public compiled source; geometry is {profile,frame,shape}; frame is the full saved Surface excluding only frameDigest; grid is the full saved Grid; binding is {ownerId,surfaceId,floorId,geometryDigest,frameDigest,gridDigest}. Definition Pin is an explicit seed field but not added to that frozen binding hash. Owner pose is bound by the full source digest and does not enter the source-local binding domain. The legacy floor sourceSha256 separately hashes the exact sourceJSON UTF-8 string.

Only sourceBytes/outputBytes/inputBytes/plannerUnits/nodes/depth can tighten existing 4M/4M/6M/1M/200k/32 limits. Work from the initial strict read is carried into the effective budget; changing limits never resets it. Reported work includes complete validation/hash/source-compilation/output charges. A bounded sixteen-step final metadata reconciliation includes final unitsCharged/outputBytes in the representation it measures. Exact limits pass; one below refuses. The actual source never changes on either path.

Within the same larger authoring attempt, the owning consumer must carry result.work into remaining phase budgets instead of granting a fresh million units. For example, pass plannerUnits = governingPlannerUnits - result.work.unitsCharged to the next planning phase, preserve effective byte/node/depth ceilings, carry aggregate input charges where applicable, and refuse exhausted or stale attempts. An independent read-only snapshot request has its own bounded budget and gives no editing credit. These data-only observations do not attest a Host's work or native allocations.

## Checks and example

Run node tools/tile-authoring-core-c2-surface-target-example.mjs for genuine unpainted/current and existing saved sources. Run node --test tests/tile-authoring-core-c2-surface-target.test.mjs for 27 controls, including independent Node SHA hash domains, explicit source-local frame/grid preservation, whole-source refusals, hostiles and exact/one-below limits. The canonical first-paint test uses the actual existing planner with the producer's remaining work/input budget; it proves pure staging only. The private source audit authenticates source/notice and distribution exclusion; frozen proposal and appearance manifests remain exact.

For map authoring, accuracy means following the complete saved semantic source; this is correctness evidence rather than a physical realism claim. Efficiency is bounded validation and direct data derivation without a mesh readback; deterministic work counts are measured, while processor/native speed remains unmeasured. Narrative preference is that the author's first mark targets the selected semantic surface and survives presentation changes. Actual Editor snapshot/native/visual adoption remains the Architect's separate integration gate.
