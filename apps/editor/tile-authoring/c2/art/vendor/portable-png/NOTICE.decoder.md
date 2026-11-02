# Private decoder proof notices

Pako 2.1.0 is pinned to nodeca/pako commit
3c06216518c259b569a5168dee867e6dabbe5160, under MIT AND Zlib.
The exact seven source files, upstream LICENSE and lib/zlib/README are preserved
under this candidate’s vendor/pako/3c06216518c259b569a5168dee867e6dabbe5160/.
See that LICENSE and README for the complete, unchanged notices.

adapted/pako/ contains altered copies with allocation, copy and logical progress
instrumentation. The original embedded notices remain. Every altered file starts
with an alteration notice inherited from the preparation spike. These are not
original Pako files. adaptations.json records the source and altered hashes and
47 textual substitutions. verify-adaptations.mjs reproduces them in memory.
No new DEFLATE algorithm is claimed.

The original painterly PNGs and their existing notices remain at their accepted
Artist paths. They are read in place, not copied into this candidate. inputs.json
and golden-oracle.json preserve their exact identities.
