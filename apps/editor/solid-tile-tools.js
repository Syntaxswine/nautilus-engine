import {SOLID_TILE_STEPS, solidTileHeightM} from '../../packages/map-core/solid-tiles.js';

export function installSolidTileTools(panel) {
  const doc = panel.ownerDocument;
  const get = id => doc.getElementById(id);
  const label = doc.createElement('label'), steps = doc.createElement('select');
  steps.id = 'solid-steps';
  label.textContent = 'Block height';
  label.append(steps);
  for (let step = 1; step <= SOLID_TILE_STEPS; step++) {
    const option = doc.createElement('option');
    option.value = String(step);
    option.textContent = `${step}/${SOLID_TILE_STEPS} · ${solidTileHeightM(step).toFixed(3)} m`;
    steps.append(option);
  }
  panel.append(label);
  get('edit-tool').add(new Option('Solid block', 'solid-block'));
  get('edit-tool').add(new Option('Remove solid block', 'erase-solid-block'));
  return {
    steps: () => Number(steps.value),
    useSelected({data}) {
      steps.value = String(data.steps);
      get('ground-kind').value = data.skin;
      get('edit-tool').value = 'solid-block';
      get('edit-tool').dispatchEvent(new Event('change'));
    }
  };
}
