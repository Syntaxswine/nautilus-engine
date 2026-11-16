// World-space triangles from a host Three.js object tree, without importing Three. Any
// object with isMesh, geometry.attributes.position (getX/getY/getZ), an optional
// geometry.index and matrixWorld.elements (column-major) qualifies. include(kind, mesh)
// filters by the nearest userData.kind above the mesh: Nautilus building models tag floor,
// exterior, trim, glazing, roof, porch, door-leaf and so on. Hidden objects still count;
// display state is not geometry.
export function objectTriangles(root,{include=null}={}){
  if(typeof root?.traverse!=='function')throw Error('Supply a host scene object with traverse().');
  root.updateMatrixWorld?.(true);
  const meshes=[];let total=0;
  root.traverse(o=>{
    if(!o.isMesh||!o.geometry?.attributes?.position)return;
    let kind=null;for(let a=o;a&&kind===null;a=a.parent)if(typeof a.userData?.kind==='string')kind=a.userData.kind;
    if(include&&!include(kind,o))return;
    const g=o.geometry;total+=Math.floor((g.index?g.index.count:g.attributes.position.count)/3);meshes.push(o);
  });
  const out=new Float32Array(total*9);let n=0;
  for(const o of meshes){
    const g=o.geometry,pos=g.attributes.position,index=g.index,e=o.matrixWorld.elements,count=Math.floor((index?index.count:pos.count)/3)*3;
    for(let t=0;t<count;t++){const id=index?index.getX(t):t,x=pos.getX(id),y=pos.getY(id),z=pos.getZ(id);
      out[n++]=e[0]*x+e[4]*y+e[8]*z+e[12];out[n++]=e[1]*x+e[5]*y+e[9]*z+e[13];out[n++]=e[2]*x+e[6]*y+e[10]*z+e[14];}
  }
  return out;
}
// World bounds {min, max} of a flat triangle list.
export function triangleBounds(positions){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let n=0;n<positions.length;n+=3)for(let a=0;a<3;a++){const v=positions[n+a];if(v<min[a])min[a]=v;if(v>max[a])max[a]=v;}
  return{min,max};
}
