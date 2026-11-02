import {rotateSceneryBlock as legacy} from './prefab-rotation.js';
import {setRoofs,authoredRoofsOf as roofsOf} from './roof-data.js';
import {validateBlock} from './roof-blocks.js';
export function rotateRoof(roof,centerX=12,centerY=12) {
  const round=n=>Math.round(n*1e6)/1e6;
  const direction=(roof.direction??1)*(roof.axis==='x'?-1:1);
  return {...structuredClone(roof),x:round(centerX+centerY-roof.y-roof.depth),y:round(centerY-centerX+roof.x),width:roof.depth,depth:roof.width,axis:roof.axis==='x'?'y':'x',...(roof.style==='shed'?{direction}:{})};
}
export function rotateSceneryBlock(block) {
  validateBlock(block);
  const roofs=roofsOf(block).map(roof=>rotateRoof(roof));
  return validateBlock(setRoofs(legacy(block),roofs,block.slopedRoofs));
}
