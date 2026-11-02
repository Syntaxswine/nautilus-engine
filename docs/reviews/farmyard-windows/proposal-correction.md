# Pane proposal: required services and scoped impact identity

This narrow correction follows `76f6198d2dae7babce2d211606df94037ea2740b` on the preserved window-contract branch. The [proposal](../../proposals/farmyard-windows.md) and [executable fixture](../../../tests/fixtures/farmyard-windows-contract/proposal.json) now freeze the two review findings before ABI acceptance. This remains proposal/test-only work, with no pane runtime/provider implementation or changes to Root's 0.10 release.

## Requirements correction

`requirementsProposal.required` contains pane behavior plus all six version-1 host services: fixed definitions, complete query composition, trusted confirmed impacts, atomic context/host commit, geometry invalidation and complete save staging. The fixture supplies explicit service IDs, supported version intervals and service-specific binding remedies.

Tests use the existing engine negotiator. A future engine-only manifest containing the proposed schema/behavior still produces six named `UNSUPPORTED_REQUIRED_FEATURE` errors; each names the missing service, required version and requirement path. Removing any service from a complete host or advertising version 2 alone also refuses. Current engine metadata advertises none of these promises. Only an actually bound host can declare them; the engine implementation manifest will register its behavior/schema separately after implementation.

## Identity correction

The packet's ID is derived, never an independently chosen alias:

```text
typedHostId = ["string", hostCommandId] OR ["integer", hostCommandId]
packet.id = JSON.stringify(["window-impact-v1", typedHostId, round, impactIndex])
receipt.id = JSON.stringify(["window-pane-receipt-v1", profileId, sceneId,
  stateId, contentEpoch, contentDigest, typedHostId, round, impactIndex])
```

Host strings and scope strings are bounded ASCII; host integer IDs are safe integers with negative zero rejected. Numeric/string IDs remain distinct. Round and impact indices are zero-based 0–65535. The current source single-path profile uses only impact index zero; syntax-only distinction of other independent impacts does not enable additional Source hits/penetration/pellets/cascades. Derived impact/receipt strings are bounded at 192/768 characters.

Target, member/pane, definition, point/cause/direction, geometry revision and expected revision remain command payload. Exact retries find the original receipt before new-request stale checks and return empty effects. Changed payload under the same key conflicts. An arbitrary new packet alias is invalid. Scope is checked first: other profile/scene/state/epoch/content cannot use archived receipts or act on replacement content with coincident IDs/revisions.

The durable scope includes an opaque saved `contentEpoch` and the exact canonical compiled-content SHA-256, not merely a target definition hash. Restore/reconnect/view residency preserve the scope and complete journal; they never call a fresh constructor to discard old identities. Explicit new content requires a new epoch/reviewed migration and preserves its old state or reviewed archive.

The new test-only identity oracle validates parsed fixture JSON and classifies identities/journal records. It has no pane transition, provider, live write, full public loader or world-hit implementation. Future strict input parsing, deterministic pane replay and whole-save validation remain implementation gates after Root accepts this checkpoint.

## Evidence and stop boundary

The 12 focused tests cover all six service/version omissions and an honestly complete host; canonical tuple encoding, typed IDs and maximum bounds; same impact retry; distinct commands/rounds/impact identities; changed payload and alias; stale revisions/geometry; cross-state/epoch/content refusals; preserved scope/three receipts after JSON save/reload; and malformed/reset/mixed journals. All original source geometry/query/restore probes still pass.

A local immutable comparison against `76f6198…` confirms **all nine** original fixture sections are unchanged: grid, placements, content, catalogue, math probe, query vectors, rotations, joins and source lifecycle. Source IDs, native geometry and original-byte audit remain fixed. Released door/grenade window refusals, public/runtime boundaries, Root metadata/version/exports/CI and private audience are unchanged.

Required gates pass: `npm run check -- --tracked`; **540/540** `npm test`; **32/32** upstream tests; and the existing 0.10 build with **430 module paths** checked. The complete original source-ID/geometry/lifecycle comparison and staged whitespace check also pass. The full correction commit is reported in the coder handoff.

Stop for Root review before runtime/provider or dependent wiring. The original checkpoint and all earlier door checkpoints remain preserved. No server/browser/watcher or retained helper was created; all foreground verification commands completed. Root's 0.10 door release/PR18 is untouched.
