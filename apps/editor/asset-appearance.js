import {WEAPON_IDS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';

const weaponName=id=>['smg','hmg','rpg'].includes(id)?id.toUpperCase():id.charAt(0).toUpperCase()+id.slice(1);
const outfitNames={normal:'Original','red-hats':'Red Hats','blue-hawaiian':'Town guide · Hawaiian shirt & straw hat'};

// Editor metadata only. This works before native tools or WebGL are ready;
// rendering and saved-document eligibility remain separate reviewed contracts.
export function characterAppearanceChoices(asset,requested={}) {
  const weapons=asset.id==='hen'?['hands']:[...WEAPON_IDS];
  const outfits=asset.id==='donkey'?['normal','red-hats','blue-hawaiian']:['normal','red-hats'];
  const weapon=requested.weapon??asset.bindings?.['unit-weapon']??(asset.id==='hen'?'hands':'rifle');
  const outfit=requested.outfit??asset.bindings?.['unit-outfit']??'normal';
  if(!weapons.includes(weapon)||!outfits.includes(outfit))throw Error('This character does not support the selected equipment or outfit.');
  return {weapon,outfit,unarmed:asset.id==='hen',
    weapons:weapons.map(value=>({value,label:weaponName(value)})),
    outfits:outfits.map(value=>({value,label:outfitNames[value]}))};
}
