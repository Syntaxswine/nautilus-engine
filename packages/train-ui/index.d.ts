import type {TrainConnector, Direction, DispatchResult} from '../train-core/index.js';
export interface TrainControls {
  readonly element: HTMLElement;
  refresh(): void;
  releaseInput(reason?: string): boolean;
  setBlocked(blocked: boolean): void;
  setActor(actorId: string): void;
  readonly state: Readonly<{actorId: string; mode: 'on-foot'|'driver'|'rider'|null; requestedDirection: Direction;
    requestedPower: number; leaseId: string|null; blocked: boolean; fault: boolean; disposed: boolean; result: DispatchResult|null}>;
  dispose(): void;
}
export function mountTrainControls(container: HTMLElement, options: {
  session: TrainConnector;
  actorId: string;
  walkingElement: HTMLElement;
  /** Must disable existing walking input and clear its held keys/pointers. */
  setWalkingEnabled(enabled: boolean): void;
  focusWalking?: () => void;
  newId?: (kind: string) => string;
  initialPower?: number;
  onError?: (error: unknown, context: {phase: string}) => void;
}): TrainControls;
