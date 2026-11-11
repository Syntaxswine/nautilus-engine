# Mechanical train controls review

This bounded revision replaces the common green control panel from
`e898cd60a023577fffc4c5b26c318c0be220b13f`. It changes only `packages/train-ui/`
and retains frozen connector `32cce619ac1b8930ac7636dc49aa8704ce08cc92`.

Steam uses original warm ochre/timber paint, brass and dark iron, a working
three-detent reverser, cream speed gauge and a pull-chain brake. Electric uses
a distinct cool commuter fascia, brake paddle and confirmed traction, aboard
and brake lamps. Stock is read from the connector, never guessed from labels.
The pull chain is deliberate fiction; the connector has no physical door state.

The browser report contains **45 passing groups** and **12 captures**: the
original 29 lifecycle groups plus 16 mechanical/feedback groups. Native mouse
drags exercise reverser and chain, keyboard covers the slider and held controls,
and native emulated touch plus synthetic cancellation cases verify ownership.
Both skins have component captures at 1440×1000, 390×844 and 320×844; all visible
buttons have at least 44×44px bounds and there is no horizontal page overflow.
Commuter rider has a separate 390px capture. Original entry/rider/signal captures
remain in the same report.

**11 Node audio tests** cover silence on mount/restore, trusted activation,
confirmed own-lease departure, occupancy transitions, refusal/repeat gating,
source replacement, cancellation, mute, suspended/missing audio and disposal.
The browser also exercises real WebAudio construction, confirmed whistle/chime
triggers and context closure. The bounded headless browser mutes speaker output;
this verifies the audio graph/lifecycle, not perceived realism or device volume.
The whistle/chime are small original synthesized approximations, not recordings.

The strict public-type fixture includes five negative controls and the new mute
API. The focused verifier checks the unchanged connector bytes and source
inventory. All recorded browser/server lifetimes have cleanup receipts; their
exact identities are exited and ports released. No preview is retained.

The visible source fixture always returns `FIXTURE_ONLY`; explicitly scripted
protocol replies exercise UI state/input only. These checks do not establish
train physics, boarding permissions, real actor/stock art acceptance or consumer
adoption. Architect already owns the real two-circuit runtime integration and
must review this revised UI in that host, including sound balance. Full engine,
package and build gates are delegated to that combined review. This is one local
review commit with no push, root/export edits or consumer-pin changes.

Original assets and read-only immutable visual-reference hashes are recorded in
[`art/references.json`](../art/references.json). The builder must preserve the
stylesheet's relative `art/steam-cab-surface.svg` dependency when packaging it.
