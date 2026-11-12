export interface ContactPoint {x:number;y:number}
export interface ContactShape {id:string;points:ContactPoint[];radiusM:number;minH:number;maxH:number}
export interface Contact {id:string;normal:ContactPoint;time?:number;initialOverlap?:boolean;depthM?:number}
export interface ContactMovement {delta:ContactPoint;distanceM:number;contacts:Contact[];segments:Array<{from:ContactPoint;to:ContactPoint}>;blocked:boolean;shape:ContactShape}
export const CONTACT_PROFILES:Readonly<{stop:'stop-v1';slide:'slide-v1';slideFactor:number;maxContacts:number;skinM:number}>;
export function contactHull(points:ContactPoint[]):ContactPoint[];
export function contactShape(input:{id:string;points:ContactPoint[];radiusM?:number;minH?:number;maxH?:number}):ContactShape;
export function boundsContactShape(id:string,bounds:{min:ContactPoint&{h:number};max:ContactPoint&{h:number}}):ContactShape;
export function translateContactShape(shape:ContactShape,delta:ContactPoint):ContactShape;
export function contactOverlap(a:ContactShape,b:ContactShape):(Contact&{depthM:number})|null;
export function contactSeparation(a:ContactShape,b:ContactShape):(Contact&{separationM:number})|null;
export function castContact(shape:ContactShape,delta:ContactPoint,obstacle:ContactShape):(Contact&{time:number;initialOverlap:boolean})|null;
export function firstContact(shape:ContactShape,delta:ContactPoint,obstacles:ContactShape[]):ReturnType<typeof castContact>;
export function moveWithContacts(shape:ContactShape,delta:ContactPoint,obstacles:ContactShape[],options?:{profile?:'stop-v1'|'slide-v1';slideFactor?:number}):ContactMovement;
