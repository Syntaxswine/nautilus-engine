# Optional Mount Dora component

Public headless entry: `@nautilus-engine/map-core/mount-dora`.
Optional renderer entry: `@nautilus-engine/map-core/mount-dora/three`.
Large resource package: `@nautilus-engine/mount-dora-content` (opt-in only).

Read [the contract](../../docs/mount-dora.md) before binding a consumer. The default SDK contains small APIs, not the town’s large upstream payload. The compiler preserves original bytes separately and emits a source/runtime ledger. No donor application is imported.

```js
import {createMountDoraCatalog,openMountDoraDocument,createMountDoraWorld}
  from '@nautilus-engine/map-core/mount-dora';
import * as runtime from '@nautilus-engine/mount-dora-content/headless';

// Browser HTTP fetch, or an explicit file fetcher in Node.
const project = await fetch(runtime.projectURL).then(r => r.json());
const catalog = createMountDoraCatalog(project);
const sector = catalog.sector('B03');
const reference = await fetch(new URL(sector.file,runtime.baseURL)).then(r=>r.json());
const document = openMountDoraDocument(reference,{
  catalog,reference,placements:runtime.art.placementsForBounds([240,480,480,720])
});
const world = await createMountDoraWorld({project,runtime,baseURL:runtime.baseURL});
// Bind world.scene / walking / readPose into normal player setup.
// For native changes, stage candidate geometry before committing the document.
// Save world.checkpoint() atomically with document.export() and setup state.
world.dispose();
```

`openMountDoraDocument` is the single document/history authority. Do not mutate the borrowed source view or maintain a parallel editor state. The live adapter supports native ground/new-wall/guard metadata edits; art-backed source shells, upper masks and unbound features refuse explicitly. Water-only native imports refuse without losing lake content. Unknown interiors and entrances are not generated.

`walkSupportedActor` belongs to the interactions entry. Its default natural step is 0.265 m; the town host explicitly records the source-deck compatibility profile. Keep exact actor pose, floor, travel receipt, revisions, resources and selected profiles on reload. Rendering/cutaway is not physical authority. The photo-guided profile automatically binds its canonical part graph; mismatched custom render/collision parts refuse.

The renderer borrows shared Three and the town atlas; its surface owns environment/instance buffers and closes them through `dispose()`. The host owns world/session persistence and must dispose the setup before the world. Data/resource URLs must resolve within the installed content package or an explicitly configured host. No automatic publication or donor pin update occurs.

Source intake, resource generation, optional package/site creation and focused review tools live in `tools/mount-dora/`. All browser reviews use the bounded task-owned helper and preserve restart sources and cleanup receipts. Draft captures are not clean-source delivery evidence.

Run `npm run pack:mount-dora` for the offline resource tarball, `npm run build:mount-dora` for the local static reference, and `npm run test:mount-dora:installed` for an offline installed SDK/content proof plus a static copy made from actual installed bytes. Outputs stay under ignored `artifacts/`; these commands do not publish. The resource package uses the compatibility SDK peer for shared Three; browser hosts bind that public specifier in their import map.
