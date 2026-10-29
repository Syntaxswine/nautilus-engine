import {createBlockDocument,openDocument} from '../../packages/map-core/index.js';
import {WEAPON_IDS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';

export const BEAR_EDITOR_INTAKE=Object.freeze({
  engine:'8c4670450cb2b38c1e1abd811d633c22de9e2b7c',
  proposal:'1115871def96e8a9e5ddc239bf4ad5a5a7ff9829',
  bearSource:'4f5f53917990ec03b2f14c65f067e4b99ec8fcaa',
  legacySource:'781246a668c723d5a4c5463e70534cc04b6a5641'
});

// These describe acceptance intent, not a new appearance API or save schema.
export function bearEditorCases() {
  return {
    source:{...BEAR_EDITOR_INTAKE},identity:'people:bear',model:'bear',
    variants:['normal','red-hats'].flatMap(outfit=>WEAPON_IDS.map(weapon=>({species:'bear',outfit,weapon}))),
    placements:[
      {tool:'guard',start:{x:5,y:5,z:0},options:{species:'bear',weapon:'rifle',outfit:'normal',heading:90}},
      {tool:'npc',start:{x:9,y:5,z:0},options:{species:'bear',weapon:'pistol',outfit:'red-hats',heading:225}}
    ],
    headings:[0,45,90,135,180,225,270,315],
    clearanceReference:{units:'metres',floor:0,wallTop:2,nextFloor:2.12,slabThickness:.12,doorWidth:1,doorHeight:1.65,
      note:'Compare native body and equipped pose bounds; a one-tile reservation does not prove clearance.'}
  };
}

export function bearEditorBaselineFixtures() {
  const cases=bearEditorCases(),document=createBlockDocument('Bear editor contract fixture');
  const floor=document.apply({tool:'floor',start:{x:0,y:0,z:0},end:{x:23,y:23,z:0},options:{}});
  if(!floor.ok)throw Error(floor.error);
  for(const command of cases.placements) {
    const comparison={...command,options:{...command.options,species:'cow'}};
    const result=document.apply(comparison);if(!result.ok)throw Error(result.error);
  }
  const baseline=JSON.parse(document.export());
  for(const [index,actor]of baseline.guards.entries()) {
    actor.outfit=cases.placements[index].options.outfit;
    actor.character.id=index?'char_bear-intake-npc-red-hat':'char_bear-intake-guard-regular';
    actor.character.displayName=index?'Red Hat visitor':'Regular workshop guard';
    actor.character.scriptId=index?'bear_visitor':'bear_guard';
  }
  baseline.guards[1].character.references=[{role:'related_character',targetId:baseline.guards[0].character.id}];
  // Remove generated editor identities by reopening the authored, stable rows.
  const baselineBlock=JSON.parse(openDocument(baseline).export());
  const unsupportedBearBlock=structuredClone(baselineBlock);
  unsupportedBearBlock.name='Unsupported v0.8 bear intent';
  for(const actor of unsupportedBearBlock.guards)actor.species='bear';
  return {baselineBlock,unsupportedBearBlock};
}
