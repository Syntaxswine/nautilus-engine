# Optional Nautilus audio

| Usage card | Value |
| --- | --- |
| Identity / status | `nautilus-audio-babble-v1`; sound foundation for architect review |
| Package / source API | Separate private `@nautilus-engine/audio` 0.1.0; original Babble Lab 0.1.0 API |
| Public entries | `@nautilus-engine/audio` (headless); `@nautilus-engine/audio/runtime` (borrowed Web Audio) |
| Source | [Babble Lab `0df4be4`](https://github.com/Syntaxswine/babble-lab/tree/0df4be4a05cfa7b636624e1911c5413a9fe844cd); [notice](NOTICE.md); [inventory](../../vendor/babble-lab/0df4be4a05cfa7b636624e1911c5413a9fe844cd/provenance.json) |
| Maintainer / integration | Sound Engineer; Architect, Nautilus Engine owns integration and game adoption |
| Spatial / save schemas | Inapplicable: PCM samples, seconds and character/mouth cues; no geometry or engine save schema |

Render repeatable character babble, animal voices or text-box blips without a
renderer, DOM, storage, network request or recorded bank. All original presets,
timing, sampled banks, CLI, cast tools, spectral morph/slice-layer tools, SFX
recipes and standalone builds remain in the complete source snapshot.
The preserved [upstream guide](../../vendor/babble-lab/0df4be4a05cfa7b636624e1911c5413a9fe844cd/README.md)
documents original authoring APIs. Engine entries expose synthesis and playback;
morphing and asset fetching remain authoring tools.

This package is independent of Nautilus's four existing distribution profiles
and static editor. Their frozen root exports/build/notices remain unchanged.
The architect can review root registration separately; this intake changes no
consumer pins or production game wiring.

## Smallest installed consumer

```js
import {render, encodeWav, mouthCues, revealSchedule} from '@nautilus-engine/audio';

const line = render('Who goes there?', 'hen-radio', {seed: 17, sampleRate: 44100});
const wav = encodeWav(line.samples, line.sampleRate);
const cues = {mouth: mouthCues(line.plan), reveal: revealSchedule(line.plan)};
// The host stores wav and cues, or hands line.samples to its existing mixer.
```

Seed, text, voice, timing and sample rate determine the result; the host owns
selection and persistence. A voice naming a bank requires that actual bank and
throws if it is absent. No silent replacement voice is selected.

## Connect retained browser audio

```js
import {createSpeaker} from '@nautilus-engine/audio/runtime';

// Inside a deliberate user gesture, using the game's existing context/mixer:
const context = hostAudioContext; // Host value, not an engine export.
await context.resume();
const speaker = createSpeaker(context, {destination: hostDialogueBus, maxCached: 32});
const line = speaker.say('Who goes there?', 'hen-radio', {
  seed: 17,
  onReveal: (_count, shown) => { subtitle.textContent = shown; },
  onMouth: open => { hostSetMouth(open); },
});
await line.done;
// On scene exit/cancellation:
speaker.stop();
speaker.clearCache();
// Keep the borrowed context and mixer alive for the rest of the game.
```

`hostDialogueBus`, `subtitle` and `hostSetMouth` belong to the consumer. The
context must implement Web Audio buffer/source/gain methods; missing contexts
throw `babble: createSpeaker needs an AudioContext`. Callbacks use the audio
clock plus browser animation/timer facilities. The game supplies permissions,
gestures, mute/volume, event deduplication and dialogue ordering. A confirmed
event may trigger a sound; playback never spends resources or confirms impact.
Notification routing, spatial sound, ambience, occlusion, a shared game mixer
and production adoption are future work for the architect to prioritize.

`prepare` warms the bounded cache. Non-overlapping `say` stops older lines;
explicit `overlap` permits several, and `stop` cancels all. Each line owns its
source/gain nodes and reveal timer; stopping disconnects them and closes mouth
callbacks. The speaker borrows the context, destination and banks. Replace an
edited bank object or call `clearCache`. Callback errors are not gameplay
rollback; hosts should supply safe presentation callbacks.

The module owns no durable save or mid-line restore protocol. Save text, voice,
seed, timing, bank identity and subtitle progress in the consumer's format.
Reopening a saved world must not replay one-shot sounds unless requested by the
game. No map, character, damage, hearing or cost rule is changed.

## Build, package and audition

From the Nautilus repository root:

```text
node tools/check-babble-lab.mjs
node --test tests/audio.test.mjs
node tools/test-babble-lab.mjs
node tools/test-audio-package.mjs
node tools/build-audio.mjs
node tools/review-audio.mjs --built
```

The package proof installs the actual standalone audio tarball offline. The
audio build writes `artifacts/audio-dist/`, including unchanged source and
standalone workbenches at
`vendor/babble-lab/0df4be4a05cfa7b636624e1911c5413a9fe844cd/index.html` and its
`dist/babble-lab.html`. The latter also opens directly from the preserved source
snapshot without a server. Use a dedicated origin for auditioning: original
cast storage keeps its upstream key and is independent of Nautilus map saves.

The original CLI can write an explicitly external output:

```text
node vendor/babble-lab/0df4be4a05cfa7b636624e1911c5413a9fe844cd/bin/babble.mjs "Who goes there?" --voice hen-radio -o artifacts/hello.wav
```

Other upstream tools default to writing `audition/`, `out/` or `dist/` beside
themselves. Copy the source to a disposable authoring folder before using those
defaults; keep the imported snapshot immutable. Optional recorded banks require
their own asset rights.

## Builder acceptance

- [x] Complete fixed source tree, modes/bytes, staged identity and dependency closure: `tools/check-babble-lab.mjs`.
- [x] Headless deterministic PCM, timing/reveal/mouth cues, WAV and missing-bank refusal: `tests/audio.test.mjs`.
- [x] All original 84 test cases run serially through `tools/test-babble-lab.mjs` and CI, including measured synthesis, banks, morphs, SFX, CLI, stop/cache and reproducible standalone builds.
- [x] Standalone installed-package proof uses public imports, this guide and notices, excluding authoring/test/standalone payloads from runtime.
- [ ] Bind a named game's mixer, confirmed events, permission, subtitles and animation; check cancellation and repeated events there.
- [ ] Adopt an exact reviewed engine/audio pin in each consumer. Root registration remains a separate architect review.

The [intake review](../../docs/reviews/2026-11-02-babble-lab.md) records validation,
browser evidence and accuracy/efficiency/narrative preferences. PCM measurements
and screenshots do not establish perceived sound quality; voice selection needs
a human audition.
