export type Point = Readonly<{x: number; y: number; h: number}>;
export type Direction = 'forward' | 'neutral' | 'reverse';
export type Expected = Readonly<{actorRevision: number; occupancyRevision: number; controlRevision: number}>;
export type BaseCommand = {actorId: string; commandId: string};
export type ActionIntent = {
  type: 'enter' | 'exit'; actorId: string; trainId: string; carId: string;
  entranceId: string; expected: Expected;
};
export type Command = (ActionIntent & {commandId: string}) | (BaseCommand & {
  type: 'drive'; trainId: string; expected: Expected; leaseId: string;
  direction: Direction; power: number; brake: number;
}) | (BaseCommand & {type: 'release'; leaseId: string});
export type Action = Readonly<{
  id: string; label: string; enabled: boolean; code: string | null; reason: string | null;
  command: ActionIntent;
}>;
export type Controls = Readonly<{
  direction: Direction; power: number; brake: number; leaseId: string | null;
}>;
export type TrainSnapshot = Readonly<{
  trainId: string; stock: 'steam' | 'electric'; profile: 'world' | 'miniature';
  speedMps: number; signedSpeedMps: number; stopped: boolean;
  driverId: string | null; controlRevision: number; controls: Controls;
  hold: Readonly<{kind: string; reason: string; signalId?: string}> | null;
}>;
export type ActorSnapshot = Readonly<{
  actorId: string; mode: 'on-foot' | 'driver' | 'rider'; expected: Expected;
  position: Point; floorId: string; walkingAllowed: boolean;
  trainId: string | null; carId: string | null; entranceId: string | null;
  cabFacing: 1 | -1 | null; train: TrainSnapshot | null; actions: readonly Action[];
}>;
export type DispatchResult = Readonly<{
  ok: boolean; committed: boolean; code: string | null; reason: string | null;
  commandId: string; repeated: boolean; observerErrors: number;
}>;
export interface TrainConnector {
  readonly contract: typeof TRAIN_SESSION_CONTRACT;
  readForActor(actorId: string): ActorSnapshot;
  /** Post-commit invalidation. Read again; no immediate callback on subscribe. */
  subscribe(listener: () => void): () => void;
  dispatch(command: Command): DispatchResult;
}
export type RetainedActor = {
  id: string; revision: number; position: Point; floorId: string; radiusM: number; heightM: number;
  mode: 'on-foot' | 'driver' | 'rider';
  attachment: {trainId: string; carId: string; entranceId: string} | null;
  [hostResource: string]: unknown;
};
export type Refusal = {ok: false; code: string; reason: string};
export type Entrance = {
  id: string; trainId: string; carId: string; carIndex: number; modelId: string;
  label: string; mode: 'driver' | 'rider'; cabFacing: 1 | -1 | null;
  local: Point; attachment: Point; position: Point; attachedPosition: Point;
  outward: {x: number; y: number}; widthM: number; clearanceM: number; reachM: number;
};
export type RailwayCarPose = {id: string; lengthM: number; reverse: boolean; x: number; z: number; yaw: number;
  front: {x: number; z: number; yaw: number; track: string}; rear: {x: number; z: number; yaw: number; track: string}};
export type RailwayTrainPose = {routeId: string; stock: 'steam' | 'electric'; profile: 'world' | 'miniature';
  couplerHeightM: number; departure: string; turnoutTaken: string | null; distanceM: number; track: string;
  stopped: boolean; cars: RailwayCarPose[]; circuit?: true; circuitLengthM?: number};
export declare function railwayCarEntrances(profile: 'world' | 'miniature', modelId: string):
  Pick<Entrance, 'id' | 'label' | 'mode' | 'local' | 'attachment' | 'outward' | 'widthM' | 'clearanceM' | 'reachM'>[];
export declare function railwayEntrancesForTrain(state: RailwayTrainPose): Entrance[];
export declare function planRailwayCircuit(waypoints: number[][], radiusM?: 4 | 16):
  {closed: true; lengthM: number; radiusM: number; spans: unknown[]; stations: unknown[]; segments: unknown[]};
export type HostTrain = Pick<TrainSnapshot, 'trainId' | 'stock' | 'profile' | 'signedSpeedMps' | 'driverId' | 'controlRevision' | 'controls' | 'hold'>;
export interface RetainedTrainHost {
  readActor(actorId: string): RetainedActor;
  canEnter(query: {actor: RetainedActor; entrance: Entrance; train: HostTrain}): {ok: true} | Refusal;
  landing(query: {actor: RetainedActor; entrance: Entrance; train: HostTrain}):
    {ok: true; landing: {position: Point; floorId: string; surfaceId: string}} | Refusal;
  /** Synchronous, atomic compare-and-commit. Failure/throw must write nothing. */
  commit(transaction: {reason: 'enter' | 'exit' | 'advance'; changes: {
    actorId: string; expectedRevision: number;
    patch: Pick<RetainedActor, 'position' | 'floorId' | 'mode' | 'attachment'>;
  }[]}): {ok: true} | Refusal;
}
export interface TrainSession extends TrainConnector {
  advance(seconds: number): {ok: true; observerErrors: number} | Refusal;
  checkpoint(): Record<string, unknown>;
  read(): {trains: {stock: string; state: RailwayTrainPose; waiting: unknown; canTakeBranch: boolean}[];
    signals: unknown[]; controls: TrainSnapshot[]};
  setTurnout(routeId: string, setting: 'main' | 'branch'): {ok: true; observerErrors: number} | Refusal;
  dispose(): void;
}
export declare function createTrainSession(options: {
  routes: {id: string; waypoints: number[][]; radiusM?: 4 | 16; turnout?: {at: number[]; end: number[]}; circuit?: true}[];
  placements: {stock: 'steam' | 'electric'; routeId: string; profile?: 'miniature' | 'world';
    departure: 'start' | 'end' | 'branch'; switchPosition: 'main' | 'branch'}[];
  actorIds: string[]; host: RetainedTrainHost; checkpoint?: Record<string, unknown> | string;
}): TrainSession;
export declare const TRAIN_SESSION_CONTRACT: Readonly<{
  id: 'nautilus-drivable-trains'; version: 1; profile: 'bounded-rail-driver-v1';
  guide: string; types: string; units: string; checkpoint: string; inputPolicy: string;
}>;
