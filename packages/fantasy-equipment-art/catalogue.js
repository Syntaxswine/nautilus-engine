import {EQUIPMENT_SPECS,equipmentSpec} from './specs.js';
import {buildEquipmentGeometry,equipmentGeometryBounds} from './geometry.js';
const copy=x=>structuredClone(x),cache=new Map(),Q=[0,0,0,1];
const grip=(position,socket,moves=false)=>({position:position.slice(),quaternion:Q.slice(),socket,moves});
function record(spec){
 const rest=buildEquipmentGeometry(spec.id),restBounds=equipmentGeometryBounds(rest,{includeHidden:false});
 const bounds=copy(restBounds);for(const draw of spec.ranged?[0,.25,.5,.75,1]:[0]){const b=equipmentGeometryBounds(buildEquipmentGeometry(spec.id,{draw,loaded:true}));for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],b.min[k]);bounds.max[k]=Math.max(bounds.max[k],b.max[k]);}}
 // Tube cross sections rotate during draw. A two-millimetre envelope covers
 // continuous intermediate poses, not just the five sampled marker states.
 if(spec.ranged)for(let k=0;k<3;k++){bounds.min[k]-=.002;bounds.max[k]+=.002;}
 const dynamic=key=>spec.ranged&&(/^(limb\.|string\.|projectile\.)/.test(key)||(spec.id==='bow'&&key==='grip.off'));
 const measure=g=>({triangles:g.batches.reduce((n,m)=>n+m.positions.length/9,0),meshBatches:g.batches.length,materials:new Set(g.batches.map(x=>x.material)).size});
 return {id:spec.id,label:spec.label,version:1,status:'review-candidate',appearanceOnly:true,family:spec.family,units:'metres',nativeScale:1,
  axes:{up:'+Y',right:'+X',front:'+Z',projectileForward:spec.ranged?'+Z':null,longWeapon:'+Y'},origin:'Main grasp point at [0,0,0]. Shield face is in +Z; grasp is behind it.',
  bounds,restBounds,boundsPolicy:'Conservative visual envelope including loaded projectile and all supported draw states; not collision, reach or damage authority.',
  grip:{main:grip([0,0,0],'grip.main'),off:spec.off?grip(spec.off,'grip.off',spec.id==='bow'):null},
  sockets:Object.entries(rest.anchors).map(([id,position])=>({id,position:position.slice(),quaternion:Q.slice(),moves:dynamic(id),role:id.startsWith('grip.')?'grasp':id.startsWith('projectile.')?'projectile-marker':id.startsWith('limb.')||id.startsWith('string.')?'articulation-marker':'descriptive-part-marker'})),
  parts:spec.parts.slice(),finishes:(spec.finishes||['standard']).slice(),
  articulation:spec.ranged?{fields:{draw:{type:'finite-number',min:0,max:1},loaded:{type:'boolean'}},defaults:{draw:0,loaded:false},patch:true,combinations:'All draw/loaded combinations supported, including empty drawing. Loaded controls only the projectile visibility. Gameplay owns dry-fire policy.',movingParts:rest.batches.filter(x=>x.part!=='static').map(x=>x.part).filter((v,i,a)=>a.indexOf(v)===i),stableNodes:true}: {fields:{},defaults:{},patch:false,combinations:'Only an empty object is supported.'},
  resources:{textures:1,textureSize:[512,512],textureBytes:1048576,gpuTextureBytesWithMipmaps:1398100,asynchronousLoads:0,...measure(rest),byFinish:Object.fromEntries((spec.finishes||['standard']).map(f=>[f,measure(buildEquipmentGeometry(spec.id,{finish:f}))]))},
  handoff:{guide:'packages/fantasy-equipment-art/README.md',example:'tools/fantasy-equipment-art/painted-v2/viewer.html',provenance:'assets/fantasy-equipment/painted-v2/provenance.json',entry:'packages/fantasy-equipment-art/three.js',required:['host Three namespace','host scene/attachment ownership'],hostOwns:['actor motion','authoritative action state','damage types/reach/costs','collision and confirmed hits','inventory and projectile simulation','persistence'],schema:'nautilus-fantasy-equipment-art-v1'}};
}
export function fantasyEquipmentArt(id){const spec=equipmentSpec(id);if(!cache.has(id))cache.set(id,record(spec));return copy(cache.get(id));}
export function listFantasyEquipmentArt(){return EQUIPMENT_SPECS.map(x=>fantasyEquipmentArt(x.id));}
