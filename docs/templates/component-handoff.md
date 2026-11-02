# <Component name>: builder handoff

Copy this guide for one component using the [handoff standard](../component-handoffs.md). Replace placeholders and remove these authoring instructions before delivery. Link the completed guide from the component's public usage card. This template defines documentation, not new runtime APIs or manifest fields.

## Identity and readiness

| Field | Value |
| --- | --- |
| Stable component/content ID | <actual ID> |
| Status | <proposed / reviewed candidate / released> |
| Engine/package pin and public entry | <exact version/commit and supported import/resource> |
| API, profile, state schema and capabilities | <actual separate identities/versions, or reason inapplicable> |
| Source and notices | <immutable source pins, notices and asset dependencies> |
| Maintainer and integration owner | <owners> |

<Describe the implemented purpose, intended game/use case and observable successful result. List unsupported cases and missing work.>

## Connect it to an existing game

| Required or optional connection | Interface/version | Host value and responsibility | Missing/incompatible diagnostic |
| --- | --- | --- | --- |
| <service/resource/callback> | <actual contract> | <how the builder supplies its retained system> | <code/path and remedy> |

<Give the smallest working example through public imports. Show readiness validation, preparation, the successful action, authoritative commit/presentation where applicable, and teardown. Link its runnable consumer and installed-package proof. Distinguish example host functions from engine exports.>

## Parts, units and ownership

<List native axes/units, origin, bounds, floor/surface identities, semantic IDs/sockets and collision assumptions, or explain why spatial data is inapplicable.>

<State who creates, borrows, advances, commits and disposes each resource. Cover partial/late loads, cancellation, failure/retry, stale or repeated actions and event deduplication.>

## Saves and game decisions

<Show save/load or state explicitly that there is no owned saved state. Name schema/content requirements, migration/unknown-field policy, mid-action behavior and atomic rejection.>

<List the game's remaining policy choices and supported art/style customization. Do not hide required gameplay work behind a cosmetic example.>

## Builder checklist and evidence

- [ ] Pin and locate this guide, the public entry, resources, notices and runnable example in the installed package.
- [ ] Bind and validate the named host services; exercise missing/incompatible providers.
- [ ] Verify semantic references, units, bounds and capability limits where applicable.
- [ ] Run the actual successful workflow without duplicate commits, costs or events.
- [ ] Verify stale/repeated requests, failure/cancellation/retry and unchanged live state on rejection.
- [ ] Save/reload supported state and reject incompatible state atomically.
- [ ] Review the actual desktop/phone and visual/accessibility paths that apply.
- [ ] Dispose/reopen; verify ownership and stop disposable helpers.
- [ ] Record engine/consumer checks, reviewed commit, remaining limits, rollback and separate adoption pin.

<For every checked item, name its fixture/result and exact reviewed commit. Give reasons for inapplicable items. Include device/runtime, measured costs where relevant and helper cleanup. End with the preferred accuracy/efficiency/narrative choice for the named use case and distinguish measurements from estimates or judgments.>
