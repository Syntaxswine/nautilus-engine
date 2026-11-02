# Source and notice boundary

The four runtime modules in this directory are newly authored private Nautilus adapter code. They contain no copied Core importer, artwork raster or decoder. Their use does not grant a license to any donor material or widen the repository's existing notices.

`vendor/ui057/projection.d.ts` is preserved exactly from Nautilus commit `05723c3cada36249c6b6777dd40c8a478701bccb`, path `docs/reviews/tile-authoring/ui/c2/projection/projection.d.ts`. It is internal design evidence. Its original proposal/readiness comments remain intact.

The test-only stager reads Core `53d7d1f4bc4b5a8205e16cbbf6a29672e6f9db32` and public metadata `42c1a61d1e8836f22ee59d74d52779aa920a91fa` from immutable Git objects. Their original bytes/imports and notices are not rewritten. Those staged sources, fixtures and PNGs are ignored proof inputs, not this candidate's shipped runtime. The public metadata promotion preserves original Artist `57c651fb0a7ed0b01c1435ba18e87efde290443a` artwork defaults and Core `43227894c50ec62b71806978195fff2c650eb388` canonical records under the reviewed `06dee5b01eeefddbe5e92a3f71d4382dffad0986` source ledger.

The returned pack keeps the selected original artwork's complete `body.notices` record byte values. Consumers must retain those notices and the original full PNG bytes when they later adopt/export that content. Discovery, verification and prefix construction are not adoption, licensing clearance, upload or a second persistence authority.
