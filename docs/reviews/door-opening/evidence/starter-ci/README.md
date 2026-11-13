# Focused starter CI collector correction

Collector commit: `63d930655cc84a626813a0c3fca5c984f23a51b4`. Approved runtime:
`98c63a743b02782e1904b730abddb206311c10b0`. The SDK, consumer runtime, examples,
assets, vendor files, package definition, upstream pins and notices are unchanged.
The original source98 package remains
`5ebcfa72a44b35a74b3821069d0c897902e45ff6d1c9ce2b0dc0842de31c86b8`;
its preserved archive copy was independently rehashed. Existing Night Ledger
browser/package evidence remains bound to that runtime.

Reviewed head `3d8cd6065f8c457a147c4ef3432ad22648d4ba8d` failed the
[starter CI step](https://github.com/Syntaxswine/nautilus-engine/actions/runs/43350433322/job/131639907444)
because its collector still expected occupancy to disable **opening**. The bounded
excerpt and full-log digest are preserved. This deterministic failure was fixed
by changing the scenario; the failed job was not rerun away.

The collector now checks that the real Open button is enabled while the blocker
is checked, opens once without relocating the operator, and appends one event.
Closing stays disabled. The public starter authority restored from that exact
UI checkpoint returns `DOOR_OCCUPIED` without changing state or emitting events.
Clearing the blocker restores the action, and the original opener-occupancy
negative remains. Key/permission, actual movement, stairs, saves/replay, native
focus/close, failed writes, stale inputs and touch/reflow assertions remain.

The corrected candidate and clean committed built reviews each pass all 13 groups.
Delivery checks pass: indexed source audit, 1,318 repository tests with established
two-worker scheduling, 32 upstream tests and the 655-module build. Registration
checks pass two tests; 23 canonical source/index records match. The current
registration is `03114e937448de4bdba44208090b942bbb53a5309514315bb0fc348ba1d97636`.

`manifest.json` inventories this supplement. The clean acceptance records its
collector commit/hash, actual served runtime hashes and clean build provenance.
The parent evidence is historical source98 proof and is preserved unchanged.
In particular, the **qualified** 13-group pause proof remains qualified: the
unmodified pause collector did not pass. See `../pause-qualified/qualification.json`.
This starter follow-up neither changes nor hardens that separate probe.

Two disposable reviews closed through their owning APIs. Cleanup verifies 14
exact process lifetimes and two released ports, with zero retained helpers.
The Architect's preview and original deadline remain untouched. The checked-in
collector plus the preserved supplemental scripts/inputs allow deliberate
reproduction; nothing restarts or publishes automatically.
