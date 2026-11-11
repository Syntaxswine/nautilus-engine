# Compact profile focused review

Fixed engine base: `4d0f7e495d75a607c9bc4c026ab100c50e7c07b4`.
Fixed donor: Tinderbox `fb0628605c274550ff8abad50b151843f08747d1`.
Scope: `packages/train-ui/` except the public facade, plus the one pinned vendor
closure. The earlier `5577773` branch remains intact. No broad engine sweep or
push was performed in this bounded tranche.

The [browser report](browser.json) passes **67 groups**: all 45 earlier classic,
electric and mechanical/audio groups plus 22 compact groups. Compact tests use
the actual retained `createTrainYardHost` and Core connector with explicit ticks
for power after finger release, N coasting, refused moving reverse, chain,
checkpoint reload, profile rebind and safety cleanup. Selected protocol doubles
cover forced actor/cab/revocation and post-commit replacement cases. The visible
source fixture still always returns `FIXTURE_ONLY`.

Native mouse covers drag/detents/jitter/chain, native keyboard covers notches and
neutral, and native emulated touch taps latch a notch and release the chain.
Independent two-finger braking uses synthetic touch events against the actual
retained authority. Physical handset review remains pending. Clicks use real
trusted browser events; repeated/refused/untrusted changes stay silent. The
browser exercises WebAudio lifecycle but mutes speaker output, so perceived
click/whistle volume still needs rendered-host review.

There are 17 captures: the earlier 12 and five compact captures using
the real retained connector in the full-viewport source-illustration fixture.
One capture shows the stopped cab with an enabled Exit button, followed by real
walking restoration and boarding again. The mechanical square/grip measure 138/80px at 390×844, 124/70px at 320×568,
96/42px at 844×390 and 138/80px at 1280×800. Every visible button and the lever
hit area have at least 44px dimensions; the full component fits the viewport.
The illustration is not the live train renderer and establishes no native-art
acceptance. Architect owns the real rendered two-circuit review.

**18 Node tests** pass, including 13 audio-gating/lifecycle cases and five
notch/real-authority/checkpoint cases. Strict TypeScript passes seven expected
type errors, including invalid profile names and readonly confirmed notch.
The public module imports in Node without DOM access.

The focused verifier checks 27 imported Git-object files and all font-manifest
hashes/notices. Classic triggers no compact wood/font requests; compact resolves
exactly three pinned binary resources totaling 3,116,098 bytes. It also checks
the unchanged Core, example host and public facade against the fixed base, the
bounded changed-file scope, all recorded helper identities and released ports.
No disposable helper is retained.

Authored files pass strict whitespace checks. Both original OFL license texts
retain their upstream trailing blank on line21 and their exact source hashes;
they are preserved source bytes, not rewritten for a style check. Existing
`vendor/** -text` also preserves source line endings.

Runtime/source/notice paths and required root work are recorded in
[compact-handoff.json](../compact-handoff.json). Full source/check/test/upstream,
installed-package/build registration, rendered acceptance and merge remain
Architect's combined delivery responsibility.
