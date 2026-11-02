# Confirmed-impact checkpoint

Base: accepted `38db463ac44acb5d9a93d3d94a7532123d0c121c`. Branch:
`codex/farmyard-window-impacts`; no reset, force push, moving donor head or other
worktree edit. The later Rung1 maintenance work remains separate.

The [builder guide](../../adapters/farmyard-window-impacts.md) documents the
implemented authority, immutable native geometry, typed/epoch-scoped receipt
identity, complete journal replay and retained transaction/save boundaries.
Fresh impacts require a trusted confirmation, exact native hit and complete
host/query/world-context tokens. The complete CAS compares all retained source
data and the current external geometry/actor context, with a final active write
fence. Before/after/unknown acknowledgements, detached loans/results, reentry,
retirement and postcommit publication ownership are covered by focused tests.

Automatic approval review initially rejected integration-owned root registration
as outside the bounded checkpoint's explicit authorization. After the human user
asked Coder to obtain Architect approval, **Architect, Nautilus Engine** reviewed
the [exact request](impact-registration-request.json) at implementation
`cc23bea012abaca8bd552b0cece59fee45e8c5ef` and explicitly approved scoped branch
preparation on 2026-10-30. The two exports, three v1 schema IDs/documents, one
engine-only capability and exact runtime/support whitelist are now applied.
All six host-service promises remain absent from `ENGINE_MANIFEST`; engine-only
negotiation reports each missing service. Matching registration assertions and
installed-package evidence were updated. This decision authorizes branch
delivery for subsequent Architect review, not acceptance of the entire impact
implementation, merging, release or game adoption.

The verified registration is preserved in separate commit
`c46d03f859b69ad5ba5307887551dd4328fab102`. Subsequent Architect review reproduced
a persistence defect in `cc23bea`: a marked encoded fog Set containing duplicate
entries could be silently deduplicated during open. The focused correction now
checks exact native element semantics and uniqueness before reconstruction,
standalone serialization and live restore. Source `key` supplies canonical
integer coordinate strings for `seen`/`visible`; `detected` retains typed actor
IDs, including distinct numeric/string identities. Unmarked arrays retain their
ordinary duplicate/order/value behavior, even beside native Sets. The host schema
adds conditional marked-field constraints; the geometry and pane-state schemas
are byte-unchanged and remain compatible through their existing v1 references.
All three schemas are independently validated together. Three regressions first
failed against the pre-fix loader, then passed; restore refusals assert zero CAS
attempts, writes and publication even with a permissive outer save validator.

Evidence uses fixed Farmyard `251bf8094b5f9ebe44208443084c1a6d6658512a` and the
unchanged original source audit. No renderer, Editor/UI, guard policy, weapon-cost
implementation, production consumer pin or other game adoption is added. The
fixture's successful-host ledger and one-AP/one-round debit are explicit host
test behavior, not invented engine combat rules. Source masks/sequence/revision,
complete-world hits, preserved injured/spent/unknown source, set types and quiet
recovery after later actions and reload have executable conformance proof.

Validation on 2026-10-30:

- `npm run check`: passed; 603 pinned source files and the existing
  headless, original-building, package whitelist and source checks remain valid.
- `npm test`: **611 passed**, including 23 impact/host tests and 17 native
  geometry tests. Released door/grenade window refusals remain unchanged.
- `npm run test:upstream`: **32 passed**.
- `npm run build`: passed, **445 module paths** checked and own/adapted scripts
  syntax-checked.
- **Actual declared installed core package**: passed using
  `node tools/test-farmyard-window-impacts-package.mjs` without `--candidate`,
  with `declared: true`. The proof imports both declared entries, opens all three
  schema URLs from the installed package, checks their exact URIs/manifest v1
  entries, confirms all seven support files and verifies that the engine still
  advertises none of the six host promises. **43 hash-verified original source
  files** remain outside the package. Two durable impacts, lost acknowledgement,
  later rounds, injured/spent/unknown retained data and quiet reload recovery are
  verified through the installed entries and all six bound services. The earlier
  implementation-only overlay proof remains historical evidence; it is not the
  declared registration proof.
- Independent Draft 2020-12 validation: **3 schemas / 27 cases passed**, including
  conditional uniqueness/native element types for marked fields and ordinary
  retained-array semantics when unmarked. Complete
  deterministic replay, capacity, mutation, context and live authority are
  separately verified by the JavaScript tests.
- Fixed Git-object audit: passed unchanged, 23 source and four Editor evidence
  files; the source-native headless closure remains 3 modules / 16,515 bytes.
  Registered runtime is 14 pure engine modules / **93,811 bytes**, including reused
  hash/identity and negotiation modules. These are raw byte measurements, not CPU
  or FPS benchmarks.
- Exact comparison with `cc23bea012abaca8bd552b0cece59fee45e8c5ef` preserves all prior
  declarations and adds only the approved two exports, three schemas, one engine
  capability and **17 whitelist files**. All **52 focused window tests** passed,
  including the five persistence regressions.
- Whitespace checks passed. Engine version, CI, upstream/consumer pins, donor
  bytes, released door/grenade refusals and other worktrees are unchanged.

Gate logs are local ignored artifacts at
`artifacts/farmyard-windows/fog-set-{check,tests,upstream,build}.log`; the separate
registration logs remain as historical evidence for `c46d03f`.
`artifacts/farmyard-windows/installed-impact-report.json` records `declared: true`,
actual installed entries/schema URLs/support files, conformance and archive hash.
The core archive is `artifacts/distribution/nautilus-engine-core-0.10.0.tgz`;
final verified SHA-256:
`2ef006b8952586ce7ed0436afd1c9401b84a96ae7e4256f5106ddb8e9df5930d`.
This branch package is not a new release or consumer pin. The source-closure
reporter's pre-registration status strings are historical wording; actual
declared availability is determined by the default package gate and installed
assertions, and integration acceptance still belongs to Architect.

No helper is retained. Offline stage, copied source fixtures and consumer were
removed in `finally`; all other commands completed as foreground checks without
ports. The full fixed implementation commit is reported in the delivery reply.
