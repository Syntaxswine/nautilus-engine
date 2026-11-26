import {freeze,insist,number,record} from './data.js';

export const PHYSICAL_DAMAGE_TYPES=freeze(['blunt','piercing','slash']);
export const DEFAULT_MELEE_BALANCE=freeze({id:'strength-linear-v1',version:1,baseMultiplier:1,strengthMultiplier:1});
export const MELEE_PROFILE=freeze({id:'nautilus-melee-training-v1',version:1,stepMs:50,rollProfile:'farmyard-percent-1',accuracy:'existing-skill-null-dexterity',damage:'round(base + strength * coefficient)',resistance:'endurance-once',contact:'single-current-world-body-cone-sample-at-impact-start',costs:'reserve-at-windup-commit-at-impact',guard:'active-facing-body-band-not-mesh',maximumActors:8,maximumCommands:512,maximumEvents:4096});
const attack=(id,damageType,reachM,arcDeg,base,strength,ap,stamina,windup,impact,recovery,pose)=>({id,damageType,reachM,arcDeg,hitHeightM:1.1,heightToleranceM:.22,damage:{base,strength},costs:{ap,stamina},timing:{windupTicks:windup,impactTicks:impact,recoveryTicks:recovery},pose});
const slash=(reach=1.25,base=8,strength=.30)=>attack('slash','slash',reach,110,base,strength,1,4,6,3,7,'slash');
const thrust=(reach=1.45,base=8,strength=.28)=>attack('thrust','piercing',reach,40,base,strength,1,4,5,3,7,'thrust');
const heavy=(reach=1.25,base=16,strength=.60)=>attack('heavy-blunt','blunt',reach,80,base,strength,2,10,12,3,13,'heavy-blunt');
const shield=(arcDeg,upkeepPerSecond,blockStamina,minHeightM,maxHeightM)=>({arcDeg,upkeepPerSecond,blockStamina,minHeightM,maxHeightM,blocks:PHYSICAL_DAMAGE_TYPES,approximation:'current-facing-cone-and-relative-body-height-band',blockedDamage:0});
const entries=[
  {id:'knife',hands:1,modes:[slash(.8,4,.22),thrust(.9,5,.22)]},
  {id:'short-sword',hands:1,modes:[slash(1.1,7,.28),thrust(1.25,7,.27)]},
  {id:'sword',hands:1,modes:[slash(),thrust()]},
  {id:'axe',hands:1,modes:[{...slash(1.2,12,.38),id:'chop'},attack('haft-bash','blunt',.9,90,4,.20,1,4,7,3,8,'heavy-blunt')]},
  {id:'pick',hands:1,modes:[attack('pick','piercing',1.05,65,12,.4,2,7,9,3,10,'heavy-blunt')]},
  {id:'blacksmith-hammer',hands:2,modes:[heavy(1.5,16,.6)]},
  {id:'mace',hands:1,modes:[heavy(1.2,10,.45)]},
  {id:'spear',hands:2,modes:[thrust(2.35,10,.35),attack('haft-sweep','blunt',1.6,130,5,.23,1,6,8,3,9,'slash')]},
  {id:'halberd',hands:2,modes:[slash(2.0,14,.4),thrust(2.5,10,.35)]},
  {id:'bow',hands:2,modes:[],articulation:{draw:true,loaded:true},rangedRules:false},
  {id:'crossbow',hands:2,modes:[],articulation:{draw:true,loaded:true},rangedRules:false},
  {id:'round-wood-shield',hands:1,modes:[],guard:shield(105,1,6,.45,1.5)},
  {id:'emblem-metal-shield',hands:1,modes:[],guard:shield(90,.8,5,.65,1.5)},
  {id:'tower-shield',hands:1,modes:[],guard:shield(140,2,9,.08,1.9)},
  {id:'riot-shield',hands:1,modes:[],guard:shield(130,1.8,8,.10,1.85)}
];
const catalogue=freeze(entries.map(entry=>({...entry,version:1,slot:entry.guard?'off':'main',usageCard:'packages/melee-core/usage-card.json'})));
export function meleeEquipment(id){const entry=catalogue.find(e=>e.id===id);insist(entry,'MELEE_EQUIPMENT_UNKNOWN','Choose a canonical fantasy equipment ID.');return entry;}
export const listMeleeEquipment=()=>catalogue;
export function meleeMode(itemId,modeId){const item=meleeEquipment(itemId),mode=item.modes.find(m=>m.id===modeId);insist(mode,'MELEE_MODE_UNSUPPORTED','This item has no selected melee mode. Bow/crossbow articulation is not a ranged attack system.');return mode;}
export function equipmentLoadout(main=null,off=null){return validateEquipment({main:main===null?null:{id:main,version:1},off:off===null?null:{id:off,version:1}});}
export function validateEquipment(value){record(value,['main','off']);const slot=value=>{if(value===null)return null;record(value,['id','version']);const item=meleeEquipment(value.id);insist(value.version===item.version,'MELEE_EQUIPMENT_VERSION','Use the exact declared equipment definition version.');return item;},main=slot(value.main),off=slot(value.off);insist(!main||main.slot==='main','MELEE_SLOT','A shield belongs in the off-hand slot.');insist(!off||off.slot==='off','MELEE_SLOT','The off-hand slot accepts a declared shield.');insist(!off||main?.hands!==2,'MELEE_TWO_HANDS','Release the shield before equipping a two-handed item.');return {main:main?{id:main.id,version:main.version}:null,off:off?{id:off.id,version:off.version}:null};}
export function damageType(value){insist(PHYSICAL_DAMAGE_TYPES.includes(value),'MELEE_DAMAGE_TYPE','Choose blunt, piercing or slash explicitly.');return value;}
export function meleeBalance(value=DEFAULT_MELEE_BALANCE){record(value,['id','version','baseMultiplier','strengthMultiplier']);insist(value.id===DEFAULT_MELEE_BALANCE.id&&value.version===1,'MELEE_BALANCE','Choose the declared linear strength balance profile.');number(value.baseMultiplier,0,4,'base multiplier');number(value.strengthMultiplier,0,4,'strength multiplier');return {...value};}
export function rawMeleeDamage(mode,strength,balance=DEFAULT_MELEE_BALANCE){damageType(mode.damageType);record(mode.damage,['base','strength']);number(mode.damage.base,0,1000,'base damage');number(mode.damage.strength,0,100,'strength coefficient');number(strength,1,100,'strength');const b=meleeBalance(balance);return Math.round(mode.damage.base*b.baseMultiplier+mode.damage.strength*strength*b.strengthMultiplier);}
