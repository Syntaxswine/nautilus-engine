# Farmyard rules conformance source

These three files retain unmodified Git-object bytes from Farmyard commit `279d2d34786b3e6e5c5baeeac6898e60030afdbe`. Original paths, Git blob IDs, UTF-8/CRLF bytes and SHA-256 values are recorded in `docs/reviews/2026-10-29-farmyard-rules.sources.json`. Original embedded comments remain with the files. The pinned repository root has no LICENSE/NOTICE/COPYING file; this provenance evidence grants no new license. See Nautilus's source notices.

The module closure is `character-stats.js`, `quickplay-presets.js` (which imports that stat module), and `solo-weapon-data.js`. They are test-only reference algorithms/data. `solo-game.js` is hashed in the source manifest for actor-shape review and is neither copied nor executed. No movement, AI, mission, renderer or game-save code is imported here.

The tests compare actual pinned reference functions against the public Nautilus-derived adapter on current quickplay/guard/menu actor shapes. Passing establishes the documented candidate seam; it does not change Farmyard's production dependency or activate progression. Keep these fixtures out of distributable packages.
