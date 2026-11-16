export type VehicleBodyID='hatchback'|'sedan'|'pickup'|'crew-pickup'|'cargo-van'|'passenger-van'|'utility-suv'|'crossover';
export type VehicleFinishID='sage'|'oxide'|'teal';
export interface VehiclePoint {x:number;y:number;h:number}
export interface VehicleBody {readonly id:VehicleBodyID;readonly name:string;readonly lengthM:number;readonly widthM:number;readonly heightM:number;readonly wheelRadiusM:number;readonly axlesM:readonly [number,number];readonly cells:readonly number[];readonly kind:string}
/** Heading is right-handed Three +Y yaw: local +Z forward, positive turns left. */
export interface VehicleSeed {id:string;body?:VehicleBodyID;finish?:VehicleFinishID;position:VehiclePoint;headingRad?:number}
/** steeringRad is physical wheel yaw about +Y, so right input produces negative yaw. */
export interface VehicleState extends Required<VehicleSeed> {floorId:string;speedMps:number;steeringRad:number;wheelbaseM:number;distanceM:number;wheelAngleRad:number;revision:number}
/** Normalised car-relative axes: +throttle forward, +steering right. */
export interface VehicleControl {throttle:number;steering:number;held:boolean}
export interface VehicleReceipt {version:1;ok:boolean;committed:boolean;code:string|null;reason:string|null;observerErrors?:number;movement?:{profile:WalkingMovementProfile;distanceM:number;contacts:Array<{id:string;normal:{x:number;y:number}}>}}
export interface VehicleExpected {actorRevision:number;occupancyRevision:number;vehicleId:string|null;seatId:'driver'|'passenger'|null;leaseId:string|null}
export interface VehicleActorState {version:1;connectorId:string;actorId:string;mode:'on-foot'|'driver'|'rider';contextId:string;position:VehiclePoint;floorId:string;walkingAllowed:boolean;vehicle:VehicleState|null;vehicleId:string|null;seatId:'driver'|'passenger'|null;expected:VehicleExpected;lease:{id:string;owner:string;actorId:string}|null}
export type VehicleCommand={version:1;actorId:string;expected:VehicleExpected}&({type:'board';vehicleId:string;seatId:'driver'|'passenger'}|{type:'exit'}|({type:'control';owner:string}&VehicleControl));
export interface VehicleOccupancy {actorId:string;vehicleId:string;seatId:'driver'|'passenger'}
export type VehicleCollisionProfile='legacy-aabb-stop-v1'|'oriented-slide-v1';
export type WalkingMovementProfile='legacy-box-stop-v1'|'disc-slide-v1';
export interface VehicleContact {id:string;vehicleId:string;normal:{x:number;y:number};distanceM:number;requestedDistanceM:number}
export interface VehicleSnapshot {revision:number;occupancyRevision:number;vehicles:VehicleState[];occupancy:VehicleOccupancy[];obstructions:Array<{vehicleId:string;code:string;reason:string}>;observerErrors:number;collisionProfile?:'oriented-slide-v1';contacts?:VehicleContact[]}
export type VehicleCheckpoint={kind:'nautilus-road-vehicles';id:string;revision:number;occupancyRevision:number;vehicles:VehicleState[];occupancy:VehicleOccupancy[]}&({version:1}|{version:2;collisionProfile:'oriented-slide-v1'});
export interface VehicleAction {id:string;target:{id:string};verb:string;label:string;enabled:boolean;reason:string|null}
export interface VehicleActions {id:string;read():{context:string;actions:VehicleAction[]};request(actionId:string,offer:string):VehicleReceipt}
/** Borrowed, one version1 connector per optional player.vehicles component.
 * Actor/context/seat/lease expectations are required on every control request.
 */
export interface VehicleConnector {readonly id:string;readonly contract:{id:'nautilus-road-vehicle-connector';version:1;profile:'flat-low-speed-v1';collisionProfile?:'oriented-slide-v1'};readForActor(actorId:string):VehicleActorState;read():VehicleSnapshot;subscribe(fn:()=>void):()=>void;dispatch(command:VehicleCommand):VehicleReceipt;actions(actorId:string):VehicleActions;release(owner:string):void;advance(seconds:number):VehicleReceipt;checkpoint():VehicleCheckpoint;dispose():void}
export interface VehicleActor {id:string;revision:number;floorId:string;position:VehiclePoint;radiusM:number;heightM:number;speedMps:number;traversal?:unknown}
export interface VehicleBounds {min:VehiclePoint;max:VehiclePoint}
export interface VehicleContactShape {id:string;points:Array<{x:number;y:number}>;radiusM:number;minH:number;maxH:number}
export interface VehicleQueries {check(bounds:VehicleBounds,floorId:string):{ok:boolean;code?:string;reason?:string};checkVehicle?(state:VehicleState,obstacles?:VehicleContactShape[]):{ok:boolean;code?:string;reason?:string;};resolve?(from:VehicleState,to:VehicleState,options?:{obstacles?:VehicleContactShape[]}):{ok:boolean;code?:string;reason?:string;vehicle:VehicleState;contacts:Array<{id:string;normal:{x:number;y:number}}>;distanceM:number;blocked?:boolean;sweeps:VehicleContactShape[]};snapshot():object}
export interface VehicleYardContent {identity:{id:string;version:number;sourcePin:string};world:{id:string;name:string;widthM:number;depthM:number;floorCount:number;storyHeightM:number;groundHeightM:number;heightM:number};surfaces:object[];interactions:{doors:object[];stairs:object[]};actors:Array<Omit<VehicleActor,'revision'>>;resources:Record<string,Record<string,unknown>>;vehicles:VehicleSeed[];appearance:{ground:number;sky:number}}
export type VehicleYardCheckpoint={kind:'nautilus-vehicle-yard';content:VehicleYardContent['identity'];world:object;interactions:object;actors:VehicleActor[];resources:VehicleYardContent['resources'];vehicles:VehicleCheckpoint}&({version:1}|{version:2;movementProfile:'disc-slide-v1'});
export interface VehicleYard {readonly connector:VehicleConnector;readonly actors:VehicleActor[];readonly actorIds:string[];readonly content:VehicleYardContent['identity'];read(actorId?:string):{actor:VehicleActor;resources:Record<string,unknown>;world:object;interactions:object;vehicles:VehicleSnapshot};readPose(actorId?:string):{actorId:string;revision:number;position:VehiclePoint;mode:VehicleActorState['mode']};subscribe(fn:()=>void):()=>void;walk(actorId:string,vector:{x:number;y:number},seconds:number):VehicleReceipt;advance(seconds:number):VehicleReceipt;checkpoint():VehicleYardCheckpoint;dispose():void}
export const VEHICLE_BODIES:readonly VehicleBody[];
export const VEHICLE_FINISHES:readonly {id:VehicleFinishID;name:string;colour:number}[];
export const ROAD_VEHICLES:readonly {id:string;form:VehicleBodyID;finish:VehicleFinishID;name:string;cells:readonly number[];lengthM:number;widthM:number;heightM:number}[];
export const VEHICLE_MOTION_PROFILE:Readonly<{id:'flat-low-speed-v1';maxForwardMps:8;maxReverseMps:3;accelerationMps2:3;serviceBrakeMps2:8;coastBrakeMps2:2;maxSteeringRad:number;deadZone:number;maxStepSeconds:number}>;
export function createVehicle(seed:VehicleSeed):VehicleState;
export function stepVehicle(state:VehicleState,control:VehicleControl,seconds:number,profile?:typeof VEHICLE_MOTION_PROFILE):VehicleState;
export function bodyFor(id:VehicleBodyID):VehicleBody;
export function roadVehicle(id:string):typeof ROAD_VEHICLES[number];
export function axis(value:number,deadZone?:number):number;
export function neutralControl():VehicleControl;
export function vehicleBounds(state:VehicleState,steeringRad?:number):VehicleBounds;
export function vehicleContactShape(state:VehicleState,steeringRad?:number):VehicleContactShape;
export function sweptVehicleShape(from:VehicleState,to:VehicleState):VehicleContactShape;
export function sweptVehicleBounds(from:VehicleState,to:VehicleState):VehicleBounds;
export function transform(state:VehicleState,x:number,z:number,h?:number):VehiclePoint;
export function createVehicleQueries(world:object,options?:{obstacles?:()=>Array<{id:string;bounds:VehicleBounds}>}):VehicleQueries&Required<Pick<VehicleQueries,'checkVehicle'|'resolve'>>;
export function createVehicleSession(options:{id?:string;vehicles:VehicleSeed[];actors:{read(id:string):VehicleActor;list():VehicleActor[];transact(updates:Array<{before:VehicleActor;after:VehicleActor}>,accept:()=>void,stagedCheckpoint?:VehicleCheckpoint):{ok:boolean;code?:string}};queries:VehicleQueries;canReach(input:{actor:VehicleActor;from:VehiclePoint;to:VehiclePoint;ignoreVehicleId?:string}):{ok:boolean;code?:string;reason?:string};checkpoint?:VehicleCheckpoint;collisionProfile?:VehicleCollisionProfile}):VehicleConnector;
export function createVehicleYard(content:VehicleYardContent,options?:{checkpoint?:VehicleYardCheckpoint;collisionProfile?:VehicleCollisionProfile;movementProfile?:WalkingMovementProfile}):VehicleYard;
export function vehicleYardContent(options:{sourcePin:string}):VehicleYardContent;
