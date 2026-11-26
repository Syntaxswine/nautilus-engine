import {fantasyEquipmentArt, listFantasyEquipmentArt} from '../../packages/fantasy-equipment-art/catalogue.js';
import type {FantasyEquipmentID, FantasyEquipmentPose, FantasyEquipmentArt} from '../../packages/fantasy-equipment-art/catalogue.js';
import {createFantasyEquipmentModel} from '../../packages/fantasy-equipment-art/three.js';
import type {FantasyEquipmentThree, FantasyEquipmentObject3D} from '../../packages/fantasy-equipment-art/three.js';

// Strict ES-only consumer: no DOM, external Three types or runtime stubs imported.
declare class HostAnchor implements FantasyEquipmentObject3D {
  readonly isObject3D: true;
  name: string; visible: boolean;
  position: {x:number;y:number;z:number};
  quaternion: {x:number;y:number;z:number;w:number};
  scale: {x:number;y:number;z:number};
  updateMatrixWorld(force?:boolean): void;
  removeFromParent(): this;
  hostAnchorMethod(): 'preserved-anchor';
}
declare class HostGroup extends HostAnchor { hostGroupMethod(): 'preserved-group' }
// Concrete signatures include required arguments, as the actual host namespace
// does; the declaration must not force a second Three dependency or zero-arg kit.
declare const host: {
  Group: typeof HostGroup;
  Object3D: typeof HostAnchor;
  Mesh: new (geometry?:object,material?:object) => object;
  BufferGeometry: new () => object;
  Float32BufferAttribute: new (array:ArrayLike<number>,itemSize:number,normalized?:boolean) => object;
  MeshStandardMaterial: new (parameters?:object) => object;
  DataTexture: new (data:Uint8Array,width:number,height:number,format?:number,type?:number) => object;
  RGBAFormat: number; UnsignedByteType: number; SRGBColorSpace: string;
  LinearMipmapLinearFilter: number; LinearFilter: number; DoubleSide: number;
};
const compatibleNamespace: FantasyEquipmentThree = host;
const metadata: FantasyEquipmentArt[] = listFantasyEquipmentArt();
const id: FantasyEquipmentID = metadata[0]!.id;
const card = fantasyEquipmentArt(id);
const scale: 1 = card.nativeScale;
const metres: 'metres' = card.units;
const coordinate: number = card.bounds.max[2];
if (card.articulation.patch) {
  const maximum: 1 = card.articulation.fields.draw.max;
  const supported: true = card.articulation.stableNodes;
  void [maximum,supported];
}
const bow = createFantasyEquipmentModel(host, {id:'bow'});
const groupType: 'preserved-group' = bow.root.hostGroupMethod();
const socketType: 'preserved-anchor' = bow.sockets['projectile.tip'].hostAnchorMethod();
type IsAny<Value> = 0 extends (1 & Value) ? true : false;
const rootIsAny: false = null! as IsAny<typeof bow.root>;
const socketIsAny: false = null! as IsAny<typeof bow.sockets['projectile.tip']>;
const accepted: FantasyEquipmentPose = bow.setArticulation({draw:.7,loaded:true});
bow.setArticulation({loaded:false});
const sword = createFantasyEquipmentModel(host, {id:'sword'});
sword.setArticulation({});
sword.setArticulation();
createFantasyEquipmentModel(host, {id:'round-wood-shield',finish:'teal'});
createFantasyEquipmentModel(host, {id:'emblem-metal-shield',finish:'red'});
createFantasyEquipmentModel(host, {id:'riot-shield',finish:'opaque'});
// @ts-expect-error canonical IDs only
fantasyEquipmentArt('unknown');
// @ts-expect-error canonical renderer IDs only
createFantasyEquipmentModel(host, {id:'longsword'});
// @ts-expect-error no colour finish on sword
createFantasyEquipmentModel(host, {id:'sword',finish:'red'});
// @ts-expect-error riot finish belongs to riot shield
createFantasyEquipmentModel(host, {id:'bow',finish:'opaque'});
// @ts-expect-error draw must be numeric
bow.setArticulation({draw:'1'});
// @ts-expect-error loaded must be boolean
bow.setArticulation({loaded:1});
// @ts-expect-error no action authority in art pose
bow.setArticulation({damage:'slash'});
// @ts-expect-error static IDs accept an empty pose only
sword.setArticulation({draw:0});
// @ts-expect-error bow has no left crossbow prod anchor
bow.sockets['limb.left'];
// @ts-expect-error sword has no second grasp
sword.sockets['grip.off'];
// @ts-expect-error point tuples have three coordinates
card.bounds.min[3];
// @ts-expect-error borrowed namespace must supply actual constructors/constants
createFantasyEquipmentModel({}, {id:'bow'});
// @ts-expect-error exact optional pose fields preserve runtime rejection of undefined
bow.setArticulation({draw:undefined});
bow.dispose();sword.dispose();
void [scale,metres,coordinate,groupType,socketType,accepted,compatibleNamespace,rootIsAny,socketIsAny];
