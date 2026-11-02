# Builder card: custom tile/decoration contract

**Status:** private contract/design proposal. No authoring runtime, public entry or CLI is implemented. Baseline/blueprint is `b850e20e2fdd85435d33f16327482b80380af728`; approved stack candidate `45ecaef16bb39424c8b885d53acb4371654b4fa0` remains separate. Discovery explicitly reports executorImplemented:false/publicRegistration:false. contract.md contains normative semantics; schemas/types are in candidates/tile-authoring/core/.

**Purpose:** the same finite commands for a human workbench and authorized headless agents; immutable reusable definitions/presets and per-owner local graphic source. Pure JSON contracts load with no DOM/storage/renderer/clock. Definitions borrow the actual closed public v1 grammar. Images/decoding/provider/host authority are external bindings. Flat crater/plant graphics do not grant physical/gameplay behavior.

**Examples:** examples/workspace-source.json, paint-command.json, content-pack-manifest.json and unimplemented-response.json. The fixture puts a graphic only on owner.a; owner.b remains clean. It contains explicit exact pins, original map JSON and profiles. The atlas is existing repository data under its full NOTICE. Example authority tokens are labelled synthetic/unbound and cannot be applied to a real workspace. No sample claims reviewable runtime output.

Proposed JSONL sequence (entry NOT implemented):

```json
{"action":"describe"}
{"action":"snapshot"}
{"action":"prepare","command":"<the actual typed command object with current host Expected bindings>"}
{"action":"apply","request":{"requestId":"<same original ID>","reviewToken":"<same live host connection token>","expectedTargetDigest":"<prepared complete target>"}}
```

The quoted placeholders explain sequencing; actual transport messages must validate against the schema and contain objects/digests. UI and agent send the identical Command object. An exported request is portable data, never a serialized retained handle. The future service is HostService in api.d.ts; its implementation/registration awaits Architect's interface freeze.

Builder checklist:

1. Load fixed private contract and actual public-v1 source validator; check required source/surface/decoder/provider profiles without assuming that schema validity makes them implemented.
2. Capture the authoritative complete source/profile/finish/constraints/resource/ledger context; keep original map JSON and old referenced versions.
3. Construct one finite ordered batch with exact immutable pins, fresh explicit IDs and complete default/group/anchor remaps. A selected geometry upgrade is explicit; another placement's source stays pinned.
4. Prepare once through the shared host service. It stages all source/dependency/resource changes and issues a host-owned one-use review only when every required binding and budget is satisfied.
5. Apply the complete target through the existing checkpoint/history/CAS/receipt policy. Unknown acknowledgements freeze mutation and retain potentially adopted assets until same-ID reconciliation. Retry presentation after an acknowledged commit, never replay game effects.
6. Export/import complete manifest+blob bytes with notices and hashes. Missing resources or unsupported required profiles refuse before adoption; read-only retained data must be labelled unsupported.
7. Prove actual human/agent target parity, returned outcomes/targets/constraints/resources, anchors under D4/LOD/floor changes, holes/seams, locks, batch Undo/Redo, uncertainty, cancellation and budget boundaries AFTER runtime/provider implementation. Current structural/reference examples do not prove that workflow.

Current proof commands:

```powershell
python -B tools/tile-authoring-core-schemas.py
node tools/tile-authoring-core-measure.mjs
python -B tools/tile-authoring-core-verify.py --dependencies artifacts/schema-validator
node --test tests/tile-authoring-core-contract.test.mjs
```

The verifier reuses isolated jsonschema4.23.0 and standard ZIP reading. It validates real encoded resource bytes and hash closure, not image decoding or a shader. No new dependency is added to normal packages. Generated proof ZIP/blobs are ignored artifacts; the existing bitmap is not duplicated in source. Helpers are foreground-only, with no retained service/browser.
