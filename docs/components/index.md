# Component usage cards

This is documentation metadata, not a runtime registry or capability declaration. It follows the [fixed builder handoff standard](https://github.com/Syntaxswine/nautilus-engine/blob/1c2b94c0cf0c86947c4e5f3da78c7d2d8404ea66/docs/component-handoffs.md). Status and executable availability are separate: a proposed card does not enable content or override a consumer's compatibility checks.

| Component/content identity | Status | Usage guide, working boundary and checklist |
| --- | --- | --- |
| `people:bear` / model `bear` | Proposed integration; provider and appearance contract pending | [Bear discovery and authoring](bear-authoring.md): current public v0.8 comparison/refusal example, intended normal/Red Hat equipment workflows, required connections, save/block checks and missing-capability remedies |

The index and guide ship with the core, renderer, asset and compatibility distributions. They require no editor, renderer or title screen to read. Their current working example targets the installed headless `@nautilus-engine/core` package; an asset-only installation contains the instructions and explicitly identifies the additional authoring package it needs. [Distribution profiles](../distribution.md) distinguish these packages.

The bear's eventual public discovery metadata must link this same maintained guide after its reviewed provider is adopted. That connection is pending; no bear runtime entry or new guide-index API is declared here. Other components acquire cards when they are reviewed rather than through a wholesale backfill.
