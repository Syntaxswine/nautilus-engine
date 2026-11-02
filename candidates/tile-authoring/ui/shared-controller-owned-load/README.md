# Private shared UI: original-read final observation

Review-only continuation of returned UI81 and UI63. The actual source producer
is still UNBOUND. Resource Load stays disabled when that port is absent. This
component is not a production SourceReadOwner, Native page loader or permission
to Stage/Apply. Do not adopt returned 63/81 as the corrected runtime.

The actual bridge and read-pairing adapter gain `resourceReadOwner.capture(read)`
and `visit(ticket, read, visitor)`. Opaque, single-use WeakMap observations bind
the original outer read to the original bridge read, base workbench read and
source scope. The producer must supply
`sourceOwner.finalReadOwner.capture(scope, actualBaseRead)` and
`visit(ticket, scope, actualBaseRead, visitor)` from its own source, context and
lifetime records. Capturing an old read after a change must never restamp it as
current. The final visit must perform no snapshot, predicate or source callback.

The Root coordinator completes callbackful snapshot/currentness comparisons
first, then verifies the owned final observation. The UI calls the borrowed
`loadSelected(actualIssuedRead)` immediately after the callback-free final path.
The existing `withCurrentRead` remains check → callback → check and is never
used as atomic dispatch permission. No callback alternation loop or caller
boolean supplies missing ownership.

Editor checkpoint `dfb01d2b1323cc628b3e92c2033ac72de5d4ec1e` documents the missing
production producer in `c2-session-source/FINAL-READ-OWNER-SEAM.md`. Its existing
read-frame and Core879 safe port do not own the required unpublished source and
connection epochs. The real producer must cover every relevant mutation before
publication, source/context replacement, retirement and ABA. A UI counter or
fixture object is not a substitute. Missing producer methods yield a null port
and a disabled Load button, even if `loadSelected` exists.

## Review and integration

Run `node tools/pin.mjs` from this directory to derive only from full fixed Git
objects. `derivation.json` records all inputs, literal edits and output hashes.
All earlier components and returned evidence remain byte-exact. Root e4d798 is
read-only; its panel body matches the reviewed 648 body. The proposal adds one
guard member. A separate artifact-only promotion packet must also apply the
three existing opt-in C1 mount changes and update both Root source validators.
Do not promote private Root/Core mirrors or create a second form producer.

`tests/protocol-source-owner.mjs` and the pairing test producer are explicitly
protocol fixtures. Browser tests use the actual C1/C2 panels and continued Root
coordinator. They do not prove actual Host, Native, meter, WAL or editing work.
The real resource action must still acquire actual d8 bytes **and** the Native
page, through bounded RESOURCE work, with zero editing credit/IDs/commands/WAL.
Returned callback readiness flags never enable editing. One controller and one
subscription remain shared; pending UI cannot clear actual Host debt.

## Design evaluation

Accuracy: prefer producer-owned observations over callback alternation for
resource dispatch. Protocol tests reproduce unpublished change, retirement and
ABA, including the returned 63/81 cases. Actual-source accuracy remains unproved
until the missing producer is supplied and independently reviewed.

Efficiency: the final path uses a constant number of WeakMap and identity
checks (code-based estimate), with no retry loop or new snapshot projection.
Existing complete-data comparisons remain before it. No performance benchmark
or Native cost claim is made.

Narrative: the existing Load button and world-neutral status styling are
retained. Unavailable host bindings leave the action disabled; the game can
retain its own visual language and decide when artwork acquisition is useful.
This is a UI judgment, not a readiness claim. Compatibility/default C1 behavior
is preserved; prefer this opt-in route for the combined tile authoring UI.

No canonical Root edits, game pins, normal navigation, Sites changes or push.
