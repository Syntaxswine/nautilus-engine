// Actual public geometry/finish modules and native Three objects, without a DOM
// or WebGL context. The tiny synthetic atlas is test-only; browser proof hashes
// and loads the actual reviewed PNG and makes the rendered acceptance claim.
import * as T from '../../../packages/render-effects/three.js';
import * as art from '../../../packages/tile-visuals/prepare.js';
import * as presenter from '../../../packages/tile-visuals/three.js';
import * as finishes from '../../../packages/tile-finishes/finishes.js';
import * as finishMetadata from '../../../packages/tile-finishes/catalogue.js';
import * as stackCore from '../../../packages/tile-stack-core/index.js';
import {actual,documentFixture} from './b1.mjs';
import {createFloorNavigation} from '../../../packages/floor-navigation/index.js';
import {createTileStackCheckpointCodec,createTileStackStorage} from '../../../apps/editor/tile-stack/checkpoint.js';
import {createTileStackSession} from '../../../apps/editor/tile-stack/session.js';
import {createTileStackPresentation} from '../../../apps/editor/tile-stack/presentation.js';
export {T,art,presenter,finishes,finishMetadata,actual};
export function nativeDocument(profile='aft-native-fifteen'){
 const d=documentFixture(profile),recipe=structuredClone(d.tileBundle.recipes[0]);recipe.interior.skinId='skin.brick-pavers';d.id='b2-native-'+profile;d.finishBinding=finishMetadata.tileFinishBinding();const catalogue=actual.tiles.createTileCatalogue([recipe]);d.tileBundle=actual.tiles.tileBundle({...d.tileBundle.layout,id:d.id+'.layout',catalogueDigest:catalogue.digest},catalogue);return d;
}
export async function nativeHarness({document=nativeDocument(),onRetire=()=>{},nativeFactory=presenter.createTileArtProvider,baseMaterial=null}={}){
 const atlas=new T.Texture({width:4,height:4});atlas.colorSpace=T.SRGBColorSpace;const base=baseMaterial??new T.MeshStandardMaterial({roughness:.95}),scene=new T.Scene(),counts={prepare:0,apply:0},disposals={atlas:0,base:0},released={atlas:false,base:false},views=[],order=[];atlas.addEventListener('dispose',()=>disposals.atlas++);base.addEventListener('dispose',()=>disposals.base++);
 const lease=(key,value,proof)=>({value,proof,release(){released[key]=true;},diagnostics:()=>({released:released[key]})});
 const presentation=createTileStackPresentation({tiles:actual.tiles,art,presenter:{createTileArtProvider(...args){const v=nativeFactory(...args);views.push(v);return v;}},finishes,finishMetadata,THREE:T,scene,floors:document.floorBinding.floors,sectorSizeM:24,atlasLease:lease('atlas',atlas,finishMetadata.TILE_FINISH_ATLAS),baseLease:lease('base',base)});
 const measured={...actual.tiles,createRetainedTileConsumer(host){const c=actual.tiles.createRetainedTileConsumer(host);return {...c,prepare(...args){counts.prepare++;return c.prepare(...args);},apply(...args){counts.apply++;return c.apply(...args);}};}},deps={...actual,tiles:measured,stack:stackCore},binding=createTileStackCheckpointCodec(deps,document),values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};let hook=()=>{},session,id=0;
 const authority=createTileStackStorage(deps,{binding,storage,initialCheckpoint:binding.codec.create(document),beforeWrite(p){hook(p,'before');},afterWrite(p){hook(p,'after');}}),floors=createFloorNavigation({floors:binding.domain.floorRecords,selectedId:'F00',cancelPreview(){session?.cancel('before-native-floor');},onFloorChange({to}){presentation.setFloor(to.id);}});
 session=await createTileStackSession(deps,{binding,finishCatalogue:{...document.finishBinding,entries:finishMetadata.tileFinishCatalogue().families.map(f=>({id:f.id,version:f.version,label:f.label,available:true,reason:null}))},authority,floorController:floors,presentation,providerToken:'actual-public-native-geometry-and-finishes',newId:()=>String(++id),retireInput:reason=>{order.push(reason);onRetire(reason);}});
 return {session,presentation,views,scene,base,atlas,counts,disposals,released,document,floors,binding,order,set hook(v){hook=v;},dispose(){session.dispose();presentation.dispose();floors.dispose();base.dispose();atlas.dispose();}};
}
export const nativeStack=(document,extra={})=>({tool:'stack',ownerId:null,origin:[20,20],widthM:8,depthM:4,seed:771,floorIds:document.floorBinding.floors.map(f=>f.id),minimumClearanceM:2,lockPolicy:'all-except-highest',finishId:'skin.brick-pavers',...extra});
