import {createExteriorPartView} from './exterior.js';
import {createRoofGroup} from '../roof-core/three.js';
import {HOUSE} from '../mount-dora-core/donnelly-house.js';
/** Native compiled boxes, faceted prisms, doors and roof meshes share the
 * authored physical plan. Cutaway changes presentation alone. */
export function createDonnellyHouseView(T,plan,{atlas=null,world}={}){
 const root=new T.Group(),views=[],prisms=[],roofs=[],doors=[],inserts=[],geometries=new Set(),materials=new Set(),clip=new T.Plane(new T.Vector3(0,-1,0),1.8);let inside=false,activeLevel=-1,disposed=false;
 for(const level of [0,1,2])for(const role of ['wall','floor','other']){
  const selected=plan.parts.filter(p=>!['prism','sloped-roof','round-window','gable-end'].includes(p.kind)&&(p.level??(p.role==='roof'?2:0))===level&&(role==='wall'?p.role==='wall':role==='floor'?p.role==='floor':!['wall','floor'].includes(p.role)));
  if(!selected.length)continue;const view=createExteriorPartView(T,{parts:selected},{atlas});root.add(view.root);views.push({view,level,role});
  if(role==='wall')view.root.traverse(mesh=>{if(mesh.isMesh){mesh.material.clippingPlanes=[clip];mesh.material.clipShadows=true;}});
 }
 for(const p of plan.parts.filter(p=>p.kind==='prism')){
  const points=p.points,position=[],add=(a,b,c)=>position.push(...a,...b,...c),bottom=points.map(([x,y])=>[x,p.minH,y]),top=points.map(([x,y])=>[x,p.topH,y]);
  for(let i=1;i<points.length-1;i++){add(top[0],top[i+1],top[i]);add(bottom[0],bottom[i],bottom[i+1]);}
  for(let i=0;i<points.length;i++){const j=(i+1)%points.length;add(bottom[i],bottom[j],top[j]);add(bottom[i],top[j],top[i]);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));geometry.computeVertexNormals();const material=new T.MeshStandardMaterial({color:p.material==='recessed-window'?0x3c626a:p.material==='porch-floor'?0xa38a64:0xe7c467,roughness:.85,side:T.DoubleSide,clippingPlanes:p.role==='wall'?[clip]:[]}),mesh=new T.Mesh(geometry,material);mesh.name=p.id;root.add(mesh);geometries.add(geometry);materials.add(material);prisms.push({mesh,part:p});
 }
 const roofMetal=new T.MeshStandardMaterial({color:0xb2c5d0,roughness:.88,metalness:.08,vertexColors:true});materials.add(roofMetal);
 for(const p of plan.parts.filter(p=>p.kind==='sloped-roof')){const view=createRoofGroup(T,p.spec,{atlas,materialMap:{metal:roofMetal}});view.position.set(...p.translation);root.add(view);roofs.push(view);}
 const trim=new T.MeshStandardMaterial({color:0xf4ecd9,roughness:.9}),siding=new T.MeshStandardMaterial({color:0xe7c467,roughness:.9,side:T.DoubleSide}),glass=new T.MeshStandardMaterial({color:0x344c50,roughness:.35,side:T.DoubleSide});for(const m of [trim,siding,glass])materials.add(m);
 const ownMesh=(g,m,parent)=>{geometries.add(g);const mesh=new T.Mesh(g,m);parent.add(mesh);return mesh;};
 for(const p of plan.parts.filter(p=>p.kind==='round-window')){
  const group=new T.Group(),shape=new T.Shape(),w=p.widthM/2,h=p.heightM/2;shape.moveTo(-w,-h);shape.lineTo(w,-h);shape.lineTo(w,h);shape.lineTo(-w,h);shape.closePath();const hole=new T.Path();hole.absellipse(0,0,p.radiusM,p.radiusM,0,Math.PI*2,true);shape.holes.push(hole);
  const mask=ownMesh(new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false,curveSegments:40}),siding,group);mask.position.z=-.08;ownMesh(new T.CircleGeometry(p.radiusM,40),glass,group).position.z=.085;ownMesh(new T.TorusGeometry(p.radiusM+.025,.05,8,40),trim,group).position.z=.095;
  for(const [w,h]of [[.045,p.radiusM*2],[p.radiusM*2,.045]]){const bar=ownMesh(new T.BoxGeometry(w,h,.045),trim,group);bar.position.z=.11;}
  group.position.set(...p.centre);group.rotation.y=Math.PI/2;root.add(group);inserts.push({group,level:p.level});
 }
 for(const p of plan.parts.filter(p=>p.kind==='gable-end')){
  const group=new T.Group(),shape=new T.Shape();p.outline.forEach(([u,h],i)=>i?shape.lineTo(u,h):shape.moveTo(u,h));shape.closePath();
  for(const w of p.windows){const hole=new T.Path(),a=w.centre[2]-w.widthM/2,b=w.centre[2]+w.widthM/2,c=w.centre[1]-w.heightM/2,d=w.centre[1]+w.heightM/2;hole.moveTo(a,c);hole.lineTo(a,d);hole.lineTo(b,d);hole.lineTo(b,c);hole.closePath();shape.holes.push(hole);}
  const mesh=ownMesh(new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false}),siding,group);mesh.rotation.y=-Math.PI/2;mesh.position.x=p.x+.08;group.name=p.id;
  const windowView=createExteriorPartView(T,{parts:p.windows.map(w=>({...w,kind:'window',normal:[1,0],material:'recessed-window',role:'roof'}))},{atlas});group.add(windowView.root);views.push({view:windowView,level:2,role:'other'});root.add(group);inserts.push({group,level:2});
 }
 const wood=new T.MeshStandardMaterial({color:0x76553a,roughness:.8}),panel=new T.MeshStandardMaterial({color:0xa88553,roughness:.83});materials.add(wood);materials.add(panel);
 for(const b of plan.doors){const group=new T.Group();group.name=b.doorId;group.position.set(b.hinge.x,b.hinge.h,b.hinge.y);const leaf=b.leaf,g=new T.BoxGeometry(leaf.widthM,leaf.heightM,leaf.thicknessM),mesh=new T.Mesh(g,wood);geometries.add(g);mesh.position.set(leaf.offsetM+leaf.widthM/2,leaf.bottomM+leaf.heightM/2,0);group.add(mesh);for(const y of [.28,.95,1.56]){const pg=new T.BoxGeometry(leaf.widthM-.15,.36,leaf.thicknessM+.006),m=new T.Mesh(pg,panel);geometries.add(pg);m.position.set(leaf.widthM/2,leaf.bottomM+y,0);group.add(m);}root.add(group);doors.push({group,binding:b});}
 root.name='Donnelly · interpreted native-parts interior v1';
 function update(){const state=world.read(),a=state.actor,x=a.position.x-HOUSE.origin[0],y=a.position.y-HOUSE.origin[1];inside=x>=0&&x<=18&&y>=0&&y<=14&&a.position.h>=HOUSE.groundH-.01&&((x>=6&&x<=16&&y<=12)||(x<=6&&y>=4&&y<=13)||(x>=16&&x<=18&&y>=1&&y<=6&&a.position.h>2)||Math.hypot(x-15.6,y-11.4)<=1.5);activeLevel=inside?(a.position.h>=2.1?1:0):-1;clip.constant=inside?(activeLevel?HOUSE.upperH:HOUSE.groundH)+1.1:40;
  for(const {view,level}of views)view.root.visible=!inside||level<=activeLevel;
  for(const {mesh,part}of prisms)mesh.visible=!inside||(part.level??2)<=activeLevel;
  for(const view of roofs)view.visible=!inside;
  for(const {group,level}of inserts)group.visible=!inside||level<=activeLevel;
  for(const {group,binding:b}of doors){const d=state.interactions.doors.find(d=>d.id===b.doorId),m=state.doorMotions?.[b.doorId],fraction=m?m.from+(m.to-m.from)*m.elapsed/m.duration:d.open?1:0;group.rotation.y=b.closedYawRadians+(b.openYawRadians-b.closedYawRadians)*fraction;group.visible=!inside||(b.floorId==='md-donnelly-ground'?0:1)<=activeLevel;}
 }
 update();return {root,update,metrics(){return {profile:plan.profile,sceneId:plan.scene.id,inside,activeLevel,nativeDoors:doors.length,roofStyles:plan.parts.filter(p=>p.kind==='sloped-roof').map(p=>p.spec.style),turretSides:6,ownedGeometries:geometries.size,ownedMaterials:materials.size,drawGroups:views.length+prisms.length+roofs.length+doors.length};},dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const {view}of views)view.dispose();for(const view of roofs)view.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();}};
}
