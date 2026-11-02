/** SEPARATE PROPOSAL ONLY. No runtime export, operation, authority or grammar change. */
import type {WorkbenchDocument,Pin,Surface,SurfaceBinding,MarkTarget,Mask,AuthoringLimits,CostBounds} from '../../../../../packages/tile-authoring-core/index.js';
export type SurfaceTargetLimits=Pick<AuthoringLimits,'sourceBytes'|'outputBytes'|'inputBytes'|'plannerUnits'|'nodes'|'depth'>;
export interface SurfaceTargetInput {
 document:WorkbenchDocument;
 expectedSource:{hostDocumentDigest:string;workspaceRevision:number};
 selection:{ownerId:string;surfaceId:string;definition:Pin};limits?:Partial<SurfaceTargetLimits>;
}
/** A seed has NO layers and is not a persisted C0 SurfaceBinding. */
export type SurfaceBindingSeed=Omit<SurfaceBinding,'layers'>;
export type SourceGridRef=Extract<Mask,{kind:'grid-spans'}>['grid'];
interface SurfaceTargetBase {
 kind:'nautilus-tile-authoring-surface-target';version:1;ok:true;committable:false;
 sourceDocumentDigest:string;workspaceRevision:number;surface:Surface;bindingSeed:SurfaceBindingSeed;
 target:MarkTarget;grid:SourceGridRef;work:CostBounds['planning'];
}
export interface ExistingSurfaceTarget extends SurfaceTargetBase {state:'existing';existingBinding:SurfaceBinding}
export interface ProspectiveSurfaceTarget extends SurfaceTargetBase {state:'prospective';existingBinding:null}
export type SurfaceTargetResult=ExistingSurfaceTarget|ProspectiveSurfaceTarget;
/** Proposed PURE bounded producer. Throws typed diagnostic errors on stale,
 * locked or unsupported input; no fabricated request ID or C0 query is added.
 * The Editor must also prove the live complete source still matches this result. */
export declare function deriveTileSurfaceTarget(tiles:unknown,input:SurfaceTargetInput):SurfaceTargetResult;
