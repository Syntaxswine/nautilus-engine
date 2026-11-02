# Artwork provenance

These are original Nautilus contract samples. They are not public registered
resources or evidence that a game supports decoration. No donor worktree,
stock image, external font or third-party graphic was imported.

`resources/organic-marks-v1.png` is the exact RGBA output of the built-in
imagegen tool, generation `exec-69d95695-e9d6-41fe-92fe-c4dd4c6b1582`. The full
final prompt is `prompts/organic-marks-v1.txt`. It requested true transparency
and a painterly six-frame albedo atlas. The original output was copied to this
project without pixel edits. The generated alpha is preserved, including low
values of 1–2/255 in the outer 16 px gutter. The proposed manifest explicitly
declares `zeroAtOrBelow8:2`; an eventual sampling kernel must apply that policy
before premultiplication, or refuse this resource profile. No hidden alpha
cleanup or reinterpretation of stored bytes is permitted. This is generated
artwork made for the user's Nautilus asset work; no claim of a third-party
license or exclusive copyright is inferred.

`resources/road-marks-v1.svg` is original vector source authored by this task.
Digits are path outlines/strokes, with no font dependency. Arrows, lines and
symbols use original path geometry. `tools/art-tile-authoring-samples.mjs
--masters` reproduces the master exactly and refuses a changed version-1 file.
`resources/road-marks-v1.png` is the browser Canvas RGBA PNG export of that
master. It has no external image/font references and no pixel postprocessing.
`export-review.json` records the source/output hashes and browser version.

Resource, prompt and master hashes are recorded in `resources.json` and the
review manifest. Portable packs must include the actual PNG bytes, this notice
and referenced metadata; the SVG/prompt are useful retained authoring sources.
Nothing depends on the machine's imagegen output directory. The initial custom
image proposal is bounded PNG/WebP RGBA; the SVG is an authoring companion,
not an extra implicitly supported runtime image format.
