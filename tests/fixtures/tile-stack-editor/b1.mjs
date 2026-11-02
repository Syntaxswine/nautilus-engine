// Actual public headless core + accepted private planner; RESOURCE-ONLY view
// stand-in, not a native provider, rendered-floor, browser or performance proof.
import * as mapCore from '../../../packages/map-core/index.js';
import * as tiles from '../../../packages/tiles-core/index.js';
import * as examples from '../../../packages/tile-visuals/example.js';
import {createFloorNavigation} from '../../../packages/floor-navigation/index.js';
import {smartTileDigest} from '../../../apps/editor/smart-tile/checkpoint.js';
import {createTileStackCheckpointCodec,createTileStackStorage} from '../../../apps/editor/tile-stack/checkpoint.js';
import {createTileStackSession} from '../../../apps/editor/tile-stack/session.js';
import {createTileStackWorkspace} from '../../../apps/editor/tile-stack/seed.js';
export const actual={mapCore,tiles,examples};
export function documentFixture(profileId='aft-native-fifteen'){
  const source=mapCore.blankMap('B1 complete original source');source.metadata={original:{hp:37,ap:0,clock:.125,unknown:['preserve',7]}};
  const ids=['skin.painterly','skin.slate','skin.sandstone'],finishBinding={id:'b1-headless-compatibility-fixture',version:1,digest:smartTileDigest({fixture:true,ids})};
  return createTileStackWorkspace(actual,{workspaceId:'b1-workspace',sourceJSON:JSON.stringify(source,null,1),profileId,finishBinding});
}
export function catalogueFor(document){return {...document.finishBinding,entries:[['skin.painterly','Painterly'],['skin.slate','Slate'],['skin.sandstone','Sandstone']].map(([id,label])=>({id,version:1,label,available:true,reason:null}))};}
export async function harness({document=documentFixture(),raw=null,storageValues=null}={}){
  const counts={prepare:0,apply:0},writes=[],views=[],values=storageValues??new Map();let ordinal=100,hook=()=>{},acquireHook=null,session;
  // Instrument the real retained consumer without replacing its preparation,
  // application, private capability checks or core namespace methods.
  const measuredTiles={...tiles,createRetainedTileConsumer(host){const consumer=tiles.createRetainedTileConsumer(host);return {...consumer,prepare(...args){counts.prepare++;return consumer.prepare(...args);},apply(...args){counts.apply++;return consumer.apply(...args);}};}};
  const deps={mapCore,tiles:measuredTiles,examples},binding=createTileStackCheckpointCodec(deps,document),initialCheckpoint=binding.codec.create(document),key='nautilus-smart-tile-editor-stack-v2:'+document.id;
  if(raw!==null)values.set(key,raw);
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const authority=createTileStackStorage(deps,{binding,storage,initialCheckpoint,beforeWrite(packet){writes.push({phase:packet.phase,requestId:packet.requestId});hook(packet,'before');},afterWrite(packet){hook(packet,'after');}});
  const floors=createFloorNavigation({floors:binding.domain.floorRecords,selectedId:'F00',cancelPreview(){session?.cancel('before-plane');}});
  const presentation={async acquire(bundle,budget){if(acquireHook)await acquireHook(bundle,budget);let disposed=false;
    // Every fixture placement is an 8x4 rectangle. These charged allowances are
    // test stand-in counts, not measured native mesh/cell/render allocations.
    const cells=bundle.layout.instances.length*32,view={root:{visible:true},cellCount:cells,diagnostics:()=>({disposed,ownedGeometry:disposed?0:1,triangles:disposed?0:bundle.layout.instances.length*2}),dispose(){disposed=true;}};views.push(view);return view;},attach(){}};
  session=await createTileStackSession(deps,{binding,finishCatalogue:catalogueFor(document),authority,floorController:floors,presentation,newId:()=>String(++ordinal),providerToken:'b1-resource-only-stand-in-no-native-provider'});
  return {session,floors,binding,authority,document,counts,writes,views,values,key,get raw(){return values.get(key);},set raw(v){values.set(key,v);},set hook(v){hook=v;},set acquireHook(v){acquireHook=v;}};
}
export const stack=(document,extra={})=>({tool:'stack',ownerId:null,origin:[20,20],widthM:8,depthM:4,seed:771,floorIds:document.floorBinding.floors.map(f=>f.id),minimumClearanceM:2,lockPolicy:'all-except-highest',finishId:'skin.painterly',...extra});
export const saved=h=>JSON.parse(h.session.save().checkpointJSON);
export async function review(h,draft=stack(h.document)){
  const set=h.session.setDraft(draft);if(!set.ok)throw Error(JSON.stringify(set));return h.session.review();
}
export async function apply(h,draft=stack(h.document)){
  const r=await review(h,draft);if(!r.ok)throw Error(JSON.stringify(r));const result=await h.session.apply(r.reviewId);if(result.committed!==true)throw Error(JSON.stringify(result));return r;
}
