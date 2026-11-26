/** Native-metre, appearance-only metadata. No renderer or DOM dependency. */
export type FantasyEquipmentID =
  | 'knife' | 'short-sword' | 'sword' | 'axe' | 'pick'
  | 'blacksmith-hammer' | 'mace' | 'spear' | 'halberd'
  | 'bow' | 'crossbow' | 'round-wood-shield' | 'emblem-metal-shield'
  | 'tower-shield' | 'riot-shield';
export type FantasyRangedEquipmentID = 'bow' | 'crossbow';
export type FantasyShieldID = 'round-wood-shield' | 'emblem-metal-shield' | 'tower-shield' | 'riot-shield';
export type FantasyEquipmentFamily = 'blade' | 'tool' | 'polearm' | 'ranged' | 'shield';
export type FantasyEquipmentFinish = 'standard' | 'teal' | 'red' | 'opaque';
export type FantasyEquipmentFinishFor<ID extends FantasyEquipmentID> =
  'standard' | (ID extends 'round-wood-shield' ? 'teal' :
    ID extends 'emblem-metal-shield' ? 'red' : ID extends 'riot-shield' ? 'opaque' : never);
export type EquipmentPoint = [number, number, number];
export type EquipmentQuaternion = [number, number, number, number];
export interface EquipmentBounds { min: EquipmentPoint; max: EquipmentPoint }
export type FantasyEquipmentSocketID =
  | 'grip.main' | 'grip.off' | 'edge' | 'tip' | 'poll' | 'head' | 'hook' | 'butt'
  | 'face.left' | 'face.right' | 'face' | 'back' | 'aim'
  | 'limb.upper' | 'limb.lower' | 'limb.left' | 'limb.right'
  | 'string.nock' | 'projectile.nock' | 'projectile.tip';
export type FantasyEquipmentSocketFor<ID extends FantasyEquipmentID> = 'grip.main'
  | (ID extends 'pick' | 'blacksmith-hammer' | 'spear' | 'halberd' | FantasyRangedEquipmentID | FantasyShieldID ? 'grip.off' : never)
  | (ID extends 'knife' | 'short-sword' | 'sword' ? 'edge' | 'tip'
    : ID extends 'axe' ? 'edge' | 'poll'
    : ID extends 'pick' ? 'tip' | 'poll'
    : ID extends 'blacksmith-hammer' ? 'face.left' | 'face.right'
    : ID extends 'mace' ? 'head'
    : ID extends 'spear' ? 'tip' | 'butt'
    : ID extends 'halberd' ? 'tip' | 'edge' | 'hook'
    : ID extends 'bow' ? 'aim' | 'limb.upper' | 'limb.lower' | 'string.nock' | 'projectile.nock' | 'projectile.tip'
    : ID extends 'crossbow' ? 'aim' | 'limb.left' | 'limb.right' | 'string.nock' | 'projectile.nock' | 'projectile.tip'
    : ID extends FantasyShieldID ? 'face' | 'back' : never);
export interface EquipmentGrip {
  position: EquipmentPoint;
  quaternion: EquipmentQuaternion;
  socket: 'grip.main' | 'grip.off';
  moves: boolean;
}
export interface EquipmentSocket {
  id: FantasyEquipmentSocketID;
  position: EquipmentPoint;
  quaternion: EquipmentQuaternion;
  moves: boolean;
  role: 'grasp' | 'projectile-marker' | 'articulation-marker' | 'descriptive-part-marker';
}
export interface FantasyEquipmentPose { draw: number; loaded: boolean }
/** Runtime requires finite draw in 0..1 and boolean loaded, independently. */
export interface FantasyEquipmentPosePatch { draw?: number; loaded?: boolean }
export type FantasyStaticEquipmentPose = Record<string, never>;
export interface FantasyRangedArticulation {
  fields: { draw: { type: 'finite-number'; min: 0; max: 1 }; loaded: { type: 'boolean' } };
  defaults: FantasyEquipmentPose;
  patch: true;
  combinations: string;
  movingParts: string[];
  stableNodes: true;
}
export interface FantasyStaticArticulation {
  fields: Record<string, never>;
  defaults: FantasyStaticEquipmentPose;
  patch: false;
  combinations: string;
}
export interface EquipmentGeometryBudget { triangles: number; meshBatches: number; materials: number }
export interface FantasyEquipmentArt {
  id: FantasyEquipmentID;
  label: string;
  version: 1;
  status: 'review-candidate';
  appearanceOnly: true;
  family: FantasyEquipmentFamily;
  units: 'metres';
  nativeScale: 1;
  axes: { up: '+Y'; right: '+X'; front: '+Z'; projectileForward: '+Z' | null; longWeapon: '+Y' };
  origin: string;
  bounds: EquipmentBounds;
  restBounds: EquipmentBounds;
  boundsPolicy: string;
  grip: { main: EquipmentGrip; off: EquipmentGrip | null };
  sockets: EquipmentSocket[];
  parts: string[];
  finishes: FantasyEquipmentFinish[];
  articulation: FantasyRangedArticulation | FantasyStaticArticulation;
  resources: EquipmentGeometryBudget & {
    textures: 1; textureSize: [512, 512]; textureBytes: 1048576;
    gpuTextureBytesWithMipmaps: 1398100; asynchronousLoads: 0;
    byFinish: { standard: EquipmentGeometryBudget } & Partial<Record<FantasyEquipmentFinish, EquipmentGeometryBudget>>;
  };
  handoff: {
    guide: string; example: string; provenance: string; entry: string;
    required: string[]; hostOwns: string[]; schema: 'nautilus-fantasy-equipment-art-v1';
  };
}
/** Returns detached mutable records. Unknown runtime IDs throw EQUIPMENT_ID. */
export function fantasyEquipmentArt(id: FantasyEquipmentID): FantasyEquipmentArt;
export function listFantasyEquipmentArt(): FantasyEquipmentArt[];
