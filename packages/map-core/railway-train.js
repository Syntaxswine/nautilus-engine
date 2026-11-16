import {planRailwayRoute, planRailwayTurnout, railwayStationAt} from '../railway-visuals/route.js';
import {railwayStockProfile, RAILWAY_STOCK_PROFILES} from '../railway-visuals/stock-profile.js';

export const RAILWAY_COUPLER_HEIGHT_M = .71;
const EPS = 1e-8;

export const RAILWAY_STOCK = RAILWAY_STOCK_PROFILES.miniature.stock;
export {RAILWAY_STOCK_PROFILES};

function consist(stock, profileId) {
  const profile = railwayStockProfile(profileId);
  if (typeof stock !== 'string' || !Object.hasOwn(RAILWAY_STOCK, stock)) throw new Error('Choose a steam or electric train.');
  let lengthM = 0;
  const cars = profile.stock[stock].cars.map((spec, index) => {
    if (index) lengthM += profile.gapM;
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
  if(turnout.plan.geometryProfile==='surveyed-v1')return {stationM:turnout.mainStationM,direction:turnout.mainDirection};
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
  const profile = railwayStockProfile(placement.profile);
  const train = consist(stock, placement.profile);
  if ((plan.radiusM ?? 4) < profile.minRadiusM) {
    throw new Error(`World-size trains need ${profile.minRadiusM} m curves. Lay a World size route or choose Miniature.`);
  }
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
  if (path.legs.length === 1 && path.legs[0].plan.closed) {
    const item = path.legs[0], length = item.plan.lengthM;
    const wrapped = ((item.from + item.direction * distanceM) % length + length) % length;
    const at = railwayStationAt(item.plan, wrapped);
    return {...at, s: at.s * item.direction, c: at.c * item.direction, track: item.track};
  }
  let offset = distanceM;
  for (const item of path.legs) {
    if (offset < item.lengthM - EPS || item === path.legs.at(-1)) {
      const at = railwayStationAt(item.plan, item.from + item.direction * Math.min(item.lengthM, Math.max(0, offset)));
      return {...at, s: at.s * item.direction, c: at.c * item.direction, track: item.track};
    }
    offset -= item.lengthM;
  }
}

export function createRailwayCircuitTrainOnPlan({id, plan}, placement) {
  if (!plan.closed || placement.routeId !== id || !['start', 'end'].includes(placement.departure) || placement.switchPosition !== 'main') {
    throw Error('A circuit train needs its own closed route, start/end orientation and main setting.');
  }
  const profile = placement.profile ?? 'miniature', spec = railwayStockProfile(profile);
  const train = consist(placement.stock, profile);
  if (plan.radiusM < spec.minRadiusM || plan.lengthM < train.lengthM + 1) throw Error('This circuit cannot fit the selected stock.');
  const path = itinerary(leg('main', plan, placement.departure === 'start' ? 0 : plan.lengthM,
    placement.departure === 'start' ? plan.lengthM : 0));
  let headM = train.lengthM;
  function read() {
    return {routeId: id, stock: placement.stock, profile, couplerHeightM: spec.couplerHeightM,
      departure: placement.departure, turnoutTaken: null, distanceM: headM - train.lengthM,
      track: 'main', stopped: false, circuit: true, circuitLengthM: plan.lengthM,
      cars: train.cars.map(car => pose(path, headM, car))};
  }
  return Object.freeze({read, moveSigned(distanceM) {
    if (!Number.isFinite(distanceM) || Math.abs(headM + distanceM) > 1e9) throw Error('Checkpoint and migrate this bounded circuit odometer.');
    headM += distanceM;
  }, checkpoint() { return {headM}; }, restore(record) {
    if (!record || Object.keys(record).join(',') !== 'headM' || !Number.isFinite(record.headM) || Math.abs(record.headM) > 1e9) throw Error('Invalid circuit motion checkpoint.');
    headM = record.headM;
  }});
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
    front: {x: front.x, z: front.z, yaw: Math.atan2(front.s, front.c), track: front.track},
    rear: {x: rear.x, z: rear.z, yaw: Math.atan2(rear.s, rear.c), track: rear.track}
  };
}

// The host supplies travel in metres. A turnout is the only place where the
// selected route can diverge. Diamonds never appear in this itinerary.
export function createRailwayTrain(route, placement) {
  const plan = planRailwayRoute(route.waypoints, route.radiusM,route.geometryProfile);
  const turnout = route.turnout && planRailwayTurnout(plan, route.turnout);
  return createRailwayTrainOnPlan({id: route.id, plan, turnout}, placement);
}

export function createRailwayTrainOnPlan({id, plan, turnout}, placement) {
  const {routeId, stock, departure, switchPosition} = placement;
  const profile = placement.profile ?? 'miniature';
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
      routeId, stock, profile, couplerHeightM: railwayStockProfile(profile).couplerHeightM, departure, turnoutTaken,
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

  // Driver sessions use signed itinerary travel. Body orientation stays fixed;
  // reversing follows the same latched path until the entire consist is back
  // on the approach. The legacy nonnegative playback API remains unchanged.
  function moveSigned(distanceM, switchSetting = setting) {
    if (!Number.isFinite(distanceM)) throw Error('Signed train travel must be finite.');
    assertSwitch(switchSetting, branch);
    setting = switchSetting;
    if (distanceM >= 0) chooseAt(headM + distanceM);
    headM = Math.max(train.lengthM, Math.min(headM + distanceM, path.lengthM));
    if (branch && headM < decisionM - EPS) {
      turnoutTaken = null;
      path = main;
    }
  }

  function checkpoint() { return {version: 1, headM, setting, turnoutTaken}; }

  function restore(saved) {
    if (!saved || saved.version !== 1 || Object.keys(saved).sort().join(',') !== 'headM,setting,turnoutTaken,version') {
      throw Error('Unsupported railway motion checkpoint.');
    }
    assertSwitch(saved.setting, branch);
    if (![null, 'main', 'branch'].includes(saved.turnoutTaken) || saved.turnoutTaken === 'branch' && !branch ||
        !Number.isFinite(saved.headM)) throw Error('Invalid railway path history.');
    const stagedPath = saved.turnoutTaken === 'branch' ? branch : main;
    if (saved.headM < train.lengthM - EPS || saved.headM > stagedPath.lengthM + EPS ||
        branch && saved.headM >= decisionM + EPS && !saved.turnoutTaken || !branch && saved.turnoutTaken !== null) {
      throw Error('Saved railway position does not fit its latched itinerary.');
    }
    headM = saved.headM; setting = saved.setting; turnoutTaken = saved.turnoutTaken; path = stagedPath;
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
  return Object.freeze({canTakeBranch: Boolean(branch), read, advance, reset, move, trajectory, lockSwitch,
    moveSigned, checkpoint, restore});
}
