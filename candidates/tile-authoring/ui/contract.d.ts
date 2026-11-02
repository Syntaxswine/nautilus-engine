/** C0 DESIGN/TYPES ONLY. Core owns the one command/query/pack/pin/outcome grammar.
 * No UI parser, executor, gesture owner or host implementation. */
import type * as Core from './inputs/core-api.js';
export type {
  Pin, Expected, Command, Operation, Query, Pack, WorkbenchDocument, Source,
  AuthoringModule, ResourceRef, Review, ApplyOutcome, Diagnostic, ImageView,
  Graphic, Layer, HostService, ImageTopLeftUV, SurfaceLocalM
} from './inputs/core-api.js';
export type ApplyRequest = Parameters<Core.HostService['apply']>[0];
export type Snapshot<R=unknown,B=unknown> = ReturnType<Core.HostService<R,B>['snapshot']>;
export type Scope = 'placed-instance' | 'explicit-selected-placements' | 'explicit-placements' | 'new-immutable-library-record' | 'whole-workspace';
export interface EditorDraftView<R=unknown,B=unknown> {
  /** Stage collects this finite canonical command; it does not prepare/apply. */
  readonly command: Core.Command<R> | null;
  readonly scope: Scope;
  readonly targetOwnerIds: readonly Core.Id[];
  readonly includeSelectedDecorationDefaults: boolean;
  readonly selectedCaptureMarkIds: readonly Core.Id[];
  /** Display data only; serialized JSON is never commit authority. */
  readonly review: Core.Review<R,B> | null;
  /** Supplied by the same Editor connection retaining the prepared result. */
  readonly retainedApplyRequest: ApplyRequest | null;
  readonly outcome: Core.ApplyOutcome | null;
  readonly actions: Readonly<Record<string,{enabled:boolean;diagnostics:Core.Diagnostic[]}>>;
}
/** One Editor service for humans and JSONL; existing draft/history/save hooks are
 * not redefined. The derived Source is never saved as a document alias. */
export interface WorkbenchBinding<R=unknown,B=unknown> {
  readonly service: Core.HostService<R,B>;
  readonly presentation: EditorDraftView<R,B>;
  readonly borrowedFloorController: object;
  readonly borrowedInputOwner: object;
  readonly borrowedResourcePorts: object;
}
