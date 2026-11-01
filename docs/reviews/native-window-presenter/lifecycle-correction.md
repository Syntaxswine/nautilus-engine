# Focused native window lifecycle correction

This follow-up preserves original candidate
`9fe6fc989a147a2a2c578727ebebfec5ef1e8b58` and accepted tile provider
`e9846df52c67c790fc1792f380a0370463aa8650`. No public registration, new art,
shatter/audio, gameplay authority, donor pin or other branch is changed.

The exact original source reproduces all three required counterexamples:
throwing candidate `added` leaves two roots attached; disposal requested by
`added` still returns activation success; throwing owned geometry `dispose`
prevents the rest of retirement and makes its early flag strand resources.
Actual pinned Three r180 changes attachment links before dispatch and does not
contain a throwing event listener. The red proof is deliberately expected to
fail; it uses exact committed provider modules with the actual public core and
actual pinned Three, not a fake core or substituted event dispatcher.

## Final behavior

- Ordinary mutating lifecycle calls reject synchronous reentry. Pending-stage
  abort and presenter disposal latch monotonic cancellation, drained by the
  owning operation before it returns. Three existing records bound cancellation
  settlement; callback errors retain at most 64 values plus a full failure count.
- A candidate attaches hidden. Attachment/detachment callbacks and current host
  fences must pass before replacing the accepted view. Rejection restores the
  still-owned old root unless whole-presenter disposal was explicitly requested.
- Every created owned node and geometry is tracked immediately, including a
  partially built instance. Retirement unpublishes records and transfers complete
  resource snapshots before invoking any listener. All native removals/disposals
  are attempted, even when an earlier listener throws or requests other cleanup.
- Final structural repair clears retiring owned parent/child links without
  refiring callbacks that could reparent them indefinitely. It never disposes
  borrowed materials/textures, borrowed scene siblings or unrelated geometry.
- Geometry notification failure after replacement commit is reported after
  consistent cleanup. The old resources have intentionally retired and are not
  resurrected. A newly stale or disposed replacement cannot return true.
- Native Three dispatch ordering remains authoritative, including its stopping
  later listeners on a single event after a throw. This provider does not patch
  Three prototypes, replace dispatch or replay disposal signals. Tests temporarily
  attach ordinary prototype listeners only to reach actual acquisition events,
  restoring them in finally.

## Evidence

`lifecycle-before.json` records the exact original source failing all 18 bounded
cases. `lifecycle-fixed.json` records the current runtime hashes and passing
results. The same cases run inside the actual installed public core/renderer
plus separately installed private presenter. Coverage includes the three required
counterexamples; abort/remove/dispose throw/reentry; actual acquisition rollback;
publication changes in added/removed/dispose callbacks; pending cancellation;
restoration before commit; notification failure after commit; neighbour/pool
survival; reverse cancellation chains; reparenting; bounded error aggregation and
idempotent final retirement. No new public projection API or authority is added.

The final four gates, installed proof, unchanged native geometry/mask parity,
source/built/installed desktop/phone captures and helper receipts are in
`acceptance.json`. All ten final image hashes must also match the original
candidate's images. Counts are CPU geometry/test evidence and visual comparison,
not a calibrated physical-glass or device-FPS claim.
