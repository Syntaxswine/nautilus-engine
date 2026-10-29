// Additive artist output only; does not modify provider registries, saves, pins or runtime capabilities.
import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';import{gzipSync}from'node:zlib';
import * as T from'../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import{VARIANT_BUILDINGS,VARIANT_PARTS,VARIANT_CONTRACT,compileVariant,variantFloorSvg,transformPoint}from'../packages/fort-variants/index.js';
import{VARIANT_LAYOUTS}from'../packages/fort-variants/layouts.js';import{VARIANT_CONNECTORS}from'../packages/fort-variants/connectors.js';
import{buildVariantMesh}from'../packages/fort-variants/mesh.js';import{createVariantModel}from'../packages/fort-variants/three.js';import{exportVariantGltf}from'./export-fort-variants-gltf.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),asset=path.join(root,'assets/fort-variants'),art=path.join(root,'art/fort-variants'),
  sha=data=>createHash('sha256').update(data).digest('hex'),clone=v=>structuredClone(v);
for(const d of['models','parts'])fs.mkdirSync(path.join(asset,d),{recursive:true});fs.mkdirSync(path.join(art,'sculpts'),{recursive:true});
function write(file,data){
  file=path.resolve(file);if(![asset,art].some(base=>file.startsWith(base+path.sep)))throw Error('Fort export escaped its owned folders.');
  const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);if(!fs.existsSync(file)||!fs.readFileSync(file).equals(bytes))fs.writeFileSync(file,bytes);
  return{file:path.relative(root,file).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};
}
const roles={'frontier-gatehouse':'main-gate','frontier-blockhouse':'corner-tower','frontier-sally-port':'rear-gate',
  'frontier-stockade-6':'wall-run','frontier-stockade-3':'wall-run','frontier-stockade-corner':'wall-corner','frontier-stockade-u':'wall-return',
  'frontier-rampart-platform':'platform','frontier-datum-stair':'stair','frontier-porch-bay':'shelter-bay','frontier-porch-terminal':'terminal-post','frontier-paired-gate':'gate-leaves'};
function swept(leaf){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let degree=0;degree<=90;degree++){
    const a=leaf.yaw+leaf.swingSign*degree*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    for(const batch of leaf.batches)for(let i=0;i<batch.positions.length;i+=3){
      const[x,y,z]=batch.positions.slice(i,i+3),p=[leaf.pivot[0]+x*c+z*s,leaf.pivot[1]+y,leaf.pivot[2]-x*s+z*c];
      p.forEach((v,j)=>{min[j]=Math.min(min[j],v);max[j]=Math.max(max[j],v);});
    }
  }
  return{min:min.map(v=>v-.002),max:max.map(v=>v+.002),method:'Closed-to-90-degree sweep sampled every degree, plus 2 mm conservative allowance; includes fittings.'};
}
function descriptor(r,game){
  const b=game.building,sweeps=game.doorLeaves.filter(l=>l.public).map(l=>({id:l.id,openingId:l.openingId,side:l.side,pivot:l.pivot,yaw:l.yaw,
    swingSign:l.swingSign,angleRange:l.angleRange,clearOpenWidth:l.clearOpenWidth,clearOpenHeight:l.clearOpenHeight,sweepBounds:swept(l)})),
    reserved=clone(game.bounds);
  for(const l of sweeps)for(let i=0;i<3;i++){reserved.min[i]=Math.min(reserved.min[i],l.sweepBounds.min[i]);reserved.max[i]=Math.max(reserved.max[i],l.sweepBounds.max[i]);}
  const isPart=VARIANT_PARTS.some(p=>p.id===r.id);
  return{id:r.id,name:r.name,role:r.kind==='transition'?'transition':roles[r.sourceModuleId]||'building',visualConstruction:r.visualConstruction,theme:r.theme,sourceModuleId:r.sourceModuleId,
    origin:isPart?(r.attachments?.origin||'Left wall-axis endpoint / local assembly corner at ground datum; see interfaces.'):'Front-left nominal footprint at ground datum.',
    nominalFootprint:[r.width,r.depth],scale:[1,1,1],quarterTurns:[0,90,180,270],interfaces:clone(r.interfaces||[]),
    attachments:clone(r.attachments||{}),physicalBounds:clone(game.bounds),reservedBounds:reserved,
    boundsPolicy:'Reserved bounds include fittings and door motion. Matching connector collars may touch/overlap; unrelated solids must not occupy passage or approach volumes.',
    portals:clone(b.portals||[]),doorMotion:sweeps,stairs:clone(b.stairs||[]),auxiliaryStairs:clone(b.auxiliaryStairs||[]),roofTerraces:clone(b.roofTerraces||[]),
    clearance:{wallWalk:{nominalWidth:1.5,minimumClearWidth:1.4,minimumClearHeight:1.8,datum:2.12},
      stairs:{nominalFlightWidth:1.3,minimumClearFlightWidth:1.25,headProbeHeight:1.8},
      mainGate:r.sourceModuleId==='frontier-gatehouse'||r.sourceModuleId==='frontier-paired-gate'?{rough:[4,4.12],minimumOpen:[3.2,3.9]}:null,
      rearGate:r.sourceModuleId==='frontier-sally-port'?{rough:[3,2],minimumOpen:[2.5,1.9]}:null},
    optionalConnections:r.sourceModuleId==='frontier-adobe-storehouse'?'Roof sockets are capped by default. Set openInterfaces explicitly before connecting neighbors.':null,
    consumerSupport:clone(b.consumerSupport)};
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function layoutSvg(layout){
  let body=`<rect x="-5" y="-6" width="${layout.width+10}" height="${layout.depth+13}" fill="#f0eddf"/><text x="0" y="-2.7" font-family="Georgia" font-size="1.8" fill="#293d31">${esc(layout.name)}</text><text x="0" y="-1" font-family="sans-serif" font-size=".7">Original module plan · metres · walkway 2.12 m · not a historical survey</text>`;
  for(const i of layout.instances){
    body+=`<g transform="translate(${i.position[0]} ${i.position[2]}) rotate(${-i.yaw*180/Math.PI})">`;
    const r=VARIANT_BUILDINGS.find(r=>r.id===i.assetId);
    if(r){const b=compileVariant(r),f=b.floors[0];
      for(const q of f.rooms)body+=`<rect x="${q.x}" y="${q.y}" width="${q.width}" height="${q.depth}" fill="${q.type==='terrace'?'#d8c8a4':q.type==='passage'?'#d6e1d3':'#e4dfce'}" stroke="#c5bca3" stroke-width=".04"/>`;
      for(const w of f.walls){const P=u=>[w.a[0]+(w.b[0]-w.a[0])*u/w.length,w.a[1]+(w.b[1]-w.a[1])*u/w.length],
        cuts=[0,w.length,...w.openings.flatMap(o=>[o.u0,o.u1])].sort((a,b)=>a-b);
        for(let k=0;k<cuts.length-1;k++){const mid=(cuts[k]+cuts[k+1])/2;if(w.openings.some(o=>mid>o.u0&&mid<o.u1))continue;
          body+=`<path d="M${P(cuts[k])}L${P(cuts[k+1])}" fill="none" stroke="#344b3a" stroke-width=".16"/>`;}
        for(const o of w.openings)if(o.type==='window')body+=`<path d="M${P(o.u0)}L${P(o.u1)}" stroke="#7299a2" stroke-width=".12"/>`;
      }
      for(const s of [...b.stairs,...b.auxiliaryStairs]){const q=s.rect;body+=`<rect x="${q.x}" y="${q.y}" width="3" height="4" fill="none" stroke="#9b875c" stroke-width=".1"/>`;}
      body+=`<text x="${r.width/2}" y="${r.depth/2}" text-anchor="middle" font-family="sans-serif" font-size=".65" fill="#324a37">${esc(i.id)}</text>`;
    }else{
      const p=VARIANT_PARTS.find(p=>p.id===i.assetId),points=p.kind==='corner'?'6,0 0,0 0,6':p.kind==='u'?'0,6 0,0 6,0 6,6':`0,0 ${p.width},0`;
      body+=`<polyline points="${points}" fill="none" stroke="#806e4b" stroke-width=".25"/>`;
      if(['stockade','sally','platform'].includes(p.kind))body+=`<rect x="0" y=".16" width="${p.width}" height="1.5" fill="#c4ad7e" fill-opacity=".65"/>`;
      if(p.kind==='sally')body+=`<path d="M1.5,0h3" stroke="#eadfc1" stroke-width=".4"/><path d="M1.5,0h3" stroke="#776f54" stroke-dasharray=".3 .2" stroke-width=".08"/>`;
    }body+='</g>';
  }
  body+=`<path d="M0,${layout.depth+2}h6m-6,-.3v.6m6,-.6v.6" stroke="#344b3a" stroke-width=".08"/><text x="2" y="${layout.depth+3.2}" font-family="sans-serif" font-size=".8">6 m</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -6 ${layout.width+10} ${layout.depth+13}" role="img" aria-label="${esc(layout.name)} module plan">${body}</svg>`;
}
const records=[],descriptors=[];
for(const r of[...VARIANT_BUILDINGS,...VARIANT_PARTS,...VARIANT_LAYOUTS]){
  const category=VARIANT_PARTS.some(p=>p.id===r.id)?'parts':'models',source=buildVariantMesh(r.id,{lod:'source'}),game=buildVariantMesh(r.id),
    exchange=createVariantModel(T,buildVariantMesh(r.id,{uvMode:'atlas'}),{uvMode:'atlas'}),gltf=exportVariantGltf(exchange),files=[];
  files.push(write(path.join(art,'sculpts',r.id+'.source-mesh.json.gz'),gzipSync(Buffer.from(JSON.stringify(source)),{level:9})));
  for(const[name,bytes]of[[r.id+'.gltf',JSON.stringify(gltf.json)],[r.id+'.bin',gltf.bin],[r.id+'.blueprint.json',JSON.stringify(game.building)],
    [r.id+'.game-mesh.json.gz',gzipSync(Buffer.from(JSON.stringify(game)),{level:9})]])files.push(write(path.join(asset,category,name),bytes));
  if(VARIANT_BUILDINGS.some(b=>b.id===r.id))for(let level=0;level<r.levels;level++)
    files.push(write(path.join(asset,category,r.id+'-level-'+level+'.svg'),variantFloorSvg(game.building,level)));
  if(VARIANT_LAYOUTS.some(b=>b.id===r.id))files.push(write(path.join(asset,category,r.id+'-plan.svg'),layoutSvg(r)));
  else descriptors.push(descriptor(r,game));
  records.push({id:r.id,name:r.name,category:VARIANT_LAYOUTS.some(b=>b.id===r.id)?'layout':category==='parts'?'part':'building',
    engineGame:game.metrics,source:source.metrics,reduction:1-game.metrics.triangles/source.metrics.triangles,interchange:exchange.data.metrics,
    bounds:game.bounds,files,animations:gltf.json.animations?.map(a=>({name:a.name,channels:a.channels.length}))||[]});
  exchange.dispose();console.log(r.id,JSON.stringify({game:game.metrics.triangles,source:source.metrics.triangles,glTF:records.at(-1).interchange.triangles}));
}
const connectorFile=write(path.join(asset,'connectors.json'),JSON.stringify({...VARIANT_CONNECTORS,modules:descriptors},null,2)),
  partsFile=write(path.join(asset,'parts.json'),JSON.stringify({version:1,collection:'nautilus-fort-era-variants-v1',contract:VARIANT_CONTRACT,modules:descriptors},null,2));
write(path.join(art,'dimensions.json'),JSON.stringify({version:1,sourceMeasurements:false,dimensionPolicy:'All dimensions are original authored adaptations. Miniature product sizes were not treated as construction dimensions.',
  baseline:'6d9dfeca7e47a4bded6497472f46f49f8ce14a5b',native:VARIANT_CONTRACT,modules:descriptors,layouts:VARIANT_LAYOUTS},null,2));
const inputFiles=['packages/fort-variants/designs.js','packages/fort-variants/index.js','packages/fort-variants/layouts.js','packages/fort-variants/connectors.js',
  'packages/fort-variants/geometry.js','packages/fort-variants/roofs.js','packages/fort-variants/mesh.js','packages/fort-variants/three.js',
  'packages/measured-buildings/index.js','packages/measured-buildings/designs.js','tools/build-fort-variants.mjs','tools/export-fort-variants-gltf.mjs',
  'art/fort-variants/provenance.json','art/fort-variants/dimensions.json','art/fort-variants/material-prompt.json','packages/frontier-fort/designs.js','packages/frontier-fort/index.js','packages/frontier-fort/layouts.js','packages/frontier-fort/connectors.js'];
write(path.join(asset,'catalogue.json'),JSON.stringify({version:1,collection:'nautilus-fort-era-variants-v1',artistFoundation:'6d9dfeca7e47a4bded6497472f46f49f8ce14a5b',
  engineBaseline:'12ad8c9b1c96637cd05c8e344692063bfde385f3',status:'Castle and modern security artist variants; pending shared editor intake, separate from v0.5.0.',
  contract:VARIANT_CONTRACT,inputs:inputFiles.map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),
  skins:['assets/buildings/painted-materials-v2.png','assets/fort-variants/painted-era-materials-v1.png']
    .map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),connectorsManifest:connectorFile,partsManifest:partsFile,assets:records},null,2));
