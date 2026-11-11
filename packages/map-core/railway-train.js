import {planRailwayRoute, planRailwayTurnout, railwayStationAt} from '../railway-visuals/route.js';

export const RAILWAY_COUPLER_HEIGHT_M = .71;
const COUPLED_GAP_M = .56;
const EPS = 1e-8;

const car = (id, lengthM, wheelbaseM, reverse = false) => Object.freeze({id, lengthM, wheelbaseM, reverse});
const steamCoach = car('steam-coach', 2.70, 1.65);
export const RAILWAY_STOCK = Object.freeze({
  steam: Object.freeze({label: 'Steam passenger train', cars: Object.freeze([
    car('steam-engine', 2.40, 1.40), car('coal-tender', 1.70, 1.05), steamCoach, steamCoach
  ])}),
  electric: Object.freeze({label: 'Electric commuter train', cars: Object.freeze([
    car('electric-cab', 2.85, 1.70), car('electric-coach', 2.75, 1.65), car('electric-cab', 2.85, 1.70, true)
  ])})
});

function consist(stock) {
  if (typeof stock !== 'string' || !Object.hasOwn(RAILWAY_STOCK, stock)) throw new Error('Choose a steam or electric train.');
  let lengthM = 0;
  const cars = RAILWAY_STOCK[stock].cars.map((spec, index) => {
    if (index) lengthM += COUPLED_GAP_M;
    const centreBehindM = lengthM + spec.lengthM / 2;
    lengthM += spec.lengthM;
    return {...spec, centreBehindM};
  });
  return {cars, lengthM};
}

function itinerary(...legs) {
  let lengthM = 0;
  const segments = legs.map(({track, from, direction, lengthM: length}) => {
    const segment = Object.freeze({track, fromM: from, toM: from + direction * length,
      direction, startM: lengthM, lengthM: length});
    lengthM += length;
    return segment;
  });
  return {legs, lengthM, segments: Object.freeze(segments)};
}

function leg(track, plan, from, to) {
  return {track, plan, from, direction: Math.sign(to - from), lengthM: Math.abs(to - from)};
}

export function railwayTurnoutStation(plan, turnout) {
  const base = railwayStationAt(plan, turnout.mainStartM);
  const [x, z] = turnout.throat;
  const [dx, dz] = turnout.incoming;
  return {
    stationM: turnout.mainStartM + (x - base.x) * base.s + (z - base.z) * base.c,
    direction: dx * base.s + dz * base.c > 0 ? 1 : -1
  };
}

function assertSwitch(switchPosition, branch) {
  if (switchPosition !== 'main' && switchPosition !== 'branch') {
    throw new Error('Choose Main line or Branch at the turnout.');
  }
  if (switchPosition === 'branch' && !branch) {
    throw new Error('The train needs a facing turnout and enough track to fit on the branch.');
  }
}

function planTrain(plan, turnout, placement) {
  const {stock, departure, switchPosition} = placement;
  if (!['start', 'end', 'branch'].includes(departure)) throw new Error('Choose a railway departure end.');
  const train = consist(stock);
  const junction = turnout && railwayTurnoutStation(plan, turnout);
  let main, branch = null, decisionM = null;
  if (departure === 'branch') {
    if (!junction) throw new Error('This route has no branch departure.');
    const end = junction.direction > 0 ? 0 : plan.lengthM;
    main = itinerary(leg('branch', turnout.plan, turnout.plan.lengthM, 0), leg('main', plan, junction.stationM, end));
  } else {
    const direction = departure === 'start' ? 1 : -1;
    const [from, to] = direction > 0 ? [0, plan.lengthM] : [plan.lengthM, 0];
    main = itinerary(leg('main', plan, from, to));
    if (junction?.direction === direction) {
      const approach = leg('main', plan, from, junction.stationM);
      const divergence = itinerary(approach, leg('branch', turnout.plan, 0, turnout.plan.lengthM));
      if (divergence.lengthM >= train.lengthM) {
        branch = divergence;
        decisionM = approach.lengthM;
      }
    }
  }
  assertSwitch(switchPosition, branch);
  if (main.lengthM < train.lengthM) {
    throw new Error(`This train needs ${train.lengthM.toFixed(1)} m of track from its departure end.`);
  }
  return {main, branch, decisionM, train};
}

export function assertRailwayTrainFits({plan, turnout}, placement) {
  planTrain(plan, turnout, placement);
}

function sample(path, distanceM) {
  let offset = distanceM;
  for (const item of path.legs) {
    if (offset < item.lengthM - EPS || item === path.legs.at(-1)) {
      return {...railwayStationAt(item.plan, item.from + item.direction * Math.min(item.lengthM, Math.max(0, offset))),
        track: item.track};
    }
    offset -= item.lengthM;
  }
}

function pose(path, headM, {id, centreBehindM, wheelbaseM, lengthM, reverse}) {
  const at = headM - centreBehindM;
  const front = sample(path, at + wheelbaseM / 2);
  const rear = sample(path, at - wheelbaseM / 2);
  return {
    id, lengthM, reverse,
    x: (front.x + rear.x) / 2,
    z: (front.z + rear.z) / 2,
    yaw: Math.atan2(front.x - rear.x, front.z - rear.z),
    front: {x: front.x, z: front.z, track: front.track},
    rear: {x: rear.x, z: rear.z, track: rear.track}
  };
}

// The host supplies travel in metres. A turnout is the only place where the
// selected route can diverge. Diamonds never appear in this itinerary.
export function createRailwayTrain(route, placement) {
  const plan = planRailwayRoute(route.waypoints);
  const turnout = route.turnout && planRailwayTurnout(plan, route.turnout);
  return createRailwayTrainOnPlan({id: route.id, plan, turnout}, placement);
}

export function createRailwayTrainOnPlan({id, plan, turnout}, placement) {
  const {routeId, stock, departure, switchPosition} = placement;
  if (id !== routeId) throw new Error('The train must start on its selected railway route.');
  const {main, branch, decisionM, train} = planTrain(plan, turnout, placement);
  let headM, path, turnoutTaken, setting;

  function chooseAt(distanceM) {
    if (!branch || turnoutTaken || distanceM < decisionM - EPS) return;
    turnoutTaken = setting;
    if (turnoutTaken === 'branch') path = branch;
  }

  function read() {
    return {
      routeId, stock, departure, turnoutTaken,
      distanceM: headM - train.lengthM,
      track: sample(path, headM).track,
      stopped: headM >= path.lengthM - EPS,
      cars: train.cars.map(spec => pose(path, headM, spec))
    };
  }

  function reset(switchSetting = setting) {
    assertSwitch(switchSetting, branch);
    setting = switchSetting;
    turnoutTaken = null;
    path = main;
    headM = train.lengthM;
    chooseAt(headM);
    return read();
  }

  function move(distanceM, switchSetting = setting) {
    if (!Number.isFinite(distanceM) || distanceM < 0) throw new Error('Train travel must be finite and nonnegative.');
    assertSwitch(switchSetting, branch);
    setting = switchSetting;
    const next = headM + distanceM;
    chooseAt(next);
    headM = Math.min(next, path.lengthM);
  }

  function advance(distanceM, switchSetting) {
    move(distanceM, switchSetting);
    return read();
  }

  function trajectory(switchSetting = setting) {
    assertSwitch(switchSetting, branch);
    const itinerary = turnoutTaken ? path : switchSetting === 'branch' ? branch : main;
    return {headM, lengthM: train.lengthM, endM: itinerary.lengthM, segments: itinerary.segments};
  }

  function lockSwitch(switchSetting) {
    assertSwitch(switchSetting, branch);
    setting = switchSetting;
    chooseAt(decisionM);
  }

  reset(switchPosition);
  return Object.freeze({canTakeBranch: Boolean(branch), read, advance, reset, move, trajectory, lockSwitch});
}
