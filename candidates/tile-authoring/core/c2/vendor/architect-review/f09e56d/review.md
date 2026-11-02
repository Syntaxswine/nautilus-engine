StageB f09e56dfcb5d72f0721b9a283883410361b26916 needs one focused correction pass. Two must-fixes are reproduced against the actual fixed private API and real original PNG bytes.

1. portable.js46–51 measures output metadata before updating the work snapshot it returns. A2703230-byte limit is accepted while final metadata plus payload actually requires2703236 bytes. Charge or conservatively reserve the final scalar widths; keep caps unchanged.
2. portable.js13/35 uses realm-dependent instanceof to reject SharedArrayBuffer. Genuine foreign shared buffers holding both original pages pass. Use intrinsic buffer branding and retain ordinary/foreign non-shared, getter-avoidance and owned-copy controls.

All16 committed B controls pass, including exact30 artwork/default capture, source/preset-save preservation, cumulative save meter, actual2,560,200-byte round trip, corruption/path/closure/accessor checks and explicit combined-placement refusal. Those tests do not cover these witnesses. The accepted38 A controls were not repeated.

All590 extracted files remain exact fixed Git bytes.18 private runtime inputs,83 unchanged accepted dependencies, original Artist PNG bytes/notices and fixed hash source are authenticated. All4 actual normal distribution inventories/exports remain exact8184 (303/145/224/366), candidate excluded. The combined-route packet is proposal-only and is not approved here. Synthetic binder/native/sharing DTOs are not actual native or Host proof.

Both own foreground lifetimes are absent; the synchronous test child exited0. No services, ports, signals, tracked Root/worker changes, installs, browser/profiling or publication. Evidence: portable-results.json plus executable exact-source probe and immutable snapshot inventory.
