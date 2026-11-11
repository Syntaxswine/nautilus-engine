# Babble Lab source and reuse

This optional audio component reuses Syntaxswine/babble-lab at
`0df4be4a05cfa7b636624e1911c5413a9fe844cd`. Every tracked file from that commit is
preserved without edits in `vendor/babble-lab/0df4be4a05cfa7b636624e1911c5413a9fe844cd/`.
Its `provenance.json` records the original commit object, complete Git tree,
file modes, Git blobs, SHA-256 values and byte counts. Nautilus entry points and
static-build selection live outside that snapshot.

The repository owner explicitly authorized importing and reusing the entirety
of Babble Lab in this sound-engineer task on 2 November 2026. The original
`package.json` declares MIT; that commit contains no separate LICENSE file, so
this notice does not invent a missing upstream copyright or license text.
The original README, attributes, code comments and asset-source references are
retained. This permission does not change third-party recording licenses.

The committed engine, tools, examples, tests and standalone builds are included
in the source import. Local `banks/`, `audition/`, `out/`, game video, downloaded
recordings and dependencies were untracked and were not imported. The source
README explicitly identifies the example Glades of Arcadia bank as
non-commercial; source manifests and download tools are references, not bundled
audio or a new grant to those assets. Asset downloads remain deliberate.
