# Basic progression integration

Nautilus 0.7 adds the requested basic upgrade: 15 freely assignable stat points per level, increasing XP requirements, separate slow practice and a character-development reference screen. The original 14 stats, character-v1, roll profiles, RNG streams and portable maps stay intact. Species/class perks and additional cast content are deferred.

The [contract](../progression.md) specifies the immutable profile, atomic authority, strict saves, retry identity and UI boundaries. The [design review](../reviews/2026-10-29-basic-progression.md) compares accuracy, efficiency and narrative against pinned AFT behavior. New implementation is engine-owned; no donor bytes are imported.

Reviewed contributions:

- core: `d8bf16e3de7da1ffaabfaccca255687b16931fcb`
- core: `5d9ba60d80bde11c704d0e7d6f0496899661c5df`
- core: `27f0a763a55db1be31704bc4ecf289dbb5e74fa7`
- ui: `1a906da9058983e97867d696535dc8db92072d81`
- ui: `719d4c47b0f78ec6ca257e8989cfc09ff17e38b4`
- ui: `7e4bb99585eafce8f433d1a62532938d958fa0c1`
- ui: `af5eb9e9c2f967e6a9fdca8251e891e6930ff886`

Accepted after 254 engine tests, 32 upstream regressions, integrity/closure checks, 365-path build and independent isolated Edge character/editor workflows. Installed-package and hosted CI records accompany the release. The browser checks use software WebGL for editor correctness and make no hardware performance claim.

The six-attribute/eight-skill sheet reuses the existing Mechanic fixture and Farmyard-derived Nautilus UI materials. Previewed accuracy uses an explicit existing percentage profile without range/cover/stance modifiers; each game retains its actual attack policy.

Adoption remains separate in all three games. The initial profile has a 4096-transaction journal cap and no rollover mechanism; future expansion requires deliberate migration. No game pin, donor worktree, hosting audience or Site is changed. Disposable review helpers stopped and their ports were verified released.
