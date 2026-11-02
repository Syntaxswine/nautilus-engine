# Optional module planning and lifecycle

The public `./runtime` entry supplies version 1 module configuration, `planModules`, `assertModulePlan` and explicit `startModules`. It is optional. Direct imports of maps, rules, items or assets do not depend on this layer. Importing it starts no clock, storage, network request, renderer or audio context; configuration does not import or activate providers.

A game can retain an existing service by publishing a host manifest and binding the requested service to it. A selected module can also request another module's service. Planning reports the complete selected dependency closure, versions, bindings and warnings before any factory runs. This is the first composition contract, not a complete world runtime or a claim that every blueprint module is implemented.

```js
import {planModules, startModules} from '@nautilus-engine/map-core/runtime';

const configuration = {
  version: 1,
  modules: [{
    id: 'my-game.rock-actions', version: 1,
    provides: [{id: 'my-game.rock-actions', version: 1}],
    requires: [{id: 'my-game.world-query', minVersion: 1, maxVersion: 1}]
  }],
  selected: ['my-game.rock-actions'],
  hosts: [{id: 'my-game.existing-world', version: 1,
    provides: [{id: 'my-game.world-query', version: 1}]}],
  bindings: {'my-game.world-query': 'my-game.existing-world'}
};

const preview = planModules(configuration);
if (!preview.ok) showCompatibilityErrors(preview.errors);
else {
  const runtime = await startModules(configuration, {
    hostServices: {'my-game.existing-world': {'my-game.world-query': existingWorld}},
    factories: {'my-game.rock-actions': ({services}) => ({
      services: {'my-game.rock-actions': createMyRockActions(services['my-game.world-query'])},
      dispose() { /* Release this module's own resources, if any. */ }
    })}
  });
  const actions = runtime.service('my-game.rock-actions', 'my-game.rock-actions');
  // The host still dispatches commands, advances time and commits world state.
  const cleanup = await runtime.stop();
  if (!cleanup.ok) reportCleanupFailures(cleanup.errors);
}
```

The example's names and `createMyRockActions` are consumer bindings, not additional engine APIs. A factory should create a resource-free handle; resource acquisition belongs in its optional asynchronous `prepare` hook. The borrowed world service is never disposed by Nautilus.

## Builder handoff

A reusable module also supplies the [standard usage card, guide and checklist](component-handoffs.md). Its example shows actual provider bindings, readiness diagnostics, retained host services and cleanup. Keep documentation metadata separate from the strict configuration below; the handoff standard adds no runtime manifest fields or mandatory composition layer.

## Configuration and diagnostics

Configuration is bounded plain JSON with `version`, registered `modules`, and selected root module IDs. Optional `hosts` and `bindings` default only when absent; explicit null, unfamiliar fields, invalid identifiers, accessors, functions and unsupported versions reject. Each module declares `id`, positive integer interface `version`, `provides`, and optional `requires`. Hosts declare the same fields except requirements. Package semantic versions, data schema versions, feature capabilities and these provider-interface versions are separate identities.

Provided services have an ID and exact positive integer version. Requirements give an ID and inclusive `minVersion`/`maxVersion`, plus an optional boolean. Each ID uses the declared ASCII identifier alphabet, is at most 96 characters, and cannot use reserved prototype-property names. There are at most 128 registered modules, 128 hosts and 64 services/requirements per provider, with additional bounded input size/depth. The structural schema is `schemas/module-configuration-v1.schema.json`; runtime validation additionally checks unique identities, ranges, references, global bounds and dependency semantics.

All active required ranges for a service are joined before selecting its provider. A unique compatible provider can add a transitive module. Ambiguity is finalized only after unique dependencies and explicitly activated optional modules finish adding their hard requirements. Module naming/registration order must not decide which version is valid. A service has **one global selected provider/version** in a composition; incompatible required profiles reject rather than run contradictory implementations behind the same ID.

An explicit binding chooses a declaring provider. Otherwise, required services consider registered modules and host providers; multiple compatible choices require a binding. Optional services do not pull in an unselected module unless explicitly bound. They may use an already selected module or a host service. Required choices outrank opportunistic optional matches; incompatible or ambiguous optional requests produce warnings. Optional bindings are dependency edges too, so a resulting cycle rejects. A host implementation's declaration is a promise to implement the interface; conformance tests still establish actual behavior.

`planModules` returns `{ok, errors, warnings, plan}`. A successful plan includes roots, topologically ordered selected module manifests, used host manifests and each consumer's resolved bindings. Diagnostic paths point into the actual input arrays/records, with module/service IDs, version ranges and candidate information alongside an action. `assertModulePlan` throws `ModuleConfigurationError` with the same diagnostics. None of these operations mutates input or starts a provider.

## Activation and ownership

`startModules(configuration, {factories, hostServices})` replans and verifies all selected implementations before calling a factory. Serialized or modified preview plans are not trusted as activation authority. Unselected factories never run. Host services are explicit borrowed values under the promised provider/service IDs.

Factories are **synchronous** and return plain data handles containing `services` and optional `prepare`, `start`, `stop`, `dispose` functions. Async factories/thenables are unsupported; put asynchronous loading/acquisition in `prepare` so the runtime owns a handle before acquisition begins. A factory that acquires resources or throws before returning its valid handle remains responsible for that acquisition. Handles may export only their declared services and must provide them after preparation. Services themselves are host/provider values, not automatically serializable or deeply frozen.

Preparation runs sequentially in dependency order. During a consumer's prepare, its dependencies are prepared and their exports exist, but they are **not started yet**. All preparation finishes before start hooks run in dependency order. Context records identify the module, borrowed services and selected provider versions. Keep simulation time, RNG, inputs, commands, transaction authority and persistence with the host; this layer invents none of them.

On a preparation/start failure, `ModuleStartError` retains the cause, phase, module ID and cleanup report. Every acquired valid handle is disposed in reverse dependency order. A module whose start was attempted also receives stop, including a partially failed start. Each dependent is stopped/disposed before its provider, so dependencies remain available for dependent cleanup. Hooks release only resources that module owns, never the host renderer, shared services or another module's textures.

After successful activation, `service(moduleId, serviceId)` returns a declared export while running. Plan/warning getters return copied metadata. `stop()` is explicit, async and idempotent: concurrent/reentrant callers share one promise. Every remaining cleanup hook is attempted even if another fails. State becomes `disposed` or `cleanup-failed`; the immutable report identifies failures. Error formatting does not invoke exception-message accessors. Repeated stop returns the same report and **does not retry** failed cleanup; the host must address that failure deliberately.

Hooks run sequentially with no implicit timeout, cancellation signal, retry, timer or worker. They must finish or fail themselves, and must not await their own runtime's shutdown promise. Applications needing cancellation, unload deadlines or persisted operation recovery must supply deliberate policies; this contract does not claim them. Runtime handles, contexts and service values are not whole-game saves. Only configuration/requirements are plain data.

## Validation and design choice

Meaningful tests cover single-library adoption, retained host services, deterministic/transitive planning, hard-range joining, optional activation precedence, missing/ambiguous/version/cycle errors, actual diagnostic paths, malformed bounded input, preparation/start rollback, exported services, ownership, reentrant stop and failing cleanup. Offline installed-package validation must prove the public entry and keep test-only consumer source out of the package.

For **accuracy**, this orchestration does not improve physical simulation; it makes the selected policy/provider relationship explicit. For **efficiency**, plain planning happens at composition boundaries and unselected modules are not activated; no frame-time advantage is claimed. For **narrative**, preserving a game's working world/turn/input systems while it borrows one useful module best supports gradual adoption. Prefer direct public imports for a tiny use case and this optional planner when explicit service composition/lifecycle adds value. This does not require a universal entity framework or event bus.
