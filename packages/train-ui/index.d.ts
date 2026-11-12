import type {TrainConnector, Direction, DispatchResult} from '../train-core/index.js';
export interface TrainControls {
  readonly element: HTMLElement;
  refresh(): void;
  releaseInput(reason?: string): boolean;
  setBlocked(blocked: boolean): void;
  setMuted(muted: boolean): void;
  setActor(actorId: string): void;
  readActionView(): Readonly<{version:1;actorId:string;context:string;mode:'on-foot'|'driver'|'rider'|null;blocked:boolean;actions:ReturnType<TrainConnector['readForActor']>['actions']}>;
  requestAction(actionId:string,context:string,event?:Event): TrainUIOutcome;
  readControlView(): Readonly<{version:1;actorId:string;context:string|null;mode:'on-foot'|'driver'|'rider'|null;compact:boolean;blocked:boolean}>;
  requestControl(intent:TrainUIControlIntent,context:string,event?:Event): TrainUIOutcome;
  readonly state: Readonly<{actorId: string; mode: 'on-foot'|'driver'|'rider'|null; requestedDirection: Direction;
    requestedPower: number; steamProfile: 'classic'|'compact-notched'; notch: 0|1|2|3|null; pendingNotch: 0|1|3|null; leaseId: string|null; blocked: boolean; fault: boolean; disposed: boolean;
    feedback: Readonly<{muted: boolean; unlocked: boolean; played: number; lastCue: 'steam-departure'|'steam-shift'|'electric-boarded'|'electric-exited'|null; activeSounds: number; contextState: string}>;
    result: DispatchResult|null}>;
  dispose(): void;
}
export type TrainUIOutcome = Readonly<{version:1;ok:boolean;committed:boolean;code:string|null;reason:string|null;commandId?:string;repeated?:boolean;observerErrors?:number}>;
export type TrainUIControlIntent = {kind:'notch';notch:0|1|2|3}|{kind:'direction';direction:Direction}|{kind:'power';power:number}|{kind:'brake'|'pulse-power'|'release'};
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
  /** External hides contextual buttons and disables E; a composer uses stamped requests. */
  actionPresentation?: 'internal'|'external';
  /** Host preference. Audio still requires a trusted user gesture. */
  muted?: boolean;
  onError?: (error: unknown, context: {phase: string}) => void;
}): TrainControls;
