// Metres in the same world space as the editor grid. Kept free of rendering.
const car = (id, lengthM, wheelbaseM, reverse = false) => Object.freeze({id, lengthM, wheelbaseM, reverse});
function fleet(engine, tender, coach, cab, electricCoach) {
  return Object.freeze({
    steam: Object.freeze({label: 'Steam passenger train', cars: Object.freeze([engine, tender, coach, coach])}),
    electric: Object.freeze({label: 'Electric commuter train', cars: Object.freeze([cab, electricCoach,
      Object.freeze({...cab, reverse: true})])})
  });
}

export const RAILWAY_STOCK_PROFILES = Object.freeze({
  miniature: Object.freeze({label: 'Miniature', couplerHeightM: .71, gapM: .56, minRadiusM: 4, halfWidthM: .60,
    stock: fleet(car('steam-engine', 2.40, 1.40), car('coal-tender', 1.70, 1.05), car('steam-coach', 2.70, 1.65),
      car('electric-cab', 2.85, 1.70), car('electric-coach', 2.75, 1.65))}),
  world: Object.freeze({label: 'World size', couplerHeightM: 1.05, gapM: 1.2, minRadiusM: 16, halfWidthM: 1.25,
    stock: fleet(car('steam-engine', 7.2, 4.2), car('coal-tender', 5.1, 3.15), car('steam-coach', 8.1, 4.95),
      car('electric-cab', 8.55, 5.1), car('electric-coach', 8.25, 4.95))})
});

export function railwayStockProfile(id = 'miniature') {
  if (!Object.hasOwn(RAILWAY_STOCK_PROFILES, id)) throw new Error('Choose World size or Miniature train proportions.');
  return RAILWAY_STOCK_PROFILES[id];
}
