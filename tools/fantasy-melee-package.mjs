export function withFantasyMeleeExports(exports,profile){
 const next={...exports};if(profile==='renderer'||profile==='assets')next['./fantasy-equipment-art']='./packages/fantasy-equipment-art/catalogue.js';
 if(profile==='renderer')next['./melee/equipment']='./packages/melee-core/equipment.js';return next;
}
export function fantasyMeleePackageFiles(profile){
 const files=['packages/fantasy-equipment-art/catalogue.d.ts','packages/fantasy-equipment-art/README.md','assets/fantasy-equipment/NOTICE.md','assets/fantasy-equipment/provenance.json','docs/fantasy-melee.md','docs/reviews/fantasy-equipment/integration/sources.json'];
 if(profile!=='assets')files.push('packages/melee-core/index.d.ts','packages/melee-core/equipment.d.ts','packages/melee-core/README.md','packages/melee-core/usage-card.json');
 if(profile==='renderer'||profile==='compatibility')files.push('packages/fantasy-equipment-art/three.d.ts','packages/native-actors/melee-three.d.ts','packages/native-actors/MELEE.md','packages/native-actors/melee-usage-card.json');
 return files;
}
