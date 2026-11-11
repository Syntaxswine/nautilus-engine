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
| R | Reverse, power .5, brake 0; Core requires a stop before changing travel direction |
| Chain | Neutral, power 0, full brake; releasing retires that exact brake lease |

Drag through the four stops or use arrows, Home (R), End (F II), and F/N/R
(F chooses F I). B or the focused chain's Space/Enter brakes. The raised grip
shows the **confirmed** notch. The adjacent speed, applied power and brake text
also come from the connector, including after a refused moving reverse.

Normal finger release ends only the drag. The accepted notch remains engaged
under the component's exclusive input-owner lease. N deliberately keeps a lease
with zero power and no brake. It is different from safety retirement, which
applies Core's neutral/full-brake release policy. After braking, explicitly
selecting N gets a fresh lease and releases the brake for coasting.

The 62% detent threshold follows Tinderbox, with a tiny numerical-boundary
tolerance. A drag tracks its last attempted detent separately from the confirmed
grip: an R refusal keeps the previous accepted gear and does not resend on every
stationary/jittering pointer event. A fresh gesture or crossing another detent
is a deliberate new request. Keyboard repeat does not walk through gears.

The chain has priority over a lever finger, including a separate touch pointer.
It closes the old notch lease, applies neutral/full brake under its own fresh
lease, and releases only that owner. The old lever finger cannot resume power.
Pointer cancellation, lost capture, a missed mouse-up, blur, hidden page, host
pause (`setBlocked(true)`), focus leaving the HUD, actor/cab changes, revocation
and disposal all close the original actor/lease. Post-commit replacement defers
cleanup until dispatch returns. Quiet cleanup cannot replace a known primary
outcome. Read failures disable controls and attempt exact-owner release.

Mount and reload never acquire or restore a latch. A snapshot can display an
external owner's controls without adopting its lease. Core checkpoint restore
preserves motion while revoking input and applying neutral/full brake. The host
must save its actors/resources atomically with Core; persist no UI pointers,
keys, notch ownership or lease IDs. `state.notch` is `0|1|2|3` while compact steam
is active and `null` otherwise; it is presentation. `state.steamProfile` records
the configured option. To switch profiles, read the mute preference, dispose
the old UI, and mount a fresh one against the same borrowed session/walking
element. This does not dispose the host or restore old power.

Clicks adapt Tinderbox's short locally synthesized oscillator envelope and share
the existing owned audio context with whistle/chime. A click requires a trusted
event, an accepted nonrepeated own command and an actual confirmed notch change.
Refusal, boundary jitter, mount, reload and snapshot invalidation stay quiet.
The existing sparse departure whistle, commuter chimes, mute and audio disposal
remain. Reduced motion removes the grip/chain transitions. Sound is optional;
labels, confirmed readouts and refusal reasons remain usable without it.

## Design decision

| Criterion | Comparison and preference |
| --- | --- |
| Accuracy | Prefer the existing Core authority and confirmed controls for both profiles. Tinderbox's notches are discrete game power settings, not a calibrated steam gearbox, pressure model or physical reverser. The requested chain brake remains deliberate fiction. Neutral coasting preserves the real Core distinction from safety release. The donor controller was adapted rather than copied into runtime so refused shifts retain valid confirmed controls and old-source cleanup stays exact. |
| Efficiency | Prefer one shared connector/lease/audio owner rather than a second train controller. There is no added clock, polling loop or renderer. Hysteresis and one attempt per detent bound redundant commands/clicks. The browser measured three newly fetched binary resources totaling 3,116,098 bytes (wood 2,757,790; Besley 108,640; Old Standard 249,668); classic fetched none of them. This adds load cost versus the classic SVG, even though the compact DOM footprint is smaller. These byte counts are measured; CPU/FPS benefits are unmeasured code estimates. |
| Narrative | For the requested small steam HUD, provisionally prefer the compact raised wooden grip, four visible marks and brass chain: it follows Tinderbox's cabinet/rail machinery and leaves more world visible. Retain classic where continuous requested power and hold-to-drive are preferred. Keep the commuter panel and lamps for electric stock. This is a visual/input judgment, reviewed at desktop and the requested phone/landscape sizes; physical handset and final rendered-yard acceptance remain with Architect. |

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

Focused results and limits are in [the review](evidence/COMPACT-REVIEW.md).
Architect owns root whitelist/build registration, real rendered-yard binding,
combined gates and main merge. This candidate makes no consumer-game adoption
claim and has not been pushed independently.
