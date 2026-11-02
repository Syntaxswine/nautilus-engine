import {WINDOW_GEOMETRY_CONTRACT as C} from './contract.js';
import {readCompiled} from './compiler.js';
import {data,fields,finite,clone,fail} from './data.js';
const EPS=1e-7;
function point(value,path){fields(value,['x','y','h'],path);for(const key of ['x','y','h'])finite(value[key],path+'/'+key);}
function axes(box,walk){return [['x',box.x0,box.x1],['y',box.y0,box.y1],...(walk?[]:[['h',box.z0,box.height]])];}
// Source EPS, slab order and endpoint policy; h is an absolute top, not extent.
function interval(from,to,box,walk){
  let lo=0,hi=1,normal={x:0,y:0,h:0};
  for(const [axis,min,max]of axes(box,walk)){
    const d=to[axis]-from[axis];if(Math.abs(d)<EPS){if(from[axis]<min||from[axis]>max)return null;continue;}
    const a=(min-from[axis])/d,b=(max-from[axis])/d,entry=Math.min(a,b);
    if(entry>lo){lo=entry;normal={x:0,y:0,h:0};normal[axis]=d>0?-1:1;}
    hi=Math.min(hi,Math.max(a,b));if(lo>hi)return null;
  }
  return {lo,hi,normal};
}
export function queryWindowSegment(compiled,input){
  const snapshot=readCompiled(compiled),request=data(input);fields(request,['purpose','floorId','from','to'],'');
  if(!C.purposes.includes(request.purpose))fail('UNSUPPORTED_QUERY_PURPOSE','/purpose','Use walk, sight, projectile or flame.');
  if(request.floorId!==snapshot.world.floorId)fail('UNSUPPORTED_FLOOR','/floorId','Only the compiled ground floor is supported.');point(request.from,'/from');point(request.to,'/to');
  const walk=request.purpose==='walk',impact=['projectile','flame'].includes(request.purpose),hits=[];
  for(const member of snapshot.members){
    if(request.purpose==='sight'&&member.kind!=='wall'||impact&&member.kind==='prop')continue;
    const box=member.bounds,startedInside=axes(box,walk).every(([axis,min,max])=>request.from[axis]>=min&&request.from[axis]<=max);
    if(impact&&startedInside)fail('EMBEDDED_PROJECTILE_ORIGIN','/from','The bounded first-hit profile refuses an origin on or inside a current shot/flame blocker.');
    const span=interval(request.from,request.to,box,walk);if(!span||span.lo<=EPS)continue;
    const hitPoint={};for(const key of ['x','y','h'])hitPoint[key]=request.from[key]+(request.to[key]-request.from[key])*span.lo;
    hits.push({...member,tEnter:span.lo,tExit:span.hi,point:hitPoint,normal:span.normal,startedInside});
  }
  hits.sort((a,b)=>a.tEnter-b.tEnter||a.sourceOrder-b.sourceOrder);
  return clone({...compiled,purpose:request.purpose,floorId:request.floorId,from:request.from,to:request.to,scope:'window members only; host must compose complete world/actor blockers before confirmation',hits,nearest:hits[0]??null});
}
// Only explicit source legacy 1.12 m edge walls qualify. No native/curved-wall
// heuristics and no writes to the retained host's collider authority.
export function clipWindowLegacyWall(compiled,input){
  const {coveredEdges,world}=readCompiled(compiled),wall=data(input);fields(wall,['provider','edge','floorId','bounds'],'');
  if(wall.provider!=='farmyard-legacy-wall-v1'||wall.floorId!==world.floorId)fail('UNSUPPORTED_LEGACY_WALL','/provider','Clipping needs actual ground legacy-edge provenance.');
  if(typeof wall.edge!=='string'||! /^(s|e):-?(0|[1-9][0-9]*):-?(0|[1-9][0-9]*)$/.test(wall.edge))fail('INVALID_EDGE','/edge','Use a canonical ground legacy edge.');
  const [axis,xText,yText]=wall.edge.split(':'),x=Number(xText),y=Number(yText);if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||wall.edge!==`${axis}:${x}:${y}`)fail('INVALID_EDGE','/edge','Noncanonical legacy edge.');
  fields(wall.bounds,['x0','x1','y0','y1','z0','height'],'/bounds');for(const key of Object.keys(wall.bounds))finite(wall.bounds[key],'/bounds/'+key);
  if(wall.bounds.x0>=wall.bounds.x1||wall.bounds.y0>=wall.bounds.y1||wall.bounds.z0>=wall.bounds.height)fail('INVALID_BOUNDS','/bounds','Legacy wall bounds must be positive.');
  const along=axis==='s'?x:y,across=axis==='s'?y:x,lo=axis==='s'?'x0':'y0',hi=axis==='s'?'x1':'y1',otherLo=axis==='s'?'y0':'x0',otherHi=axis==='s'?'y1':'x1';
  if(Math.abs(wall.bounds[lo]-(along-.56))>EPS||Math.abs(wall.bounds[hi]-(along+.56))>EPS||Math.abs((wall.bounds[otherLo]+wall.bounds[otherHi])/2-(across+.5))>EPS)fail('UNSUPPORTED_LEGACY_WALL','/bounds','Only the exact legacy edge-centred 1.12 m span can be clipped.');
  const covered=new Set(coveredEdges);if(covered.has(wall.edge))return null;
  const edge=n=>axis==='s'?`s:${n}:${across}`:`e:${across}:${n}`;
  if(covered.has(edge(along-1)))wall.bounds[lo]=along-.5;
  if(covered.has(edge(along+1)))wall.bounds[hi]=along+.5;
  return wall;
}
