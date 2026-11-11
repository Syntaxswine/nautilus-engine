# Babble Lab sound foundation intake

Date: 2 November 2026. Owner: Sound Engineer. Review/integration owner:
**Architect, Nautilus Engine**. Branch: `codex/sound-babble-lab`.
Base: Nautilus `1e6a97b67c57917160db89db34cbae9e4e46f90c` from reviewed `origin/main`.

## Source and adoption

The user requested a fresh sound worktree and authorized reusing the entirety of
[Syntaxswine/babble-lab](https://github.com/Syntaxswine/babble-lab).
The separate pin in `modules/audio/source.json` is `0df4be4a05cfa7b636624e1911c5413a9fe844cd`, matching GitHub
`main` and the clean local Babble Lab source when inspected. The donor checkout
was read only. `tools/intake-babble-lab.mjs` reads Git objects at that exact pin;
it never copies uncommitted files or changes a donor worktree.

The entire original tracked tree is preserved in
`vendor/babble-lab/0df4be4a05cfa7b636624e1911c5413a9fe844cd/`: **72 files,
877,146 bytes**, Git tree `770f23853ba4ab0c90deef77953574acb90e6623`.
This includes all engine modules, the browser workbench, CLI, examples, timing,
bank/sampler, morphing, SFX/download tools, original tests, README/attributes and
the two committed standalone builds. `provenance.json` is separate intake
metadata beside the original files. No original bytes are adapted.

The checker hashes every blob and reconstructs the entire Git tree including
names and modes, then verifies the preserved commit object. This proves complete
source identity offline, including in shallow CI checkouts. Tracked delivery
checks also compare staged Git blobs/modes. Added or generated files inside the
immutable snapshot are refused. The full donor history is retained as merge
ancestry when the checked integration is committed.

The original package declares MIT, without a separate LICENSE file at this pin.
The owner's express reuse permission and preserved notices are recorded in
[the audio notice](../../modules/audio/NOTICE.md). Untracked banks, recordings,
auditions, dependencies and generated output are outside the committed source
and were not imported. Existing third-party recording rights are unchanged.
Source manifests describing SFX are retained without downloading their assets.

The optional [audio usage card](../../modules/audio/README.md) documents the separate private `@nautilus-engine/audio` package and its borrowed Web Audio `/runtime` entry. Its installed package includes the real runtime closure and handoff/notice; authoring tools, tests and standalone artifacts remain in source. `node tools/build-audio.mjs` supplies a separate browser bundle including the unchanged source and standalone workbenches.

The first root-registration proposal encountered the exact historical notice/upstream/package/build/distribution guards in the accepted tile integration. Those files and guards are preserved unchanged. The standalone audio module, build and tarball keep this import independently reviewable; root registration is a separate architect decision. No reviewed gate was weakened to permit the import.

This is a sound foundation for review. No production game, consumer pin, map
schema, character rule, notification bus or dialogue-state machine is changed.
The host still owns its AudioContext/mixer, user gesture, mute/volume policy,
cast, event scheduling/deduplication, subtitles, animation and saves. Playback
follows a confirmed event; it does not confirm impact or spend a gameplay cost.

## Accuracy, efficiency and narrative

| Choice and use case | Accuracy | Efficiency | Narrative / preference |
| --- | --- | --- | --- |
| Seeded formant/animal babble versus authored recorded speech for routine AFT/Farmyard NPC lines | Babble preserves text rhythm, pitch/prosody and timed mouth/reveal cues. It is a stylized voice, with no claim of natural intelligibility or real chicken physiology. A performance recording can convey deliberate words and delivery more accurately. | Code inspection: synthesis costs scale with rendered sample count; the optional speaker caches prepared lines with a configured bound. Authoring/pre-rendering avoids live synth cost. Recording requires encoded assets and decoding/storage. No practical CPU/memory winner is measured here. | Subjective provisional preference: Babble for abundant, repeatable creature barks and text-box chatter; recorded/performed lines for story moments needing intelligible dialogue or acting. Preserve both choices through the host mixer. |
| Full Babble Lab with timing, mouth cues, sample banks and morph tools versus importing only a small blip routine | Timing and cue data allow deliberate animation/subtitle alignment; banks explicitly reject missing identities. Blips are an intentional abstraction. | Measured source import: 72 files / 877,146 bytes; runtime graph: 19 modules including two wrappers. Code inspection: pure synthesis loads no browser/renderer/network; authoring/SFX tools stay outside runtime tarballs. These counts are dependency evidence, not a speed benchmark. | Prefer the full preserved foundation with optional entries for Nautilus's shared sound role. Use the simpler blip preset where text readability matters more than character performance. The broader source import preserves existing creative work without forcing games to execute every tool. |
| Synthetic/recorded environmental sound for Tinderbox fire and the wider world | This intake supplies a presentation tool, not a fire acoustics, occlusion, propagation or hearing simulation. It cannot establish physical fire-sound accuracy. | Untested proposal: pre-rendered cues/loops plus bounded host voices; measure concurrent voice counts and mixer/render cost before selecting live procedural effects. | Subjective provisional preference: preserve richer layered recordings/procedural behavior for Tinderbox's central fire experience; use restrained notification and interaction cues in tactical games. No fire provider or ambience assets are implemented in this intake. |

Adoption status: source imported and optional engine wrappers implemented for
architect review. The inherited AFT source/notice closure is unchanged. This
task selects no new combat/hearing policy and does not replace existing game
speech. Recorded versus synthetic profiles remain consumer decisions. Human
audition is required before claiming the voices or effects sound good;
automated PCM measurements cannot establish perceived quality.

## Validation and remaining wiring

Evidence lives under the sound worktree's ignored `artifacts/audio-intake/` and
`artifacts/audio-package/`; final gate/browser results are recorded below before
delivery. Node v24.15.0 and npm 11.12.1 on Windows were used.

The focused checks cover full-tree identity, staged-byte preservation, headless
and deterministic finite/nonzero PCM, timing/reveal/mouth cues, WAV output,
missing-bank refusal and runtime package boundaries. A separate original-suite
runner requires all 84 reviewed Babble Lab test cases and executes files
serially, so CPU-heavy audition exports do not compete with parallel Nautilus
tests. Source files and their original assertions/time limits remain unchanged.

An initial two-file-concurrency run reported 83 passes and one audition export
subprocess timeout at its original 60-second limit. That failed evidence remains
in `focused.log`; delivery requires a successful serial original-suite run.
The runner removes inherited Node test IPC context and checks the TAP case
count so a nested invocation cannot silently report success without its cases.

The installed-package proof packs the actual standalone audio package, installs its tarball offline in a disposable consumer, executes the guide's headless example and checks the notice/docs and supported playback export.
Consumers are removed in `finally`; tarballs/reports remain as review outputs.

Map editing, undo/redo, map saves, import/export and generation receive no UI or
format changes. Their existing regression suite remains required. Browser
review is scoped to the preserved sound workbench and actual Web Audio adapter;
no sound quality claim follows from a screenshot or numeric sample checks.

Architect follow-up: review this fixed branch, choose a consumer and its mixer/
event seam, then prioritize notification profiles, barks/dialogue routing,
ambience/spatial presentation and human audition. Retained host services and
confirmed-event ownership should be bound once; do not connect sounds by
replaying costs or inferred impacts. Game adoption and private Sites deployment
remain separate architect decisions.

## Recorded sound validation

- Complete source: 72 original files, 877,146 bytes; original 16-commit history is retained at delivery. The staged byte/mode audit matches the source tree.
- Original suite: 84/84 passed serially in 157,429 ms on this Windows host. This is test-suite elapsed time, not a synthesis benchmark.
- Sound integration: 3/3 focused tests passed, including unchanged root profile exports/file lists.
- Actual standalone audio tarball: public synthesis/runtime imports, guide example, notices and headless execution passed after offline installation.
- Built browser review: all six checks passed in isolated Edge. The 1600x1100 desktop capture and 390x844 phone capture were inspected; the phone document width was 390 px, with no horizontal overflow.
- Exact Node/browser PCM SHA-256 for the seeded fixture: `5df216d9d46a94336c8a64664cac33b80611276bb4e5a2a954e585d26a13e102`. Real playback ended, overlapping lines stopped, reveal/mouth callbacks advanced, and the borrowed AudioContext remained running until the host explicitly closed it.
- Evidence: `docs/reviews/audio/babble-lab/{browser.json,desktop.png,phone.png,helper-cleanup.json}`. Review helpers closed through supported APIs; their exact process lifetimes are absent and port 53465 was verified released. No preview is retained.
- Required repository gates: `npm run check -- --tracked` PASS; `npm test` 1,165/1,165 PASS; `npm run test:upstream` 32/32 PASS; `npm run build` PASS (563 module paths checked). All fixed root contracts were preserved.

The review harness adds only an empty favicon in its isolated page to prevent incidental browser-chrome 404 requests; original source/standalone HTML bytes remain unchanged, and real application resource/console errors still fail the review.
