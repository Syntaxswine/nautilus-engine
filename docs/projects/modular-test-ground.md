# Modular test ground and verifiable objectives

Status: scoped by Architect on 11 November 2026; implementation follows the
[player setup composition tranche](player-setup-composition.md). This is proposed
work, not a delivered map, objective system or automatic wiring claim. Keep one
accountable builder active at a time.

## Intended experience and source boundary

Use Night Ledger as the reference for a small, readable playable situation, then
provide more room and replaceable test areas. The retained Farmyard reference in
`examples/farmyard-door-reference.fixture.json` identifies its mission as
`night-ledger` and its source pin as
`251bf8094b5f9ebe44208443084c1a6d6658512a`. That snapshot is evidence of the retained
baseline, not an inspection of the current donor game. Preserve its original
fixture and tests. Build a separate Nautilus test ground through public engine
contracts; do not enlarge a donor mission or update a consumer pin as a side
effect. New imports follow the existing committed-source/provenance rules.

The playground recipe selects **layout, plot contents, mission objective and
verification conditions** independently where their declared requirements match.
The menu and agents edit/export the same configuration used to start a real game.
A player should be able to return to setup, replace a test, and try it again
without rewriting surrounding input, HUD or interaction wiring.

## Map and replaceable plots

Start with a provisional 64 by 64 metre main ground, a central safe spawn and
connecting paths, and several 16 by 16 metre plots. Adjust the dimensions after
native-scale review. Larger fixtures, especially the existing two railway
circuits, receive an explicitly sized adjoining area rather than squeezing trains
or curves into a small plot. Preserve standard story heights and the native metre
coordinate contract. The first proof needs only two interchangeable door/item
plots; other stations follow as their providers are accepted.

| Plot family | Useful interchangeable fixtures |
| --- | --- |
| Movement and height | Open ground, obstacles, eighth-height natural steps, existing stairs and upper floors |
| Interactions | Single/double doors, windows, containers, pickups and alternative room layouts |
| Combat and feedback | Targets, cover, secondary bodies along scattered shots, rock/grenade tests and supported guard responses |
| Environment | Light/fire surfaces and, later, accepted sewer/catacomb assemblies |
| Transport adjoining area | Platforms, the existing steam/electric circuits, splits and nonjoining crossings |

Each plot declares a stable ID/version/source, footprint, ground elevation and
floor identities, entrances/boundary connections, reachable spawn/exit points,
owned entities/resources and required capabilities/services. Geometric entrances
and semantic runtime ports are separate contracts. A matching texture or numeric
value does not establish a compatible connection. Missing or ambiguous bindings,
overlap, unsupported heights or unreachable required targets give named readiness
errors before activation.

Swaps use the existing staged setup lifecycle. Pause/release input, prepare and
validate the candidate, then accept once; a refusal or pre-acceptance cancellation
preserves the accepted ground. Keep neighbouring plots and the player's resources
intact. Require leaving an occupied plot, or an explicit fixture restart, when
actors, vehicles, held commands or cross-plot references prevent a safe swap.
Do not teleport/heal/refill a saved character as an incidental repair. State
whether fire, sound and other effects are isolated for a test or deliberately
allowed across a plot boundary. Retire only the replaced plot's owned resources.

## Objectives and verification travel with the recipe

The mission objective is another replaceable component. It names its version,
stable targets, required actions/capabilities, prerequisites, seed/reset policy,
completion conditions and the observations needed to verify them. Changing the
objective need not change scenery. Changing scenery must validate that the
selected objective and its observations remain supported. Unsupported tests show
why they cannot run; they are never marked successful because a check was skipped.

Distinguish an offered action, an accepted command, a committed gameplay result
and a verified observation. A button click or an `ok` receipt alone cannot prove
the result. A test starts from a recorded baseline, invokes the ordinary public
action path, then evaluates declared expectations through authoritative state,
queries or committed events. Verification reads gameplay truth; it does not create
the effect it is meant to check or introduce a second command authority.

| Objective | Example evidence beyond the input/acknowledgement |
| --- | --- |
| Open the marked door | The same target's confirmed door state is open and the public passage query agrees; required costs/keys follow the selected policy |
| Recover the ledger/item | The target item transfers to the intended inventory exactly once and leaves its prior world/container location |
| Distract a guard with a rock | Confirmed impact/sound identity and the supported guard provider's observed response; an absent guard-observation service refuses the test |
| Board, drive and leave a train | Actor/car occupancy, confirmed movement along the selected route, release of driving authority and reachable on-foot exit |
| Save and reload a result | A newly loaded checkpoint preserves the relevant identities, state and spent resources without replaying a command or one-shot effect |

Keep mission completion and test verification separately visible: a mission can
meet its rule while an additional wiring observation fails or is unavailable.
Use explicit pending, running, passed, failed and unavailable/inconclusive states,
with expected/observed values, stable entity/event/receipt IDs and a reason. Do not
label a test passed until all its required observations are available and agree.
Bound waits by an appropriate condition/deadline and report the missing condition.
Deduplicate committed event IDs; request retries and reload do not count twice.

Record whether a condition tests current state or a new event after the test
baseline. An already-open door must not accidentally satisfy a test intended to
exercise opening. Export the exact composition, objective/verifier versions,
source pins, seed, baseline/checkpoint reference and observations so a builder or
agent can reproduce a failure. Record the observer implementation version too;
an observation is evidence for its declared scope, not proof of every subsystem.
Keep transient input and one-shot effects out of replay. Restarting a sandbox
fixture is an explicit operation distinct from resuming a saved game.

## Golden fixture checklist

The next reuse tranche adds a registry-generated checklist of named, versioned
golden fixtures. Selection loads compatible plots, components, objectives and
observations through the same real recipe/menu/agent path, supporting quick manual
try-out and **Run selected**. Initially only accepted door/item fixtures work;
movement/heights, combat, environment and train families follow as their services
are accepted. Use real native dimensions/heights and retain one simulation authority.

Each fixture records a stable ID/version, reviewed baseline/source pins,
seed/checkpoint, required capabilities/ports, placement/dependency/conflict rules,
expected observations, reset policy and evidence references. Golden means a
reviewed, committed, reproducible starting situation with explicit expectations;
never silently regenerate or bless expectations from the latest output.

Checkbox selection is separate from verification: off means disabled/not run,
never passed. Show pending, running, pass, fail and unavailable/inconclusive with
reasons. Unsupported providers disable selection with an actionable explanation.
Changing a fixture or relevant dependency invalidates its previous result; a changed
recipe cannot retain a stale green tick. Run from known isolated baselines, keeping
deliberate linked/interference tests explicit. Fixture setup must not reset/refill a
real save. Check gameplay state, public geometry and committed observations; render
captures supplement them with declared tolerance, not pixel identity across devices.
Include a deliberately broken outcome that the verifier catches. Export selected
IDs/versions, full recipe/seed, expectation/observer versions and evidence/results
for reproduction. Report only supported coverage actually exercised. This section
is scope for the following builder, not a fixture runner delivered by Stage 3.

## Sequential delivery and acceptance

Finish and review the existing Stage 2 setup candidate, then Root's installed
train-yard integration. The next single-builder reuse assignment becomes this
Night Ledger-inspired ground: first two replaceable plots and two interchangeable
door/item objectives, with visible verification through the same installed recipe.
Do not turn Stage 2 into a universal quest system, streaming-world rewrite or a
request to implement every station listed above. Extend existing public contracts
only when this narrow complete workflow proves a missing interface.

Acceptance requires a plot change with neighbouring state retained, an objective
change without rebuilding the plot, an incompatible selection refused before
activation, export/reload equivalence, and correct owned cleanup. Demonstrate both
a passing action and a deliberate mismatch where the request is acknowledged but
an expected authoritative observation is absent: the latter must fail verification
with its cause named. Agents and the menu must get the same result. Record actual
setup steps/time and comparable performance on the enlarged ground before claiming
easy setup or a negligible cost.

## Design recommendation

**Accuracy:** explicit dimensions and independently observable gameplay results
make tests more faithful to what the player experiences. This is a correctness
recommendation, not a claim of physically calibrated simulation.

**Efficiency:** prefer bounded plots, selected providers and event-driven
observations over activating every subsystem. Runtime/load savings are unmeasured;
compare the same test and seed before drawing performance conclusions.

**Narrative:** retain Night Ledger's readable small mission feeling within a
larger coherent ground. Distinct spaces give actions context while replaceable
objectives let one setting exercise several systems. This is a subjective
preference; check navigation/readability in the native desktop and phone review.
