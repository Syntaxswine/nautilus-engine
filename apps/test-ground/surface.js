import * as T from '@nautilus-engine/map-core/render-effects/three';
import {createRockModel} from '@nautilus-engine/map-core/items/three';
import {createRoadVehicleKit} from '@nautilus-engine/map-core/vehicles/three';
import {REGISTRY,slotById,plotById} from './registry.js';
import {canonical,insist} from './data.js';

// Content rendering only. Never creates actor movement, door state or gameplay input.
export async function createGroundSurface(document,host,{signal}={}) {
  const element=document.createElement('div');element.className='ground-surface';const canvas=document.createElement('canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label','Night Ledger test ground');element.append(canvas);
  const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(document.defaultView.devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene();scene.background=new T.Color(0x9cb5ad);const camera=new T.PerspectiveCamera(45,1,.05,400);
  scene.add(new T.HemisphereLight(0xfff5db,0x334b40,2.4));const sun=new T.DirectionalLight(0xffe4b0,3.2);sun.position.set(-15,30,15);scene.add(sun);
  const shared=[],plots=new Map(),base=new T.Group();scene.add(base);let retired=false,stages=0,commits=0,retiredPlots=0;
  const mat=(color,list=shared)=>{const m=new T.MeshStandardMaterial({color,roughness:.92});list.push(m);return m;};
  const box=(root,bounds,material,list)=>{const {min:a,max:b}=bounds,g=new T.BoxGeometry(Math.max(.01,b.x-a.x),Math.max(.01,b.h-a.h),Math.max(.01,b.y-a.y));list.push(g);const mesh=new T.Mesh(g,material);mesh.position.set((a.x+b.x)/2,(a.h+b.h)/2,(a.y+b.y)/2);root.add(mesh);return mesh;};
  const slab=(x,y,w,d,color,h=-.01)=>box(base,{min:{x,y,h:h-.02},max:{x:x+w,y:y+d,h}},mat(color),shared);
  slab(0,0,64,64,0x63795e,-.04);slab(14.5,29,3,12,0xb5aa89);slab(46.5,29,3,12,0xb5aa89);slab(14.5,38.5,35,3,0xb5aa89,-.008);
  slab(8,48,48,16,0x6f8068,-.025);
  const grid=new T.GridHelper(64,32,0x8a9a79,0x77866b);grid.position.set(32,.005,32);base.add(grid);shared.push(grid.geometry,grid.material);
  function sign(text,x,y,size=2) {const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#eadab5';ctx.fillRect(0,0,512,128);ctx.fillStyle='#263c35';ctx.font='bold 34px Georgia';ctx.textAlign='center';ctx.fillText(text,256,76);const texture=new T.CanvasTexture(c),m=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}),g=new T.PlaneGeometry(size*3,size*.75),mesh=new T.Mesh(g,m);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.012,y);base.add(mesh);shared.push(texture,m,g);}
  sign('SAFE COURT · 64 × 64 m',32,45,1.4);sign('SHARED WALKING + DRIVING COURSE',32,50,1.1);sign('RAILWAY RESERVE → 240 × 180 m',53,44,.9);
  const barrierPaint=mat(0xaa9875);for(const s of host.read().world.surfaces.filter(s=>s.id.startsWith('driving-')))box(base,s.bounds,barrierPaint,shared);
  sign('HEAD ON → STOP',15,60.4,.55);sign('CLEAR WALL TIP',29.2,52.7,.55);sign('WALK · SLIDE',23.5,54,.5);sign('GLANCE · SLIDE',42,60.5,.55);sign('REAL OBSTRUCTION',33.3,61,.55);
  const kit=createRoadVehicleKit(T,{bodies:['hatchback','pickup'],profile:'game',signal}),cars=[];
  function makePlot(s,selection) {
    const slot=slotById(selection.slot),root=new T.Group(),resources=[],{x,y}=slot.origin,doors=new Map(),rocks=new Map();root.name=selection.slot+' '+plotById(selection.fixture).name;
    const tint=selection.slot==='west'?0xd9ae61:0x82b4ab,paint=mat(tint,resources),wall=mat(0xa69876,resources),leaf=mat(0x526e57,resources);
    for(const surface of s.world.surfaces.filter(f=>f.id.startsWith(selection.slot+'-')))box(root,surface.bounds,wall,resources);
    for(const [xx,yy,w,d]of [[x,y,16,.07],[x,y+16,16,.07],[x,y,.07,16],[x+16,y,.07,16]])box(root,{min:{x:xx,y:yy,h:.005},max:{x:xx+w,y:yy+d,h:.02}},paint,resources);
    const g=new T.BoxGeometry(1,1,1);resources.push(g);const mesh=new T.Mesh(g,leaf);root.add(mesh);doors.set(selection.slot+'/door',mesh);
    const rock=s.rocks.find(r=>r.id===selection.slot+':rock');if(rock){const model=createRockModel(T,{seed:s.recipe.seed,radius:rock.profile.radius});root.add(model.root);rocks.set(rock.id,model);resources.push({dispose:()=>model.dispose()});const ringG=new T.RingGeometry(.17,.23,24),ringM=new T.MeshBasicMaterial({color:0xe3bb6e,side:T.DoubleSide}),ring=new T.Mesh(ringG,ringM);ring.rotation.x=-Math.PI/2;ring.position.set(x+12,.008,y+14);root.add(ring);resources.push(ringG,ringM);rocks.set(rock.id+'/marker',{root:ring});}
    let disposed=false;return {root,doors,rocks,key:canonical({selection,generation:s.plotGenerations[selection.slot]}),dispose(){if(disposed)return;disposed=true;root.removeFromParent();resources.forEach(r=>r.dispose());}};
  }
  function prepare(snapshot) {
    insist(!retired,'SURFACE_RETIRED','Surface retired.');const replacements=new Map();let used=false;
    try{for(const selection of snapshot.recipe.plots){const key=canonical({selection,generation:snapshot.plotGenerations[selection.slot]});if(plots.get(selection.slot)?.key!==key)replacements.set(selection.slot,makePlot(snapshot,selection));}stages++;}
    catch(e){replacements.forEach(p=>p.dispose());throw e;}
    return {commit(){insist(!used&&!retired,'SURFACE_STAGE_RETIRED','Visual candidate already retired.');used=true;for(const [id,p]of replacements){const old=plots.get(id);scene.add(p.root);plots.set(id,p);if(old){old.dispose();retiredPlots++;}}commits++;},dispose(){if(used)return;used=true;replacements.forEach(p=>p.dispose());}};
  }
  function fit(mesh,bounds){mesh.visible=!!bounds;if(!bounds)return;const {min:a,max:b}=bounds;mesh.position.set((a.x+b.x)/2,(a.h+b.h)/2,(a.y+b.y)/2);mesh.scale.set(b.x-a.x,b.h-a.h,b.y-a.y);}
  const surface={element,canvas,renderer,scene,camera,prepare,
    resize(){const r=canvas.getBoundingClientRect(),width=Math.max(1,r.width),height=Math.max(1,r.height),ratio=renderer.getPixelRatio();if(canvas.width!==Math.floor(width*ratio)||canvas.height!==Math.floor(height*ratio))renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();return {width,height};},
    draw(){if(retired)return;const s=host.read();for(const {id,model}of cars){const v=s.vehicles.vehicles.find(v=>v.id===id);model.root.position.set(v.position.x,v.position.h,v.position.y);model.root.rotation.y=v.headingRad;model.update(v);}for(const p of plots.values()){for(const [id,mesh]of p.doors){const door=s.interactions.doors.find(d=>d.id===id);if(door)fit(mesh,door.open?door.openBounds:door.closedBounds);}for(const [id,model]of p.rocks){const rock=s.rocks.find(r=>r.id===id.replace('/marker',''));model.root.visible=rock?.phase==='world';if(!id.endsWith('/marker')&&rock?.position)model.root.position.set(rock.position.x,rock.position.h,rock.position.y);}}renderer.render(scene,camera);},
    read(){return {stages,commits,retiredPlots,plotRoots:Object.fromEntries([...plots].map(([id,p])=>[id,p.root.uuid])),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};},
    dispose(){if(retired)return;retired=true;cars.forEach(c=>c.model.dispose());cars.length=0;kit.dispose();plots.forEach(p=>p.dispose());plots.clear();shared.forEach(r=>r.dispose());scene.clear();renderer.dispose();renderer.forceContextLoss();element.remove();}};
  try{await kit.ready;if(signal?.aborted)throw Error('GROUND_SURFACE_ABORTED');for(const v of host.read().vehicles.vehicles){const model=kit.createDriving('vehicle-'+v.body+'-'+v.finish);scene.add(model.root);cars.push({id:v.id,model});}prepare(host.read()).commit();return Object.freeze(surface);}catch(e){surface.dispose();throw e;}
}
