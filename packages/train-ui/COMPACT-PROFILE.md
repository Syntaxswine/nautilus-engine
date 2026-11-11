# Compact notched steam controls

Pass `steamProfile:'compact-notched'` to `mountTrainControls`. Omit it or use
`'classic'` for the existing hold-to-drive panel. Electric keeps its current
controls with either option. Enter, Exit, rider/on-foot gates, walking ownership,
mute, errors and disposal stay within the same component and connector.

The fixed donor is Tinderbox `fb0628605c274550ff8abad50b151843f08747d1`.
Its four original train modules, guide, evidence, wood/font ancestry and notices
are preserved as Git-object bytes in the [vendor source record](../../vendor/tinderbox-train-controls/fb0628605c274550ff8abad50b151843f08747d1/source.json).
The adapted runtime is separate in this package. No donor worktree was written,
and no game pin, map format, Core behavior, root export or build was changed.

| Notch | Request |
| --- | --- |
| F II | Forward, power 1, brake 0 |
| F I | Forward, power .5, brake 0 |
| N | Neutral, power 0, brake 0: the host's normal coast |
| R | Reverse, power .5, brake 0; first apply full brake when moving forward, then engage R after a confirmed stop |
| Chain | Neutral, power 0, full brake; releasing retires that exact brake lease |

Drag through the four stops or use arrows, Home (R), End (F II), and F/N/R
(F chooses F I). B or the focused chain's Space/Enter brakes. The raised grip
shows the **confirmed** notch. The adjacent speed, applied power and brake text
also come from the connector. Pending direction is shown separately while
confirmed controls are neutral, zero power and full brake.

Normal finger release ends only the drag. The accepted notch remains engaged
under the component's exclusive input-owner lease. N deliberately keeps a lease
with zero power and no brake. It is different from safety retirement, which
applies Core's neutral/full-brake release policy. After braking, explicitly
selecting N gets a fresh lease and releases the brake for coasting.

Selecting a notch opposite to cab-relative travel applies maximum brake through
the current owned lease and remembers the requested notch locally. It works
symmetrically for R while moving forward and either forward notch while moving
in reverse. After the host confirms a stop, a guarded microtask rereads the
actor, cab, lease, controls and current revisions, then engages that notch. It
consumes the intent before dispatch, so repeated stopped notifications cannot
repeat the shift. Core's raw moving-swap refusal remains unchanged. The UI owns
no clock and does not predict a stop or weaken host permission.

Normal finger release retains this sequence. N, another notch, the chain,
safety release, focus/visibility/pause, revocation, actor/cab change, Exit,
failed/unknown dispatch and disposal cancel it. A stopped callback cannot acquire
another owner's lease. Mount/checkpoint reload never restores local intent.
Failed automatic shifts are not retried. If braking itself refuses, the UI
attempts exact-owner safety retirement and leaves no queued direction change.

The 62% detent threshold follows Tinderbox, with a tiny numerical-boundary
tolerance. A drag tracks its last attempted detent separately from the confirmed
grip: pending R stays distinct from confirmed neutral/braking and does not
resend on every stationary/jittering pointer event. A fresh gesture or crossing another detent
is a deliberate new request. Keyboard repeat does not walk through gears.

The chain has priority over a lever finger, including a separate touch pointer.
It closes the old notch lease, applies neutral/full brake under its own fresh
lease, and releases only that owner. The old lever finger cannot resume power.
Pointer cancellation, lost capture, a missed mouse-up, blur, hidden page, host
pause (`setBlocked(true)`), focus leaving the HUD, actor/cab changes, revocation
and disposal all close the original actor/lease. Post-commit replacement defers
cleanup until dispatch returns. Quiet cleanup cannot replace a known primary
outcome. Read failures disable controls and attempt exact-owner release. If
Core's busy guard refuses a safety release from its notification, one deferred
retry retains that exact old actor/lease and uses a fresh command ID. It never
retries a direction command or uses a replacement actor's lease.

Mount and reload never acquire or restore a latch. A snapshot can display an
external owner's controls without adopting its lease. Core checkpoint restore
preserves motion while revoking input and applying neutral/full brake. The host
must save its actors/resources atomically with Core; persist no UI pointers,
keys, notch ownership or lease IDs. `state.notch` is `0|1|2|3` while compact steam
is active and `null` otherwise; it is presentation. `state.pendingNotch` is
`0|1|3|null`, a local request with no save authority. `state.steamProfile` records
the configured option. To switch profiles, read the mute preference, dispose
the old UI, and mount a fresh one against the same borrowed session/walking
element. This does not dispose the host or restore old power.

Clicks adapt Tinderbox's short locally synthesized oscillator envelope and share
the existing owned audio context with whistle/chime. A click requires a trusted
event, an accepted nonrepeated own command and an actual confirmed notch change.
Automatic completion retains only the original intent's trusted provenance and
uses an already running audio owner; it never creates/resumes audio by itself.
Refusal, boundary jitter, mount, reload and snapshot invalidation stay quiet.
The existing sparse departure whistle, commuter chimes, mute and audio disposal
remain. Reduced motion removes the grip/chain transitions. Sound is optional;
labels, confirmed readouts and refusal reasons remain usable without it.

## Design decision

| Criterion | Comparison and preference |
| --- | --- |
| Accuracy | Prefer unchanged Core authority and confirmed controls for both profiles. The new opposite-direction assistance requests full brake and waits for a real host-confirmed stop. It does not simulate a gearbox, pressure model or physical reverser, and the chain remains deliberate fiction. Neutral coasting remains distinct from safety retirement. Raw Core moving-swap refusal and classic/electric behavior stay compatible. |
| Efficiency | Prefer one shared connector/lease/audio owner rather than a second train controller. The local pending token uses existing notifications and at most one scheduled completion at a time, with no clock or polling. CPU cost is an unmeasured constant-work estimate. No new art/audio resources were added: compact still resolves three pinned binaries totaling 3,116,098 bytes; classic fetches none of them. |
| Narrative | For the requested compact steam controls, prefer one deliberate opposite notch followed by visible braking and automatic engagement, instead of requiring another selection after stopping. Keep confirmed N/brake separate from the pending request and provide immediate cancellation. This is an input/visual judgment rather than physical calibration. Retain classic hold-to-drive and the commuter panel for their existing use cases. Physical handset and rendered-yard acceptance remain with Architect. |

The mechanical square measures 138×138 with an 80px grip on the standard phone,
124×124 with 70px on the narrow phone, and 96×96 with 42px in compact landscape.
The full component includes its adjacent confirmed readouts, mute and Exit; the
host must measure that full area, including visible refusal/signal reasons.

## Adoption and packaging

Load `style.css`, its imported `compact.css`, and the existing adjacent classic
SVG. Preserve `packages/train-ui/` relative to `vendor/`: compact CSS resolves
its pinned texture/fonts two levels above. Include both complete OFL notices
and the source records. The exact runtime/notice and reference-closure paths are
in [compact-handoff.json](compact-handoff.json). The unchanged public facade
already re-exports the options/types; Architect owns its source registration.

The original compact review is [recorded here](evidence/COMPACT-REVIEW.md); the
current assistance results and limits are in [the reverse review](evidence/REVERSE-REVIEW.md).
Architect owns root whitelist/build registration, real rendered-yard binding,
combined gates and main merge. This candidate makes no consumer-game adoption
claim and has not been pushed independently.
