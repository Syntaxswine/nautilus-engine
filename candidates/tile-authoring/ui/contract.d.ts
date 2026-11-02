/**
 * UI contract proposal only. No public export, schema registration or live binding.
 * Exact command names, payload schemas and workspace policy await Architect review.
 */
export type Panel = 'workbench' | 'library' | 'brush' | 'layers' | 'requirements' | 'content-pack';
export type Scope = 'definition' | 'preset' | 'instance' | 'selected-instances' | 'content-pack';
export interface ContentRef { id: string; version: number; sha256: string }
export interface Diagnostic {
  code: string; path: string; message: string; action: string;
  ownerIds?: string[]; reservationIds?: string[]; requiredCapability?: string;
}
/** Captured by Editor. UI displays/copies these; it never synthesizes tokens. */
export interface Binding {
  workspaceId: string; workspaceToken: string; contextToken: string;
  policyToken: string; floorTableToken: string; contentToken: string; resourceToken: string;
}
export interface Control {
  id: string; label: string; panel: Panel; order: number;
  kind: 'button' | 'number' | 'select' | 'reorder';
  /** JSON Pointer into the strictly validated command payload. Null for buttons. */
  argumentPath: string | null; unit: string | null;
}
export interface CommandDescriptor {
  id: string; version: number; label: string; summary: string;
  schema: ContentRef; target: 'recipe' | 'preset' | 'decoration' | 'instance' | 'requirements' | 'content-pack';
  effect: 'read' | 'edit'; history: 'none' | 'one-entry';
  scopes: { default: Scope; allowed: Scope[]; confirmation: string | null };
  available: boolean; diagnostics: Diagnostic[]; controls: Control[];
}
export interface Discovery {
  kind: 'nautilus-tile-authoring-ui-discovery-proposal'; version: 1;
  discoveryToken: string; binding: Binding; commands: CommandDescriptor[];
  notices: Diagnostic[];
}
/** Coder/Editor own the strict payload grammar behind schema. Unknown is opaque
 * at this UI boundary; it is never an unchecked saved metadata/extension bag. */
export interface Command {
  kind: 'nautilus-tile-authoring-command-proposal'; version: 1;
  requestId: string; discoveryToken: string; binding: Binding;
  command: { id: string; version: number; schema: ContentRef };
  scope: Scope; targets: { ownerId: string; surfaceId: string; floorId: string }[];
  payload: unknown;
}
export interface Action {
  enabled: boolean; diagnostics: Diagnostic[];
}
export interface Snapshot {
  kind: 'nautilus-tile-authoring-ui-snapshot-proposal'; version: 1;
  binding: Binding; discoveryToken: string; phase: string;
  actions: Record<'stage' | 'review' | 'apply' | 'cancel' | 'undo' | 'redo' |
    'save' | 'open' | 'recover' | 'retryPresentation', Action>;
  selection: { ownerIds: string[]; surfaceId: string | null; floorId: string };
  floor: { id: string; label: string; elevationM: number; mode: string };
  draft: { requestId: string; commandId: string; scope: Scope; targetOwnerIds: string[] } | null;
  review: null | {
    requestId: string; id: string; token: string; binding: Binding;
    sourceDiff: unknown; diagnostics: Diagnostic[];
    targetOwnerIds: string[]; lockedOwnerIds: string[];
    resourceRequirements: unknown; costBounds: unknown; historyEntries: 1;
  };
  recovery: null | { requestId: string; operationId: string };
  /** Saved minimum, draft request and stronger pair obligations remain distinct. */
  clearance: { acceptedMinimumM: number | null; requestedMinimumM: number | null; pairRequirements: unknown };
}
/** One proposed shared headless Editor service, used directly by UI and agents.
 * It delegates strict validation/planning and owns retained prepare/final lease,
 * whole-workspace commit/history/recovery. This file implements none of it. */
export interface AuthoringService {
  discover(): Discovery;
  getSnapshot(): Snapshot;
  subscribe(listener: () => void): () => void;
  stage(command: Command): Promise<void>;
  review(input: { requestId: string }): Promise<void>;
  apply(input: { requestId: string; reviewId: string; reviewToken: string }): Promise<void>;
  cancel(input: { requestId: string }): Promise<void>;
  recover(input: { requestId: string }): Promise<void>;
  undo(): Promise<void>; redo(): Promise<void>; save(): Promise<void>;
  open(input: unknown): Promise<void>; retryPresentation(): Promise<void>;
}
/** These are borrowed existing host objects, not newly implemented controllers.
 * Workbench disposal removes only its subscriptions/DOM, never these services. */
export interface ProposedMountBindings {
  service: AuthoringService;
  floorController: object;
  inputOwner: object;
  selectionOwner: object;
  presenter: object | null;
}
