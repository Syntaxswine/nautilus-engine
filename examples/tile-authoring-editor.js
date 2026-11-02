import * as T from '@nautilus-engine/renderer/render-effects/three';
import * as mapCore from '@nautilus-engine/core';
import * as tiles from '@nautilus-engine/core/tiles';
import * as authoring from '@nautilus-engine/core/tiles/authoring';
import * as art from '@nautilus-engine/core/tiles/art';
import * as examples from '@nautilus-engine/core/tiles/art/example';
import * as finishMetadata from '@nautilus-engine/core/tiles/finishes';
import * as finishes from '@nautilus-engine/renderer/tiles/finishes/three';
import * as presenter from '@nautilus-engine/renderer/tiles/art/three';
import {createFloorNavigation} from '@nautilus-engine/core/floors';
import {mountFloorNavigation} from '../packages/floor-navigation/dom.js';
import {createTileAuthoringWorkspace} from '../apps/editor/tile-authoring/seed.js';
import {createTileAuthoringCheckpointCodec,createTileAuthoringStorage} from '../apps/editor/tile-authoring/checkpoint.js';
import {createTileAuthoringSession} from '../apps/editor/tile-authoring/session.js';
import {createTileAuthoringHostService,createTileAuthoringWorkbenchBinding} from '../apps/editor/tile-authoring/host-service.js';
import {createTileAuthoringPresentation,createTileAuthoringResourcePorts} from '../apps/editor/tile-authoring/presentation.js';
import {createTileAuthoringJSONL} from '../apps/editor/tile-authoring/jsonl.js';
import {mountTileAuthoringUI} from '../apps/editor/tile-authoring/ui/panel.js';
import {rectangleSpecFromFields} from '../apps/editor/tile-authoring/ui/commands.js';
import {bindSmartTileInput} from '../apps/editor/smart-tile/input.js';
import {smartTileDigest} from '../apps/editor/smart-tile/checkpoint.js';

const $=id=>document.getElementById(id),stage=$('stage'),events=new AbortController(),scene=new T.Scene(),camera=new T.PerspectiveCamera(43,1,.1,1000),renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
scene.background=new T.Color('#b5c3ae');scene.add(new T.HemisphereLight(0xfff9e8,0x486044,2.1));const sun=new T.DirectionalLight(0xffefce,2.4);sun.position.set(-15,35,10);scene.add(sun);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setPixelRatio(1);stage.append(renderer.domElement);
const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Custom tile map canvas');
let disposed=false,session=null,input=null,panel=null,floorView=null,yaw=.35,pitch=.92,distance=49,fault=null;
const target=new T.Vector3(46,0,3),raycaster=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),owned=[],disposals=new Map(),leases=new Map(),counts={prepare:0,apply:0},writes=[];
const own=value=>{owned.push(value);disposals.set(value,0);value.addEventListener('dispose',()=>disposals.set(value,disposals.get(value)+1));return value;};
const library=finishMetadata.tileFinishCatalogue(),response=await fetch($('tile-authoring-atlas').href);if(!response.ok)throw Error('The reviewed finish atlas could not be loaded.');
const atlasBytes=await response.arrayBuffer(),atlasHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',atlasBytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
if(atlasBytes.byteLength!==library.atlas.bytes||atlasHash!==library.atlas.sha256)throw Error('Finish atlas bytes do not match the fixed library.');
const blobURL=URL.createObjectURL(new Blob([atlasBytes],{type:'image/png'}));let atlas;try{atlas=own(await new T.TextureLoader().loadAsync(blobURL));}finally{URL.revokeObjectURL(blobURL);}atlas.colorSpace=T.SRGBColorSpace;
const base=own(new T.MeshStandardMaterial({color:0xffffff,roughness:.95}));
function lease(value,proof){let released=false;leases.set(value,(leases.get(value)??0)+1);return Object.freeze({value,proof,release(){if(!released){released=true;leases.set(value,leases.get(value)-1);}},diagnostics:()=>({released})});}
const source=mapCore.blankMap('Original map for custom tile authoring');source.metadata={original:{hp:37,ap:0,unknown:['preserved',7]}};
const profileId=new URL(location.href).searchParams.get('profile')??'aft-native-fifteen';
const measuredTiles={...tiles,createRetainedTileConsumer(host){const actual=tiles.createRetainedTileConsumer(host);return {...actual,prepare(...args){counts.prepare++;return actual.prepare(...args);},apply(...args){counts.apply++;return actual.apply(...args);}};}},deps={mapCore,tiles:measuredTiles,authoring,examples};
const template=examples.surfaceRecipe('custom-default-template',8,4,{segments:16});template.interior.skinId=library.families[0].id;
const workspace=createTileAuthoringWorkspace(deps,{workspaceId:'custom-tiles-'+profileId,sourceJSON:JSON.stringify(source),profileId,finishBinding:finishMetadata.tileFinishBinding(),templateRecipe:template}),binding=createTileAuthoringCheckpointCodec(deps,workspace);
const authority=createTileAuthoringStorage(deps,{binding,storage:localStorage,initialCheckpoint:binding.codec.create(workspace),beforeWrite(packet){writes.push({phase:packet.phase,requestId:packet.requestId});if(writes.length>512)writes.shift();if(packet.phase==='commit'&&fault==='before'){fault=null;throw Error('Injected pre-write uncertainty');}},afterWrite(packet){if(packet.phase==='commit'&&fault==='after'){fault=null;throw Error('Injected lost acknowledgement');}if(packet.phase==='commit'&&fault==='cancel-after'){fault=null;session.cancel('Injected post-write cancellation');}}});
const checkpoint=authority.read(),finishCatalogue={...checkpoint.document.finishBinding,entries:library.families.map(f=>({id:f.id,version:f.version,label:f.label,available:true,reason:null}))};
const atlasLease=lease(atlas,{id:library.atlas.id,path:library.atlas.path,sha256:atlasHash,bytes:atlasBytes.byteLength}),baseLease=lease(base);
const presentation=createTileAuthoringPresentation({tiles,art,presenter,finishes,finishMetadata,THREE:T,scene,floors:checkpoint.document.floorBinding.floors,sectorSizeM:mapCore.MAP_CONTRACT.blockSize,atlasLease,baseLease});
const resourcePorts=createTileAuthoringResourcePorts({presentation,atlasLease,baseLease,readSessionResources:()=>session.getSnapshot().resources,availableProfiles:['public-v1-source-validation','owner-local-level-top-v1']});
const ground=new T.Mesh(own(new T.PlaneGeometry(96,96)),own(new T.MeshStandardMaterial({color:'#89977f',roughness:1})));ground.rotation.x=-Math.PI/2;ground.position.set(46,-.015,3);scene.add(ground);
const grid=new T.GridHelper(96,96,'#526b55','#91a28c');owned.push(grid.geometry);disposals.set(grid.geometry,0);grid.geometry.addEventListener('dispose',()=>disposals.set(grid.geometry,disposals.get(grid.geometry)+1));for(const material of Array.isArray(grid.material)?grid.material:[grid.material])own(material);scene.add(grid);
function planeTo(floor){plane.constant=-floor.elevationM;ground.position.y=floor.elevationM-.015;grid.position.set(46,floor.elevationM-.01,3);target.y=floor.elevationM;presentation.setFloor(floor.id);render();}
const floors=createFloorNavigation({floors:binding.domain.floorRecords,selectedId:'F00',cancelPreview(){input?.cancel('before-floor-change');session?.cancel('before-floor-change');},onFloorChange({to}){planeTo(to);}});presentation.setFloor(floors.state.selectedId);
session=await createTileAuthoringSession(deps,{binding,finishCatalogue,resourcePorts,authority,floorController:floors,presentation,providerToken:'actual-public-custom-rectangle-provider-v1',retireInput:reason=>input?.retire(reason)});
const service=createTileAuthoringHostService({session,authoring,isAuthorized:()=>!disposed}),jsonl=createTileAuthoringJSONL(service,{isAuthorized:()=>!disposed});
function ids(){const n=crypto.randomUUID();return {requestId:'c1.req.'+n,opId:'c1.op.'+n,definitionId:'c1.definition.'+n,recipeId:'c1.recipe.'+n,presetId:'c1.preset.'+n,ownerIds:['c1.owner.one.'+n,'c1.owner.two.'+n],chunkIds:['c1.chunk.one.'+n,'c1.chunk.two.'+n],sourceIds:{prefix:'c1.source.'+n,surfaceId:'c1.surface.'+n,gridId:'c1.grid.'+n}};}
const rectangleSpec=(fields,context)=>rectangleSpecFromFields(fields,{...context,finishId:library.families[0].id});
const workbench=createTileAuthoringWorkbenchBinding({service,session,borrowedFloorController:floors,borrowedInputOwner:{retire:reason=>input?.retire(reason)},borrowedResourcePorts:resourcePorts,allocateIds:ids});
const error=e=>{$('stage-status').textContent=e.message;};floorView=mountFloorNavigation($('floor-controls'),floors,{showModes:false,label:'Drawing floor',onError:error});panel=mountTileAuthoringUI($('authoring-tools'),workbench,{tiles,authoring,rectangleSpec,onError:error});
function screenToWorld(event){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);const point=raycaster.ray.intersectPlane(plane,new T.Vector3());return point?[point.x,point.z]:null;}
input=bindSmartTileInput({canvas,session,screenToWorld,hitOwner:()=>presentation.hitOwner(raycaster),selectionMode:()=>true,readDraft:()=>null,onCamera({dx,dy}){yaw-=dx*.008;pitch=Math.max(.2,Math.min(1.5,pitch+dy*.006));render();}});
for(const floor of checkpoint.document.floorBinding.floors){const option=document.createElement('option');option.value=floor.id;option.textContent=floor.label+' · '+floor.elevationM+' m';$('cutaway-floor').append(option);}
function inspect(){const mode=$('view-mode').value;session.setInspection({mode,cutawayFloorId:mode==='cutaway'?$('cutaway-floor').value:null});}
$('view-mode').addEventListener('change',inspect,{signal:events.signal});$('cutaway-floor').addEventListener('change',inspect,{signal:events.signal});
const unsubscribe=session.subscribe(state=>{$('stage-status').textContent=state.owners.length+' placed tiles · drawing floor '+state.floor.label+' · '+(state.readiness.visual.state==='failed'?'View needs retry':state.readiness.visual.state==='candidate'?'Review preview':state.phase==='recovery-required'?'Recover the original request':'Ready');$('view-mode').disabled=!state.actions.setInspection;$('cutaway-floor').disabled=!state.actions.setInspection;$('cutaway-label').hidden=state.inspection.mode!=='cutaway';$('view-mode').value=state.inspection.mode;if(state.inspection.cutawayFloorId)$('cutaway-floor').value=state.inspection.cutawayFloorId;render();});
$('fit').addEventListener('click',()=>{const box=presentation.bounds();if(!box.isEmpty()){box.getCenter(target);const size=box.getSize(new T.Vector3());distance=Math.max(size.x/(stage.clientWidth/stage.clientHeight),size.z,size.y,5)*1.9;}render();},{signal:events.signal});
function render(){if(disposed)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);}
canvas.addEventListener('wheel',event=>{if(event.ctrlKey||event.defaultPrevented)return;event.preventDefault();distance=Math.max(8,Math.min(350,distance*(event.deltaY>0?1.09:1/1.09)));render();},{passive:false,signal:events.signal});const resize=new ResizeObserver(render);resize.observe(stage);render();
function proofSnapshot(){const retained=authority.read();return {version:3,state:session.getSnapshot(),view:workbench.getSnapshot(),checkpointJSON:JSON.stringify(retained),checkpointDigest:smartTileDigest(retained),native:presentation.snapshot(),input:input.snapshot(),counts:structuredClone(counts),writes:structuredClone(writes),atlas:{...library.atlas,verifiedSha256:atlasHash,verifiedBytes:atlasBytes.byteLength,width:atlas.image.width,height:atlas.image.height},drawCalls:renderer.info.render.calls,rendererMemory:{...renderer.info.memory},hostLeases:[...leases.values()],hostPool:[...disposals.values()],disposed};}
function dispose(){if(disposed)return;disposed=true;const failures=[],attempt=fn=>{try{fn();}catch{failures.push('HOST_CLEANUP_CALLBACK');}};for(const fn of [()=>events.abort(),()=>resize.disconnect(),()=>input.dispose(),()=>panel.dispose(),()=>floorView.dispose(),unsubscribe,()=>session.dispose(),()=>presentation.dispose(),()=>floors.dispose(),()=>ground.removeFromParent(),()=>grid.removeFromParent()])attempt(fn);if([...leases.values()].every(n=>n===0))for(const value of owned)attempt(()=>value.dispose());else failures.push('BORROWED_LEASES_STILL_CHARGED');attempt(()=>renderer.dispose());attempt(()=>canvas.remove());return failures;}
window.tileAuthoringEditorProof=Object.freeze({ready:true,service,jsonl,workbench,proofSnapshot,acceptedRootIdentity:()=>scene.children.find(node=>node.userData.smartTileRole==='accepted')?.uuid??null,cleanupSnapshot:()=>({disposed,native:presentation.snapshot(),resources:session.getSnapshot().resources,hostLeases:[...leases.values()],hostPool:[...disposals.values()],rendererMemory:{...renderer.info.memory}}),syntheticFault(mode){if(!['before','after','cancel-after'].includes(mode))throw Error('Unknown injected fault.');fault=mode;},dispose});window.addEventListener('pagehide',dispose,{once:true,signal:events.signal});
