# Original Nautilus painted equipment revision

Original mesh simplification, per-part UV registrations and packing: Nautilus Artist, 26 November 2026. Original painterly bitmap masters were created with built-in imagegen edits against the retained SVG/PNG UV guides. Exact prompts, original selected outputs and the one corrected round-shield back master are preserved in `source/`. Only the corrected back cell is selected from that edit; the remaining shield cells retain their first master. No third-party art or donor files are newly imported.

The new mesh treatment removes raised wraps, small rivets, engraved/fullered overlays, individual board faces, decorative badge relief and other surface-only pieces. Those details are painted. Functional depth, outer form, shield boss, grasps, apertures and moving limbs/string/projectiles remain native-metre geometry. No combat, timing, actor motion or save system is supplied or changed by this art revision.

The factory borrows the host Three namespace. It creates one owned 512-square texture per instance and uses existing standard materials, without a new shader or texture-pooling service. The imagegen masters are retained authoring inputs; UV packing, palette quantization and lossless byte decoding are reproducible from those bytes. No claim is made that stochastic image generation reproduces an identical master from prompt text alone.

Earlier original art notices and provenance remain preserved at their historical paths. Current resource/UV/source hashes are in this directory's `provenance.json`. The fixed integrated reference for comparison and grip invariance is `5d19e6198b25e14ef98caf8dbad04ba739f96506`. Native goat/Three references use the existing engine pins and notices and are not copied into this art package.
