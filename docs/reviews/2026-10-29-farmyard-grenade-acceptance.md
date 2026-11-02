# Farmyard grenade integration acceptance

The optional grenade component in Nautilus 0.9 passes local source, build and offline installed-package acceptance. [PR16](https://github.com/Syntaxswine/nautilus-engine/pull/16) owns exact-head CI and promotion to canonical main. Games adopt their own reviewed pins separately.

Farmyard source is `251bf8094b5f9ebe44208443084c1a6d6658512a`; public core is frozen at `c7beb44fa254b2d72657f7e3a959920216f09b35`, native provider at `2b7d57dcd45a30d5b02a1ac357d559fedb35b854` plus `d06ca5f958dfe9ea831d0fe936af2114130f1e33`, and reference player at `cc49e030eca70f2708268d028ad5f7474f84e450`. Original bytes, source hashes and notices stay distinct from engine-owned adapters. No game pin or Sites audience changed.

## Evidence

- All 448 engine tests, 32 inherited regressions, source checks and build pass; 402 module paths are verified. The installed headless proof also compares against the actual pinned Farmyard game. All 20 native-provider tests pass.
- Source, built and offline installed browser workflows each pass ten real groups. Exact package/fixture/tool fingerprint `012d4f6028ed3b5183502791a95f1fda7db9f6165d815f2f238c28640dd4fe9b` and final projected context `3928bb0c0d51d175d688d722c2ae6ab4a7ad7042ce7089a96f56893c760a2cd5` match. Missing/partial proof records cannot emit parity.
- Actual RAF playback records 107 frames, including 18 flying frames, with one accepted throw and unchanged authoritative state throughout. [Native playback](evidence/grenade-integrated/live/native-throw.webm), [live record](evidence/grenade-integrated/live/review.json), [installed phase gallery](evidence/grenade-integrated/installed/installed-release.png), [phone](evidence/grenade-integrated/installed/installed-phone-aim.png), [transformed instance](evidence/grenade-integrated/installed/installed-transformed-elevated.png).
- Every disposable root browser/server lifetime has supported-API cleanup and PID-plus-creation/port verification. No helper is retained. Earlier optional video dependency/sampling diagnostics are recorded separately from passing acceptance; they required no runtime change or dependency install.

[Machine-readable acceptance](evidence/grenade-integrated/acceptance.json), [file hashes](evidence/grenade-integrated/files.json), [installed comparison](evidence/grenade-integrated/installed/parity.json) and complete source/build/installed reports retain the concrete evidence. Captured outputs preserve their original bytes under the scoped Git attribute so the SHA-256 inventory remains verifiable across checkouts. Live diagnostic source is preserved as text; deliberately copy it to `artifacts/review-grenade-live.mjs` to repeat that local review after building. No publishing or external message is part of its restart.

The independent artist review passes the bounded component: matching phase images, phone and transformed views, plus actual playback, show no confirmed blocking paint, duplicate-casing or release-position defect. Fine finger/sole contact and physical-device FPS remain outside this acceptance.

## Measured packages and limits

| Package | Compressed bytes | Unpacked bytes | Files |
| --- | ---: | ---: | ---: |
| Headless core | 1,290,863 | 6,525,595 | 182 |
| Optional renderer | 21,708,185 | 24,964,821 | 83 |
| Compatibility | 22,881,825 | 30,992,812 | 226 |

These are local Windows package measurements with integrity recorded in the acceptance JSON; the renderer also contains existing building/roof content. Raw Farmyard reference snapshots and all review fixtures/media are excluded from runtime packages. Initial native readiness requests 34 non-navigation resources / 6,699,575 encoded bytes. SwiftShader and emulated 390/320 px touch are not physical-device performance measurements.

`farmyard-static-same-plane-v1` preserves source costs, finite stock/pack synchronization, equipped weapon, ordinary trajectory/cover/damage, casualties and sight/control transitions. Windows, fueled/volatile targets, active fire and other actor floors refuse before costs. A future reactive adapter must preserve ordered source consequences; this release does not replace full Farmyard production gameplay. There is no authoritative fuse, bounce or midflight save. Saves retain injured/spent state and durable identity; loading/retry does not replay presentation. The bounded journal has 128 records and requires explicit future archive/migration rather than identity eviction.

The reference owns its complete fixture authority and synchronous storage. A retained game must bind real atomic context persistence, fresh visibility/control and complete body services, keeping unrelated actors/inventory/world state. The 820-triangle original prop and painted horse/throw are a native proof; NPC markers, complete cast/equipment rendering and audio remain game choices. The measured 0.547317 m hand/arc gap uses a labelled 0.12 s cosmetic bridge, with source authority unchanged. Dense side stills and actual playback show no confirmed blocking discontinuity; forearm occlusion and distant elevated views do not establish fine contact or throw clearance for every cast member.

For accuracy, prefer the explicit source profile for Farmyard parity and native original geometry for presentation. For efficiency, select the headless/renderer entries needed; local bytes and resource counts do not establish device FPS. For narrative, native pin/plant/release/follow-through and explicit aim/confirm preserve the authored tactical experience; another game can choose reduced arc/ring presentation. [Builder guide](../grenades.md), [controls](../ui/grenade-controls.md), [native ABI](grenade-presentation/provider.md).
