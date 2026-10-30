# Door connection ownership, lifecycle and source-write correction

This focused follow-up is based directly on `48a0192777a8a5ade0448b313123418398ce044a`. Root should cherry-pick only the correction commit onto its composed candidate. It imports no Root version/export/package/CI changes and preserves all original source pins and native profiles. The full correction SHA is delivered in the coder chat and configured remote.

## Confirmed defects and resulting behavior

The old connection passed the same `hostNext` graph to CAS and its caller, and returned a live read loan on CAS refusal. A caller could therefore change authoritative HP through a returned success/refusal. Reads, geometry inputs/outputs, returned results and staged loads are now detached; CAS receives separate owned state/host copies. The host can install its exact candidate objects without exposing them through the return value. Nested mutation regressions compare retained host tokens, complete saves and sidecar serialization for success, refusal, retry, adoption and unknown outcomes.

The connection now rejects nested preview/action/adoption/save calls throughout read, geometry, CAS and publication with `REENTRANT_OPERATION`. Disposal remains immediate and idempotent. Precommit read/query disposal prevents CAS. CAS receives a temporary `candidate.canCommit()` predicate: **check it last, immediately before the atomic write**, after state/context/host token comparisons. It refuses disposal and expires as soon as CAS returns or throws; it cannot revive during another operation. The installed builder example implements this last check. No save/schema/export version changes are required.

A positive acknowledgement remains `committed:true` even when a view throws or the connection is disposed. Disposal stops remaining publications. Each publication also checks fresh detached authority; independent intervening changes stop stale output (`publicationStopped:'stale'`), and an unreadable store stops it as `'unavailable'`. Thus a nested or independent Close cannot be followed by stale outer Open fog/collider/presentation. The formatter reads only an own data message or a bounded primitive string and has a total fallback: null-prototype objects, throwing message getters, coercion hooks and descriptor traps cannot escape after commit.

A thrown or non-boolean CAS acknowledgement may follow an actual write. It returns `COMMIT_OUTCOME_UNKNOWN`, `committed:null`, no consequences/presentation, and `recovery:{command,receiptId}` preserving the original typed request captured **before** borrowed services. It neither claims rollback nor invents a new ID. Read authoritative persistence and retry the original command. Already recorded attempts recover quietly, including after retained movement, injury/AP adoption, intervening close and reload. Before-write failures can retry the same request and spend once. The component never rewrites an unresolved command to a fresh identity.

Source `refresh` also has write semantics beyond value differences. An omitted visible guard's `alertAge` previously projected as zero, so normalized comparison could suppress the required raw assignment and later `endTurn` produced NaN. Accepted actions now always write first-squad hero `isMoving=false` and the final AP result. Every living guard that actually sees the hero receives source-exact `alert=true`, fresh `{x,y}` last-known data and `alertAge=0` even when normalized values match. A shared private source sight predicate identifies those guards. Raw omitted fields on unseen/unrelated actors remain absent during action/load/adoption. Omitted moving/alert flags use false only in the calculation projection. Original-game whole-host comparison and subsequent `endTurn` prove the visible counter becomes 1 without normalization of unrelated actors or resource refill on load/adoption.

## Validation and delivery boundary

| Check | Result |
| --- | --- |
| `npm run check -- --tracked` | Pass; production whitelist, original source bytes, headless closures and original assets unchanged. |
| `npm test` | **430/430 pass**, including all **26** door conformance/connection tests and existing native tests. |
| `npm run test:upstream` | **32/32 pass**. |
| `npm run build` | Pass; 410 module paths checked on the preserved 0.8 foundation lineage. |
| Candidate installed package proof | Pass; public guide includes final CAS fence, actual retained source movement/save/retry behavior and nested successful-result mutation against installed authority/save. |
| Source legacy regression | Actual immutable `performInteraction` and `endTurn` match whole-host bytes/field presence; visible missing age becomes 0 then 1, and unrelated omitted fields survive load/adoption. |
| Callback matrix | Accepted/refused/repeated/adopted ownership; hostile thrown values in all four publications; read/query/CAS/postcommit disposal; expired fences; same-connection reentry; independent stale authority; unreadable authority; exceptions/invalid acknowledgements before/after write; original-ID recovery with intervening actions. |
| Cleanup | All verification commands completed; disposable package stage and installed consumer were removed in `finally`. No local server, watcher, browser or retained helper was started. |

The final disposable installed overlay has 204 files, 1,313,666 compressed bytes / 6,610,093 unpacked bytes and integrity `sha512-97WmtnWgoLqg89dDpsWMozoX9xAberIV7oPadEbxGxa+6Z5p8GUkcLwHTOjXHnwnH4cI7L/18JZYohTvrlH1Mw==`. This is the coder's preserved-foundation proof; Root owns the actual composed 0.10 export/registration/package provenance, installed `test:doors` and browser checks. The correction changes no donor bytes, game pins, private audience or native interaction policy.

Keep the updated public guide when composing: the `canCommit()` final check, `committed:null` recovery handling, detached result ownership and no reentry during borrowed callbacks are part of the connection contract. Runtime publication errors are observations after a known action, never instructions to award that action again. Schema/manifest composition remains Root-owned.
