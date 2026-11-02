export function prefabPlacementOptions() {
  const $=id=>document.getElementById(id);
  return {asset:$('building-asset')?.value,turns:Number($('building-turns')?.value||0),clearance:Number($('building-clearance')?.value||2)};
}
