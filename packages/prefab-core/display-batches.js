// Display batches for building prefabs. Opaque triangles merge into one geometry
// per material, ordered so that each editor view draws a few contiguous runs.
// A view only rewrites the runs (geometry groups) of that shared geometry, so
// placed copies follow their template. No dimensions, UVs or material
// definitions change, and the source model keeps its own view rules; original
// buildings hand their opaque source arrays over to the batches.

const SIZES={position:3,normal:3,uv:2,grossUV:2},IDENTITY=Object.freeze({elements:Object.freeze([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])});
const compare=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]??-Infinity)-(b[i]??-Infinity);if(d)return d;}return 0;};

// pieces: {mesh, material, start, end, key, order, visible(options), exact}.
// [start,end) are draw positions in the source geometry (index or vertex). An
// exact piece is copied byte for byte; otherwise its world transform is baked
// with the same Vector3 arithmetic the renderer's matrices describe.
function mergeOpaque(T,pieces,names){
  const byMaterial=new Map(),p=new T.Vector3(),n=new T.Vector3(),normalMatrix=new T.Matrix3();
  for(const piece of pieces){if(!byMaterial.has(piece.material))byMaterial.set(piece.material,[]);byMaterial.get(piece.material).push(piece);}
  const records=[];
  for(const [material,list]of byMaterial){
    list.sort((a,b)=>compare(a.key,b.key)||a.order-b.order);
    const vertices=list.reduce((sum,piece)=>sum+piece.end-piece.start,0),arrays={};
    for(const name of names)arrays[name]=new Float32Array(vertices*SIZES[name]);
    const ranges=[];let at=0;
    for(const piece of list){
      const geometry=piece.mesh.geometry,attributes=geometry.attributes,index=geometry.index,count=piece.end-piece.start;
      if(piece.exact&&!index){for(const name of names){const size=SIZES[name],source=attributes[name];if(!source)throw Error('Exact building pieces need '+name+'.');arrays[name].set(source.array.subarray(piece.start*size,piece.end*size),at*size);}}
      else{
        normalMatrix.getNormalMatrix(piece.mesh.matrixWorld);
        for(let i=piece.start,o=at;i<piece.end;i++,o++){
          const v=index?index.getX(i):i;
          p.fromBufferAttribute(attributes.position,v).applyMatrix4(piece.mesh.matrixWorld);arrays.position[o*3]=p.x;arrays.position[o*3+1]=p.y;arrays.position[o*3+2]=p.z;
          n.fromBufferAttribute(attributes.normal,v).applyNormalMatrix(normalMatrix);arrays.normal[o*3]=n.x;arrays.normal[o*3+1]=n.y;arrays.normal[o*3+2]=n.z;
          for(const name of names)if(SIZES[name]===2){const a=attributes[name];arrays[name][o*2]=a?.getX(v)||0;arrays[name][o*2+1]=a?.getY(v)||0;}
        }
      }
      ranges.push({piece,start:at,count});at+=count;
    }
    const geometry=new T.BufferGeometry();
    for(const name of names)geometry.setAttribute(name,new T.BufferAttribute(arrays[name],SIZES[name]));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    // A material array makes the geometry groups the draw list, for every copy.
    const mesh=new T.Mesh(geometry,[material]);mesh.name=material.name||'building batch';mesh.castShadow=mesh.receiveShadow=true;
    records.push({mesh,material,ranges});
  }
  return records;
}

// Consecutive visible pieces become one draw (ranges are back to back in the buffer).
function applyRuns(records,options){
  for(const record of records){
    const geometry=record.mesh.geometry;geometry.clearGroups();let run=null;
    for(const range of record.ranges){
      if(!range.piece.visible(options))run=null;
      else if(run)run.count+=range.count;
      else{geometry.addGroup(range.start,range.count,0);run=geometry.groups[geometry.groups.length-1];}
    }
    record.mesh.visible=geometry.groups.length>0;
  }
}
const runs=records=>records.reduce((sum,record)=>sum+record.mesh.geometry.groups.length,0);

function release(root,records){root.removeFromParent();for(const {mesh}of records)mesh.geometry.dispose();root.clear();}

// Gross houses: native transforms are baked, as before. A piece is one face
// range of one native mesh; its visibility is its floor/roof scope and the
// optional wall toggle. Order: the lowest floor's furniture, walls and floors,
// then always-shown parts, roofs and ornament, then each higher floor's floors,
// walls and furniture, so the exterior and each floor cutaway are few runs.
export function batchPrefab(T,source) {
  source.root.updateMatrixWorld(true);
  const pieces=[],levels=new Map();let order=0;
  source.root.traverseVisible(mesh=>{
    if(!mesh.isMesh)return;
    const chain=[];let node=mesh;while(node!==source.root){chain.unshift(node);node=node.parent;}
    // Native floor/props, roofs and ornament have independent visibility. Walls
    // also retain a separate toggle, without fragmenting each metre-long panel.
    const scope=chain.slice(0,chain[0]?.name.startsWith('Level ')?2:1),wall=chain.some(node=>node.name.startsWith('wall:'));
    const geometry=mesh.geometry,attributes=geometry.attributes,index=geometry.index,total=index?index.count:attributes.position.count;
    const faces=Array.isArray(mesh.material)?geometry.groups:[{start:0,count:total,materialIndex:0}];
    if(!faces.length)throw Error('Native multi-material geometry must declare its face groups.');
    const level=scope[0].name.startsWith('Level ')?Number(scope[0].name.slice(6)):null;if(level!==null)levels.set(scope[0],level);
    for(const face of faces){
      const material=Array.isArray(mesh.material)?mesh.material[face.materialIndex]:mesh.material,start=Math.max(face.start,geometry.drawRange.start),end=Math.min(face.start+face.count,geometry.drawRange.start+geometry.drawRange.count,total);
      if(end>start)pieces.push({mesh,material,start,end,scope,wall,level,order:order++,exact:false,visible:({walls=true}={})=>scope.every(node=>node.visible)&&(walls||!wall)});
    }
  });
  // Classify each scope by the source's own rule: furniture shows only with
  // furniture on; roofs and ornament only outside a cutaway.
  const shown=view=>{source.setView(view);return new Set(pieces.filter(piece=>piece.scope.every(node=>node.visible)).map(piece=>piece.scope));};
  const sorted=[...new Set(levels.values())].sort((a,b)=>a-b),plain=shown({view:'exterior',showFurniture:false}),furnished=shown({view:'exterior',showFurniture:true});
  const cut=sorted.map(level=>shown({view:'cutaway',level,showFurniture:true}));source.setView();
  for(const piece of pieces){
    const prop=furnished.has(piece.scope)&&!plain.has(piece.scope),inCut=cut.some(set=>set.has(piece.scope)),block=piece.level===null?-1:sorted.indexOf(piece.level);
    const inner=prop?2:piece.wall?1:0;
    piece.key=block===0?[0,2-inner]:block>0?[2+block,inner]:inCut?[1,0]:[2,0];
  }
  const records=mergeOpaque(T,pieces,['position','normal','uv','grossUV']),root=new T.Group();root.name=source.root.name;
  for(const {mesh}of records)root.add(mesh);
  function sync(options={}){applyRuns(records,options);}
  sync();
  return {root,records,pieces,sync,runs:()=>runs(records),dispose(){release(root,records);}};
}

// Original buildings: every opaque mesh, door leaves included, merges per
// material; glass stays one mesh per source batch so it still sorts back to
// front. Classes come from the source's own view rule, sampled per floor:
//   C1 shown in every view up to its floor (floors, stairs, porches)
//   C2 shown up to its floor but hidden with walls off (interior, doors)
//   C3 shown outside cutaways, also with walls off (roofs, details, towers)
//   C4 shown outside cutaways with walls on (envelope, trim, glazing frames)
// The order C2 (highest floor first), C1 (lowest first), C3, C4 makes the
// exterior, each cutaway and either wall setting one run per material.
export function batchOriginal(T,source) {
  source.root.updateMatrixWorld(true);
  const tops=[...source.root.children],floors=[...new Set(tops.map(top=>top.userData.level??0))].sort((a,b)=>a-b),seen=[];
  const sample=(view,options)=>{source.setView(view,options);seen.push({cut:view.view==='cutaway',level:view.level,walls:options.walls,visible:new Set(tops.filter(top=>top.visible))});};
  for(const walls of [true,false]){sample({view:'exterior'},{walls});for(const level of floors)sample({view:'cutaway',level},{walls});}
  source.setView({view:'exterior'},{walls:true});
  const key=top=>{
    const shown=seen.filter(view=>view.visible.has(top)),bare=shown.some(view=>!view.walls&&!view.cut),cuts=shown.filter(view=>view.cut&&view.walls).map(view=>view.level);
    if(!shown.length)return [4];
    const from=cuts.length?Math.min(...cuts):null;
    return from===null?[bare?2:3]:bare?[1,from]:[0,-from];
  };
  const pieces=[],glass=[],root=new T.Group();root.name=source.root.name;let order=0;
  for(const top of tops){
    const k=key(top),visible=()=>top.visible;
    top.traverse(mesh=>{
      if(!mesh.isMesh)return;
      if(mesh.material.transparent){if(mesh!==top)throw Error('Transparent door parts are not batched.');const copy=mesh.clone();copy.visible=top.visible;glass.push({top,mesh:copy});return;}
      pieces.push({mesh,material:mesh.material,start:0,end:mesh.geometry.attributes.position.count,key:k,order:order++,exact:mesh===top&&mesh.matrixWorld.equals(IDENTITY),visible});
    });
  }
  const records=mergeOpaque(T,pieces,['position','normal','uv']);
  // The merged copies replace the opaque source geometry, which is never drawn:
  // release its arrays so a template holds its triangles once. Glass keeps its own.
  const released=new T.BufferGeometry();for(const piece of pieces){piece.mesh.geometry.dispose();piece.mesh.geometry=released;}
  for(const {mesh}of records)root.add(mesh);for(const {mesh}of glass)root.add(mesh);
  function sync(){applyRuns(records);for(const {top,mesh}of glass)mesh.visible=top.visible;}
  sync();
  return {root,records,glass,pieces,sync,runs:()=>runs(records)+glass.filter(({mesh})=>mesh.visible).length,dispose(){release(root,records);}};
}
