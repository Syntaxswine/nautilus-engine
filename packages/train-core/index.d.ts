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
export declare const TRAIN_SESSION_CONTRACT: Readonly<{
  id: 'nautilus-drivable-trains'; version: 1; profile: 'bounded-rail-driver-v1';
  guide: string; types: string; units: string; checkpoint: string; inputPolicy: string;
}>;
