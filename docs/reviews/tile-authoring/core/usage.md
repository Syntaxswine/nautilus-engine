# Builder card: custom tile/decoration contract

**Status:** private contract/design proposal. No authoring runtime, public entry or CLI is implemented. C0 parent is `7772910059d86c00c84475af489be812ff225c5d`; blueprint is `b850e20e2fdd85435d33f16327482b80380af728`; approved stack candidate `45ecaef16bb39424c8b885d53acb4371654b4fa0` remains separate. Discovery explicitly reports executorImplemented:false/publicRegistration:false. contract.md contains normative semantics; schemas/types are in candidates/tile-authoring/core/.

**Purpose:** the same finite commands for a human workbench and authorized headless agents; immutable reusable definitions/presets and per-owner local graphic source. Pure JSON contracts load with no DOM/storage/renderer/clock. Definitions borrow the actual closed public v1 grammar. Images/decoding/provider/host authority are external bindings. Flat crater/plant graphics do not grant physical/gameplay behavior.

**Examples:** document-v3.json is the full saved authority; workspace-source.json is its detached read-only view. paint-command.json and content-pack-manifest.json use the direct 777 command/pack definitions; transitive Artwork intentionally gains required imageView. unimplemented-response.json is the C0 full-target refusal stub. artist-import-mapping.json explicitly maps30 fixed Artist frames to Core pins; sampling-contract-vectors.json records mathematical frame/alpha/layer oracles. The fixture has31 artwork records sharing3 blobs. One graphic targets owner.a; owner.b stays clean. Original map/floor/finish/constraints and notices are retained. Example authority/context tokens are synthetic/unbound; no example is an applicable retained review or evidence of runtime readiness.

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
2. Capture the full v3 document and checkpoint/journal/context tokens. Retain the complete six B1 fields and one AuthoringModule. Source projection and contentRevision alone never authorize a write; exact Undo/Redo can restore an older revision.
3. Treat stored image UV/pivot as top-left (u right,v down), mark position as surface-local metres (u right,v up), and include the explicit Surface origin/basis before owner D4/origin and the native/render swap. Check noncentral pivots and all D4 vectors. Construct one finite ordered batch with exact immutable pins, fresh explicit IDs and complete default/group/anchor remaps. A selected geometry upgrade is explicit; another placement's source stays pinned.
4. Stage verified PNG bytes/decoder leases outside finite commands. Resolve typed resourceRefs against immutable library artwork; verify explicit page/frame/sampler and all shared budget charges, including existing finish materials. Optional WebP is unbound without an actual proven decoder. Prepare once through the shared host service. It stages all source/dependency/resource changes and issues a host-owned one-use review only when every required binding and budget is satisfied.
5. An ordinary nonempty command increments contentRevision once; NO_CHANGE writes nothing and preserves redo. Metadata edits keep tileBundle/layout revision exact and skip geometry preparation. Apply the complete targetDocument through the existing checkpoint/history/CAS/receipt policy. Unknown acknowledgements freeze mutation and retain potentially adopted assets until same-ID reconciliation. Retry presentation after an acknowledged commit, never replay game effects.
6. Export/import complete manifest+blob bytes with notices and hashes. Missing resources or unsupported required profiles refuse before adoption; read-only retained data must be labelled unsupported.
7. Prove actual human/agent target parity, returned outcomes/targets/constraints/resources, anchors under D4/LOD/floor changes, holes/seams, locks, batch Undo/Redo, uncertainty, cancellation and budget boundaries AFTER runtime/provider implementation. Current structural/reference examples do not prove that workflow.

Current proof commands:

```powershell
python -B tools/tile-authoring-core-schemas.py
node tools/tile-authoring-core-measure.mjs
python -B tools/tile-authoring-core-verify.py --dependencies artifacts/schema-validator
node --test tests/tile-authoring-core-contract.test.mjs tests/tile-authoring-core-c0.test.mjs
node tools/tile-authoring-core-audit.mjs
```

The verifier reuses isolated jsonschema4.23.0 and standard ZIP reading. It validates real encoded resource bytes and hash closure, not image decoding or a shader. No new dependency is added to normal packages. Generated proof ZIP/blobs are ignored artifacts; none of the three bitmaps is duplicated in this role source. Helpers are foreground-only, with no retained service/browser.

Immutable metadata evidence in candidates/tile-authoring/core/inputs/ is copied byte-for-byte from the named Git commits and verified by raw SHA. Standard Node tests use these copies, including the original777 schema, so shallow CI needs no worker branch fetch. Actual three-blob archive verification reads PNG bytes from the fixed Artist Git objects; no bitmap is duplicated in this role source. These evidence inputs are not a second runtime artwork authority.
