# Contour rendering effects

`@nautilus-engine/map-core/render-effects` exports `SearchHalo` and `HALO_WIDTHS`. It is an optional presentation package, independent of the headless map and rules entries. No game has adopted this Nautilus package automatically.

```js
import * as THREE from '@nautilus-engine/map-core/render-effects/three';
import {SearchHalo, HALO_WIDTHS} from '@nautilus-engine/map-core/render-effects';

// Build the renderer, scene and rigs with this same Three r180 instance.
const halo = new SearchHalo({reducedMotion: () => prefersReducedMotion});
halo.render(renderer, scene, camera, [
  {root: visibleProp, strength: 1, width: HALO_WIDTHS.standard},
  {root: posedBody, strength: .55, width: HALO_WIDTHS.wide}
], presentationTimeMs);

// At scene retirement, before disposing the source art/rigs:
halo.dispose();
```

Call `render` in place of the normal full-frame `renderer.render(scene, camera)`, after updating animation and scene state. Time is supplied in milliseconds; the effect owns no clock, random stream, simulation state or animation loop. Reduced motion freezes the light at time zero. Empty or zero-strength targets use the normal one-pass scene render. `dispose` is idempotent and makes subsequent effect calls inert.

Use the canvas or an ordinary 2D render target matching the renderer's complete drawing buffer, at mip zero. The initial supported pipeline is WebGL2, `THREE.NoToneMapping`, standard depth, one camera, opaque scene coverage, a full viewport and no scissor/clipping or XR. Use clear alpha 1 or an opaque `THREE.Color` scene background; the composite retains scene alpha and does not implement transparent-output coverage. Active halos explicitly reject transparent clears without that background, tone-mapped, reverse/log-depth, cube/array/3D, partial-viewport and XR configurations. This preserves the approved LDR palette and avoids changing the rest of a consumer's scene under an unsupported output pipeline. HDR/tone-mapping and transparent-output compositors require separate reviewed adaptations. The inherited 8-bit linear scene buffer and two-sample MSAA can produce small quantization/edge differences from a direct canvas render; this is not a pixel-identical replacement pipeline.

Roots must be visible members of the rendered scene. Ordinary meshes, skinned meshes, morph targets and sprites are supported. Alpha comes from standard material maps/alpha maps, opacity and alpha testing; this is a cutout silhouette, not physically transparent light transport. Custom shader hooks, displacement, clipping, instanced and batched targets reject explicitly. Auto-updating LOD targets/ancestors also reject: settle LOD visibility before the effect call and set their `autoUpdate=false` so the base scene cannot select a different level after masks are synchronized. Geometry, maps, material arrays, sprite centers/rotation/attenuation, skin bindings and manually maintained world matrices can change between frames. Source objects, textures, geometry, skeletons and morph state remain owned by their game. The effect owns only proxy materials, its fullscreen quad and three reusable targets; retired proxies release their materials.

`strength` defaults to 1 and clamps to `[0,1]`; zero skips the target. `width` defaults to 1 and clamps to `[1,2.5]`; both must be finite. Prefer `HALO_WIDTHS.standard` (1) and `HALO_WIDTHS.wide` (1.75). Each distinct width needs its own silhouette/edge pair. The base scene plus composite adds two passes, so one width uses four passes and these two use six. This is a code/test count, not a measured GPU performance claim. Mask/light buffers use 0.75 times CSS dimensions; scene color uses the drawing-buffer dimensions. CSS size and DPR are tracked independently.

The halo keeps the source painting intact, clips silhouettes and spill against scene depth, and restores the supported renderer destination, clear color/alpha, automatic clearing and shadow-update setting even if a pass fails. Owned buffers clear explicitly, independently of host clear flags. It assumes ordinary opaque/alpha-cutout occluders that contribute depth; transparent depthless surfaces and nonstandard deformations are outside this initial contract.

## Game adapter policy

The game supplies already eligible visible roots, reach emphasis and removal when contents are exhausted or an object retires. Farmyard's nearest-item limit, LOS/residency checks, loot rules, ash selection and opened-chest state are deliberately absent from the shared renderer. The effect neither discovers objects nor queries/changes AP, saves, RNG or perception. Scenario discovery exclamation marks and extraction flags remain separate game/UI responsibilities.

## Sources and review

Farmyard commit `7db49df29a9ff412d06d205f4bc48f75297bce51` supplies the approved shader bodies and renderer design. Its original renderer, tests and porting guide remain byte-preserved reference evidence under the `upstream.json` `searchHalo` pin, never executed as engine modules. `tools/snapshot-search-halo.mjs` reads Git objects only and verifies dependency resolution before writing a new immutable snapshot. The two Farmyard gameplay imports are excluded by renderer extraction. Three module/core and the MIT notice reuse the existing AFT pin; source and engine hashes plus a CRLF/LF comparison are recorded without rewriting either original.

Nautilus adds material/geometry reconciliation, manual-matrix support, independent CSS/DPR sizing, explicit owned-buffer clears, complete supported destination restoration and explicit capability failures. The reviewed gold/edge/composite shader strings are unchanged and covered by a regression check. The [intake record](intake/2026-10-28-search-halo.md) documents design selection and adoption limits.

After `npm run build && npm run serve`, open `/examples/search-halo.html` to inspect standard and wide profiles, a painted alpha sprite, a posed skinned mesh, light phases, reduced motion and foreground occlusion. The example uses engine-owned procedural fixture geometry/art, not Farmyard game state or imported models.
