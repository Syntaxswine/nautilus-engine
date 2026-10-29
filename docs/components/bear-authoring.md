# Bear discovery and authoring: builder handoff

## Identity and readiness

| Field | Value |
| --- | --- |
| Stable identities | Shared discovery `people:bear`; model `bear`; outfits `normal` and `red-hats` |
| Status | **Proposed. Actual bear rendering and authoring are not integrated in this checkpoint.** Metadata/readiness preparation and legacy refusal are tested |
| Engine/package baseline | Released v0.8.0, `8c4670450cb2b38c1e1abd811d633c22de9e2b7c`; preparation `d42fc2de10b6ae33174cb2c9e11412936c79a57c` |
| Working public entry | `@nautilus-engine/core` root for the baseline comparison/refusal example below. This is the installed headless profile, not a donor/editor-private import |
| Bear provider/API/profile | Pending a fixed Coder checkpoint reviewed and distributed by the architect; no executable bear API is named speculatively |
| Appearance schema/capability | Pending that same checkpoint. Preserve the original `aft-map-v2`, `aft-block-v1` and species-neutral character-v1 contracts; guide text does not extend them |
| Source and notices | AFT bear `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`; existing twelve rigs remain at `781246a668c723d5a4c5463e70534cc04b6a5641`. Coder must supply the new snapshot's exact notices/resource manifest before adoption; current notices do not claim that import |
| Owners | Coder: provider, resources and appearance contract. Editor: discovery/authoring and this guide. Artist: native paint/rig/socket/clearance evidence. UI: frozen-candidate usability review. Architect: integration and release |

The target is searchable bear discovery, isolated native-scale preview and preserved Guard/NPC authoring. A successful final adoption must retain both outfits, all thirteen equipment identities, facing, role and authored character data through editing, saves and supported blocks. This card does not mark that target complete. The existing v0.8 catalogue remains at twelve visual rigs, with bull/rabbit/dog preview-only and bear absent.

## Connect it to an existing game

| Connection | Current interface/readiness | Builder responsibility and remedy |
| --- | --- | --- |
| Document authoring | Installed `@nautilus-engine/core`: `createBlockDocument`, `openDocument`, preview/apply/history/export | The example below is a **v0.8 comparison/refusal path**. Wait for the reviewed appearance extension before submitting actual bear content |
| Bear discovery/provider/resources | Required, pending reviewed Coder entry and manifest | Use exact package-safe resource URLs from that provider. Missing bear metadata/provider means obtain the reviewed pin; never fetch from a donor checkout or select another species as a substitute |
| Three and renderer | Required only for presentation; exact bear entry pending | Supply the game's retained Three namespace/renderer. Keep metre scale. The provider must borrow these services and declare its owned library/instance resources |
| Supported appearances and motion | Two outfits and thirteen equipment IDs requested; family capabilities pending | Read the provider's actual supported families and restrictions before enabling a pose. An unsupported chair/equipment or traversal combination needs a supported choice/provider, not an unrelated animation |
| Save store | Retained host callbacks, demonstrated below as an in-memory stand-in | Store only committed validated document bytes. Stage a replacement before changing the live session; preserve unsupported input for migration/review |
| Game adapter and capabilities | Required for game handoff; bear declaration pending | Bind the game's adapter once, then negotiate its real schema/capability declarations. Add the missing semantic provider or retain the source world; do not add guide fields to a strict runtime manifest |
| Movement, doors/stairs, combat, inventory and fire | Host decisions/providers, not supplied by the visual bear | Bind compatible geometry/commands/time/persistence separately. A visible door/stair or a played throw marker does not compile a route, spend inventory or commit another effect. Missing semantic compiler/recipe work stays a Coder/adapter-owner integration gap |

### Installed working example: retained save store and preserving refusal

Install the reviewed headless core package profile, then run this code in Node 22 or later. `retainedStore` is an example host service, not an engine export. No renderer, editor, donor import or new schema is required. The assertion refusing bear is specific to the v0.8 baseline and must be replaced by the reviewed positive bear example when its appearance contract is adopted.

In the reviewed source checkout, `npm run pack:core` creates `artifacts/distribution/nautilus-engine-core-0.8.0.tgz`. Copy that tarball into the existing game's project and run `npm install --offline --ignore-scripts ./nautilus-engine-core-0.8.0.tgz`. Save the following snippet as `bear-handoff.mjs` there and run `node bear-handoff.mjs`. Runtime imports resolve only the installed package. This documentation candidate keeps baseline runtime version 0.8.0 for proof; it is not a newly promoted release.

<!-- installed-example:start -->
```js
import assert from 'node:assert/strict';
import {createBlockDocument, openDocument} from '@nautilus-engine/core';

const retainedStore = {
  value: null,
  write(json) { this.value = json; },
  read() { return this.value; }
};
const author = createBlockDocument('Bear handoff baseline');
const apply = command => {
  const result = author.apply(command);
  assert.equal(result.ok, true, result.error);
};
apply({tool:'floor', start:{x:0,y:0,z:0}, end:{x:23,y:23,z:0}, options:{}});
apply({tool:'guard', start:{x:5,y:5,z:0},
  options:{species:'cow',outfit:'normal',weapon:'rifle',heading:90}});
apply({tool:'npc', start:{x:9,y:5,z:0},
  options:{species:'cow',outfit:'red-hats',weapon:'pistol',heading:225}});

const committed = author.export();
const unsupported = author.preview({tool:'guard', start:{x:13,y:5,z:0},
  options:{species:'bear',outfit:'normal',weapon:'rifle',heading:90}});
assert.equal(unsupported.ok, false); // Current baseline has no bear capability.
assert.equal(author.export(), committed); // Preview/rejection did not edit it.

retainedStore.write(committed);
const staged = openDocument(retainedStore.read());
assert.equal(staged.export(), committed);
assert.deepEqual(staged.map.guards.map(actor => actor.character.category),
  ['combat','npc']);
assert.equal(staged.map.guards[0].species, 'cow');
assert.equal(staged.map.guards[1].outfit, 'red-hats');
console.log('Installed baseline: comparison roles/save roundtrip and bear refusal passed.');
```
<!-- installed-example:end -->

### Intended bear placement/save steps after the reviewed pin

These steps are blocked until `people:bear` is actually registered and its required appearance capability is implemented. They are an acceptance recipe, not instructions to bypass the current validator.

1. Pin the reviewed provider/engine, locate this card through discovery and verify notices/resources and supported capabilities. Stop if the entry is absent or marked unsupported.
2. Open **Asset library → People**, search **bear**, select `normal` or `red-hats`, and choose an equipment ID from `hands`, `knife`, `pistol`, `rifle`, `assault`, `smg`, `hmg`, `shotgun`, `sniper`, `grenade`, `launcher`, `rpg`, `flamethrower`. Compare against the 26 cases in the acceptance fixture; preview must not change the open document/history.
3. Use the supported authoring binding. Reproduce the fixture's regular **Guard** at `(5,5,0)`, rifle, heading 90, and Red Hat **NPC** at `(9,5,0)`, pistol, heading 225. Select/edit each; verify the complete character IDs, categories, names, script IDs and relationship remain intact. Test all eight declared headings.
4. Undo and redo placement, facing and appearance edits. Invalid/stale requests must preserve the current map and redo stack. Confirm two differently equipped bears remain independent.
5. Use **Save in this browser**, reload and explicitly recover the saved design. Export native JSON and import it into a fresh document. Compare exact preserved appearance/authored fields rather than only the visible mesh. Reject unknown/future/unsupported forms before replacing the live state.
6. Capture the supported 24 × 24 block, reload/rotate it, place it in a full map and export/reload again. Check remapped duplicate character identities and internal relationships according to the actual reviewed block contract; do not truncate unsupported fields.
7. Bind an explicitly compatible game adapter and test success. Repeat with bounded Tinderbox and another unsupported consumer: refusal must occur before their live game callback runs, while retaining the source document. Add the missing adapter capability/provider or keep an extended save; never convert the bear to a different saved species.

## Parts, units and ownership

Editor ground coordinates are `(x,y)` in metre tiles with layer `z`; the legacy visual adapter maps to Three `(x,height,y)` at 2.12 m story spacing. Keep native root scale `[1,1,1]`; fit the camera rather than resizing the actor. Verify the reviewed provider's foot origin, handedness, body bounds, equipped bounds and sockets before adopting its spatial profile. A paint projection frame is not a collision box.

Compare against the fixture's native **2 m** wall, **0.12 m** slab, **2.12 m** floor interval and **1 × 1.65 m** doorway. The one-tile authoring reservation does not establish standing/prone/door/ceiling clearance. Preserve the bear's native tail, eye/hand anchors, Red Hat paint and cap fit, and its HMG/RPG carries; exact native part/socket records and measured bounds await the provider/Artist checkpoint.

The editor owns proposed inputs, isolated previews and document commits. The host owns persistence and gameplay authority/time/random streams. The visual library/instance must expose exactly-once teardown; stop motion first, retire only owned instance/library resources and preserve borrowed renderer/textures. Failed/partial/late loads need cancellation-generation checks, explicit retry and safe close/reopen. Do not inherit both the old inspection skeleton cleanup and the donor bear's skeleton disposal. This ownership contract must be verified against the actual provider before its checklist item is checked.

## Saves and game decisions

This editor workflow saves authored content, not running combat/movement or a game clock. Its preview/pose state is not an authoritative action. Mid-action game restore is therefore outside this authoring example: the game's own save/command providers must restore progress and deduplicate committed events. Sampling a pose must not replay a throw/projectile or resource charge.

The reviewed appearance extension must name its actual schema/profile/capability versions and unknown-field/migration policy. Those identities are pending. Preserve complete character data and older map/block behavior. If v0.8 reports `Use at most 46 guards (50 characters including the squad).` for the bear fixture, the cause is unsupported species, not population: keep the input and obtain the reviewed extension rather than deleting characters or changing species.

Games retain cast/faction/statistics, inventory, AP/time, detection, damage, movement, geometry and fire policies. Art/style customization may use supported outfit/equipment choices while preserving socket/scale contracts. Automatic semantic recipes are a longer-term goal; missing actor/world bindings and door/stair compilers remain explicit work, not new runtime behavior in this guide.

## Builder checklist and evidence

The source fixtures and tests below are linked at fixed preparation commit `d42fc2de10b6ae33174cb2c9e11412936c79a57c`; they are not donor/editor-private imports required by the installed example. [Fixture directory](https://github.com/Syntaxswine/nautilus-engine/tree/d42fc2de10b6ae33174cb2c9e11412936c79a57c/tests/fixtures/editor-bear) and [preparation evidence](https://github.com/Syntaxswine/nautilus-engine/blob/c224f887d95c714a801cbba71d6677b277a88d8b/docs/reviews/2026-10-29-editor-bear-preflight.md).

- [ ] Locate the final bear public entry, full resource/notices manifest and appearance declaration in an installed package. **Pending Coder/architect pin**; only this guide and the baseline example are installed now.
- [x] Read headless outfit/equipment metadata before native tools/WebGL. `tests/editor-asset-appearance.test.mjs` covers both bear-intent outfits and thirteen IDs; no bear rendering is claimed.
- [x] Preserve the comparison/negative fixtures: `comparison-cow.block.json`, `unsupported-v0.8-bear.block.json`, `acceptance-intent.json`. `tests/editor-bear-intake.test.mjs` verifies authored Guard/NPC identities and atomic v0.8 refusal with redo retained.
- [ ] Run actual bear discovery, both outfits × thirteen equipment choices and native pose/socket/clearance checks. **Pending provider and Artist review**; the 26 rendered Cow comparisons establish only the existing-animal baseline.
- [ ] Place/select/edit/face the actual fixture bears, undo/redo each edit, and retain character IDs, categories and relationships. **Pending appearance document binding**; existing restrictions stay enabled.
- [ ] Save/reload, export/import and supported block capture/rotation/placement with actual bear records. **Pending positive saved form and block contract**. The installed example proves the retained baseline save store and negative path only.
- [x] Exercise current preview readiness, constructor/draw failure, explicit retry, close/reopen and stale selection. `tests/editor-assets-lifecycle.test.mjs` and `tools/review-editor-bear-preflight.mjs`; prior evidence records no main-document mutation.
- [ ] Repeat loading/cancellation/retry/disposal for the real bear provider, two concurrent equipment/outfit instances, and survival of borrowed resources. **Pending exact provider ownership API**.
- [ ] Exercise actual bear capability negotiation and unsupported-consumer refusal before game mutation. **Pending capability and adapter declarations**; a guide field cannot grant support.
- [x] Review the existing comparison/metadata paths on desktop and 390 px phone, including no-WebGL metadata and expected graphics errors. Preparation evidence is fixed at `c224f887d95c714a801cbba71d6677b277a88d8b`.
- [ ] Record the final engine/consumer checks, reviewed bear candidate, rollback and separate game adoption pin. Preparation passed 364 engine tests, 32 upstream tests and build; this is not final bear acceptance.

The preferred boundary preserves the native bear and semantic references (**accuracy**), loads an independently pinned provider lazily without claiming unmeasured speedups (**efficiency**), and retains regular/Red Hat identity while games own faction and rules policy (**narrative**). Recorded comparison counts are measurements; biological realism, physical clearance and performance require their own evidence.
