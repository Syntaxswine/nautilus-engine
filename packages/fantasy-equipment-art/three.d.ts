import type {
  FantasyEquipmentID, FantasyRangedEquipmentID, FantasyEquipmentFinishFor,
  FantasyEquipmentSocketFor, FantasyEquipmentPose, FantasyEquipmentPosePatch,
  FantasyStaticEquipmentPose,
} from './catalogue.js';

/** Minimal structural contract, not a replacement Three class or dependency. */
export interface FantasyEquipmentObject3D {
  readonly isObject3D: boolean;
  name: string;
  visible: boolean;
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number };
  updateMatrixWorld(force?: boolean): void;
  removeFromParent(): unknown;
}
/** Host constructors/constants are borrowed; no Three import or instance owned. */
export interface FantasyEquipmentThree {
  Group: new () => FantasyEquipmentObject3D;
  Object3D: new () => FantasyEquipmentObject3D;
  Mesh: new (...args: never[]) => object;
  BufferGeometry: new (...args: never[]) => object;
  Float32BufferAttribute: new (...args: never[]) => object;
  MeshStandardMaterial: new (...args: never[]) => object;
  DataTexture: new (...args: never[]) => object;
  RGBAFormat: number;
  UnsignedByteType: number;
  SRGBColorSpace: string;
  LinearMipmapLinearFilter: number;
  LinearFilter: number;
  DoubleSide: number;
}
export interface FantasyEquipmentOptions<ID extends FantasyEquipmentID = FantasyEquipmentID> {
  id: ID;
  finish?: FantasyEquipmentFinishFor<ID> | undefined;
}
/** Distributes across unknown IDs so optional sockets are never invented. */
export type FantasyEquipmentSockets<ID extends FantasyEquipmentID, Anchor> =
  ID extends FantasyEquipmentID ? Record<FantasyEquipmentSocketFor<ID>, Anchor> : never;
export interface FantasyEquipmentModel<
  ID extends FantasyEquipmentID = FantasyEquipmentID,
  Root = FantasyEquipmentObject3D,
  Anchor = FantasyEquipmentObject3D,
> {
  root: Root;
  sockets: FantasyEquipmentSockets<ID, Anchor>;
  /** Validates before mutation; static IDs accept only {}. No action effects. */
  setArticulation(input?: ID extends FantasyRangedEquipmentID ? FantasyEquipmentPosePatch : FantasyStaticEquipmentPose):
    ID extends FantasyRangedEquipmentID ? FantasyEquipmentPose : FantasyStaticEquipmentPose;
  /** Terminal/idempotent; drains owned resources and preserves borrowed hosts. */
  dispose(): void;
}
/** Infers the host's full Group/Object3D types without an @types/three peer. */
export function createFantasyEquipmentModel<Host extends FantasyEquipmentThree, ID extends FantasyEquipmentID>(
  THREE: Host, options: FantasyEquipmentOptions<ID>,
): FantasyEquipmentModel<ID, InstanceType<Host['Group']>, InstanceType<Host['Object3D']>>;
