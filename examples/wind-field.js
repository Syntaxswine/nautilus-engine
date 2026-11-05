import * as T from '../packages/render-effects/three.js';
import {DESIGNS} from '../packages/building-catalog/index.js';
import {createBuildingModel} from '../packages/building-catalog/three.js';
import {TERRAIN,windDirection,bearingName,frictionVelocity,SURFACE_LAYER_SIGMA,windDomain,objectTriangles,triangleBounds,sampleWindField,seededRandom,WIND_FIELD_KIND,WIND_FIELD_VERSION,
  WIND_BEARINGS_KIND,WIND_BEARINGS_VERSION,evenBearings,createWindBearingSampler,encodeWindBearings,createSmoke,windFieldBounds,windFieldSolid} from '../packages/wind-core/index.js';

const $=id=>document.getElementById(id),errors=[],say=text=>{$('status').textContent=text;};
addEventListener('error',event=>errors.push(event.message));addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
// Footprint centres (x, z) in metres and a compass turn. A model's front faces north (-z).
const SITES={
  single:{label:'Single building',margin:3,height:3,buildings:[{id:'rowan-family',x:0,z:0,turn:0}],smoke:0},
  street:{label:'Street canyon',margin:2,height:2.5,buildings:[{id:'narrow-court',x:-5,z:11.5,turn:0},{id:'batten-general-store',x:5,z:11,turn:0},{id:'mews-corner',x:-5,z:-9.5,turn:180},{id:'market-terrace',x:5,z:-10,turn:180}],smoke:3},
  farmyard:{label:'Farmyard',margin:2,height:2.5,buildings:[{id:'red-crest-barn',x:0,z:0,turn:90},{id:'hearth-cape',x:-3,z:16,turn:180},{id:'longspan-machine-shed',x:18,z:4,turn:270}],smoke:1}
};
const MAX_CELLS=1000000,TOLERANCE=2e-4;
const state={preset:'single',buildings:structuredClone(SITES.single.buildings),cell:1,fromDeg:225,speed:6,terrain:'rough',gust:1,running:!matchMedia('(prefers-reduced-motion: reduce)').matches,
  streaks:true,mean:false,slice:'off',sliceHeight:1.5,smoke:true,smokeMode:'live'};
// One gold hue, dark to light: slow air recedes into the dark ground, fast air glows.
const RAMP=['#3a3424','#6b5a33','#a3844a','#d6b679','#fbf0d0'],LUT=new Float32Array(64*3),LUT8=new Uint8Array(64*3);
{const stops=RAMP.map(hex=>new T.Color(hex)),srgb=RAMP.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
  for(let n=0;n<64;n++){const t=n/63*(RAMP.length-1),i=Math.min(RAMP.length-2,Math.floor(t)),f=t-i,c=stops[i].clone().lerp(stops[i+1],f);LUT[n*3]=c.r;LUT[n*3+1]=c.g;LUT[n*3+2]=c.b;for(let a=0;a<3;a++)LUT8[n*3+a]=Math.round(srgb[i][a]+(srgb[i+1][a]-srgb[i][a])*f);}}
const rampIndex=t=>Math.max(0,Math.min(63,Math.round(t*63)));

// ---------- renderer, scene and camera
const canvas=$('scene'),stage=$('stage');let renderer=null;
try{const context=canvas.getContext('webgl2',{antialias:true});if(context)renderer=new T.WebGLRenderer({canvas,context,antialias:true});}catch{renderer=null;}
if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;}else $('scene-fallback').hidden=false;
const scene=new T.Scene();scene.background=new T.Color('#172b24');scene.add(new T.HemisphereLight(0xfff5d9,0x55624f,1.9));
const sun=new T.DirectionalLight(0xffedce,2.4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const ground=new T.Mesh(new T.PlaneGeometry(400,400),new T.MeshStandardMaterial({color:0x5d6a50,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);
const grid=new T.GridHelper(200,200,0x7d8a6c,0x6c785e);grid.material.opacity=.18;grid.material.transparent=true;grid.position.y=-.01;scene.add(grid);
const camera=new T.PerspectiveCamera(38,1,.1,900),view={target:new T.Vector3(),azimuth:-35,elevation:32,distance:60};
function placeCamera(){const a=view.azimuth*Math.PI/180,e=view.elevation*Math.PI/180;camera.position.set(view.target.x+view.distance*Math.sin(a)*Math.cos(e),view.target.y+view.distance*Math.sin(e),view.target.z+view.distance*Math.cos(a)*Math.cos(e));camera.lookAt(view.target);updateRose();}
function resize(){const r=stage.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer?.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();for(const p of Object.values(plumes))p.material.uniforms.scale.value=h*renderer?.getPixelRatio?.()/(2*Math.tan(camera.fov*Math.PI/360));}

// ---------- site models
const atlas=renderer?await new T.TextureLoader().loadAsync('../assets/buildings/painted-materials-v2.png'):null;
if(atlas){atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
const site=new T.Group();site.name='wind site';scene.add(site);let models=[],siteBounds=null;
function buildModels(){
  for(const m of models)m.model.dispose();models=[];site.clear();
  for(const def of state.buildings){
    const model=createBuildingModel(T,def.id,{atlas}),holder=new T.Group(),b=model.building;
    model.root.position.set(-b.width/2,0,-b.depth/2);model.root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    holder.add(model.root);holder.position.set(def.x,0,def.z);holder.rotation.y=-def.turn*Math.PI/180;holder.name=def.id;site.add(holder);models.push({model,holder,def});
  }
  site.updateMatrixWorld(true);siteBounds=new T.Box3().setFromObject(site);
}

// ---------- the solver worker
const worker=new Worker(new URL('./wind-field-worker.js',import.meta.url),{type:'module'});
let generation=0,domain=null,solid=null,field=null,meanField=null,stats=null,readyInfo=null,applied=null;
const windSettings=()=>({speed:state.speed,fromDeg:state.fromDeg,z0:TERRAIN[state.terrain].z0});
const turbulenceSettings=()=>state.gust>0?{gain:state.gust,lengthScale:20,modes:32,seed:1}:null;
// Builds the site the state describes. A site that does not fit is refused as a whole: the state,
// the controls and the models go back to the last site that ran, whose field and worker generation
// stay current, so no field is ever drawn or exported under another site's buildings.
function rebuild({frame=false}={}){
  buildModels();
  const triangles=objectTriangles(site),bounds=triangleBounds(triangles),preset=SITES[state.preset];
  let g=null,problem='';try{g=windDomain(bounds,{cell:state.cell,fromDeg:state.fromDeg,upstream:preset.margin,lateral:preset.margin,downstream:preset.margin,height:preset.height,minimum:8});}catch(error){problem=error.message;}
  if(g&&g.cells>MAX_CELLS)problem='That site needs '+g.cells.toLocaleString()+' cells at '+state.cell+' m; the limit here is '+MAX_CELLS.toLocaleString()+'.';
  if(problem){
    if(!applied){say(problem);return false;}
    const cellChanged=applied.cell!==state.cell;Object.assign(state,structuredClone(applied));buildModels();$('preset').value=state.preset;$('cell').value=String(state.cell);buildingList();
    say(problem+(cellChanged?' The cells stay at '+state.cell+' m.':state.cell<1?' The previous site stays; switch to 1 m cells first.':' The previous site stays.'));return false;
  }
  applied={preset:state.preset,buildings:structuredClone(state.buildings),cell:state.cell};
  // A refused change returned above with the previous site and its bake together; an accepted one drops the bake.
  generation++;domain=g;field=meanField=null;solid=null;readyInfo=null;stats=null;forgetBake();
  // Frame the site from the wind's right-hand side, so streaks and smoke cross the view.
  if(frame){const c=siteBounds.getCenter(new T.Vector3()),size=siteBounds.getSize(new T.Vector3());view.target.set(c.x,Math.min(4,size.y*.35),c.z);view.distance=Math.max(28,Math.hypot(size.x,size.z)*1.55)/Math.sqrt(Math.min(1,camera.aspect));view.azimuth=270-state.fromDeg;view.elevation=30;}
  const half=Math.max(g.size[0],g.size[2])*g.cell/2+10;Object.assign(sun.shadow.camera,{left:-half,right:half,top:half,bottom:-half,near:1,far:220});sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.copy(view.target);sun.position.set(view.target.x-30,60,view.target.z+20);
  placeCamera();layoutSlices();resetStreaks();clearSmoke();
  $('scale-note').textContent='Ground grid · 1 metre · wind cells '+g.cell+' m';
  $('site-note').textContent=g.size.join(' × ')+' cells ('+g.cells.toLocaleString()+') over '+g.size.map(n=>Math.round(n*g.cell)).join(' × ')+' m.';
  say('Voxelizing '+(triangles.length/9).toLocaleString()+' model triangles…');
  worker.postMessage({type:'site',generation,grid:{origin:[...g.origin],cell:g.cell,size:[...g.size]},triangles,wind:windSettings(),turbulence:turbulenceSettings(),tolerance:TOLERANCE},[triangles.buffer]);
  worker.postMessage({type:'run',running:state.running});return true;
}
const asField=velocity=>({kind:WIND_FIELD_KIND,version:WIND_FIELD_VERSION,origin:domain.origin,cell:domain.cell,size:domain.size,velocity,solid});
worker.onmessage=({data})=>{
  if(data.generation!==undefined&&data.generation!==generation)return;
  if(data.type==='ready'){solid=data.solid;readyInfo=data;say('Air is flowing. '+(data.enclosed?data.enclosed.toLocaleString()+' sealed interior cells count as solid. ':'')+'Click a roof or the ground to release smoke.');if(state.smoke)addDefaultSmoke();}
  else if(data.type==='field'){field=asField(data.velocity);meanField=data.mean?asField(data.mean):null;stats=data.stats;paintSlice();showStats();}
  else if(data.type==='export'){const blob=new Blob([data.text],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nautilus-wind-'+state.preset+'-'+Math.round(state.fromDeg)+'deg.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);say('Exported the '+(stats?.averagedSteps?'mean':'current')+' field ('+(data.text.length/1e6).toFixed(1)+' MB).');}
  else if(data.type==='error'){errors.push(data.message);say('Solver error: '+data.message);}
};
worker.onerror=event=>{errors.push(event.message);say('The solver worker failed: '+event.message);};
let windTimer=0;
function sendWind(){clearTimeout(windTimer);windTimer=setTimeout(()=>{if(domain)worker.postMessage({type:'wind',wind:windSettings(),turbulence:turbulenceSettings()});},120);updateLegend();}
const isSolid=(x,y,z)=>{if(!solid)return false;const g=domain,i=Math.floor((x-g.origin[0])/g.cell),j=Math.floor(y/g.cell),k=Math.floor((z-g.origin[2])/g.cell);return i>=0&&j>=0&&k>=0&&i<g.size[0]&&j<g.size[1]&&k<g.size[2]&&solid[i+g.size[0]*(j+g.size[1]*k)]===1;};
const inside=(x,y,z)=>{const g=domain;return x>g.origin[0]&&z>g.origin[2]&&x<g.origin[0]+g.size[0]*g.cell&&z<g.origin[2]+g.size[2]*g.cell&&y>=0&&y<g.size[1]*g.cell;};
const velocityField=()=>state.mean&&meanField?meanField:field;
const sample=(x,y,z,out)=>{const f=velocityField();if(!f){out[0]=out[1]=out[2]=0;return out;}return sampleWindField(f,x,y,z,out);};
const speedScale=()=>Math.max(2,1.5*state.speed);

// ---------- wind streaks: tracers drawn as fading trails
const STREAKS=1500,TRAIL=8,GLOW=.75,trail=new Float32Array(STREAKS*TRAIL*3),age=new Float32Array(STREAKS),life=new Float32Array(STREAKS),speedOf=new Float32Array(STREAKS),random=seededRandom(7);
const streakGeometry=new T.BufferGeometry(),streakPositions=new Float32Array(STREAKS*(TRAIL-1)*6),streakColors=new Float32Array(STREAKS*(TRAIL-1)*6);
streakGeometry.setAttribute('position',new T.BufferAttribute(streakPositions,3).setUsage(T.DynamicDrawUsage));streakGeometry.setAttribute('color',new T.BufferAttribute(streakColors,3).setUsage(T.DynamicDrawUsage));
const streaks=new T.LineSegments(streakGeometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));streaks.frustumCulled=false;streaks.renderOrder=3;scene.add(streaks);
function spawn(n){
  const g=domain,top=Math.min(g.size[1]*g.cell,(siteBounds?.max.y||8)*2.2);let x=0,y=0,z=0;
  for(let attempt=0;attempt<12;attempt++){x=g.origin[0]+random()*g.size[0]*g.cell;z=g.origin[2]+random()*g.size[2]*g.cell;y=.3+random()**1.4*top;if(!isSolid(x,y,z))break;}
  for(let t=0;t<TRAIL;t++){const o=(n*TRAIL+t)*3;trail[o]=x;trail[o+1]=y;trail[o+2]=z;}age[n]=0;life[n]=3+random()*5;
}
function resetStreaks(){if(!domain)return;for(let n=0;n<STREAKS;n++){spawn(n);age[n]=random()*life[n];}}
const A=[0,0,0],B=[0,0,0];
function moveStreaks(dt){
  if(!domain||!field)return;
  for(let n=0;n<STREAKS;n++){
    const o=n*TRAIL*3;
    // Shift the trail back one slot; the head moves with a midpoint step.
    trail.copyWithin(o+3,o,o+(TRAIL-1)*3);
    const x=trail[o+3],y=trail[o+4],z=trail[o+5];sample(x,y,z,A);sample(x+.5*dt*A[0],y+.5*dt*A[1],z+.5*dt*A[2],B);
    const X=x+dt*B[0],Y=y+dt*B[1],Z=z+dt*B[2];trail[o]=X;trail[o+1]=Y;trail[o+2]=Z;speedOf[n]=Math.hypot(B[0],B[1],B[2]);
    age[n]+=dt;if(age[n]>life[n]||!inside(X,Y,Z)||isSolid(X,Y,Z))spawn(n);
  }
}
function drawStreaks(){
  const scale=1/speedScale();let v=0;
  for(let n=0;n<STREAKS;n++){
    const base=n*TRAIL*3,c=rampIndex(speedOf[n]*scale)*3,fadeIn=GLOW*Math.min(1,age[n]/.6,(life[n]-age[n])/.6);
    for(let t=0;t<TRAIL-1;t++){
      const a=base+t*3,b=a+3,f0=(1-t/(TRAIL-1))*fadeIn,f1=(1-(t+1)/(TRAIL-1))*fadeIn;
      streakPositions[v]=trail[a];streakPositions[v+1]=trail[a+1];streakPositions[v+2]=trail[a+2];streakColors[v]=LUT[c]*f0;streakColors[v+1]=LUT[c+1]*f0;streakColors[v+2]=LUT[c+2]*f0;v+=3;
      streakPositions[v]=trail[b];streakPositions[v+1]=trail[b+1];streakPositions[v+2]=trail[b+2];streakColors[v]=LUT[c]*f1;streakColors[v+1]=LUT[c+1]*f1;streakColors[v+2]=LUT[c+2]*f1;v+=3;
    }
  }
  streakGeometry.attributes.position.needsUpdate=true;streakGeometry.attributes.color.needsUpdate=true;
}

// ---------- smoke: puffs carried by the wind, rising while they are warm (wind-core createSmoke).
// Two systems share the sources and the seed: one rides the live solver, one the baked blend.
// The rise is the puffs' own drift, not a buoyant flow.
const MAX_SOURCES=6,SMOKE={capacity:3200,lifetime:26,rate:14,rise:1.1,riseTime:5,spread:.12,jitter:.15,seed:11};let sources=[];
const smokeMaterial=new T.ShaderMaterial({uniforms:{scale:{value:600},life:{value:SMOKE.lifetime},color:{value:new T.Color('#d9dbd3')}},transparent:true,depthWrite:false,
  vertexShader:'attribute float age;uniform float scale;uniform float life;varying float vAge;void main(){vAge=age/life;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=(.5+3.2*sqrt(vAge))*scale/-p.z;}',
  fragmentShader:'uniform vec3 color;varying float vAge;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.08,d)*(1.-vAge)*min(1.,vAge*40.)*.42;if(a<.004)discard;gl_FragColor=vec4(color*(1.-.25*vAge),a);}'});
const bakedMaterial=smokeMaterial.clone();bakedMaterial.uniforms.color.value=new T.Color('#8fc3dc');
const plumes={live:{material:smokeMaterial,smoke:null},baked:{material:bakedMaterial,smoke:null}};
for(const p of Object.values(plumes)){p.geometry=new T.BufferGeometry();p.points=new T.Points(p.geometry,p.material);p.points.frustumCulled=false;p.points.renderOrder=4;p.points.visible=false;scene.add(p.points);}
let sampler=null,bakedSolid=null;
function resetPlumes(){
  const bounds=domain?windFieldBounds(domain):null;
  for(const[name,p]of Object.entries(plumes)){
    p.smoke=createSmoke({...SMOKE,bounds,blocked:name==='live'?isSolid:(x,y,z)=>bakedSolid!==null&&bakedSolid(x,y,z)});for(const s of sources)p.smoke.addEmitter({x:s.x,y:s.y,z:s.z});
    p.geometry.setAttribute('position',new T.BufferAttribute(p.smoke.positions,3).setUsage(T.DynamicDrawUsage));p.geometry.setAttribute('age',new T.BufferAttribute(p.smoke.ages,1).setUsage(T.DynamicDrawUsage));p.geometry.setDrawRange(0,0);
  }
}
const sourceMarkers=new T.Group();scene.add(sourceMarkers);const markerGeometry=new T.CylinderGeometry(.18,.18,.5,10),markerMaterial=new T.MeshBasicMaterial({color:0xd6b679});
function addSource(point){
  if(sources.length>=MAX_SOURCES){sources.shift();sourceMarkers.remove(sourceMarkers.children[0]);for(const p of Object.values(plumes))p.smoke?.removeEmitter(0);}
  sources.push(point.clone());for(const p of Object.values(plumes))p.smoke?.addEmitter({x:point.x,y:point.y,z:point.z});
  const m=new T.Mesh(markerGeometry,markerMaterial);m.position.copy(point).add(new T.Vector3(0,-.15,0));sourceMarkers.add(m);
}
function clearSmoke(){sources=[];sourceMarkers.clear();resetPlumes();}
function addDefaultSmoke(){const holder=models[SITES[state.preset].smoke]?.holder||models[0]?.holder;if(!holder)return;const box=new T.Box3().setFromObject(holder),c=box.getCenter(new T.Vector3());addSource(new T.Vector3(c.x,box.max.y+.3,c.z));}
function moveSmoke(dt){
  if(field)plumes.live.smoke.step(sample,dt);
  if(sampler)plumes.baked.smoke.step(sampler.sample,dt);
}
function drawSmoke(){
  for(const[name,p]of Object.entries(plumes)){
    p.points.visible=state.smoke&&Boolean(p.smoke)&&(state.smokeMode===name||state.smokeMode==='both');if(!p.points.visible)continue;
    p.geometry.setDrawRange(0,p.smoke.count);p.geometry.attributes.position.needsUpdate=true;p.geometry.attributes.age.needsUpdate=true;
  }
}

// ---------- baked bearings: workers bake the set; the page then blends it as a game would
const BAKE={speed:6,warmup:1,average:3};let bake=null,bakedSet=null,bakedFor=null,bakeGeneration=0;
function stopBake(){if(bake)for(const w of bake.workers)w.terminate();bake=null;$('bake').textContent='Bake bearings';$('bake-progress').hidden=true;}
function forgetBake(){stopBake();bakedSet=sampler=bakedSolid=bakedFor=null;setSmokeMode('live');$('export-bake').disabled=true;$('bake-note').textContent='Not baked yet.';}
function startBake(){
  if(bake){stopBake();$('bake-note').textContent='Bake cancelled.';return;}
  if(!domain||!readyInfo){say('Wait for the site to finish voxelizing, then bake.');return;}
  const count=Number($('bake-count').value),bearings=evenBearings(count),lanes=Math.max(1,Math.min(count,(navigator.hardwareConcurrency||4)-2)),generation=++bakeGeneration;
  const message={generation,grid:{origin:[...domain.origin],cell:domain.cell,size:[...domain.size]},wind:{speed:BAKE.speed,z0:TERRAIN[state.terrain].z0},turbulence:turbulenceSettings(),warmup:BAKE.warmup,average:BAKE.average,tolerance:TOLERANCE};
  bake={generation,count,bearings,fields:new Map(),unconverged:new Map(),workers:[],started:performance.now(),terrain:state.terrain,gust:state.gust};
  for(let lane=0;lane<lanes;lane++){
    const w=new Worker(new URL('./wind-field-bake-worker.js',import.meta.url),{type:'module'}),triangles=objectTriangles(site);
    w.onmessage=onBake;w.onerror=event=>{errors.push(event.message);say('A bake worker failed: '+event.message);stopBake();};
    w.postMessage({...message,triangles,bearings:bearings.filter((_,n)=>n%lanes===lane)},[triangles.buffer]);bake.workers.push(w);
  }
  $('bake').textContent='Cancel bake';$('bake-progress').hidden=false;$('bake-progress').value=0;
  $('bake-note').textContent='Baking '+count+' bearings in '+lanes+' worker'+(lanes>1?'s':'')+': each warms up for '+BAKE.warmup+' flow-through and averages '+BAKE.average+'. The live wind keeps running.';
}
function onBake({data}){
  if(!bake||data.generation!==bake.generation)return;
  if(data.type==='error'){errors.push(data.message);say('Bake error: '+data.message);stopBake();return;}
  if(data.type!=='bearing')return;
  bake.fields.set(data.fromDeg,data.field);bake.unconverged.set(data.fromDeg,data.unconverged);$('bake-progress').value=bake.fields.size/bake.count;
  const elapsed=(performance.now()-bake.started)/1000,left=elapsed/bake.fields.size*(bake.count-bake.fields.size);
  $('bake-note').textContent='Baked '+bake.fields.size+' of '+bake.count+' bearings in '+elapsed.toFixed(0)+' s'+(left>0?'; about '+Math.ceil(left)+' s to go.':'.');
  if(bake.fields.size<bake.count)return;
  const{bearings,fields,unconverged}=bake;
  bakedSet={kind:WIND_BEARINGS_KIND,version:WIND_BEARINGS_VERSION,bearings,warmup:BAKE.warmup,average:BAKE.average,unconverged:bearings.map(b=>unconverged.get(b)),fields:bearings.map(b=>fields.get(b))};
  bakedFor={terrain:bake.terrain,gust:bake.gust,seconds:elapsed,count:bake.count};stopBake();makeSampler();
  $('export-bake').disabled=false;setSmokeMode('both');
  say('Baked '+bakedFor.count+' bearings in '+elapsed.toFixed(0)+' s. Blue smoke follows the blend; turn the dial and it swings at once, while the live wind takes a flow-through to settle.');
}
function makeSampler(){if(!bakedSet)return;sampler=createWindBearingSampler(bakedSet,{fromDeg:state.fromDeg,speed:state.speed,blend:$('bake-blend').value});bakedSolid=windFieldSolid(sampler.field);showBlend();}
function showBlend(){
  if(!sampler)return;sampler.setWind({fromDeg:state.fromDeg,speed:state.speed});
  const{bearings:[a,b],weights:[wa,wb],mode}=sampler.field.blend,stale=bakedFor.terrain!==state.terrain||bakedFor.gust!==state.gust;
  $('bake-note').textContent=(a===b||wb===0?'At '+a+'°, a baked bearing':'Blending '+a+'° and '+b+'° ('+mode+', '+wa.toFixed(2)+' and '+wb.toFixed(2)+')')+', times '+(state.speed/BAKE.speed).toFixed(2)+' for '+state.speed+' m/s.'
    +(stale?' Baked for '+bakedFor.terrain+' terrain and gusts '+bakedFor.gust+'; bake again to match the live wind.':'');
}
function setSmokeMode(mode){
  state.smokeMode=bakedSet||mode==='live'?mode:'live';$('smoke-mode').value=state.smokeMode;
  for(const option of $('smoke-mode').options)option.disabled=option.value!=='live'&&!bakedSet;$('smoke-key').hidden=state.smokeMode!=='both';
}

// ---------- slices: the speed on a plane through the field
const sliceMaterial=new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,opacity:.6});const slicePlane=new T.Mesh(new T.PlaneGeometry(1,1),sliceMaterial);slicePlane.renderOrder=2;scene.add(slicePlane);let sliceTexture=null,sliceAxis='x';
function layoutSlices(){
  if(!domain)return;const g=domain,[nx,ny,nz]=g.size,[dx,dz]=windDirection(state.fromDeg),w=nx*g.cell,d=nz*g.cell,hgt=ny*g.cell,cx=g.origin[0]+w/2,cz=g.origin[2]+d/2;
  sliceTexture?.dispose();slicePlane.rotation.set(0,0,0);
  if(state.slice==='horizontal'){sliceTexture=new T.DataTexture(new Uint8Array(nx*nz*4),nx,nz);slicePlane.scale.set(w,d,1);slicePlane.rotation.x=-Math.PI/2;slicePlane.position.set(cx,Math.min(state.sliceHeight,hgt-g.cell/2),cz);}
  else{sliceAxis=Math.abs(dx)>=Math.abs(dz)?'x':'z';const c=siteBounds.getCenter(new T.Vector3());
    if(sliceAxis==='x'){sliceTexture=new T.DataTexture(new Uint8Array(nx*ny*4),nx,ny);slicePlane.scale.set(w,hgt,1);slicePlane.position.set(cx,hgt/2,c.z);}
    else{sliceTexture=new T.DataTexture(new Uint8Array(nz*ny*4),nz,ny);slicePlane.scale.set(d,hgt,1);slicePlane.rotation.y=Math.PI/2;slicePlane.position.set(c.x,hgt/2,cz);}}
  sliceTexture.colorSpace=T.SRGBColorSpace;sliceTexture.magFilter=T.LinearFilter;sliceTexture.minFilter=T.LinearFilter;sliceMaterial.map=sliceTexture;sliceMaterial.needsUpdate=true;
  slicePlane.visible=state.slice!=='off';$('slice-height-row').hidden=state.slice!=='horizontal';$('slice-height').max=String(Math.max(1,Math.floor(hgt-1)));paintSlice();
}
function paintSlice(){
  const f=velocityField();if(!f||!sliceTexture||state.slice==='off')return;
  const g=domain,[nx,ny,nz]=g.size,data=sliceTexture.image.data,v=f.velocity,scale=1/speedScale();
  const put=(o,cell)=>{if(solid[cell]){data[o+3]=0;return;}const s=Math.hypot(v[cell*3],v[cell*3+1],v[cell*3+2]),c=rampIndex(s*scale)*3;data[o]=LUT8[c];data[o+1]=LUT8[c+1];data[o+2]=LUT8[c+2];data[o+3]=225;};
  if(state.slice==='horizontal'){const j=Math.min(ny-1,Math.max(0,Math.floor(state.sliceHeight/g.cell)));for(let r=0;r<nz;r++)for(let i=0;i<nx;i++)put((r*nx+i)*4,i+nx*(j+ny*(nz-1-r)));}
  else if(sliceAxis==='x'){const k=Math.min(nz-1,Math.max(0,Math.floor((slicePlane.position.z-g.origin[2])/g.cell)));for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)put((j*nx+i)*4,i+nx*(j+ny*k));}
  else{const i=Math.min(nx-1,Math.max(0,Math.floor((slicePlane.position.x-g.origin[0])/g.cell)));for(let j=0;j<ny;j++)for(let c=0;c<nz;c++)put((j*nz+c)*4,i+nx*(j+ny*(nz-1-c)));}
  sliceTexture.needsUpdate=true;
}

// ---------- panels
function showStats(){
  if(!stats||!domain)return;const g=domain,solidCells=solid?solid.reduce((a,b)=>a+b,0):0,u=frictionVelocity(state.speed,TERRAIN[state.terrain].z0),warm=Math.max(0,stats.warmUntil-stats.time);
  const rows=[['Grid',g.size.join(' × ')+' @ '+g.cell+' m'],['Air / solid',(g.cells-solidCells).toLocaleString()+' / '+solidCells.toLocaleString()],['Step',stats.milliseconds.toFixed(0)+' ms · '+stats.iterations+' CG iterations'],
    ['Divergence',stats.divergence.toExponential(1)+' of U'+(stats.converged?'':' (not converged)')],['Simulated',stats.time.toFixed(1)+' s · '+stats.simPerSecond.toFixed(2)+'× real time'],
    ['Mean wind',stats.averagedSteps?stats.averagedTime.toFixed(0)+' s averaged':'starts in '+warm.toFixed(0)+' s'],['Blockage',(stats.blockage*100).toFixed(1)+' % of the cross-section'],
    ['Fastest air',stats.maxSpeed.toFixed(1)+' m/s'],['Friction velocity',u.toFixed(2)+' m/s'],['Gust σu',state.gust?(SURFACE_LAYER_SIGMA[0]*u*state.gust).toFixed(2)+' m/s':'off']];
  $('stats').replaceChildren(...rows.flatMap(([k,v])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;return[dt,dd];}));
}
function updateLegend(){
  const bar=$('legend-bar'),ctx=bar.getContext('2d'),gradient=ctx.createLinearGradient(0,0,bar.width,0);RAMP.forEach((c,i)=>gradient.addColorStop(i/(RAMP.length-1),c));ctx.fillStyle=gradient;ctx.fillRect(0,0,bar.width,bar.height);
  const max=speedScale();$('legend-mid').textContent=(max/2).toFixed(max/2<10?1:0);$('legend-max').textContent=max.toFixed(0)+' m/s';
}
// The rose turns with the view: a world direction (dx, dz) projects onto the camera's
// right (cos a, -sin a) and forward (-sin a, -cos a) axes; its clockwise angle from screen-up follows.
function updateRose(){
  const a=view.azimuth*Math.PI/180,[dx,dz]=windDirection(state.fromDeg),right=dx*Math.cos(a)-dz*Math.sin(a),up=-dx*Math.sin(a)-dz*Math.cos(a),wind=Math.atan2(right,up)*180/Math.PI;
  $('rose-north').setAttribute('transform','rotate('+view.azimuth+')');$('rose-n').setAttribute('transform','rotate('+view.azimuth+')');$('rose-wind').setAttribute('transform','rotate('+(wind-180)+')');
}
function setBearing(deg){state.fromDeg=((Math.round(deg)%360)+360)%360;$('bearing').textContent=state.fromDeg+'°';$('bearing-name').textContent=bearingName(state.fromDeg)+' wind';$('dial-arrow').setAttribute('transform','rotate('+state.fromDeg+')');$('dial').setAttribute('aria-valuenow',String(state.fromDeg));$('dial').setAttribute('aria-valuetext',state.fromDeg+' degrees, from the '+bearingName(state.fromDeg));updateRose();if(state.slice==='vertical')layoutSlices();showBlend();}
function buildingList(){
  const list=$('buildings');list.replaceChildren(...state.buildings.map((def,index)=>{
    const li=document.createElement('li'),select=document.createElement('select'),turn=document.createElement('button');
    select.setAttribute('aria-label','Building '+(index+1));for(const d of DESIGNS){const o=new Option(d.name,d.id,false,d.id===def.id);select.add(o);}
    select.onchange=()=>{def.id=select.value;rebuild();};turn.textContent='Turn '+def.turn+'°';turn.setAttribute('aria-label','Turn building '+(index+1)+' a quarter, now '+def.turn+' degrees');
    turn.onclick=()=>{def.turn=(def.turn+90)%360;buildingList();rebuild();};li.append(select,turn);return li;}));
}
for(const[id,s]of Object.entries(SITES))$('preset').add(new Option(s.label,id));
for(const[id,t]of Object.entries(TERRAIN))$('terrain').add(new Option(t.label.split(':')[0]+' · z0 '+t.z0+' m',id,false,id===state.terrain));
{const ticks=$('dial-ticks');for(let a=0;a<360;a+=15){const r=a%90===0?40:a%45===0?44:47,l=document.createElementNS('http://www.w3.org/2000/svg','line'),t=a*Math.PI/180;l.setAttribute('x1',String(Math.sin(t)*r));l.setAttribute('y1',String(-Math.cos(t)*r));l.setAttribute('x2',String(Math.sin(t)*51));l.setAttribute('y2',String(-Math.cos(t)*51));l.setAttribute('class','dial-tick'+(a%45===0?' major':''));ticks.append(l);}}
$('preset').onchange=()=>{state.preset=$('preset').value;state.buildings=structuredClone(SITES[state.preset].buildings);buildingList();rebuild({frame:true});};
$('cell').onchange=()=>{state.cell=Number($('cell').value);rebuild();};
$('speed').oninput=()=>{state.speed=Number($('speed').value);$('speed-value').textContent=state.speed+' m/s';sendWind();showBlend();};
$('terrain').onchange=()=>{state.terrain=$('terrain').value;sendWind();showBlend();};
$('gust').oninput=()=>{state.gust=Number($('gust').value);$('gust-value').textContent=state.gust===0?'steady':state.gust===1?'surface layer':'× '+state.gust.toFixed(2);sendWind();showBlend();};
$('bake').onclick=startBake;$('bake-blend').onchange=makeSampler;$('smoke-mode').onchange=()=>setSmokeMode($('smoke-mode').value);
$('export-bake').onclick=()=>{if(!bakedSet)return;const text=JSON.stringify(encodeWindBearings(bakedSet)),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download='nautilus-wind-bearings-'+state.preset+'-'+bakedSet.bearings.length+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);say('Exported the '+bakedSet.bearings.length+'-bearing set ('+(text.length/1e6).toFixed(1)+' MB).');};
$('show-streaks').onchange=()=>{state.streaks=$('show-streaks').checked;streaks.visible=state.streaks;};
$('show-mean').onchange=()=>{state.mean=$('show-mean').checked;paintSlice();};
$('slice').onchange=()=>{state.slice=$('slice').value;layoutSlices();};
$('slice-height').oninput=()=>{state.sliceHeight=Number($('slice-height').value);$('slice-height-value').textContent=state.sliceHeight+' m';if(domain)slicePlane.position.y=Math.min(state.sliceHeight,domain.size[1]*domain.cell-domain.cell/2);paintSlice();};
$('show-smoke').onchange=()=>{state.smoke=$('show-smoke').checked;sourceMarkers.visible=state.smoke;};
$('run').onclick=()=>{state.running=!state.running;$('run').textContent=state.running?'Pause wind':'Resume wind';$('run').setAttribute('aria-pressed',String(state.running));worker.postMessage({type:'run',running:state.running});};
$('restart').onclick=()=>{worker.postMessage({type:'restart'});resetStreaks();say('The flow restarts from the bare inflow profile.');};
$('clear-smoke').onclick=()=>{clearSmoke();say('Smoke cleared. Click a roof or the ground to release more.');};
$('export').onclick=()=>worker.postMessage({type:'export'});
// Compass dial: drag or arrow keys set where the wind comes from.
const dial=$('dial');let dialDrag=false;
const dialAt=event=>{const r=dial.getBoundingClientRect(),x=event.clientX-r.left-r.width/2,y=event.clientY-r.top-r.height/2;setBearing(Math.atan2(x,-y)*180/Math.PI);};
dial.onpointerdown=event=>{dialDrag=true;dial.setPointerCapture(event.pointerId);dialAt(event);};dial.onpointermove=event=>{if(dialDrag)dialAt(event);};
dial.onpointerup=dial.onpointercancel=()=>{if(dialDrag){dialDrag=false;sendWind();}};
dial.onkeydown=event=>{const step=event.shiftKey?1:15;if(['ArrowRight','ArrowUp'].includes(event.key))setBearing(state.fromDeg+step);else if(['ArrowLeft','ArrowDown'].includes(event.key))setBearing(state.fromDeg-step);else return;event.preventDefault();sendWind();};

// ---------- camera input; a short click places smoke
const pointers=new Map();let press=null;const ray=new T.Raycaster(),ndc=new T.Vector2();
canvas.addEventListener('contextmenu',event=>event.preventDefault());
canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});press={x:event.clientX,y:event.clientY,t:performance.now(),button:event.button,moved:0};canvas.classList.add('dragging');});
canvas.addEventListener('pointermove',event=>{
  const prev=pointers.get(event.pointerId);if(!prev)return;const dx=event.clientX-prev.x,dy=event.clientY-prev.y;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(press)press.moved+=Math.abs(dx)+Math.abs(dy);
  if(pointers.size===2){const[a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(press.pinch)view.distance=Math.max(8,Math.min(300,view.distance*press.pinch/d));press.pinch=d;placeCamera();return;}
  if(press?.button===2||event.shiftKey){const a=view.azimuth*Math.PI/180,k=view.distance/600;view.target.x-=(dx*Math.cos(a)+dy*Math.sin(a))*k;view.target.z+=(dx*Math.sin(a)-dy*Math.cos(a))*k;}
  else{view.azimuth-=dx*.35;view.elevation=Math.max(4,Math.min(88,view.elevation+dy*.25));}
  placeCamera();
});
canvas.addEventListener('pointerup',event=>{
  pointers.delete(event.pointerId);canvas.classList.remove('dragging');
  if(press&&press.button===0&&press.moved<6&&performance.now()-press.t<500&&state.smoke){
    const r=canvas.getBoundingClientRect();ndc.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
    const hit=ray.intersectObjects([site,ground],true)[0];
    if(hit&&domain&&inside(hit.point.x,.5,hit.point.z)){const n=hit.face?hit.face.normal.clone().transformDirection(hit.object.matrixWorld):new T.Vector3(0,1,0);addSource(hit.point.clone().addScaledVector(n,.35).setY(Math.max(.4,hit.point.y+.25)));say('Smoke source '+sources.length+' placed '+hit.point.y.toFixed(1)+' m up.');}
  }
  press=null;
});
canvas.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);press=null;canvas.classList.remove('dragging');});
canvas.addEventListener('wheel',event=>{event.preventDefault();view.distance=Math.max(8,Math.min(300,view.distance*Math.exp(event.deltaY*.0012)));placeCamera();},{passive:false});
canvas.addEventListener('keydown',event=>{const map={ArrowLeft:[6,0],ArrowRight:[-6,0],ArrowUp:[0,4],ArrowDown:[0,-4]};if(map[event.key]){view.azimuth+=map[event.key][0];view.elevation=Math.max(4,Math.min(88,view.elevation+map[event.key][1]));placeCamera();event.preventDefault();}else if(event.key==='+'||event.key==='='){view.distance*=.9;placeCamera();}else if(event.key==='-'){view.distance/=.9;placeCamera();}});
new ResizeObserver(resize).observe(stage);

// ---------- start
buildingList();setBearing(state.fromDeg);updateLegend();$('run').textContent=state.running?'Pause wind':'Resume wind';$('run').setAttribute('aria-pressed',String(state.running));
resize();rebuild({frame:true});
if(!state.running)say('Motion is paused because the system asks for reduced motion. Press Resume wind to start.');
let previous=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-previous)/1000);previous=now;
  if(state.running){if(state.streaks)moveStreaks(dt);if(state.smoke)moveSmoke(dt);}
  if(state.streaks)drawStreaks();drawSmoke();
  renderer?.render(scene,camera);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.windFieldReview={get state(){return structuredClone(state);},get domain(){return domain&&{origin:[...domain.origin],cell:domain.cell,size:[...domain.size],cells:domain.cells};},
  get stats(){return stats&&{...stats};},get ready(){return Boolean(readyInfo&&field);},get puffs(){return plumes.live.smoke?.count??0;},get bakedPuffs(){return plumes.baked.smoke?.count??0;},get sources(){return sources.map(s=>s.toArray());},get errors(){return[...errors];},
  get bake(){return{baking:Boolean(bake),done:bake?bake.fields.size:bakedSet?.bearings.length??0,count:bake?.count??bakedSet?.bearings.length??0,seconds:bakedFor?.seconds??null,blend:sampler?structuredClone(sampler.field.blend):null,smokeMode:state.smokeMode};},
  sample(x,y,z){return sample(x,y,z,[0,0,0]);},sampleBaked(x,y,z){return sampler?sampler.sample(x,y,z,[0,0,0]):null;},setBearing(deg){setBearing(deg);sendWind();},startBake(count=8){$('bake-count').value=String(count);if(!bake)startBake();},setSmokeMode,
  // Moves streaks and smoke as the frame loop does, for review where animation frames do not run.
  advance(seconds=1,dt=1/30){for(let t=0;t<seconds;t+=dt){if(state.streaks)moveStreaks(dt);if(state.smoke)moveSmoke(dt);}resize();if(state.streaks)drawStreaks();drawSmoke();renderer?.render(scene,camera);return{puffs:plumes.live.smoke?.count??0,bakedPuffs:plumes.baked.smoke?.count??0};},
  // A smoke source at a world point, as a click would place it.
  addSmoke(x,y,z){addSource(new T.Vector3(x,y,z));return sources.length;},
  // Camera for review shots: azimuth and elevation in degrees, distance in metres.
  look({azimuth=view.azimuth,elevation=view.elevation,distance=view.distance}={}){Object.assign(view,{azimuth,elevation,distance});placeCamera();resize();renderer?.render(scene,camera);return{...view,target:view.target.toArray()};},
  // Centroid of each smoke system's puffs, metres.
  centroids(){return Object.fromEntries(Object.entries(plumes).map(([name,p])=>{const s=p.smoke,c=[0,0,0];if(!s?.count)return[name,null];for(let n=0;n<s.count;n++)for(let a=0;a<3;a++)c[a]+=s.positions[n*3+a]/s.count;return[name,c];}));}};
