# Focused material-profile correction

Baseline `a536cfec20e609a6c507f000791d8d7e71ae6d18`; branch
`codex/tile-finish-material-boundary`. Architect's independent Physical fixture
showed that `instanceof MeshStandardMaterial` also accepts its Physical subclass.
The finish adapter then created a plain Standard shader, dropping clearcoat/IOR
semantics. This correction enforces the already documented ordinary profile.

`nativeBase` now requires the exact shared-Three MeshStandardMaterial prototype,
type and Standard brand, and rejects the Physical marker. Existing opaque/
map/field/custom-shader restrictions remain. Physical, custom Standard subclasses,
retagged/Physical-marked Standard, Basic and Shader profiles refuse before any
native allocation. No Physical shader support or new material profile is added.

One actual borrowed-Three regression fixture mixes each of those six profiles
with a normal Standard bucket. It compares full native material/texture JSON,
atlas pixels, geometry attributes/interfaces, source/projection, mesh bindings,
disposal observations and pool/view counters. Actual Material/BufferGeometry/
Texture constructor IDs prove zero allocation even if a resource might otherwise
be created then immediately disposed. The fixture failed on the uncorrected
Physical case and passes after this guard change. Normal Standard geometry,
finishes, seams, D4/detail and throwing/reentrant lifecycle checks still pass.

All 18 focused source checks and the same 18 actual-installed checks pass. The
installed proof uses real physical public core/renderer packages and explicitly
private candidate/accepted-host helper copies; it does not fake public exports.
Reproduce it with `node tools/art-tile-stack-material-boundary.mjs`. The tool
removes its disposable offline consumer in finally; no browser/server/watcher
or retained helper is created. New source/dependency/archive hashes and TAP are
in the adjacent correction JSON and installed TAP.

The four family definitions, catalogue binding, textures/shader, geometry and
canonical borders stay unchanged. Public provider files and the exact D4
negative-zero witness are byte-preserved; no source control normalization or
unaccepted provider correction is applied. Existing review/source manifests
remain historical evidence for the baseline commit. This focused correction
report records the new guard/test hashes rather than rewriting old evidence.
The custom-overlay contract remains separately preserved at
`f5bfda9ec0f639018ccfee2415b1f70502e77cae`.

Required repository gates passed: `npm run check`, `npm test` (930/930),
`npm run test:upstream` (32/32), and `npm run build` (519 checked module paths).
After these gates, `node tools/art-tile-stack-material-boundary.mjs --record`
records the final task hashes and gate-log hashes. All accepted source fences,
the original 294 studies and the four finish IDs remain intact.
