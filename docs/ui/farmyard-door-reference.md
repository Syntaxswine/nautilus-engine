# Farmyard door reference: UI binding

Status: reference implementation in progress. API baseline: `48a0192777a8a5ade0448b313123418398ce044a`; adopt corrections only from an Architect-supplied fixed commit. The reference consumes the named Farmyard endpoint profile and the retained game host. Production registration, versioning, exports, schemas, CI and game adoption remain Architect-owned.

## Builder card

| Field | Binding |
| --- | --- |
| Behavior | `./adapters/farmyard/doors`, `farmyard-single-ground-leaf-endpoint-v1` v1. Read the [adapter guide](../adapters/farmyard-doors.md) and its installed retained-source example first. |
| Source content | Farmyard `251bf8094b5f9ebe44208443084c1a6d6658512a`. The original `interaction-view.js` creates a unit cube with the existing timber texture, tint `0xb5ad86`, roughness `.9`, native shadows, and the door interaction ID. It positions/scales that leaf directly from the current footprint. No fitted catalogue opening or replacement collider is inferred. |
| Retained authority | The reviewed complete game connection retains source movement, actors, HP/AP, inventory, ammunition, stamina, RNG, routes, fog and complete persistence. Door UI proposes explicit commands; it implements no cost, movement, geometry, fog or contact rule. |
| One target | A selected source door ID and displayed Open/Close action are captured on press with actor identity, original command ID, expected revision and reference-session identity. No target is selected by nearest-distance fallback. |
| One geometry | The current metadata-bearing geometry from the retained source host supplies movement, sight, projectile/grenade queries and the rendered leaf. An open leaf remains solid. Cached publication is presentation, not another collision authority. |
| Time/lifecycle | The page owns its view/input lifetime and borrows the retained connection. Pause, blur, load/replacement and disposal clear held input and pending target presses. Old scene targets/actions are retired before the new scene is adopted. |
| Persistence | Use the complete strict host-save loader and the reviewed retained-host persistence/reconciliation path. Preserve the original command on unknown outcomes. Quiet load/retry restores current poses without re-publishing an action. A known commit remains successful when presentation fails. |
| Scale/bounds | Metres `(x,y)` on ground, renderer `(x,height,y)`. Source leaf `1.12 × 2 × .16 m`; explicit edge axis and swing sign; source actor radius `.23 m`, profile reach `1.65 m`. These are this named source profile's bounds. |

## Required browser evidence

| Case | Evidence to retain |
| --- | --- |
| Closed / open / close again | Exactly one current leaf, rendered world bounds matching its authoritative collider. The same source geometry changes walking, sight, projectile and grenade obstruction consistently. The open leaf still blocks queries through its own footprint. |
| Reach and occupancy refusal | Exercise actual retained movement into and out of reach and a living destination-pose occupant. Compare complete host/state tokens, AP and saved record before/after refusal. |
| Combat and contact | Use the source profile's preview cost. Verify accepted debit and already-computed visibility/contact transition, including source debit-before-contact-refill ordering. No second refresh or inferred AP rule in the view. |
| Target lifetime | Change selection, delete the selected target, change its pose/revision and replace the scene between press and activation/preview. No command falls back to another nearby door; only a fresh press can select a new displayed action. |
| Persistence and retry | Complete save/load preserves retained state. Original-ID retry after an intervening action/load is quiet. Inject before-write, after-write and unreadable outcomes through the reviewed host; reconcile from authoritative storage without guessing or re-spending. |
| Presentation failure | A postcommit view/collider/visibility publication failure cannot undo a recorded action or report it as uncommitted. Restore the view from current authority without replay. |
| Desktop / touch | Native keyboard/pointer and emulated touch at 320 and 390 CSS pixels. Visible target/action and AP feedback, at least 44 px controls, usable focus and no horizontal overflow. Record synthetic fault/gesture probes separately from native input. |
| Teardown | Held input, pending press, blur, pause, load/replacement and disposal. No late command, animation frame or target survives retirement; borrowed movement/query/persistence services remain usable. |

Use the actual camera and UI root's client rectangle for world picking and target projection. A joystick, if used by the shared controls, retains its press-time rectangle through the gesture. The door action must not add a second movement, keyboard or game interaction handler.

## Unsupported bounds

This reference does not add pairs, locks/keys/difficulty, damage/breaching, upper floors, stairs, windows, active fire, fueled actors, reactive scenery or other geometry profiles. Use the adapter's explicit refusal and diagnostics; preserve unsupported source data instead of dropping it. The endpoint profile does not simulate the swept hinge arc. The bounded 128-receipt journal is preserved and never reset to hide capacity. Native mover-history is outside this adoption.

## Design recommendation

**Accuracy:** reuse the actual source leaf recipe and its current collision footprint, and present only authoritative action/cost outcomes. Source parity establishes consistency with Farmyard, not physical calibration. Prefer the native conservative motion provider for new authored rooms; this reference preserves the named Farmyard endpoint policy.

**Efficiency:** one current collider per leaf and event-driven action previews avoid a second mover or per-frame door adoption. This is a code-based design estimate; actual browser query, draw and load measurements remain to be recorded.

**Narrative:** retain Farmyard's timber leaf and readable explicit Open/Close action, with immediate refusal/cost feedback. This is a UI preference for a gradual Farmyard adoption; each new game still chooses its supported policy, art, costs and presentation.

## Dependencies still awaiting a fixed handoff

The initial checkpoint supplies the adapter and original headless movement subset. Its installed example demonstrates an in-memory CAS. Final browser composition also needs the reviewed complete retained-host persistence/reconciliation connection, the accepted shared movement controls, and the fixed source leaf/texture binding closure. Do not implement replacement game handlers or silently copy a competing persistence protocol into this view. Record exact supplied commits and actual imports here as those dependencies land.
