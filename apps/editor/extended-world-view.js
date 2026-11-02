const NS='http://www.w3.org/2000/svg',LIMIT=1600;
const number=value=>Number(value.toFixed(3));

// Event-driven SVG projections of the actual authored AABBs. This requires no
// WebGL context, model renderer, animation loop or substitute geometry schema.
export function createExtendedWorldView({axon,plan,counts},{onSelect=()=>{},onDraw=()=>{}}={}) {
  const doc=plan.ownerDocument,events=new AbortController();
  let current=null,gesture=null;
  const node=(name,attributes={},text)=>{
    const element=doc.createElementNS(NS,name);
    for(const [key,value]of Object.entries(attributes))element.setAttribute(key,String(value));
    if(text!==undefined)element.textContent=text;return element;
  };
  const polygon=(points,attributes)=>node('polygon',{points:points.map(p=>p.map(number).join(',')).join(' '),...attributes});
  function cancelGesture(){const existed=!!gesture;gesture=null;plan.querySelector('.ew-drag')?.remove();return existed;}
  function position(event) {
    const matrix=plan.getScreenCTM();if(!matrix)return null;
    const p=plan.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
    const local=p.matrixTransform(matrix.inverse());return {x:local.x,y:local.y};
  }
  plan.addEventListener('pointerdown',event=>{
    if(event.button!==0||!current)return;
    plan.focus({preventScroll:true});
    if(current.tool!=='box') {
      const id=event.target.closest('[data-surface-id]')?.getAttribute('data-surface-id');if(id)onSelect(id);return;
    }
    const start=position(event);if(!start)return;
    gesture={start,floorId:current.floorId,pointerId:event.pointerId};plan.setPointerCapture(event.pointerId);event.preventDefault();
  },{signal:events.signal});
  plan.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.pointerId)return;
    const p=position(event);if(!p)return;
    plan.querySelector('.ew-drag')?.remove();
    plan.append(node('rect',{class:'ew-drag',x:Math.min(p.x,gesture.start.x),y:Math.min(p.y,gesture.start.y),width:Math.abs(p.x-gesture.start.x),height:Math.abs(p.y-gesture.start.y),fill:'#e7c67a44',stroke:'#ffe0a0','stroke-width':.1,'pointer-events':'none'}));
  },{signal:events.signal});
  plan.addEventListener('pointerup',event=>{
    if(!gesture||event.pointerId!==gesture.pointerId)return;
    const previous=gesture,end=position(event);cancelGesture();
    if(plan.hasPointerCapture(event.pointerId))plan.releasePointerCapture(event.pointerId);
    if(end&&previous.floorId===current?.floorId)onDraw({from:previous.start,to:end,floorId:previous.floorId});
  },{signal:events.signal});
  for(const type of ['pointercancel','lostpointercapture'])plan.addEventListener(type,cancelGesture,{signal:events.signal});

  function render({world,floorId,preview=null,selectedSurfaceId=null,tool='select'}) {
    if(gesture&&(current?.floorId!==floorId||current?.tool!==tool))cancelGesture();
    current={world,floorId,tool};
    const shown=preview||world,floor=world.floors.find(value=>value.id===floorId),bounds=world.bounds;
    const original=new Map(world.surfaces.map(surface=>[surface.id,surface]));
    const changed=surface=>!!preview&&JSON.stringify(original.get(surface.id))!==JSON.stringify(surface);
    const actorBodies=new Set(shown.entities.filter(entity=>entity.kind==='actor').map(entity=>entity.id+':body'));
    const color=surface=>changed(surface)?'#edc573':actorBodies.has(surface.id)?'#70c5c4':surface.role==='roof'?'#6b987b':surface.supports?'#b8ad8a':'#8f9f99';
    const project=(x,y,h)=>[(x-y)*12,(x+y)*4.6-h*14];
    const corners=[];
    for(const x of [0,bounds.widthM])for(const y of [0,bounds.depthM])for(const h of [bounds.minHeightM,bounds.heightM])corners.push(project(x,y,h));
    const minX=Math.min(...corners.map(p=>p[0]))-42,maxX=Math.max(...corners.map(p=>p[0]))+22;
    const minY=Math.min(...corners.map(p=>p[1]))-20,maxY=Math.max(...corners.map(p=>p[1]))+30;
    axon.setAttribute('viewBox',[minX,minY,maxX-minX,maxY-minY].join(' '));axon.replaceChildren();
    const gridStep=Math.max(1,10**Math.floor(Math.log10(Math.max(bounds.widthM,bounds.depthM)/8)));
    for(let x=0;x<=bounds.widthM;x+=gridStep) {
      const a=project(x,0,0),b=project(x,bounds.depthM,0);
      axon.append(node('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#61746b','stroke-width':.5,opacity:.35}));
    }
    for(let y=0;y<=bounds.depthM;y+=gridStep) {
      const a=project(0,y,0),b=project(bounds.widthM,y,0);
      axon.append(node('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#61746b','stroke-width':.5,opacity:.35}));
    }
    const plane=[[0,0],[bounds.widthM,0],[bounds.widthM,bounds.depthM],[0,bounds.depthM]].map(([x,y])=>project(x,y,floor.elevationM));
    axon.append(polygon(plane,{fill:'#d5bd7320',stroke:'#e1c782','stroke-width':1.2,'stroke-dasharray':'5 5'}));
    // Limit only drawing work, disclose the count, and keep authoritative queries
    // and exports complete. The native acceptance world draws every body.
    const records=[...shown.surfaces].sort((a,b)=>(b.floorId===floorId)-(a.floorId===floorId)).slice(0,LIMIT);
    records.sort((a,b)=>(a.bounds.min.h-b.bounds.min.h)||((a.bounds.min.x+a.bounds.min.y)-(b.bounds.min.x+b.bounds.min.y)));
    for(const surface of records) {
      const {min:a,max:b}=surface.bounds,fill=color(surface),active=surface.floorId===floorId;
      const group=node('g',{opacity:active?1:.3,'data-body-id':surface.id});group.append(node('title',{},surface.id+' · '+surface.floorId));
      const p=(x,y,h)=>project(x,y,h);
      group.append(polygon([p(a.x,b.y,a.h),p(b.x,b.y,a.h),p(b.x,b.y,b.h),p(a.x,b.y,b.h)],{fill,stroke:'#142a26','stroke-width':.4}));
      group.append(polygon([p(b.x,a.y,a.h),p(b.x,b.y,a.h),p(b.x,b.y,b.h),p(b.x,a.y,b.h)],{fill,stroke:'#142a26','stroke-width':.4,opacity:.7}));
      group.append(polygon([p(a.x,a.y,b.h),p(b.x,a.y,b.h),p(b.x,b.y,b.h),p(a.x,b.y,b.h)],{fill,stroke:surface.id===selectedSurfaceId?'#fff1b4':'#142a26','stroke-width':surface.id===selectedSurfaceId?2:.45}));
      axon.append(group);
    }
    for(const datum of world.floors) {
      const [x,y]=project(0,0,datum.elevationM),active=datum.id===floorId;
      axon.append(node('line',{x1:x-7,y1:y,x2:x+5,y2:y,stroke:active?'#ffe0a0':'#71877a','stroke-width':active?2:1}));
      axon.append(node('text',{x:x-12,y:y+3,'text-anchor':'end',fill:active?'#ffe0a0':'#9db2a3','font-size':11,'font-family':'system-ui'},datum.label));
    }
    const selectedRecords=shown.surfaces.filter(surface=>surface.floorId===floorId),planRecords=selectedRecords.slice(0,LIMIT);
    const framing=selectedRecords.length?{
      minX:Math.min(...selectedRecords.map(surface=>surface.bounds.min.x)),maxX:Math.max(...selectedRecords.map(surface=>surface.bounds.max.x)),
      minY:Math.min(...selectedRecords.map(surface=>surface.bounds.min.y)),maxY:Math.max(...selectedRecords.map(surface=>surface.bounds.max.y))
    }:{minX:0,maxX:bounds.widthM,minY:0,maxY:bounds.depthM};
    plan.setAttribute('viewBox',[framing.minX-1,framing.minY-1,framing.maxX-framing.minX+2,framing.maxY-framing.minY+2].join(' '));
    plan.dataset.tool=tool;plan.replaceChildren();
    plan.append(node('rect',{x:0,y:0,width:bounds.widthM,height:bounds.depthM,fill:'#162e29',stroke:'#627d6a','stroke-width':.06}));
    planRecords.sort((a,b)=>a.bounds.min.h-b.bounds.min.h);
    for(const surface of planRecords) {
      const {min:a,max:b}=surface.bounds,selected=surface.id===selectedSurfaceId;
      const rect=node('rect',{x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y,fill:color(surface),
        opacity:surface.supports ? .7 : .95,stroke:selected?'#fff1b4':changed(surface)?'#ffdd91':'#233c33','stroke-width':selected ? .16 : .045,
        'data-surface-id':surface.id,...(changed(surface)?{'stroke-dasharray':'.2 .12'}:{})});
      rect.append(node('title',{},surface.id+' · '+number(a.h)+'–'+number(b.h)+' m'));plan.append(rect);
    }
    for(const link of shown.links)for(const endpoint of [link.from,link.to])if(endpoint.floorId===floorId) {
      plan.append(node('circle',{cx:endpoint.position.x,cy:endpoint.position.y,r:.22,fill:'#e6cb84',stroke:'#233c33','stroke-width':.05}));
    }
    for(const entity of shown.entities.filter(record=>record.floorId===floorId)) {
      const marker=node('circle',{cx:entity.position.x,cy:entity.position.y,r:.26,fill:'#6bc8d0',stroke:'#132e30','stroke-width':.07});
      marker.append(node('title',{},entity.id+' · supported '+entity.kind+' anchor'));plan.append(marker);
    }
    counts.textContent=records.length+' / '+shown.surfaces.length+' bodies in overview · '+planRecords.length+' / '+selectedRecords.length+' on working floor';
  }
  return Object.freeze({render,cancelGesture,dispose(){events.abort();cancelGesture();axon.replaceChildren();plan.replaceChildren();}});
}
