# Overlay renderer alternatives

Scope: flat supported local surfaces for Nautilus workbench and optional game
consumers. This is an unimplemented contract proposal on fixed brief
`b850e20e2fdd85435d33f16327482b80380af728`. No donor implementation is imported.

| Option | Accuracy | Efficiency | Narrative / recommendation |
| --- | --- | --- | --- |
| On-surface albedo compositing | Existing target triangles give exact visible edge/hole coverage; source-local coordinates and explicit floor binding prevent accidental neighbour/floor projection. No Z displacement or changed canonical boundary. Alpha/lighting need a reviewed kernel port. | No extra decoration geometry; shared base draws are the design intent. Spatial indexing bounds fragment work. Shader fetch cost and custom-kernel integration are unmeasured. | Preferred first flat-surface method for tactical maps: paint looks attached and survives LOD. Apparent crater/plant art remains visibly cosmetic (subjective preference). |
| Shared atlas and batching | Correct if immutable resource/frame identity, UV phase, premultiplied filtering and complete layer order survive batching. Reordering by texture alone can be wrong. | Recommended complement to compositing. Two sample pages total 12 MiB decoded base bytes by dimensions. Avoids one texture/material/draw per cell; actual GPU overhead, binning and uniform upload remain unmeasured. | One coherent painterly library with readable arrows/numbers is useful across games. Separate content skins/game policies remain available. Not a clipping method by itself. |
| Clipped decal geometry | Can respect holes/edges/floors only with a reviewed exact target-surface clipper. A scene ray/projector or bounding rectangle is insufficient. Coplanar depth handling can introduce artifacts. | More geometry/work/draws and retirement under the same aggregate limits; costs scale with clipping and marks. No benchmark exists. | Defer for wrapped/wall/prop needs or special kernels. It may suit richer close-view games later, but it is not the default first flat-surface path. |

The provisional preference is **on-surface compositing plus shared atlas/batching**.
It represents flat paint accurately without inventing solid geometry. Its shader
cost could outweigh geometry savings on a phone; representative measurements
must settle that tradeoff before adoption. Keep clipped decals as an explicitly
different reviewed profile, never a silent fallback that paints another storey.

Colour choice: store exact straight-alpha sRGB PNG/WebP source, explicitly decode
RGB to linear, premultiply each texel before interpolation, then source-over in
stable layer/order. This is preferable for soft pigment edges to an implicit
loader convention or gamma-space blend. Four-tap filtering is a proposal with a
known design cost; no FPS, calibration or cross-device quality claim is made.

Authoring recommendation: source-stable local anchors and independent decoration
sidecars are preferred over derived-cell/triangle addressing or rewriting a
shared recipe's base texture. One local edit should give a reused part its own
history (subjective narrative judgement) while versioned presets remain reusable.
Game damage/fire/vegetation/support and expiry remain under each consumer's
authority; a richer Tinderbox simulation does not belong in an art overlay.

Adoption status: contract/art samples only. The static alpha screenshot proves
artwork/export appearance, not clipping, shader behaviour, allocation retirement,
real editor/agent parity or game adoption. Those are explicit later proof gates.
