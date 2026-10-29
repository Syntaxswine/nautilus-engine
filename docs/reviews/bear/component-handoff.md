# Bear: builder handoff

This proposed artist card follows the [handoff standard at `1c2b94c0cf0c86947c4e5f3da78c7d2d8404ea66`](https://github.com/Syntaxswine/nautilus-engine/blob/1c2b94c0cf0c86947c4e5f3da78c7d2d8404ea66/docs/component-handoffs.md). It describes the fixed source reference and the remaining integration obligations. It does not add runtime fields, a public socket API, a manifest, or playable behavior. Find this card through the adjacent [artist review index](README.md).

## Identity and readiness

| Field | Value |
| --- | --- |
| Content identities | Native source profile `bear`; intended shared discovery ID `people:bear` from the commissioned proposal. The latter is absent from the released v0.8.0 catalogue. |
| Status | Proposed artist handoff. The source-reference stage is complete; integrated provider/editor acceptance and game adoption are pending. Appearance and motion evidence do not establish playable behavior. |
| Engine baseline | Nautilus v0.8.0, `8c4670450cb2b38c1e1abd811d633c22de9e2b7c`. The existing AFT snapshot `781246a668c723d5a4c5463e70534cc04b6a5641` is unchanged. |
| Public entry | Existing headless discovery: `@nautilus-engine/map-core/assets`, `listSharedAssets` / `sharedAsset`, `SHARED_ASSET_CONTRACT.version === 1`. No released public bear loader, presentation entry or placement extension exists at this baseline. |
| Profile, state and capabilities | `BEAR_PROFILE` is an unversioned donor profile at the pinned source, not an engine API version. Bear appearance/save schema, capability IDs and optional motion declarations await Coder's reviewed contract. No identifiers are invented by this card. |
| Source | AFT `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`; [59-file review manifest](source-manifest.json) records original paths, Git blobs, byte counts and SHA-256 hashes. |
| Fixed artist evidence | Nautilus `711bc2e3e7b1fd91039b72bc358c3e9f007d1b04`, [report](https://github.com/Syntaxswine/nautilus-engine/blob/711bc2e3e7b1fd91039b72bc358c3e9f007d1b04/docs/reviews/bear/README.md); [passing CI](https://github.com/Syntaxswine/nautilus-engine/actions/runs/40935213997). This is a reference checkpoint, not an integrated bear candidate. |
| Owners | Artist: native art, source semantics, measured bounds and comparable visual evidence. Coder: immutable import, public provider/resources/ownership and appearance contract. Editor: preserved authoring. Architect: fixed checkpoint review and engine integration. Each game owner: adoption and playable bindings. |

The intended result is the existing bear, with its normal and Red Hat paintings, native fitted cap, equipment and explicitly supported presentation families. A successful game adoption must additionally preserve authored identity and connect that appearance to the game's retained systems. This source-only review cannot demonstrate the latter.

## Connect it to an existing game

The table describes bindings the adopting builder must demonstrate once the public bear candidate is supplied. It is not a list of implemented guarantees.

| Connection | Interface/version at this stage | Builder responsibility and readiness check | Failure and remedy |
| --- | --- | --- | --- |
| Content discovery and provider | Headless discovery contract v1 is released; bear provider entry/capability is pending | Select the exact reviewed engine/content pin; resolve `people:bear` and read its actual provider declarations before replacing a live actor | At v0.8.0 discovery has no bear. Stop intake and obtain the reviewed public provider; do not import donor or editor-private factories into a game. |
| Renderer and resources | One borrowed host Three namespace; public bear resource resolver pending | Retain the game's renderer and camera, use package/module-based URLs, await all declared body/paint/cap/prop resources | Missing resource, incompatible Three identity or absent cap dependency must be named by the provider and leave the old scene intact. Coder owns the actual diagnostic contract. |
| Playback and committed events | Public optional bear motion declarations and markers pending | Supply host time and a chosen supported family/equipment combination; render committed events without spending inventory or creating gameplay objects again | Unsupported family/equipment or absent marker must reject explicitly. A rifle study is not a replacement for a different prop. |
| Geometry and floor support | The artist supplies visual triangles and sampled envelopes only; no bear collision, navigation or swept-clearance provider is accepted | Bind host-confirmed floor/support identity, actor hull and equipment-aware clearance queries at native metres | Missing floor, insufficient opening/ceiling clearance or unsupported shape blocks the action. A tile reservation, visual mesh or conservative AABB does not prove safe traversal. |
| Authoring and persistence | Bear schema/capability and positive placement example pending Coder/Editor checkpoints | Preserve species, outfit, weapon, heading, role and authored data; stage and validate a whole load before replacement | v0.8.0 legacy validation does not accept bear. Negotiate the real extension; never substitute another species or drop appearance on export. |
| Lifetime and cancellation | Public bear ownership contract pending | Keep renderer/host services borrowed, stop motion before actor release, invalidate stale loads and release owned partial/late resources once | Validate concurrent instances, cancellation, failed load, retry and reopen. Preserve borrowed textures and original prop carry settings. |

### Working public readiness example

This example uses the released public discovery entry and retains the host's reporting function. At the pinned v0.8.0 baseline the expected result is `ready: false`, with no scene or save mutation. `reportUnavailable` and the returned readiness object are local example code, not new Nautilus APIs or diagnostic codes.

```js
import {listSharedAssets, SHARED_ASSET_CONTRACT}
  from '@nautilus-engine/map-core/assets';

export function inspectBearReadiness(reportUnavailable) {
  if (SHARED_ASSET_CONTRACT.version !== 1) {
    throw new Error('Review the selected discovery contract before intake.');
  }
  const bear = listSharedAssets().find(asset => asset.id === 'people:bear');
  if (!bear) {
    reportUnavailable('Bear is not supplied by this engine pin. Obtain the reviewed bear provider and appearance contract.');
    return {ready: false};
  }
  // Catalogue discovery alone cannot establish provider or gameplay readiness.
  reportUnavailable('Read this pin’s provider declarations and validate the required host bindings before preparing a bear.');
  return {ready: false, discovered: bear.id};
}
```

A positive public prepare/create/present/dispose example and installed-package proof are **missing, Coder-owned work**. This card deliberately supplies no fabricated loader calls. The runnable [source reference consumer](https://github.com/Syntaxswine/nautilus-engine/blob/711bc2e3e7b1fd91039b72bc358c3e9f007d1b04/art/bear-review/source-viewer.js) is independent visual evidence; its private donor imports are not an adoption recipe. Reproduction commands are in [the report](README.md#reproduce-and-next-checkpoint).

## Parts, units and ownership

### Native space and bounds

One unit is one metre. Native Three coordinates are `(+X forward, +Y up, Z lateral)`; root `[0,0,0]` is the authored ground/foot datum, not the centre of the body or a support slab. Keep root scale `[1,1,1]`. The shared kit interval is 2.12 m; this does not assign a floor or grant traversal. The game supplies the mapping from its coordinates and heading convention to the reviewed provider. Donor helpers use different heading signs, so do not bind a game heading to an arbitrary private helper.

These are indexed live-vertex measurements at the source checkpoint, rounded to six decimals. They are pose-specific visual envelopes, not collision hulls or maxima for every possible animation. See [all 260 samples](source-measurements.json) for exact scopes and equipment variants.

| Outfit / sample and envelope | Minimum `[X,Y,Z]` m | Maximum `[X,Y,Z]` m | Size `[forward,height,lateral]` m |
| --- | --- | --- | --- |
| Normal, hands carry: body / visual / equipped | `[-0.269530,0,-0.485770]` | `[0.232832,1.670845,0.485975]` | `[0.502362,1.670845,0.971745]` |
| Red Hat, hands carry: body | `[-0.269530,0,-0.485770]` | `[0.232832,1.670845,0.485975]` | `[0.502362,1.670845,0.971745]` |
| Red Hat, hands carry: visual / equipped, including cap | `[-0.269530,0,-0.485770]` | `[0.232832,1.691898,0.485975]` | `[0.502362,1.691898,0.971745]` |
| Normal HMG carry: equipped, including fitted grasp | `[-0.269530,0,-0.627429]` | `[0.540484,1.670845,0.367209]` | `[0.810015,1.670845,0.994638]` |
| Normal RPG idle, 4.2 s: equipped | `[-0.273428,0,-0.557680]` | `[0.339586,1.652847,0.540642]` | `[0.613014,1.652847,1.098322]` |
| Normal sniper crawl, phase 0: equipped | `[-0.670733,0.006,-0.487740]` | `[1.157517,0.723087,0.639662]` | `[1.828250,0.717087,1.127401]` |

Body is the visible skinned body plus an active fitted grip/cuff; visual adds the cap; equipped adds visible props, mount and hose. A one-metre opening has only 5.362 mm total spare lateral width in HMG carry; the sampled RPG idle and sniper crawl are wider than it. Raw carry-to-prone composition puts seven equipment choices below the floor in both outfits, including RPG at −0.528707 m and HMG at −0.236243 m. [The finding and reproducer](README.md#findings-for-integration) must be resolved or that combination explicitly unsupported. Do not shrink the bear or equipment to pass a clearance check.

### Source parts and attachment references

The following are actual source names/keys, with meaning fixed by AFT `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`. They are review references, **not released public socket declarations**. Coder must map and validate the public semantics before a builder binds them. A missing public socket or ambiguous mapping is an integration failure, not a reason to guess by mesh index.

| Source identity / key | Semantic purpose and native reference | Binding limitation |
| --- | --- | --- |
| `hips`, `spine`, `head` | Main support chain; source bind positions `[0,0.80,0]`, `[-0.025,1.08,0]`, `[-0.065,1.30,0]` m | Bone centres are not floor contacts or actor clearance volumes. |
| `hand1`, `hand-1` | Primary grip and support-side hand; bind positions `[0.061,0.742,0.410]`, `[0.061,0.742,-0.410]` m | Preserve per-weapon/per-family palm offsets, native joints and authored anchors. A single universal hand transform is insufficient. |
| Prop `anchors.grip`, `anchors.support`, `anchors.stock`, `anchors.muzzle` when present | Named equipment contacts/reference points from the selected prop | Query the actual reviewed prop contract. Unarmed, one-handed and other equipment must not be assumed to expose the same active contacts or effects. A muzzle transform does not execute a shot. |
| `hoof1`, `hoof-1`; `plantigrade bear foot 1`, `plantigrade bear foot -1` | Native foot joints and visible paws; bind joints `[-0.035,0.120,±0.232]` m | The sole's measured surface meets Y=0 in carry. Joint height is not the sole/support plane; moving, prone and casualty samples need separate support checks. |
| `connected shirt and sleeves`, `connected overalls seat and legs`, `forearm and hand ±1` | Layered body/garment and hand surfaces | Retain native weights, cuffs and fitted HMG grasp. Clothing is not a separate gameplay body or automatic collision surface. |
| `unified bear skull rounded ears and muzzle`; profile `eye` | Head surface; eye/sight reference `[0.079,1.515,0.107]` m in native bind space | Convert bind-space reference through the declared rig binding; it is not already head-local and does not define a complete vision system. |
| `short bear tail` | Separate painted bob following the source hips weighting | Preserve the tail registration correction; no standalone tail gameplay, collision or long-tail animation is declared. |
| `fitted Red Hat cap`, attached to `head`; `BEAR_PROFILE.redHatFit` | Native cap fit uses centre `[-0.015,1.625,0]` m and cap-only fit scale `[0.91,0.67,0.85]` | This shapes the cap geometry and leaves the actor at scale one. Requires pig-foreman cap geometry/paint; do not replace with a generic oversized cap. |
| Animation semantic markers | No released bear marker contract at the v0.8.0 baseline | Coder must declare supported markers, units and seek/replay semantics. Study flash/trace flags are not durable game event IDs. |

### Outfit and motion limits

Outfit IDs are exactly `normal` and `red-hats`. Preserve the native painting for each; generic faction-uniform painting must not overwrite it. Equipment choices are exactly `hands`, `knife`, `pistol`, `rifle`, `assault`, `smg`, `hmg`, `shotgun`, `sniper`, `grenade`, `launcher`, `rpg`, `flamethrower`. These source identities do not authorize inventory or combat behavior.

| Presentation family | Fixed source evidence | What the builder still needs |
| --- | --- | --- |
| Carry / armed idle | Both outfits and all 13 choices; three idle samples per choice, seek/replay, native contacts and borrowed carry restoration measured | Actual public provider declarations, concurrency and transitions; preserve HMG/RPG fits. |
| Kneel / raw prone posture | All 13 choices measured; selected paired captures; prone floor failure recorded | Equipment-specific accepted composition or explicit rejection. No blanket prone acceptance. |
| Crawl | Four measured phases across all 13 choices; four paired HMG captures | Fixed provider and host swept/body/equipment clearance, not just hand contacts. |
| Locomotion / mammal aim-fire study | Three paired rifle travel samples; six rifle sequence times including aim/recoil/rise | Other prop families and the public provider's coverage must be declared and reviewed. The direct mammal study uses its internal rifle. |
| Separate `createProneMotion` study | Source explicitly accepts horse only | Unsupported for bear; do not redirect to a horse rig. |
| Grenade/throw, ladder/ledge/roof, casualty/fire, chair, speaking | Not independently accepted through a fixed Nautilus bear provider yet | Review each declared family and marker. Chair remains unarmed. Unsupported families must not silently use another animal or unrelated prop. |

The host creates and persists gameplay actors and committed actions. The future bear provider creates its presentation instance, accepts supplied playback time and releases owned rig/paint resources. The retained renderer, clock, game state and any explicitly borrowed textures stay host-owned. Raw source paint disposal owns its input texture; an adapter must define texture leases/copies rather than passing a shared host texture to an owning disposer. Stop motion before actor disposal; handle partial/late loads and stale requests; restore borrowed prop carry settings. The source benchmark validates one reference path, not all those provider lifetime guarantees.

### Required resources and notices

| Resource | Source path and role |
| --- | --- |
| Body | `dist/tactics/bear-10k-data.json`, 419,919 source bytes, plus its source factory/rig closure. Author data is review evidence, not a required game payload. |
| Normal painting | `dist/assets/characters/lowpoly-proof/bear-worker-model-paint-v1.png`, 1,590,125 bytes. |
| Red Hat painting | `dist/assets/characters/lowpoly-proof/bear-red-hat-model-paint-v1.png`, 1,746,454 bytes. |
| Cap | `dist/tactics/pig-foreman-10k-data.json`, 701,071 bytes; `dist/assets/characters/lowpoly-proof/pig-foreman-model-paint-v1.png`, 1,635,690 bytes; fitted cap/painter closure. The source cap factory uses document-relative fetch, which needs a package-safe adapter. |
| Equipment / motion | Selected prop's code/data/paint and the declared family dependencies; source keys alone are not a closed production manifest. Optional portrait/speaking resources need explicit inclusion if supported. |
| Notices | Preserve original source notices and Three's complete MIT notice (`dist/tactics/vendor/THREE-LICENSE.txt`, hash in the manifest). [Nautilus notices](../../../NOTICE.md) explain differing/unspecified source rights; this card adds no licence grant. |

Use [the source manifest](source-manifest.json) for full hashes and inspection/runtime-root distinctions. Its 16,695,637-byte reference cache includes review-only files and a source Three runtime; it is **not** the production import or packaged-byte budget. The reference branch imports zero runtime bear bytes. Coder owns the minimal immutable snapshot, dependency closure, notices and installed-resource proof, sharing the live host Three instance.

## Saves and game decisions

The artist reference owns no application save state. Its sample outfit, equipment and time are disposable review inputs, not a new save schema. Bear placement/persistence remains unimplemented at the fixed baseline. Before adoption, Coder and Editor must provide the actual versioned appearance representation and example save/load, preserving species, outfit, weapon, heading, role, authored character data and required capabilities. Unknown/unsupported data must be preserved or rejected atomically according to the selected public contract, never silently dropped. Statistics remain species-neutral; loading appearance must not refill resources or normalize damage.

The host owns inventory, cast/factions, permissions, AP/time costs, movement/turn scheduling, combat, fire, vision, hit/collision geometry and confirmed effects. It chooses safe routes/openings for active body/equipment envelopes and supplies floor identity. For supported mid-action restoration, stage the complete gameplay and presentation state together; restoration/seek must not spend a second item, create another projectile or repeat a release effect. No accepted bear mid-action schema or marker deduplication contract is supplied by this artist card.

Style substitutions may change presentation only after checking native registration, cap/eye/cuff/tail fit, contacts, bounds and supported motions. Keep metre scale and native pivots; adjust cameras. Any changed geometry/painting needs its own source/candidate comparison. A gameplay or geometry-policy change belongs in the adopting game's explicit review.

## Builder checklist and evidence

The completed artist evidence below is tied to `711bc2e3e7b1fd91039b72bc358c3e9f007d1b04`; the runtime baseline remains `8c4670450cb2b38c1e1abd811d633c22de9e2b7c`.

| Artist proof completed | Fixed evidence and practical limit |
| --- | --- |
| Native measurement and source identity | [Manifest](source-manifest.json), [260 samples](source-measurements.json), [structured findings](source-findings.json). Body 10,050 triangles from 27,298 author triangles; cap adds 700. Contacts below `5e-16` m in measured samples. Visual envelopes are not collision acceptance. |
| Comparable appearance and selected motion | [44 paired captures and browser report](source-browser-review.json), source Three r180, Edge 156.0.4314.50, Node v24.15.0, 1600×1100 software WebGL; zero browser/resource errors. Native source reference, not integrated provider/editor or physical-phone acceptance. |
| Local and remote regression checks | [Local receipt](checks.json): integrity, 357 engine tests, 32 upstream tests and build. [Both GitHub jobs passed](https://github.com/Syntaxswine/nautilus-engine/actions/runs/40935213997). These do not resolve the visual findings. |
| Cleanup | [Four exact helper lifetimes ended, all four ports released, zero retained helpers](source-helper-cleanup.json). Source-only bench excluded from deployed editor. |

The following is the **adoption** checklist. Items remain open because this source-reference card is not a playable provider. Attach the actual reviewed engine/provider/editor/game pins and fixture results before checking them.

- [ ] Locate this guide, the bear's actual public entry, resources, notices and positive runnable example in the installed distribution. **Coder:** public provider/card packaging and installed proof pending.
- [ ] Bind and validate retained renderer/time/geometry/persistence services and exercise missing/incompatible providers. **Coder + game builder:** actual contract and diagnostics pending.
- [ ] Verify public semantic/socket mappings, units, body/visual/equipped bounds, floor/support and capabilities. **Coder + Artist + game builder:** use this source evidence; integrated semantics and swept clearance remain open.
- [ ] Run successful discovery, presentation and preserved Guard/NPC authoring without duplicate actions/costs/events. **Coder + Editor + game builder:** await fixed candidate; discovery alone is insufficient.
- [ ] Verify stale/repeated requests, rapid equipment changes, two concurrent bears, failed/late loads, cancellation and retry without live-state damage. **Coder + Editor:** provider tests and real browser evidence pending.
- [ ] Save/reload and export/import supported map/block appearance and mid-action state; reject unsupported consumers atomically. **Coder + Editor + game builder:** real schema, fixtures and host transaction needed.
- [ ] Review actual desktop/phone controls, metadata-only WebGL failure, loading/retry, visual quality and the declared optional motion families. **UI + Artist:** integrated fixed-candidate review pending; source captures are comparison material.
- [ ] Dispose/reopen and prove exactly-once owned cleanup plus survival of borrowed renderer/textures and restored prop settings. **Coder + game builder:** integrated lifecycle proof pending; source helper cleanup is already recorded separately.
- [ ] Record engine and game checks, accepted exact pins, rollback and separate game adoption. **Architect + game owner:** no game pin, production deployment or playable acceptance was changed here. Roll back the guide independently, or retain the prior engine pin if candidate adoption fails.

**Accuracy:** for AFT/Farmyard-style use, prefer the actual bear's fitted body, original outfits and named anchors; separately validate support, active equipment and physical clearance. The source prone composition is a measured integration trap, not permission to stretch a different animal or rescale this one.

**Efficiency:** prefer a separate lazy provider and package only its closed resource requirements. Counts and source byte budgets above are measured; CPU/GPU/phone timing and savings from automatic wiring are unmeasured. Keep the heavier source bench outside runtime packages.

**Narrative:** preserve both native paintings, cap and short-tail identity while leaving faction, inventory, rules and effects to the game. This is the preferred appearance boundary; optional behavior becomes usable only through declared, reviewed host bindings.
