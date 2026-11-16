import assert from 'node:assert/strict';
import test from 'node:test';
import {CHECK_PROFILES, resolveAttackRoll} from '@nautilus-engine/map-core/rules';
import {traceAftShot} from '@nautilus-engine/map-core/rules/aft';
import {seededShots} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/helicoid-shot.js';
import {bodyIntersection, firearmTrajectory, pelletTrajectories}
  from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/ballistic-shot.js';

const defaults = {
  origin: Object.freeze({x: 0, y: 0, h: 1.2}),
  aim: Object.freeze({x: 0, y: 20, h: 1.2}),
  maxReach: 30,
  precision: 80,
  seed: 42,
  decision: Object.freeze({rolledHit: false, chance: 50, die: 8})
};
const input = changes => ({...defaults, ...changes});
const bodyHeight = 1.75;
const missWorld = () => null;

function intendedTarget(aim, ground) {
  return {id: 'intended', x: aim.x, y: aim.y, z: 0, ground};
}

function selectedRegion(aim) {
  const target = intendedTarget(aim, false);
  return ray => bodyIntersection(target, ray.origin, ray.direction, Infinity, bodyHeight)?.zone === 'torso';
}

function donorReference(spec, targeted) {
  const {origin, aim, decision} = spec;
  const draw = seededShots(spec.seed);
  let seed = spec.seed, draws = 0;
  const random = () => {
    const value = draw();
    seed = value * 4294967296;
    draws++;
    return value;
  };
  const shooter = {x: origin.x, y: origin.y, z: 0};
  const target = intendedTarget(aim, !targeted);
  const options = {
    accurate: decision.rolledHit, chance: decision.chance, precision: spec.precision, zone: 'torso',
    shotRoll: decision.die === undefined ? undefined : {die: decision.die, rolledHit: decision.rolledHit},
    reach: spec.maxReach, pellets: spec.pellets
  };
  const geometry = {
    muzzleHeight: () => origin.h, targetHeight: () => aim.h, bodyHeight: () => bodyHeight,
    trace(_state, _shooter, _origin, _direction, reach) { return {distance: reach}; }
  };
  const rays = spec.pellets > 1
    ? pelletTrajectories({}, shooter, target, options, random, geometry)
    : [firearmTrajectory({}, shooter, target, options, random, geometry)];
  return {rays, seed, draws};
}

function assertParity(spec, targeted = false) {
  const expected = donorReference(spec, targeted);
  const actual = traceAftShot(spec, {trace: missWorld, strikesSelectedRegion: targeted ? selectedRegion(spec.aim) : undefined});
  assert.equal(actual.seed, expected.seed);
  assert.equal(actual.draws, expected.draws);
  assert.equal(actual.rays.length, expected.rays.length);
  assert.equal(actual.scatterDie, spec.decision.rolledHit ? null : expected.rays[0].shotRoll.die);
  for (const [i, ray] of actual.rays.entries()) {
    const donor = expected.rays[i];
    assert.deepEqual(ray.origin, donor.origin);
    assert.deepEqual(ray.direction, donor.direction);
    assert.equal(ray.angularError, donor.angularError);
    assert.equal(ray.missAdjusted, donor.missAdjusted);
    assert.equal(ray.maxReach, donor.distance);
    assert.deepEqual(ray.endpoint, {
      x: donor.origin.x + donor.direction.x * donor.distance,
      y: donor.origin.y + donor.direction.y * donor.distance,
      h: donor.origin.h + donor.direction.h * donor.distance
    });
  }
  return actual;
}

test('ordinary and natural-one misses match the pinned ray and consume the two original draws', () => {
  const ordinary = assertParity(input());
  const naturalOne = assertParity(input({decision: {...defaults.decision, die: 1}}));
  assert.equal(ordinary.draws, 2);
  assert.equal(naturalOne.draws, 2);
  assert.equal(naturalOne.seed, ordinary.seed);
  assert.ok(naturalOne.rays[0].angularError >= 28 * Math.PI / 180);
  assert.ok(naturalOne.rays[0].angularError < 48 * Math.PI / 180);
  assert.ok(naturalOne.rays[0].angularError > ordinary.rays[0].angularError);
  assertParity(input({origin: {x: 12.5, y: -3, h: 2}, aim: {x: 12.75, y: -2.9, h: 14.5}, precision: 33}));
});

test('a host miss without a die uses AFT conditional failure sampling without changing the decision', () => {
  const decision = {rolledHit: false, chance: 50};
  const ordinary = assertParity(input({decision}));
  assert.deepEqual(ordinary.decision, decision);
  assert.equal(ordinary.draws, 3);
  assert.ok(ordinary.scatterDie >= 2 && ordinary.scatterDie <= 19);
  const critical = assertParity(input({decision: {rolledHit: false, chance: 95}}));
  assert.equal(critical.scatterDie, 1);
  assert.equal(critical.draws, 3);
});

test('a direct hit decision uses the exact pinned ray and stops at reach when the trace is clear', () => {
  const spec = input({decision: {rolledHit: true, chance: 5, die: 7}, maxReach: 3});
  const result = assertParity(spec);
  assert.deepEqual(result.decision, spec.decision);
  assert.equal(result.seed, spec.seed);
  assert.equal(result.draws, 0);
  assert.equal(result.rays[0].contact, null);
  assert.deepEqual(result.rays[0].endpoint, {x: 0, y: 3, h: 1.2});
  const contact = traceAftShot(spec, {
    strikesSelectedRegion() { assert.fail('A direct hit does not need a silhouette query.'); },
    trace(ray) {
      const distance = (2 - ray.origin.y) / ray.direction.y;
      return {kind: 'actor', id: 'intended', region: 'torso', distance};
    }
  }).rays[0];
  assert.deepEqual(contact.endpoint, {x: 0, y: 2, h: 1.2});
  assert.equal(contact.contact.region, 'torso');
});

test('world points use metre height h when they also carry a tactical floor z', () => {
  const spec = input({
    origin: {x: 2, y: 3, h: 1.45, z: 4},
    aim: {x: 2, y: 9, h: 1.45, z: 1},
    maxReach: 7,
    decision: {...defaults.decision, rolledHit: true}
  });
  const result = traceAftShot(spec, {trace(ray) {
    assert.deepEqual(ray.origin, {x: 2, y: 3, h: 1.45});
    assert.deepEqual(ray.direction, {x: 0, y: 1, h: 0});
    assert.deepEqual(ray.rangeEndpoint, {x: 2, y: 10, h: 1.45});
    return {kind: 'world', distance: 2};
  }});
  assert.deepEqual(result.rays[0].endpoint, {x: 2, y: 5, h: 1.45});
});

test('the selected torso query adjusts a failed ray just outside the source silhouette', () => {
  const spec = input({decision: {...defaults.decision, die: 15}});
  const unadjusted = assertParity(spec);
  const strikes = selectedRegion(spec.aim);
  assert.equal(strikes(unadjusted.rays[0]), true);
  const adjusted = assertParity(spec, true);
  assert.equal(adjusted.rays[0].missAdjusted, true);
  assert.equal(strikes(adjusted.rays[0]), false);
  assert.equal(adjusted.seed, unadjusted.seed);
});

test('a failed roll can hit a finite off-axis wall or an incidental actor along the actual ray', () => {
  const spec = input();
  const wallQuery = ({origin, direction, maxReach}) => {
    const distance = (7 - origin.y) / direction.y;
    const x = origin.x + distance * direction.x;
    const h = origin.h + distance * direction.h;
    return distance >= 0 && distance <= maxReach && x > .02 && x < .3 && h > .5 && h < 1.8
      ? {kind: 'world', id: 'side-wall', distance} : null;
  };
  const wall = traceAftShot(spec, {trace: wallQuery});
  const ray = wall.rays[0];
  assert.equal(wall.decision.rolledHit, false);
  assert.equal(ray.contact.id, 'side-wall');
  assert.equal(ray.contact.kind, 'world');
  assert.ok(Math.abs(ray.endpoint.y - 7) < 1e-12);
  assert.ok(ray.endpoint.x > .02 && ray.endpoint.x < .3);
  assert.deepEqual(ray.endpoint, {
    x: ray.origin.x + ray.direction.x * ray.contact.distance,
    y: ray.origin.y + ray.direction.y * ray.contact.distance,
    h: ray.origin.h + ray.direction.h * ray.contact.distance
  });
  const direct = traceAftShot({...spec, decision: {...spec.decision, rolledHit: true}}, {trace: wallQuery});
  assert.equal(direct.rays[0].contact, null);

  const incidental = {id: 'other', x: .45, y: 14, z: 0};
  const actor = traceAftShot(spec, {trace({origin, direction, maxReach}) {
    const hit = bodyIntersection(incidental, origin, direction, maxReach, bodyHeight);
    return hit ? {kind: 'actor', id: incidental.id, distance: hit.distance, region: hit.zone} : null;
  }}).rays[0];
  assert.equal(actor.contact.kind, 'actor');
  assert.equal(actor.contact.id, 'other');
  assert.equal(actor.contact.region, 'torso');
  assert.ok(Math.abs(Math.hypot(actor.endpoint.x - incidental.x, actor.endpoint.y - incidental.y) - .34) < 1e-10);
});

test('one settled shotgun shell matches all six donor rays and the post-shell RNG state', () => {
  const hit = assertParity(input({pellets: 6, decision: {...defaults.decision, rolledHit: true}}), true);
  assert.equal(hit.draws, 10);
  assert.equal(hit.rays[0].angularError, 0);
  assert.ok(hit.rays.slice(1).every(ray => ray.angularError > 0));
  const spec = input({pellets: 6, decision: {rolledHit: false, chance: 55}});
  const miss = assertParity(spec, true);
  assert.equal(miss.draws, 13);
  assert.ok(miss.rays.every(ray => !selectedRegion(spec.aim)(ray)));
});

test('the existing resolved roll can feed the spread and saved state replays exactly', () => {
  const decision = resolveAttackRoll(5, CHECK_PROFILES.aftFirearm, 42);
  const first = input({decision, seed: decision.seed, pellets: 6});
  const snapshot = JSON.stringify(first);
  const traced = traceAftShot(first, {trace: missWorld});
  assert.deepEqual(traceAftShot(JSON.parse(snapshot), {trace: missWorld}), traced);
  assert.equal(traced.draws, 12);
  assert.equal(JSON.stringify(first), snapshot);
  const next = input({seed: traced.seed, pellets: 6});
  const restored = {...next, seed: JSON.parse(JSON.stringify({seed: traced.seed})).seed};
  assert.deepEqual(traceAftShot(restored, {trace: missWorld}), traceAftShot(next, {trace: missWorld}));
});

test('invalid inputs and an impossible selected-region miss refuse before world tracing', () => {
  let calls = 0;
  const queries = {trace() { calls++; return null; }};
  for (const changes of [
    {seed: undefined}, {seed: -1}, {seed: 2 ** 32}, {maxReach: 0}, {maxReach: Infinity}, {pellets: 65}, {pellets: 1.5},
    {origin: {x: NaN, y: 0, h: 1}}, {origin: {x: 0, y: 0, z: 1}}, {aim: defaults.origin},
    {precision: 101}, {pelletCount: 6},
    {decision: {rolledHit: 'false', chance: 50}}, {decision: {...defaults.decision, chance: -1}},
    {decision: {...defaults.decision, die: 0}}
  ]) assert.throws(() => traceAftShot(input(changes), queries));
  assert.throws(() => traceAftShot(input(), {...queries, strikesSelectedRegion: () => true}), /outside target silhouette/);
  assert.throws(() => traceAftShot(input(), {...queries, strikesSelectedRegion: () => null}), /return a boolean/);
  assert.equal(calls, 0);
  assert.throws(() => traceAftShot(input(), {}), /world trace/);
  for (const contact of [undefined, {kind: 'world', distance: 31}, {kind: 'world', distance: -1},
    {kind: 'actor', distance: 2}, {kind: 'unknown', distance: 1}]) {
    assert.throws(() => traceAftShot(input(), {trace: () => contact}));
  }
});
