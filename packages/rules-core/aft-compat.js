import {nextRandom, validSeed} from './checks.js';
import {fields, finite, integer, plain} from './validation.js';
import {angularHelicoidShot, failedShotRoll, placeHelicoidMiss, rollMarginScatter}
  from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/helicoid-shot.js';

// Legacy climb and combat helpers retain the original AFT unit/state shapes.
export {CLIMBS, climbingSkill, climbingPenalty, climbingPreview, rollClimb, climbRiskText}
  from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/climbing.js';
export {turnAP, injuryMovement, accuracyPenalty, roundChance}
  from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/combat-state.js';

function point(value, label) {
  const {x, y, h} = value ?? {};
  if (![x, y, h].every(Number.isFinite)) throw new TypeError(label + ' needs finite x, y and h coordinates.');
  return Object.freeze({x, y, h});
}

function atDistance(origin, direction, metres) {
  return point({
    x: origin.x + direction.x * metres,
    y: origin.y + direction.y * metres,
    h: origin.h + direction.h * metres
  }, 'Shot endpoint');
}

function readContact(value, maxReach) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('The world query must return a contact record or null.');
  }
  const {kind, distance, id, region} = value;
  if (kind !== 'world' && kind !== 'actor') throw new TypeError('Contact kind must be world or actor.');
  if (!Number.isFinite(distance) || distance < 0 || distance > maxReach) {
    throw new RangeError('Contact distance must lie within the traced reach.');
  }
  if ((id !== undefined || kind === 'actor') && (typeof id !== 'string' || !id.length)) {
    throw new TypeError('Supply a nonempty contact ID for an actor or named world contact.');
  }
  if (region !== undefined && (typeof region !== 'string' || !region.length)) {
    throw new TypeError('Contact region must be a nonempty string.');
  }
  return Object.freeze({kind, distance, ...(id === undefined ? {} : {id}), ...(region === undefined ? {} : {region})});
}

// x and y are ground metres, and h is metre height. The host supplies the settled
// roll and reads a fixed world snapshot. It commits the returned seed and hits.
export function traceAftShot(input, queries = {}) {
  fields(input, ['origin', 'aim', 'maxReach', 'decision', 'precision', 'pellets', 'seed'], 'shot input');
  fields(queries, ['trace', 'strikesSelectedRegion'], 'shot queries');
  const {decision, seed, precision = 80, maxReach, pellets = 1} = input;
  if (!plain(decision)) throw new TypeError('Supply the settled hit decision.');
  const {rolledHit, chance, die} = decision;
  if (typeof rolledHit !== 'boolean') throw new TypeError('Supply the settled hit decision.');
  finite(chance, 0, 100, 'hit chance');
  finite(precision, 0, 100, 'weapon precision');
  if (die !== undefined) integer(die, 1, 20, 'D20 result');
  if (!Number.isFinite(maxReach) || maxReach <= 0) throw new RangeError('Maximum reach must be positive and finite.');
  integer(pellets, 1, 64, 'pellet count');
  const {trace, strikesSelectedRegion} = queries;
  if (typeof trace !== 'function') throw new TypeError('Supply a read-only world trace.');
  if (strikesSelectedRegion !== undefined && typeof strikesSelectedRegion !== 'function') {
    throw new TypeError('The selected-region query must be a function.');
  }
  let nextSeed = validSeed(seed) >>> 0;
  const origin = point(input.origin, 'Shot origin'), aim = point(input.aim, 'Aim point');
  const aimDistance = Math.hypot(aim.x - origin.x, aim.y - origin.y, aim.h - origin.h);
  if (!Number.isFinite(aimDistance) || aimDistance < 1e-6) {
    throw new RangeError('Aim point must differ from the muzzle by a finite distance of at least one micrometre.');
  }
  let draws = 0;
  function random() {
    const draw = nextRandom(nextSeed);
    nextSeed = draw.seed;
    draws++;
    return draw.value;
  }

  const directionOf = ({direction: [x, y, h]}) => point({x, y, h}, 'Shot direction');
  function excludes(ray) {
    if (!strikesSelectedRegion) return false;
    const strikes = strikesSelectedRegion(Object.freeze({origin, direction: directionOf(ray)}));
    if (typeof strikes !== 'boolean') throw new TypeError('The selected-region query must return a boolean.');
    return strikes;
  }
  const frameOrigin = [origin.x, origin.y, origin.h];
  const frameAim = [aim.x, aim.y, aim.h];
  function place(error, rotation) {
    const frame = {origin: frameOrigin, aim: frameAim, error, rotation};
    return rolledHit ? angularHelicoidShot(frame) : placeHelicoidMiss(frame, excludes);
  }

  const scatterDie = rolledHit ? null : (die ?? failedShotRoll(chance, random).die);
  const error = rolledHit ? 0 : rollMarginScatter({chance, precision, die: scatterDie, roll: random()}).error;
  const centre = place(error, rolledHit ? 0 : random());

  // The phase, radius and tangent offsets follow the pinned ballistic-shot.js
  // pelletTrajectories loop. Only the metre-space query binding changes.
  const centreX = Math.tan(centre.error) * Math.cos(centre.angle);
  const centreY = Math.tan(centre.error) * Math.sin(centre.angle);
  const rays = [];
  for (let i = 0; i < pellets; i++) {
    let shot = centre;
    if (i > 0) {
      const phase = random() * Math.PI * 2;
      const radius = Math.tan(Math.sqrt(random()) * .11);
      const x = centreX + Math.cos(phase) * radius;
      const y = centreY + Math.sin(phase) * radius;
      shot = place(Math.atan(Math.hypot(x, y)), Math.atan2(y, x) / (Math.PI * 2));
    }
    const direction = directionOf(shot);
    const rangeEndpoint = atDistance(origin, direction, maxReach);
    const ray = Object.freeze({origin, direction, maxReach, rangeEndpoint});
    const contact = readContact(trace(ray), maxReach);
    rays.push(Object.freeze({
      ...ray, contact,
      endpoint: contact ? atDistance(origin, direction, contact.distance) : rangeEndpoint,
      angularError: shot.error, missAdjusted: !!shot.missAdjusted
    }));
  }
  return Object.freeze({
    profile: 'aft-roll-margin-spread-1',
    decision: Object.freeze({rolledHit, chance, ...(die === undefined ? {} : {die})}),
    scatterDie, seed: nextSeed, draws, rays: Object.freeze(rays)
  });
}
