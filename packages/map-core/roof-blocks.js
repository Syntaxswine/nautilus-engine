import * as legacy from './prefab-blocks.js';
import {assertRoofData,setRoofs,roofsInSector,shiftRoofs,mergeRoofExtensions,authoredRoofsOf as roofsOf} from './roof-data.js';
export * from './prefab-blocks.js';
export function validateBlock(block) {if(block?.kind==='nautilus-appearance-document')throw Error('Use the appearance block API; legacy block operations cannot preserve nautilus-bear-appearance-v1 actors.');assertRoofData(block,24);legacy.validateBlock(block);return block;}
export function openBlock(block) {validateBlock(block);return setRoofs(legacy.openBlock(block),roofsOf(block),block.slopedRoofs);}
export function extractBlock(map,sx=0,sy=0) {
  assertRoofData(map);const roofs=roofsInSector(map,sx,sy);
  return setRoofs(legacy.extractBlock(map,sx,sy),shiftRoofs(roofs,-sx*24,-sy*24),map.slopedRoofs);
}
export function placeBlock(map,block,sx,sy) {
  validateBlock(block);assertRoofData(map);
  const removed=new Set(roofsInSector(map,sx,sy).map(r=>r.id)),retained=roofsOf(map).filter(r=>!removed.has(r.id));
  const roofs=[...retained,...shiftRoofs(roofsOf(block),sx*24,sy*24,retained,true)];
  const extension=mergeRoofExtensions(map.slopedRoofs,block.slopedRoofs);
  return assertRoofData(setRoofs(legacy.placeBlock(map,block,sx,sy),roofs,extension));
}
// The generator has already checked its block catalogue. Stage a candidate so
// aggregate limits or conflicting metadata cannot partially mutate its map.
export function applyData(map,block,x,y,remap=false) {
  if(map.slopedRoofs===undefined&&block.slopedRoofs===undefined)return legacy.applyData(map,block,x,y,remap);
  assertRoofData(map);assertRoofData(block,24);
  if(![x,y].every(n=>Number.isInteger(n)&&n>=0&&n<=216&&n%24===0))throw Error('Choose a valid 24-metre block offset.');
  const extension=mergeRoofExtensions(map.slopedRoofs,block.slopedRoofs);
  const roofs=[...roofsOf(map),...shiftRoofs(roofsOf(block),x,y,roofsOf(map),remap)];
  const candidate=structuredClone(map);legacy.applyData(candidate,block,x,y,remap);setRoofs(candidate,roofs,extension);assertRoofData(candidate);
  for(const key of Object.keys(map))if(!Object.hasOwn(candidate,key))delete map[key];
  for(const [key,value]of Object.entries(candidate))Object.defineProperty(map,key,{value,enumerable:true,configurable:true,writable:true});
}
