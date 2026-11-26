import {createMeleeState,stageMeleeCommand,stageMeleeTick,equipmentLoadout,meleeMode,readMeleePresentation,applyTypedMeleeDamage} from '@nautilus-engine/map-core/melee';
import type {MeleeCharacter,MeleeHostSnapshot} from '@nautilus-engine/map-core/melee';
import {fantasyEquipmentArt,listFantasyEquipmentArt} from '@nautilus-engine/map-core/fantasy-equipment-art';
import {createFantasyEquipmentModel} from '@nautilus-engine/map-core/fantasy-equipment-art/three';
import type {FantasyEquipmentThree} from '@nautilus-engine/map-core/fantasy-equipment-art/three';
import {prepareNativeMeleeActor} from '@nautilus-engine/map-core/native-actors/melee/three';
declare const character:MeleeCharacter,host:MeleeHostSnapshot,three:FantasyEquipmentThree;
const state=createMeleeState({id:'typed-duel',seed:123,content:{id:'fixture',version:1,sourcePin:'796c1e73644a30a3061d2f38b3bcccab49519453'},actors:[{id:'player',equipment:equipmentLoadout('sword','round-wood-shield')},{id:'target',equipment:equipmentLoadout('blacksmith-hammer')}]});
const action=stageMeleeCommand(state,{type:'attack',commandId:'strike-1',expectedRevision:0,actorId:'player',targetId:'target',modeId:'slash'},host);
if(action.ok&&!action.repeated){const number:number=action.characters[0]!.resources.hp;const type:'blunt'|'piercing'|'slash'=meleeMode('sword','slash').damageType;void number;void type;}
stageMeleeTick(state,{tick:1,stepId:'typed-duel/step/1'},host);
applyTypedMeleeDamage(character,24,'piercing',{armour:{id:'typed-flat-v1',version:1,reduction:{blunt:0,piercing:2,slash:3}}});
const sword=createFantasyEquipmentModel(three,{id:'sword'}),bow=createFantasyEquipmentModel(three,{id:'bow'});
sword.setArticulation({});bow.setArticulation({draw:.5,loaded:false});fantasyEquipmentArt('bow').grip.main.position;listFantasyEquipmentArt();
prepareNativeMeleeActor({renderer:{isWebGLRenderer:true},actorId:'player',readPresentation:()=>readMeleePresentation(state,'player',0)}).then(view=>{const id:string|null|undefined=view.readPresentation()?.actionId;view.setActive(true);view.dispose();void id;});
// @ts-expect-error explicit damage IDs, never an unknown default
applyTypedMeleeDamage(character,5,'physical');
// @ts-expect-error required full typed reduction profile
applyTypedMeleeDamage(character,5,'slash',{armour:{id:'typed-flat-v1',version:1,reduction:{slash:3}}});
// @ts-expect-error shields are not main weapons
equipmentLoadout('riot-shield');
// @ts-expect-error two-handed hammer cannot gain a shield
equipmentLoadout('blacksmith-hammer','tower-shield');
equipmentLoadout('pick');
// @ts-expect-error accepted two-handed pick cannot gain a shield
equipmentLoadout('pick','round-wood-shield');
// @ts-expect-error bow has no melee mode
meleeMode('bow','thrust');
// @ts-expect-error no undeclared equipment
fantasyEquipmentArt('long-sword');
// @ts-expect-error static art has no draw state
sword.setArticulation({draw:.2});
// @ts-expect-error draw is numeric
bow.setArticulation({draw:'full'});
// @ts-expect-error optional native standing-hand profile supports goat only
prepareNativeMeleeActor({renderer:{isWebGLRenderer:true},actorId:'player',model:'donkey',readPresentation:()=>readMeleePresentation(state,'player',0)});
// @ts-expect-error no invented melee stat added to character-v1
character.stats.melee=50;
