export type PhysicalDamageType='blunt'|'piercing'|'slash';
export type ShieldId='round-wood-shield'|'emblem-metal-shield'|'tower-shield'|'riot-shield';
export type MainEquipmentId='knife'|'short-sword'|'sword'|'axe'|'pick'|'blacksmith-hammer'|'mace'|'spear'|'halberd'|'bow'|'crossbow';
export type TwoHandedEquipmentId='blacksmith-hammer'|'spear'|'halberd'|'bow'|'crossbow';
export type FantasyEquipmentId=MainEquipmentId|ShieldId;
export type MeleeModeId='slash'|'thrust'|'chop'|'haft-bash'|'pick'|'heavy-blunt'|'haft-sweep';
export type MeleePose='slash'|'thrust'|'heavy-blunt';
export type ModeFor<I extends MainEquipmentId>=I extends 'knife'|'short-sword'|'sword'|'halberd'?'slash'|'thrust':I extends 'axe'?'chop'|'haft-bash':I extends 'pick'?'pick':I extends 'mace'|'blacksmith-hammer'?'heavy-blunt':I extends 'spear'?'thrust'|'haft-sweep':never;
export interface Resources {hp:number;ap:number;stamina:number}
/** Structural description of the unchanged portable character-v1 contract. */
export interface MeleeCharacter {version:1;id:string;name:string;stats:Record<'strength'|'endurance'|'dexterity'|'agility'|'intelligence'|'perception'|'mechanical'|'medical'|'firearms'|'heavyWeapons'|'explosives'|'leadership'|'sneak'|'climbing',number>;resources:Resources;skillPoints:number}
export interface Costs {ap:number;stamina:number}
export interface VersionedEquipment<I extends FantasyEquipmentId=FantasyEquipmentId>{id:I;version:1}
export interface EquipmentLoadout {main:VersionedEquipment<MainEquipmentId>|null;off:VersionedEquipment<ShieldId>|null}
export interface MeleeMode {readonly id:MeleeModeId;readonly damageType:PhysicalDamageType;readonly reachM:number;readonly arcDeg:number;readonly hitHeightM:number;readonly heightToleranceM:number;readonly damage:Readonly<{base:number;strength:number}>;readonly costs:Readonly<Costs>;readonly timing:Readonly<{windupTicks:number;impactTicks:number;recoveryTicks:number}>;readonly pose:MeleePose}
export interface ShieldGuard {readonly arcDeg:number;readonly upkeepPerSecond:number;readonly blockStamina:number;readonly minHeightM:number;readonly maxHeightM:number;readonly blocks:readonly PhysicalDamageType[];readonly approximation:string;readonly blockedDamage:0}
export interface EquipmentDefinition {readonly id:FantasyEquipmentId;readonly version:1;readonly slot:'main'|'off';readonly hands:1|2;readonly modes:readonly MeleeMode[];readonly guard?:ShieldGuard;readonly articulation?:Readonly<{draw:true;loaded:true}>;readonly rangedRules?:false;readonly usageCard:string}
export interface MeleeBalance {id:'strength-linear-v1';version:1;baseMultiplier:number;strengthMultiplier:number}
export interface MeleeBody {actorId:string;revision:number;position:{x:number;y:number;h:number};headingDeg:number;radiusM:number;heightM:number;floorId:string}
export interface MeleeWorld {id:string;revision:number}
export interface ContactQuery {version:1;world:MeleeWorld;sourceBody:MeleeBody;targetBody:MeleeBody;from:{x:number;y:number;h:number};to:{x:number;y:number;h:number}}
export interface ContactResponse {clear:boolean;world:MeleeWorld;sourceRevision:number;targetRevision:number;blockerId:string|null}
export interface TypedArmour {id:'typed-flat-v1';version:1;reduction:Record<PhysicalDamageType,number>}
export interface MeleeHostSnapshot {revision:number;characters:readonly MeleeCharacter[];bodies:readonly MeleeBody[];world:MeleeWorld;armour?:Record<string,TypedArmour|null>;owns(actorId:string,itemId:FantasyEquipmentId):boolean;permitted(request:{type:string;actorId:string;targetId:string|null;itemId:FantasyEquipmentId|null}):{ok:boolean;reason:string};traceContact(query:ContactQuery):ContactResponse}
export interface MeleeOutcome {id:string;actorId:string;targetId:string;itemId:MainEquipmentId;modeId:MeleeModeId;damageType:PhysicalDamageType;tick:number;rolledHit:boolean;contact:boolean;blocked:boolean;reason:string;chance:number;seedBefore:number;seedAfter:number;rawDamage:number;armourReduction:number;enduranceResistance:number;hpLost:number;guardCost:number;world:MeleeWorld;sourceBody:MeleeBody;targetBody:MeleeBody}
export interface MeleeAction {id:string;commandId:string;itemId:MainEquipmentId;itemVersion:1;modeId:MeleeModeId;targetId:string;startedTick:number;resolved:boolean;interrupted:boolean;interruptedTick:number|null;recoveryUntil:number|null;outcome:MeleeOutcome|null}
export interface MeleeParticipant {id:string;equipment:EquipmentLoadout;guard:boolean;articulation:{draw:number;loaded:boolean};action:MeleeAction|null}
export interface MeleeEvent {id:string;type:string;tick:number;[field:string]:unknown}
export interface CommandReceipt {commandId:string;type:MeleeCommand['type'];actorId:string;tick:number;revision:number;eventIds:string[]}
export interface MeleeState {kind:'nautilus-melee-state';version:1;profile:'nautilus-melee-training-v1';balance:MeleeBalance;id:string;content:{id:string;version:number;sourcePin:string};seed:number;tick:number;revision:number;actors:MeleeParticipant[];receipts:Array<{commandId:string;request:string;receipt:CommandReceipt}>;events:MeleeEvent[]}
interface CommandBase {commandId:string;expectedRevision:number;actorId:string}
export type MeleeCommand=CommandBase&({type:'attack';targetId:string;modeId:MeleeModeId}|{type:'equip';equipment:EquipmentLoadout}|{type:'guard';active:boolean}|{type:'interrupt';reason:string}|{type:'articulate';draw:number;loaded:boolean});
export interface Budget {current:Resources;reserved:Costs;available:Costs}
export interface MeleeRefusal {ok:false;code:string;reason:string;committed:false;repeated:false;events:[]}
export interface MeleeRepeated {ok:true;committed:false;repeated:true;receipt:CommandReceipt|{stepId:string;tick:number};events:[]}
/** A pure proposal. Only the retained host may atomically publish all fields. */
export interface MeleePlan {ok:true;code:null;reason:null;committed:false;repeated:false;next:MeleeState;characters:MeleeCharacter[];events:MeleeEvent[];receipt:CommandReceipt|{stepId:string;tick:number;revision:number};expected:{melee:string;host:{revision:number;characters:MeleeCharacter[];bodies:MeleeBody[];world:MeleeWorld;armour:Record<string,TypedArmour|null>}};budgets:Record<string,Budget>}
export type MeleeStage=MeleeRefusal|MeleeRepeated|MeleePlan;
export interface MeleePresentation {actorId:string;headingDeg:number;equipment:EquipmentLoadout;guard:boolean;articulation:{draw:number;loaded:boolean};phase:'idle'|'windup'|'impact'|'recovery';progress:number;actionId:string|null;pose:MeleePose}
export const PHYSICAL_DAMAGE_TYPES:readonly PhysicalDamageType[];
export const MELEE_PROFILE:Readonly<{id:'nautilus-melee-training-v1';version:1;stepMs:50;rollProfile:'farmyard-percent-1';maximumActors:8;maximumCommands:512;maximumEvents:4096;[key:string]:string|number}>;
export const DEFAULT_MELEE_BALANCE:Readonly<MeleeBalance>;
export function listMeleeEquipment():readonly EquipmentDefinition[];
export function meleeEquipment(id:FantasyEquipmentId):EquipmentDefinition;
export function meleeMode<I extends MainEquipmentId>(itemId:I,modeId:ModeFor<I>):MeleeMode;
export function equipmentLoadout<I extends MainEquipmentId|null=null>(main?:I,off?:I extends TwoHandedEquipmentId?null:ShieldId|null):EquipmentLoadout;
export function rawMeleeDamage(mode:MeleeMode,strength:number,balance?:MeleeBalance):number;
export function createMeleeState(options:{id:string;content:MeleeState['content'];seed:number;actors:Array<{id:string;equipment?:EquipmentLoadout}>;balance?:MeleeBalance}):MeleeState;
export function openMeleeState(input:MeleeState|string):MeleeState;
export function reservations(state:MeleeState):Record<string,Costs>;
export function availableMeleeBudgets(state:MeleeState,characters:readonly MeleeCharacter[]):Record<string,Budget>;
export function readMeleeActor(state:MeleeState,id:string):MeleeParticipant&{phase:MeleePresentation['phase'];progress:number;reservation:Costs};
export function readMeleePresentation(state:MeleeState,id:string,headingDeg:number):MeleePresentation;
export function previewMeleeAttack(state:MeleeState,request:{actorId:string;targetId:string;modeId:MeleeModeId},host:MeleeHostSnapshot):MeleeRefusal|{ok:boolean;reason:string;committed:false;chance:number;rawDamage:number;damageType:PhysicalDamageType;contact:{eligible:boolean;reason:string|null};[key:string]:unknown};
export function stageMeleeCommand(state:MeleeState,command:MeleeCommand,host:MeleeHostSnapshot):MeleeStage;
export function stageMeleeTick(state:MeleeState,step:{tick:number;stepId:string},host:MeleeHostSnapshot):MeleeStage;
export function applyTypedMeleeDamage(character:MeleeCharacter,rawDamage:number,type:PhysicalDamageType,options?:{armour?:TypedArmour|null;resistance?:'endurance'|'none'}):{character:MeleeCharacter;damageType:PhysicalDamageType;rawDamage:number;armourReduction:number;enduranceResistance:number;hpLost:number;hpBefore:number;hpAfter:number};
