# Farmyard firearm feedback

The optional `@nautilus-engine/firearm-feedback` package provides the `farmyard-realtime-firearm-feedback-1` presentation profile. It is a candidate for games with ordinary firearms and native Farmyard/AFT-style rigs. It fits aim and recoil over the host's gait and stance, and requests sound for each committed discharge. Pistol, off-hand pistol, rifle, sniper rifle, assault rifle, SMG, HMG and shotgun are supported. An off-hand pistol uses the TT-33 model on the left arm. The profile drives one equipped gun per actor at a time.

Version 0.1.0 uses `@nautilus-engine/renderer@^0.10.0` as a peer. Import the rig's Three namespace from that renderer via `@nautilus-engine/renderer/render-effects/three`. The reference rig uses the existing AFT horse and firearm models. This component owns no renderer or scene. It borrows the rig and applies an overlay only when the host samples it.

## Connect a host

```js
import {createFirearmAudio, createFirearmFeedback} from '@nautilus-engine/firearm-feedback';

export function connectFirearm({actorId, worker, profile, context, getClip, prepareBase, afterSequence = 0}) {
  const audio = context && createFirearmAudio({context, getClip});
  const feedback = createFirearmFeedback({afterSequence, playCue: audio?.playCue});
  const actor = feedback.bindActor({actorId, worker, profile});
  return {
    present: round => feedback.commitRound(round),
    frame: frame => actor.sample(frame, prepareBase),
    cursor: () => feedback.sequence,
    dispose() {
      try { feedback.dispose(); } finally { audio?.dispose(); }
    }
  };
}
```

- **Discharge.** Submit `{sequence, actorId, weapon, at, origin, target}` immediately after the host commits an actual shot. `sequence` is a stable positive safe integer shared across the encounter and assigned per individual round. Send new rounds in sequence order. Gaps allow the same cursor to follow a filtered host journal. Any sequence at or below the cursor is stale and ignored. The cursor advances before requesting sound. A failed audio callback reports `failed` in the accepted receipt and the cue is consumed. A jam, blocked input or an uncommitted preview has no round. A miss still discharges. The host owns ammunition, costs, RNG, impact and any damage.
- **Time and space.** `at` and frame `now` are seconds in the same nondecreasing host clock. `origin` and `target` are metre points `{x,y,h}` with height `h`. They map to Three `(x,h,y)` and the native gun bore points along local +X. Use the committed trace endpoint for `target`, including the endpoint of a miss. Each bound actor retains at most its latest live round. Every accepted round can request sound, while only the most recent eligible round drives recoil. The recoil window is 280 ms. Changing weapons or sampling beyond the window retires that round's pose. Bind an actor before its discharge for pose feedback. Rounds from an unbound actor can still request sound.
- **Rig.** Pass the borrowed `worker.root`, `worker.bones`, `worker.skeleton` and equipped `worker.weapon` from the shared Three instance. The named bones are `spine`, `head` and the `upperArm`, `forearm`, `hand`, `fingers` chains with `-1` and `1` suffixes. The model has a native `id`, `carry`, a root directly under the worker, and its `grip` and `muzzle` anchors directly under the gun root. Shouldered weapons also need `support` and `stock`. Optional authored `carry.handPoses` give grip quaternions, palm offsets and finger curls. The root and parent world frame are upright, unit scale and may be translated or yawed. Named limb lengths are fixed while bound. Provide the donor species `profile` when available. The fitter reads `bodyYaw` and `headYaw` in degrees, `headPitch` in radians, `headPitchSlope`, `stockOffset` in metres and `proneAim` with its `stock`, `torsoFollow` and `headOffset` fields.
- **Frame.** Sample with `{now, weapon, floorHeight, blend, pose, aim}`. `floorHeight` is the local standing surface's world elevation and defaults to zero. `blend` is the gait amount from 0 to 1. `pose.kneel` and `pose.prone` are stance weights from 0 to 1, with both zero for standing. The optional `aim: {target, progress}` presents host acquisition from 0 to 1. The optional synchronous `prepareBase(frame)` runs after the previous overlay is restored. Prepare gait, posture, placement and any weapon swap there, or omit it to reuse the current base. Use `weapon: null` to clear firearm presentation. The returned muzzle, bore and fit diagnostics are visual samples. A constrained fit can return `supported: false` with a reason.
- **Audio.** Provide synchronous `playCue(request)` for an existing mixer or bind `createFirearmAudio({context, destination, getClip})`. `getClip(cueId)` supplies a decoded buffer or no clip. The callback receives `cueId`, `sequence`, `actorId`, `weapon`, copied `origin`, `delaySeconds`, `range` in metres and `priority`. The gun cue starts at zero delay with the donor range of 48 m. The shotgun also requests `shotgun-pump` at 0.35 s with range 18 m and priority 0.5. The supplied Web Audio binding plays nonspatial audio on the host's destination, attenuates the pump and caps scheduled or playing voices at 12. Use your mixer for distance, orientation, master gain and visibility policy. Resume audio in the host's user gesture and resolve clips before play. A callback that returns false or an absent clip produces a skipped receipt.
- **Lifetime.** One binding controls the named rig transforms at a time. Host updates to these transforms run inside `prepareBase`. Callbacks run synchronously and cannot reenter the presenter. Dispose the actor binding before retiring or replacing the rig. Disposal restores the last base without detaching or disposing the rig. Dispose the audio binding to stop scheduled and playing voices. The context, buffers, destination, renderer, gun and rig remain host-owned. The presenter keeps no saved state. Start a new instance with the journal's `afterSequence` to enter a restored encounter without replaying old sounds.

## Practice example and verification

Build the optional archive with `node tools/pack-firearm-feedback.mjs` and the renderer peer with `npm run pack:renderer`. Install both local tarballs in the host. The firearm tarball includes this guide, the original notice and source ledger.

Open `/examples/firearm-feedback.html` on the Nautilus build server. Select a weapon and stance, then aim or fire. **Three rounds** commits three distinct practice misses. The fixture generates its test audio in the browser and uses a static native horse base frame for each stance. `node tools/review-firearm-feedback.mjs` packs and installs both tarballs offline and runs the example through their public entries in a disposable browser.

For adoption, verify the exact engine pin, the host's authored grip anchors and all intended stances. Send one miss and an ordered burst through the actual commit journal, then repeat those IDs and sample the same frame again. Confirm one cue per round and a 350 ms pump, then dispose during pending playback and restore with a consumed cursor. Review the game with its own authorized clips and check short-range and constrained poses for each rig. Remove the optional binding and package import to roll back.

## Source and design choice

The pinned Farmyard Commando Real Time sources supply the pistol fit, shouldered stock and grip fit, aim acquisition blend, recoil envelope and sound cues. Nautilus adapts that code to a translated and yawed host frame and uses the existing canonical AFT Three runtime. Its test reference also reuses Nautilus's pinned AFT horse model, mesh and weapon models. The complete donor code for the adopted algorithms, SHA-256 hashes, Git blobs and applicable notice are retained separately as reference evidence. The optional package contains the adaptation, source metadata and notices. [Farmyard snapshot](https://github.com/Syntaxswine/farmyard-commando-realtime/tree/12cbb6881a344181f45519ca2275a20a7768f61b) · [Source ledger](source.json)

The source ledger identifies the five original recordings by ID, timing, Git blob and SHA-256. The source recipes record the Sonniss GDC v2.0 license and a separate noncommercial Glades of Arcadia source-bank note. This delivery contains recording metadata only. Bind recordings licensed for the consuming game or use its own replacement clips. [Sonniss GDC license](https://sonniss.com/gdc-bundle-license/)

| Criterion | Decision for real-time tactical firearms |
| --- | --- |
| Accuracy | The native fit keeps hands on the pistol or the stock and two authored grips together. At discharge it fits the muzzle toward the committed endpoint, including on misses. The following rise and recovery are authored cues. The package contains no physical recoil, ballistics or acoustic simulation. |
| Efficiency | One current round per bound actor, a single cursor and capped audio voices bound retained work. The shoulder solver may run several reach and bore fits when fully raised. This is a code-based cost assessment without a frame-rate benchmark. Hosts can sample only visible actors and let off-screen discharges feed audio. |
| Narrative | In a close real-time tactical view, the separate pistol and shouldered poses make weapon and stance easier to read. Per-round audio and the delayed pump keep the sound synchronized with the action. The relative readability is a visual judgment from the reference, and the synthetic clips are timing fixtures. |

Prefer this presentation profile for ordinary real-time Farmyard-style weapons. Keep authoritative scheduling and the game's existing visual effects in the host. More distant views can choose a simpler host pose or use the cue stream without binding a rig. Game adoption is a separate change, and species outside the native horse fixture need their own visual review.
