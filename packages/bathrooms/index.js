import {BATHROOM_CONTRACT, BATHROOM_MODULES, BATHROOM_LAYOUTS, bathroomRecipe} from './designs.js';
export {BATHROOM_CONTRACT, BATHROOM_MODULES, BATHROOM_LAYOUTS, bathroomRecipe};
export function compileBathroom(input) {
  if (input?.schema === BATHROOM_CONTRACT.schema) input = input.recipe;
  const recipe = typeof input === 'string' ? (BATHROOM_LAYOUTS.find(r => r.id === input) || bathroomRecipe(input)) : input;
  if (!recipe || ![...BATHROOM_MODULES, ...BATHROOM_LAYOUTS].some(r => r.id === recipe.id)) throw Error('Unknown bathroom recipe.');
  const r = structuredClone(recipe);
  const canonical = [...BATHROOM_MODULES, ...BATHROOM_LAYOUTS].find(q => q.id === r.id);
  if (r.kind !== canonical.kind || r.width !== canonical.width || r.depth !== canonical.depth || r.style !== canonical.style || r.hand !== canonical.hand) throw Error('Keep the registered bathroom construction and footprint.');
  if (!(r.width > 0 && r.depth > 0) || r.width > 240 || r.depth > 240) throw Error('Invalid bathroom dimensions.');
  if (r.kind === 'stall' && (r.width !== 1 || r.depth !== 2 || r.tiles?.join(',') !== '1,2')) throw Error('A stall must occupy exactly 1 × 2 tiles.');
  if (r.kind === 'layout') for (const i of r.instances) {
    if (!BATHROOM_MODULES.some(m => m.id === i.assetId) || i.position?.length !== 3 || !i.position.every(Number.isFinite) ||
      !Number.isFinite(i.yaw) || Math.abs(i.yaw / (Math.PI / 2) - Math.round(i.yaw / (Math.PI / 2))) > 1e-7 || i.scale?.some(v => v !== 1)) throw Error('Use known modules, finite positions, unit scale and quarter turns.');
    const module = BATHROOM_MODULES.find(m => m.id === i.assetId);
    if (['stall', 'assembly', 'outhouse'].includes(module.category) && ![i.position[0], i.position[2]].every(Number.isInteger)) throw Error('Place stall cells on whole tile lines.');
  }
  return {schema: BATHROOM_CONTRACT.schema, version: 1, id: r.id, name: r.name, collection: 'nautilus-bathrooms-v1',
    category: r.category, recipe: r, contract: structuredClone(BATHROOM_CONTRACT), nominalFootprint: [r.width, r.depth],
    stallCells: r.kind === 'stall' ? [[0, 0]] : r.cells || r.stallCells || (r.kind === 'outhouse' ? Array.from({length: r.bays}, (_, i) => [i, 0]) : []),
    consumerSupport: {editorProvider: false, plumbing: false, collision: false, navigation: false, fire: false},
    sourcePolicy: 'Original game-scale bathroom art; not a measured product or accessibility/industrial specification.'};
}
export function bathroomPlan(input) {
  const b = input?.schema === BATHROOM_CONTRACT.schema ? input : compileBathroom(input), r = b.recipe;
  const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  const sx = 90, sy = 170, scale = 70, w = Math.max(600, r.width * scale + 180), h = r.depth * scale + 225;
  let content = '';
  for (let x = 0; x <= r.width; x++) content += `<path d="M${sx + x * scale},${sy}v${r.depth * scale}"/>`;
  for (let z = 0; z <= r.depth; z++) content += `<path d="M${sx},${sy + z * scale}h${r.width * scale}"/>`;
  let cells = '';
  for (const [x, z] of b.stallCells) cells += `<rect x="${sx + x * scale}" y="${sy + z * scale}" width="70" height="140" fill="#d4e1d5" stroke="#466454" stroke-width="2"/><text x="${sx + (x + .5) * scale}" y="${sy + (z + 1) * scale}" text-anchor="middle" font-size="11">1 × 2 tiles</text><path d="M${sx + (x + .1) * scale},${sy + z * scale}h56a56,56 0 0 0 -56,-56z" fill="none" stroke="#9a875c" stroke-dasharray="4 3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(b.name)} tile plan"><rect width="100%" height="100%" fill="#f0eddf"/><g fill="#283e34" font-family="Georgia"><text x="30" y="35" font-size="23">${esc(b.name)}</text><text x="30" y="60" font-size="14">Native metres · 1 m per tile · closed footprint ${r.width} × ${r.depth} m</text><text x="30" y="82" font-size="12">Each stall = exactly 1 × 2 tiles; dashed door swing reserves aisle space.</text></g><g stroke="#c1c6b4" stroke-width="1">${content}</g><g font-family="sans-serif" fill="#283e34">${cells}</g><rect x="${sx}" y="${sy}" width="${r.width * scale}" height="${r.depth * scale}" fill="none" stroke="#283e34" stroke-width="2"/></svg>`;
}
