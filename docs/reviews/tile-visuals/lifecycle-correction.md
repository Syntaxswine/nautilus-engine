# Focused canonical tile lifecycle correction

Separate follow-up branch `codex/tile-visual-lifecycle` starts at preserved
provider **`e9846df52c67c790fc1792f380a0370463aa8650`**. Its four accepted
material/accessor/ID/analytic-grade corrections remain intact. `data.js`,
`mesh.js` and `prepare.js` retain exact original bytes; no source controls,
triangles, canonical samples, materials, pins or public registrations change.

The actual pinned-Three red proof reproduces the reported original failures:
only the first of 17 owned geometries receives repeated disposal attempts while
all five instances remain registered; a throwing removed listener followed by
global retry ends at **-90 triangles**. A geometry listener requesting global
disposal also recurses to stack exhaustion in the original. Constructor rollback
shares the early-exit cleanup failure. The red proof intentionally fails all ten
cases against exact committed Git objects, with actual public core and Three.

## Correction and provenance

Ownership is published before constructor callbacks/attachments so partial
acquisition can always roll back. Retirement unpublishes records/interfaces and
decrements counters exactly once before dispatching observers. Complete owned
geometry/node snapshots drain despite individual failures; a retired flag never
skips an unfinished snapshot. Native parent repair also removes retiring nodes
reparented by callbacks, preserving borrowed scene siblings and resources.

Remove/cull mutations reject reentry. Nested disposal latches monotonic intent
and drains all remaining owners before the outer operation returns. Repeated
disposal is quiet. Error aggregation retains at most 64 values and the full
failure count. Native event ordering/stopping behavior remains unchanged; the
provider attempts each resource once and does not patch Three or replay events.

The small cleanup helper is derived from the artist's committed, now accepted
native-window correction **`5f027e039ba9307fd25719c6307d9760baf54e20`**, file
`packages/native-window-presenter/cleanup.js`, read through Git objects. It is
adapted here with a tile error code and without unused restoration/query helpers.
There is no runtime dependency on the window provider, no import from a moving
worker checkout and no new art/licence grant. The window branch is preserved.

## Proof boundary

`lifecycle-before.json` and `lifecycle-fixed.json` retain runtime hashes and
red/green results. All ten cases also execute in the actual installed public
core/renderer with a separate private provider package. Cases cover target and
global disposal faults, removed-listener faults, reentrant dispose/remove/cull,
exact counters/final retirement, surviving neighbour attributes, ordinary
Three attachment and borrowed-material acquisition rollback, reparenting and
bounded error reporting. The 20 earlier focused tests stay unchanged.

The acceptance record includes final focused/installed/four-gate proof, unchanged
source/built desktop/phone images and exact helper shutdown/port verification.
The historical four-class review evidence remains historical; it is not reopened
or relabelled as this lifecycle correction. All 294 staged art studies and the
fixed headless core remain unchanged. Public integration, Smart Tile/editor/game
adoption, body/support/nav/fire/water and consumer pins remain Root-owned work.
