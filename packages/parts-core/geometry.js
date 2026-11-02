import {partIdentity,decodePartIdentity} from './identity.js';
import {failParts} from './data.js';
export const axes=['x','y','h'],epsilon=1e-7;
export const compare=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
export function pieceIdentity(instanceId,kind,partId,index){if(!Number.isSafeInteger(index)||index<0||index>32767)failParts('PARTS_PIECE_LIMIT','/parts','A semantic part exceeds its bounded piece budget.');return partIdentity(instanceId,kind,partId)+':'+index.toString(36);}
export function decodePieceIdentity(value){if(typeof value!=='string'||value.length>96)failParts('INVALID_PART_ID','/id','Malformed generated piece identity.');const parts=value.split(':'),tail=parts.pop(),base=decodePartIdentity(parts.join(':')),index=parseInt(tail,36);if(pieceIdentity(base.instanceId,base.kind,base.partId,index)!==value)failParts('INVALID_PART_ID','/id','Noncanonical generated piece identity.');return {...base,index};}
export function rotatePoint(point,turns){const {x,y,h}=point;return turns===0?{x,y,h}:turns===1?{x:-y,y:x,h}:turns===2?{x:-x,y:-y,h}:{x:y,y:-x,h};}
export function transformPoint(point,transform){const rotated=rotatePoint(point,transform.quarterTurns);return {x:rotated.x+transform.x,y:rotated.y+transform.y,h:rotated.h+transform.h};}
export function composeTransform(parent,child){return {...transformPoint(child,parent),quarterTurns:(parent.quarterTurns+child.quarterTurns)%4};}
export function transformBounds(bounds,transform){const points=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const h of [bounds.min.h,bounds.max.h])points.push(transformPoint({x,y,h},transform));return pointBounds(points);}
export function pointBounds(points){return {min:Object.fromEntries(axes.map(axis=>[axis,Math.min(...points.map(point=>point[axis]))])),max:Object.fromEntries(axes.map(axis=>[axis,Math.max(...points.map(point=>point[axis]))]))};}
export function positiveBounds(bounds,path){for(const axis of axes)if(!Number.isFinite(bounds.min[axis])||!Number.isFinite(bounds.max[axis])||bounds.min[axis]>=bounds.max[axis])failParts('INVALID_PART_GEOMETRY',path,'Settled part bounds need finite positive volume.');return bounds;}
export const insideRect=(point,rect)=>point.x>=rect.min.x-epsilon&&point.x<=rect.max.x+epsilon&&point.y>=rect.min.y-epsilon&&point.y<=rect.max.y+epsilon;
export function cutRectangle(outer,holes,path){
  for(const hole of holes)if(hole.min.x>=hole.max.x||hole.min.y>=hole.max.y||hole.min.x<outer.min.x||hole.min.y<outer.min.y||hole.max.x>outer.max.x||hole.max.y>outer.max.y)failParts('INVALID_PART_OPENING',path,'An enabled opening must have positive area and remain inside its owning rectangle.');
  const xs=[...new Set([outer.min.x,outer.max.x,...holes.flatMap(hole=>[hole.min.x,hole.max.x])])].sort((a,b)=>a-b),ys=[...new Set([outer.min.y,outer.max.y,...holes.flatMap(hole=>[hole.min.y,hole.max.y])])].sort((a,b)=>a-b),rectangles=[];
  for(let xi=1;xi<xs.length;xi++)for(let yi=1;yi<ys.length;yi++){const middle={x:(xs[xi-1]+xs[xi])/2,y:(ys[yi-1]+ys[yi])/2};if(!holes.some(hole=>middle.x>hole.min.x&&middle.x<hole.max.x&&middle.y>hole.min.y&&middle.y<hole.max.y))rectangles.push({min:{x:xs[xi-1],y:ys[yi-1]},max:{x:xs[xi],y:ys[yi]}});}
  return rectangles;
}
function cardinal(angle){const turns=Math.round(angle/(Math.PI/2));if(Math.abs(angle-turns*Math.PI/2)>1e-12)failParts('UNSUPPORTED_LEAF_ANGLE','/door','This profile uses native cardinal leaf poses.');return (turns%4+4)%4;}
export function leafBounds(hinge,angle,leaf){const points=[],turns=cardinal(angle);for(const u of [leaf.offsetM,leaf.offsetM+leaf.widthM])for(const v of [-leaf.thicknessM/2,leaf.thicknessM/2])for(const h of [leaf.bottomM,leaf.bottomM+leaf.heightM]){const point=rotatePoint({x:u,y:v,h},turns);points.push({x:hinge.x+point.x,y:hinge.y+point.y,h:hinge.h+point.h});}return pointBounds(points);}
export function leafMotionBounds(hinge,start,end,leaf){
  const points=[],turns=cardinal(start),direction=Math.sign(end-start);if(Math.abs(Math.abs(end-start)-Math.PI/2)>1e-12)failParts('UNSUPPORTED_LEAF_SWING','/door','This profile requires an explicit signed quarter-turn leaf operation.');
  for(const u of [leaf.offsetM,leaf.offsetM+leaf.widthM])for(const v of [-leaf.thicknessM/2,leaf.thicknessM/2]){
    // Reflect clockwise sweeps to CCW, then test the crossed cardinal extrema.
    // Only exact quarter turns and sqrt are used; no host trig approximations
    // enter the compiled scene identity.
    const initial=rotatePoint({x:u,y:v,h:0},turns),x=initial.x,y=initial.y*direction,radius=Math.sqrt(x*x+y*y),candidates=[{x,y},{x:-y,y:x}];
    if(x>=0&&y<=0)candidates.push({x:radius,y:0});if(x>=0&&y>=0)candidates.push({x:0,y:radius});if(x<=0&&y>=0)candidates.push({x:-radius,y:0});if(x<=0&&y<=0)candidates.push({x:0,y:-radius});
    for(const point of candidates)for(const h of [leaf.bottomM,leaf.bottomM+leaf.heightM])points.push({x:hinge.x+point.x,y:hinge.y+point.y*direction,h:hinge.h+h});
  }
  return pointBounds(points);
}
