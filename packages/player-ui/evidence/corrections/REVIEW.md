# Architect review corrections

Parent candidate: `03096098ec51da1bca822a892e7cfe48638e39c5`.
Architect's fixed-parent diagnostic reported two accepted action pairs collapsing
into one button, and a cancelled camera result with old exported settings after
the borrowed camera had already accepted its new settings. The supplied diagnostic
was read as evidence; its script/files were not imported into this candidate.

Action keys now encode the complete provider/action pair without slash ambiguity.
Both of the reported actions remain offered, presented and individually routed.
Node regressions also cover quotes/escapes and explicit duplicate rejection within
one provider. The combined key is opaque; the structured intent identities remain.

Both activation paths now share a defined non-cancellable camera commit point.
Before the prepared camera update, the shell publishes its accepted configuration
and view and disconnects preparation cancellation. The camera must synchronously
accept prepared state before post-update notifications. Those callbacks may
re-enter, abort, throw or dispose without converting an accepted change into an
uncommitted result. Readiness failure and cancellation before acceptance preserve
the previous camera/configuration/view. Resource disposal never reverts accepted
camera state. Disposing from a notification retires new and old views and blocks
native input synchronously.

The fresh bounded Edge run asserts 15 groups: the mounted identity reproduction
and seven camera cases for each live/replacement path. They cover invalid and valid
reentrant requests, post-acceptance abort, post-update exceptions, disposal/native
input retirement, pre-commit cancellation and readiness refusal. It uses declared
APIs and the real retained yard host, without a new world/clock/kernel. Active
input/world state remain unchanged by a live camera update. Both accepted and
uncommitted paths check borrowed camera/config coherence and owned staging cleanup.

Unchanged baseline browser evidence/captures and helper receipts remain exact
parent bytes. Of its 24 groups, 23 remain applicable. The old expectation that
disposal during a camera commit would report cancellation is superseded by the
new explicit commit point; the maintained full-review script now expects an
accepted result and the focused run tests both paths. No broad browser rerun or
additional engine sweep was performed. The Node and type checks are rerun with
the two new identity regressions, and all source hashes/receipts are refreshed.

The new browser/server is short-lived and closes through the same supported
Playwright/HTTP finally path. Exact process identities, deadline, restart inputs,
cleanup receipt and released-port verification accompany this record. No helper
is retained. Source-only status, Stage 2/3/4 boundaries, donor pins, root
registration, Core, train widget and production release remain unchanged.
