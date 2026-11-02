/** Unregistered Gate A host helper; borrow the actual public ./tiles namespace. */
export type Id=string;
export interface Floor {id:Id;elevationM:number}
export interface Context {contextToken:string;cancelled:boolean;floorProfile:{id:Id;version:1;floors:Floor[]}}
export interface Constraints {kind:'nautilus-stack-constraints';version:1;floorProfileId:Id;minimumClearanceM:number;owners:{instanceId:Id;primaryReservationId:Id}[];managedRelations:Cross[]}
export interface Cross {id:Id;kind:'cross';a:Id;b:Id;clearanceM:number}
export interface Expected {revision:number;layoutDigest:string;catalogueDigest:string;contextToken:string;constraintsDigest:string}
export interface Limits {maxPlannerWork:number;maxPlannerBytes:number;maxSteps:number;maxClosure:number;maxSpatialTests:number;maxGeometryWork:number;neighbourRadiusM:number}
export interface Placement {id:Id;recipeId:Id;origin:[number,number,number];floorBindings:Record<Id,Id>;transform:{quarterTurns:0|1|2|3;mirrorX:boolean};locked:boolean;anchorIds:Id[];primaryReservationId:Id}
export interface StackIntent {kind:'place-stack';version:1;id:Id;recipe:unknown;primaryReservationId:Id;originXY:[number,number];transform:{quarterTurns:0|1|2|3;mirrorX:boolean};members:{id:Id;floorId:Id;locked:boolean;anchorIds:Id[]}[]}
export interface EditIntent {kind:'edit-owners';version:1;id:Id;upserts:Placement[];removeIds:Id[];recipeUpdates:unknown[];joins:{removeIds:Id[];upserts:unknown[]};relations:{removeIds:Id[];upserts:unknown[]}}
export interface Input {bundle:unknown;context:Context;constraints:Constraints;expected:Expected;intent:StackIntent|EditIntent;limits:Limits}
export interface Diagnostic {code:string;path:string;message:string;action:string;ownerIds?:Id[];reservationIds?:Id[];requiredCapability?:string}
export interface Plan {kind:'nautilus-tile-stack-plan';version:1;ok:true;request:unknown;constraints:Constraints;binding:{layoutDigest:string;catalogueDigest:string;contextToken:string;constraintsDigest:string;requestDigest:string};inspection:{closureOwnerIds:Id[];validatedOwnerIds:Id[];obligations:unknown[]};work:{plannerUnits:number;serializedBytes:number}}
export interface Refusal {ok:false;request:null;constraints:null;diagnostics:Diagnostic[];work:{plannerUnits:number;serializedBytes:number}}
/** Pure request/data planning. No matching/selection/CAS/history authority. */
export declare function planTileStack(core:object,input:Input):Plan|Refusal;
/** Headless proof convenience: plans, then invokes public prepareTileRepair once.
 * Real Editor wiring uses planTileStack + its existing retained consumer.prepare.
 * The convenience returns plain data, never a retained/committable host handle. */
export declare function prepareTileStack(core:object,input:Input):{ok:boolean;plan:Plan|Refusal;preparation:unknown|null};
