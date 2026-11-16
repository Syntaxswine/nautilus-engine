import {railwayStockProfile} from './stock-profile.js';

// Semantic points match the original sculpt recipes, before the model's yaw.
// World bodies map source X/Y/Z independently; Miniature keeps source metres.
export function railwayCarEntrances(profileId, modelId) {
  const profile = railwayStockProfile(profileId);
  const spec = Object.values(profile.stock).flatMap(stock => stock.cars).find(car => car.id === modelId);
  if (!spec) throw Error('Unknown railway car model.');
  if (modelId === 'coal-tender') return [];
  const world = profileId === 'world', lengthScale = world ? 3 : 1;
  const sideScale = world ? modelId === 'steam-engine' ? 2.2 : modelId === 'steam-coach' ? 2.12 : 2.05 : 1;
  const heightScale = world ? modelId.startsWith('electric') ? 2.55 : 2.5 : 1;
  const deck = world ? modelId === 'steam-engine' ? 1.25 : 1.1 : .9;
  const half = spec.lengthM / (2 * lengthScale);
  const result = [];
  const point = (x, y, h = .9) => ({x: x * sideScale, y: y * lengthScale, h: deck + (h - .9) * heightScale});
  const add = (id, label, mode, x, z, insideX, insideZ, width, height, outward) => result.push({
    id, label, mode, local: point(x, z), attachment: point(insideX, insideZ),
    outward: {x: outward, y: 0}, widthM: width * (modelId.startsWith('steam') ? sideScale : lengthScale),
    clearanceM: height * heightScale, reachM: 1.5
  });
  for (const side of [-1, 1]) {
    const name = side < 0 ? 'left' : 'right';
    if (modelId === 'steam-engine') {
      // Open gaps beside the narrow rear cab panel, over the rear footplate.
      add('cab-rear-' + name, 'steam cab', 'driver', side * .34, -1.17, side * .34, -1.06, .30, .82, side);
    } else if (modelId === 'steam-coach') {
      for (const end of [-1, 1]) add('vestibule-' + (end < 0 ? 'rear-' : 'front-') + name,
        'steam coach', 'rider', side * .52, end * (half - .144), side * .28, end * (half - .08), .325, world ? .76 : .712, side);
    } else {
      const cab = modelId === 'electric-cab';
      for (const [index, z] of (cab ? [-.875, .722] : [-.892, .892]).entries()) {
        add('door-' + index + '-' + name, cab ? 'electric cab' : 'electric coach', cab ? 'driver' : 'rider',
          side * .594, z, 0, z, .298, world ? .72 : .607, side);
      }
    }
  }
  return result;
}

export function railwayLocalPoint(pose, local) {
  const yaw = pose.yaw + (pose.reverse ? Math.PI : 0), c = Math.cos(yaw), s = Math.sin(yaw);
  return {x: pose.x + local.x * c + local.y * s, y: pose.z - local.x * s + local.y * c, h: local.h};
}

export function railwayEntrancesForTrain(state) {
  const trainId = 'train/' + state.stock;
  return state.cars.flatMap((pose, index) => railwayCarEntrances(state.profile, pose.id).map(entrance => {
    const position = railwayLocalPoint(pose, entrance.local);
    const normalPoint = railwayLocalPoint(pose, {...entrance.local,
      x: entrance.local.x + entrance.outward.x, y: entrance.local.y + entrance.outward.y});
    return {...entrance, trainId, carId: trainId + '/car/' + index, carIndex: index, modelId: pose.id,
      cabFacing: entrance.mode === 'driver' ? pose.reverse ? -1 : 1 : null,
      position, attachedPosition: railwayLocalPoint(pose, entrance.attachment),
      outward: {x: normalPoint.x - position.x, y: normalPoint.y - position.y}};
  }));
}
