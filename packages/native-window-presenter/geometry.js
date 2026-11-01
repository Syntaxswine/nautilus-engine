import {surfaceUV} from './paint.js';
// Static native art adaptation, NOT a donor state/authority import. Definitions
// and masks have already been revalidated by the actual public window API.
export function buildWindow(T,materials,p,spec,content,sceneId,owned){
  const root=new T.Group(),cube=new T.BoxGeometry(1,1,1);owned.add(cube);
  root.name=p.id;root.position.set(p.x,0,p.y);root.rotation.y=(p.rotation??0)*Math.PI/180;
  root.userData={sceneId,placementId:p.id,engineInstanceId:content.engineInstanceId,definitionId:p.definitionId,definitionDigest:content.definitionDigest};
  const panes=new Map(),solids=new Map(),borderless=spec.solids.length===0,finish=materials[p.finish??'steel'];
  const memberId=id=>JSON.stringify(['window-member-v1',sceneId,p.id,id]);
  function box(parent,name,b,material,geometry=cube){const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(...b.min.map((v,i)=>(v+b.max[i])/2));mesh.scale.set(...b.min.map((v,i)=>b.max[i]-v));mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  for(const part of spec.solids){
    let geometry=cube;const b={min:part.min,max:part.max};
    if(part.role==='lower-wall'){
      geometry=cube.clone();owned.add(geometry);const pos=geometry.attributes.position,norm=geometry.attributes.normal,uv=geometry.attributes.uv;
      for(let i=0;i<pos.count;i++){const point=[pos.getX(i),pos.getY(i),pos.getZ(i)].map((n,j)=>n*(b.max[j]-b.min[j])+(b.max[j]+b.min[j])/2);uv.setXY(i,...surfaceUV(point,[norm.getX(i),norm.getY(i),norm.getZ(i)]));}
    }
    const mesh=box(root,part.id,b,part.role==='lower-wall'?materials.walls[p.wall??'brick']:finish.frame,geometry);
    mesh.userData={...root.userData,memberId:memberId(part.id),partId:part.id,role:part.role,kind:'wall'};solids.set(part.id,mesh);
    if(part.role!=='lower-wall'){
      const w=b.max[0]-b.min[0],h=b.max[1]-b.min[1];
      for(const side of [-1,1]){const stripe={min:[b.min[0]+.005,b.min[1]+.005,side*.099-.001],max:[b.max[0]-.005,b.max[1]-.005,side*.099+.001]};if(w<h)stripe.max[0]=stripe.min[0]+.006;else stripe.min[1]=stripe.max[1]-.006;const edge=box(root,part.id+':enamel-edge',stripe,finish.edge);edge.userData={decorative:true,placementId:p.id};}
    }
  }
  let sheet;
  if(borderless){sheet=cube.clone();owned.add(sheet);sheet.setIndex(Array.from(cube.index.array).slice(24,36));sheet.clearGroups();}
  for(const pane of spec.panes){
    const group=new T.Group(),binding=content.panes.find(b=>b.paneId===pane.id);group.name='pane:'+pane.id;
    group.userData={...root.userData,paneId:pane.id,partId:pane.id,visualId:binding.visualId,memberId:memberId(pane.id),kind:'glass',role:null};root.add(group);
    const glass=box(group,'glass:'+pane.id,{min:pane.min,max:pane.max},materials.glass,borderless?sheet:cube);glass.castShadow=false;glass.userData={...group.userData};
    let shine=null;
    if(!borderless){const points=[],[x0,y0]=pane.min,[x1,y1]=pane.max,w=x1-x0,h=y1-y0;
      for(const side of [-1,1])for(const [ax,ay,bx,by]of [[.16,.12,.40,.85],[.62,.18,.79,.70]])points.push(new T.Vector3(x0+w*ax,y0+h*ay,side*.003),new T.Vector3(x0+w*bx,y0+h*by,side*.003));
      const g=new T.BufferGeometry().setFromPoints(points);owned.add(g);shine=new T.LineSegments(g,materials.shine);shine.name='shine:'+pane.id;shine.userData={decorative:true,placementId:p.id,paneId:pane.id};group.add(shine);
    }
    panes.set(pane.id,{root:group,glass,shine,broken:false});
  }
  return {root,panes,solids};
}
export function buildLegacyWall(T,material,record,owned){
  const b=record.bounds,g=new T.BoxGeometry(1,1,1);owned.add(g);const mesh=new T.Mesh(g,material);mesh.name='legacy:'+record.edge;
  mesh.position.set((b.x0+b.x1)/2,(b.z0+b.height)/2,(b.y0+b.y1)/2);mesh.scale.set(b.x1-b.x0,b.height-b.z0,b.y1-b.y0);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={provider:record.provider,edge:record.edge,kind:'host-legacy-wall-view'};return mesh;
}
