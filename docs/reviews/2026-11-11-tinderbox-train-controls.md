# Tinderbox train controls integration

Main `8ee9008764749e04856d6916b0193ebe5b7f62cc` contains the complete reviewed railway stack from PR53. Its tree matches tested `4d0f7e495d75a607c9bc4c026ab100c50e7c07b4`. This tranche evaluates Tinderbox's compact steam control against that foundation.

## Fixed source and scope

The donor is Tinderbox `fb0628605c274550ff8abad50b151843f08747d1`, including `9b453e6510de2f620008ffa206b20bfd91b69a71`. Relevant source is `src/ui/train-{control.js,control-model.js,control.css,click.js}`, with its guide, provenance and recorded review under `docs/ui/train-controls/`. Import only committed Git objects, preserve original source bytes and notices, and keep Nautilus adaptations separate. The donor guide establishes an optional v1-connector binding and scripted UI review, not production train adoption.

UI owns the compact profile, source closure and focused review. Architect owns package/build registration, the real two-circuit binding, combined acceptance and main integration. Character resources, rail simulation, save formats and game pins remain host-owned.

## Design decision

**Accuracy:** Persistent fixed notches resemble a physical control more closely than a power button held by the finger. Forward II/full power, Forward I/half power, neutral/coast and reverse/half power are prototype UI policies, not calibrated steam-locomotive controls. The pull-chain brake is deliberate fiction. Reversal eligibility, motion and confirmed brake state remain authoritative host decisions.

**Efficiency:** The compact DOM/CSS control and constant-work detent selection are event driven. Hysteresis should reduce accidental transitions around a notch; this is a code-based expectation, not a measured CPU or frame-rate improvement. No physical handset performance claim is made.

**Narrative:** The raised wooden grip, visible gear mark, mechanical stops and sparse clicks suit Tinderbox's warm painted machinery and the user's requested steam aesthetic. A square control leaves more of a phone's world view available. This is a subjective preference. The existing commuter fascia remains appropriate for electric stock.

Prefer the compact option in the steam playtest. Preserve the current panel as the compatible default for existing API consumers and retain the electric controls. Mount, reload and revoked authority must never restart latched power or sound. Refused shifts must show the actual accepted state.

## Acceptance

Accepted builder `004d244397fc88a2c411388dd9046858772c020e` against the railway main above. The builder's finished review records 67 browser groups, 18 Node tests, seven negative TypeScript controls and 17 captures. Architect review exercised the native two-circuit yard separately: persistent forward notches, coasting neutral, moving reversal refusal, chain brake priority, reverse, quiet save/reload, safe profile switching and retained character resources. Both fleets' classic cab and coach/exit workflows passed. Compact controls fit 390×844, 320×568 and 844×390 viewports; native touch exercised latch release, second-finger brake priority and cancellation.

The same complete compact workflow passed with UI and resources loaded from an offline-installed compatibility tarball, borrowing the project's native world/host explicitly. Both shipped font faces reached `loaded`. This exposed and corrected npm's interpretation of brackets in the literal Besley filename: physical distribution inventories stay literal, while serialized npm whitelists escape bracket metacharacters. An installed-package proof checks all three binaries, CSS-relative URLs, notices, source-fixture exclusion and DOM-free UI import. The actual tile-authoring CI preflight regression also passes after this publishing change.

Architect validation passes: indexed integrity check, all 1,220 engine tests, all 32 upstream tests and the static build. Evidence is retained locally under `artifacts/tinderbox-train-gates/`, `artifacts/tinderbox-train-playtest/`, `artifacts/tinderbox-train-installed/` and `artifacts/installed-train-controls/`. Disposable review browsers and servers close in `finally`; their receipts record exact lifetimes and closed ports. This review does not establish physical handset performance. Passenger laps use explicit host-clock steps after live departure, not a measured frame-rate test. No production consumer pin changes.

All 27 preserved donor files were independently compared with fixed Tinderbox Git objects. Source inventory SHA-256 is `dd00fa451b542957600b23a908de5f65535048901aa070364c542c8b57687823`; local notice is `2a72e16a8c12cdf08b091ca4dc754b80c552fca6c726517a82ff2aedfbf02895`; adaptation source record is `ded0653ff0b31f66391afd2026c2e03bc8770706992fb72833e12ecf8ac10c3e`. Exact runtime resources total 3,116,098 bytes:

| Resource | Bytes | SHA-256 |
| --- | ---: | --- |
| Farmyard wood-factory-v2.png, preserved through Tinderbox | 2,757,790 | `fd84b8b6dffb4974ce19c51d8a8e0dbe7295a2dddcf8c262eaa94e542ed64021` |
| Besley[wght].ttf | 108,640 | `71f352d8859c787631a0978161d48497a72caa69dcae6996d6712a564df86c1e` |
| OldStandard-Regular.ttf | 249,668 | `42717a1280b523a506ca2b0285cca380e77fe214b1f6e3d75a8b925005f19eac` |

Original OFL license bytes, including trailing whitespace, remain preserved. The optional compact profile loads these resources; the classic default and electric presentation retain their previous behavior. Mount/reload never replays a prior lever lease or cue. The yard selects compact steam initially and exposes a Full panel choice for direct compatibility comparison.

## Brake-before-opposite follow-up

Reviewed UI commit `d99fcf85256c90474cf570185159669caaed8070`, based on merged main `db656a6d717ad36aabe32955b47a09b8badb116e`, adds Nautilus-authored assistance rather than claiming it came from Tinderbox. Selecting an opposite compact steam notch commits neutral/power 0/brake 1, retaining a local requested notch. After confirmed stopping, one guarded microtask rechecks current actor, cab/context, lease, controls and expected revisions, consumes the intent, then proposes the new gear. The raw Core moving-reversal refusal and all save formats stay unchanged. A cancelled, stale, failed or restored intent cannot retry a direction command. A safety release refused by Core's busy notification gets one deferred attempt for its exact old actor/lease, including after disposal; a primary action result is retained.

Prefer this assistance for the compact touch/keyboard playtest: one selection expresses the player's desired direction while confirmed braking remains visible. This is a usability/narrative judgment, not calibrated physical reverser behavior. Maximum brake means the existing profile's normalized brake value 1. The implementation adds no clock and schedules bounded work from host notifications; CPU/FPS benefits are unmeasured. Classic/electric policy and the module's headless Core boundary are preserved.

The owner's finished proof reports 80 Edge browser groups, 27 Node tests, eight negative type controls and 19 captures, including actual retained-host stopping/reversal, symmetric forward engagement, stale/foreign ownership, cancellation, silent restore and busy-notification disposal. All 13 recorded helper lifetimes exited. These captures establish DOM and real authority behavior; Root's separate rendered-yard check establishes the native scene binding. Physical handset/speaker calibration remains unmeasured. Source-only report: `packages/train-ui/evidence/REVERSE-REVIEW.md`.

Registration adds internal `reverse-intent.js`; `state.pendingNotch` is readonly and nullable. Adaptation-record SHA-256 is `6c75b69c3a362e99fe4985b8ea1523352ab8f9e2a9f32af5b87a872316e7fb12`. All 27 donor files, three binaries and notices retain the original hashes above. The standard engine test runner now executes the component's behavioral tests, and the integration check authenticates every implementation module in the UI closure against the finished commit. Required combined gates, installed package resources and native workflow results belong to the integration PR at its final head.

The yard's surrounding player setup still has manual composition. The [player setup/live playground scope](../projects/player-setup-composition.md) records that separate missing infrastructure and requires the same public recipe to serve the playground, real scenes and agent commands. This reverse correction does not claim to deliver that recipe.
