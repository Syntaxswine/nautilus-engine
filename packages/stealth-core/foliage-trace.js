// Ordered bucket traversal from the reviewed AFT optimization; original bytes
// are reference-only. Geometry remains the existing 781246a snapshot.
import {segmentBox} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-geometry.js';
import {foliageSegment} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/foliage-obstacles.js';
const CHUNK=4;
export function foliageIndex(boxes){const index=new Map();for(const b of boxes)for(let x=Math.floor(b.min[0]/CHUNK);x<=Math.floor(b.max[0]/CHUNK);x++)for(let y=Math.floor(b.min[2]/CHUNK);y<=Math.floor(b.max[2]/CHUNK);y++){const key=x+','+y;if(!index.has(key))index.set(key,[]);index.get(key).push(b);}return index;}
export function traceFoliage(scene,start,end,purpose='shot',space='simulation',anyHit=false){
 const index=space==='world'?scene.worldIndex:scene.index,dx=end[0]-start[0],dz=end[2]-start[2],sx=Math.sign(dx),sz=Math.sign(dz),visited=new Set();let hit=null,x=Math.floor(start[0]/CHUNK),z=Math.floor(start[2]/CHUNK);
 if(!Number.isFinite(dx)||!Number.isFinite(dz)||!Number.isFinite(start[1])||!Number.isFinite(end[1]))return null;
 let tx=dx?((x+(sx>0?1:0))*CHUNK-start[0])/dx:Infinity,tz=dz?((z+(sz>0?1:0))*CHUNK-start[2])/dz:Infinity;const stepX=dx?CHUNK/Math.abs(dx):Infinity,stepZ=dz?CHUNK/Math.abs(dz):Infinity;
 const visit=(x,z)=>{
   for(const b of index.get(`${x},${z}`)||[]){
    if(visited.has(b))continue;visited.add(b);if(purpose==='sight'?!b.blocksSight:!b.blocksShot)continue;
    const entry=segmentBox(start,end,b);if(entry===null||hit&&entry>hit.t)continue;
    const at=foliageSegment(start,end,b);if(at!==null&&(!hit||at<hit.t)){hit={t:at,box:b};if(anyHit)return true;}
   }
   return false;
 };
 // Traverse in entry order instead of allocating/sorting every boundary cut.
 // At a corner also visit both touched side buckets, including reverse rays.
 while(true){
  if(visit(x,z))return hit;const next=Math.min(tx,tz);
  if(hit&&hit.t<Math.min(next,1)-1e-10||next>1)break;
  if(Math.abs(tx-tz)<1e-10){if(visit(x+sx,z)||visit(x,z+sz))return hit;x+=sx;z+=sz;tx+=stepX;tz+=stepZ;}
  else if(tx<tz){x+=sx;tx+=stepX;}
  else {z+=sz;tz+=stepZ;}
 }
 return hit;
}
// Terrain reveal needs a yes/no obstruction, not the nearest impact receipt.
// Firearms, guard/target rays and public trace callers retain nearest-hit order.
export function foliageOccluded(scene,start,end,space='simulation'){return !!traceFoliage(scene,start,end,'sight',space,true);}
