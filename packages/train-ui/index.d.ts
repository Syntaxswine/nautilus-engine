import type {TrainConnector, Direction, DispatchResult} from '../train-core/index.js';
export interface TrainControls {
  readonly element: HTMLElement;
  refresh(): void;
  releaseInput(reason?: string): boolean;
  setBlocked(blocked: boolean): void;
  setMuted(muted: boolean): void;
  setActor(actorId: string): void;
  readonly state: Readonly<{actorId: string; mode: 'on-foot'|'driver'|'rider'|null; requestedDirection: Direction;
    requestedPower: number; steamProfile: 'classic'|'compact-notched'; notch: 0|1|2|3|null; leaseId: string|null; blocked: boolean; fault: boolean; disposed: boolean;
    feedback: Readonly<{muted: boolean; unlocked: boolean; played: number; lastCue: 'steam-departure'|'steam-shift'|'electric-boarded'|'electric-exited'|null; activeSounds: number; contextState: string}>;
    result: DispatchResult|null}>;
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
  /** Explicit steam-only persistent notches; default classic keeps hold-to-drive. */
  steamProfile?: 'classic'|'compact-notched';
  /** Host preference. Audio still requires a trusted user gesture. */
  muted?: boolean;
  onError?: (error: unknown, context: {phase: string}) => void;
}): TrainControls;
