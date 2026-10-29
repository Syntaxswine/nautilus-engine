// Engine adapter of Farmyard fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b. Original bytes and rights are in vendor/farmyard-furniture/fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b/provenance.json.
export function softBox(THREE,w,h,d,r=.012,detail=2){
 r=Math.min(r,w/4,h/4,d/4);const shape=new THREE.Shape(),x=-w/2,y=-h/2;
 shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
 const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSize:r*.48,bevelThickness:r,bevelSegments:detail,steps:1,curveSegments:detail+1});g.translate(0,0,-d/2+r);g.computeVertexNormals();
 // Local triplanar-style UVs follow boards rather than stretching an atlas over caps.
 const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));let u,v;if(ny>nx&&ny>nz){u=p.getX(i)/w+.5;v=p.getZ(i)/d+.5;}else if(nx>nz){u=p.getZ(i)/d+.5;v=p.getY(i)/h+.5;}else{u=p.getX(i)/w+.5;v=p.getY(i)/h+.5;}uv.setXY(i,u,v);}return g;
}
