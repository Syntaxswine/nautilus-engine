# Focused input and Finish correction

Parent: `f7521d829de9e4ef971b0a087467c1cdaf565c9b`, preserved unchanged in Git with its original [controller review](controller.md) and evidence. Root requested two input-accounting fixes and one Finish preservation fix after completing the bounded controller review. Public runtime packages, UI source bytes, pins and versions remain unchanged. Root owns the separate npm resolver portability adaptation and combined integration/release.

## Confirmed counterexamples and changes

1. A primary touch starts on an outside UI control and remains held. A later non-primary canvas touch draws and releases. The original input owner ignored the outside contact and produced a draft. The document contact ledger now includes outside origins. A UI-first sequence keeps UI ownership through all of its contacts; canvas contacts cannot become a new gesture or capture the UI contact. Normal UI pointer-up/click and keyboard activation remain native.
2. Two canvas fingers enter quarantine. Escape previously cleared the physical-pointer set while both were held, allowing a third non-primary contact to construct. Blur/hidden shared that reset. Cancellation now retires the gesture and releases capture while keeping physical-contact accounting and quarantine. Up/cancel events drain the ledger. After a missed release, a fresh primary down can retire stale contacts only for its own pointer type; a non-primary contact or another pointer type cannot clear them. The original click guard remains in place, and pointer-up never accepts an edit.
3. Finish previously rebuilt the selected instance's `anchorIds` from every recipe anchor, changing an existing empty or proper attachment subset. Finish now clones the exact old instance subset. New-owner construction retains its intentional initial anchor binding. Shape controls, recipe anchor definitions, locks, the neighbour and its shared recipe remain unchanged.

The fresh-primary boundary uses the browser's pointer-type/primary semantics described in [Pointer Events §4.1.2](https://www.w3.org/TR/pointerevents3/#the-primary-pointer). Input ownership and conservative ledger retention remain Editor policy, not a claim of physical-device validation.

Root's exact-object witnesses are retained read-only in the primary checkout under `artifacts/smart-tile-controller-review/`: `input/quarantine-probe.mjs`, `input/quarantine-witness.json`, `authority/probe-f7521d8.mjs` and `authority/result-f7521d8.json`. Those probes address the fixed parent, separate from the raw-CDP omitted-click observation.

## Focused checks

`tests/smart-tile-input.test.mjs` reproduces UI-first ownership, Escape/blur/hidden with two fingers held and a third released, stale releases, same-type fresh-primary recovery, different-type rejection, normal all-up recovery, old click quarantine and keyboard boundaries. These are explicitly labelled control-flow stand-ins. The new counterexamples failed against the old implementation before the correction.

`tests/smart-tile-session.test.mjs` adds two actual public-core/session Finish→Review→Apply→save cases: `anchorIds=[]` and a proper one-of-two anchor subset. Both previously committed expanded bindings and now preserve the exact original subset in the saved document and operation receipt. Full recipe equality, except the intentional ID/version/skin change, preserves controls and anchor definitions; full neighbour/shared-recipe equality preserves locks and neighbouring data. The existing actual-session history/recovery cases remain covered. The focused input/session run passes 22 cases.

The browser matrix adds native UI-first and held-Escape sequences to each existing real-host mode. It inspects contact ownership while held, then uses protocol-compliant all-up release packets and verifies no draft, source write or history acceptance. The exact partial-release ordering from Root's counterexamples is covered by the focused control-flow tests. The subsequent complete construction gesture starts with a trusted primary down, then requires the first native Review and Apply activations exactly once. No forced click, pointer-up acceptance or guard weakening is used.

An initial native diagnostic used a nonempty CDP `touchEnd` packet as though it named the remaining contacts; that did not represent the intended held-contact ordering. Only the harness was corrected to protocol-compliant empty all-up packets. Production behavior was not changed in response to that harness error. The focused partial-release tests remain independent of CDP semantics.

## Current delivery evidence

The [correction evidence index](evidence/input-finish-correction/index.json) records current source, built and actual offline-installed runs, exact file/tool hashes, state parity, native event streams, captures and cleanup receipts. It is separate from the parent's preserved 25-case evidence. The current matrix has 27 checks per mode; phone emulation is 390/320 CSS px, DPR 1, five touch points, with browser/API details retained in each report. This is not physical-phone or performance evidence.

All four delivery gates pass: `npm run check`, `npm test` (875 cases), `npm run test:upstream` (32 cases), and `npm run build` (514 module paths). The raw mounted/never-mounted diagnostic was rerun against the current input bytes: both controls still omit the first click under both one/five-touch-point profiles, with a distinct second activation producing one. It remains separately labelled `observed` and unresolved; the three corrections above do not claim to explain or fix that omitted compatibility click. No browser/server helper is retained after review.

Reproduce with `npm run check`, `npm test`, `npm run test:upstream`, `npm run build`, the three modes of `node tools/review-smart-tile-editor.mjs`, `node tools/review-smart-tile-input-compat.mjs`, then `node tools/collect-smart-tile-editor-review.mjs`. The collector writes the correction subdirectory and preserves the parent's evidence.
