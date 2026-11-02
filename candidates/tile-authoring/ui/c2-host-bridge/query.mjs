// Bounded pre-command QUERY only. Never an authoring attempt or editing credit.
import * as tiles from '../../../../packages/tiles-core/index.js';
import {deriveTileSurfaceTarget} from './vendor/core0597/root/candidates/tile-authoring/core/c2/surface-target.js';
import {Budget,shape} from './vendor/core0597/root/candidates/tile-authoring/core/c2/data.js';
import {validateGridMask} from './vendor/core0597/root/candidates/tile-authoring/core/c2/operations.js';
import {failure,validateUIShape} from './vendor/ui5a7/root/candidates/tile-authoring/ui/c2-runtime/contract.js';

export function inspectSurface(document,expected,selection){
 return deriveTileSurfaceTarget(tiles,{document,expectedSource:{hostDocumentDigest:expected.hostDocumentDigest,workspaceRevision:expected.workspaceRevision},selection});
}
export function canonicalMaskData(draft,target){
 const input=validateUIShape('MaskDraft',draft);
 if(input.kind==='all-surface')return input;
 const rows=new Map(),seen=new Set();
 for(const {i,j} of input.cells){
  const key=i+','+j;if(seen.has(key))throw failure('C2_MASK_DUPLICATE','Name each authored mask cell once.');seen.add(key);
  if(!rows.has(j))rows.set(j,[]);rows.get(j).push(i);
 }
 const result={kind:'grid-spans',grid:structuredClone(target.grid),rows:[...rows].sort((a,b)=>a[0]-b[0]).map(([j,cells])=>{
  cells.sort((a,b)=>a-b);const spans=[];for(const i of cells){const last=spans.at(-1);if(last&&last.i0+last.count===i)last.count++;else spans.push({i0:i,count:1});}return{j,spans};
 })};
 // This standalone finite query budget cannot be handed to session.prepare.
 const query=new Budget();shape(tiles,'mask',result,query);validateGridMask(tiles,{mask:result},target.surface,query);
 return result;
}
