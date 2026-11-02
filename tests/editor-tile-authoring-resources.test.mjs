// Actual native allocation owner/manager unit proof. No authoring Core shim,
// command integration, DOM, WebGL, PNG decode or installed-package claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mapCore from '../packages/map-core/index.js';
import * as tiles from '../packages/tiles-core/index.js';
import * as examples from '../packages/tile-visuals/example.js';
import * as T from '../packages/render-effects/three.js';
import * as art from '../packages/tile-visuals/prepare.js';
import * as presenter from '../packages/tile-visuals/three.js';
import * as finishes from '../packages/tile-finishes/finishes.js';
import * as finishMetadata from '../packages/tile-finishes/catalogue.js';
import {createTileAuthoringWorkspace} from '../apps/editor/tile-authoring/seed.js';
import {createTileAuthoringPresentation,createTileAuthoringResourcePorts} from '../apps/editor/tile-authoring/presentation.js';
import {createSmartTileViews} from '../apps/editor/smart-tile/views.js';

async function native(){
  const deps={mapCore,tiles,examples},template=examples.surfaceRecipe('lease.template',8,4,{segments:16});template.interior.skinId='skin.brick-pavers';
  const document=createTileAuthoringWorkspace(deps,{workspaceId:'lease-unit',sourceJSON:JSON.stringify(mapCore.blankMap('Native lease unit')),finishBinding:finishMetadata.tileFinishBinding(),templateRecipe:template});
  const atlas=new T.Texture({width:4,height:4});atlas.colorSpace=T.SRGBColorSpace;const base=new T.MeshStandardMaterial(),released={atlas:false,base:false};
  const lease=(name,value,proof)=>({value,proof,release(){released[name]=true;},diagnostics:()=>({released:released[name]})});
  const atlasLease=lease('atlas',atlas,finishMetadata.TILE_FINISH_ATLAS),baseLease=lease('base',base),presentation=createTileAuthoringPresentation({tiles,art,presenter,finishes,finishMetadata,THREE:T,scene:new T.Scene(),floors:document.floorBinding.floors,sectorSizeM:24,atlasLease,baseLease});
  const manager=createSmartTileViews(presentation),initial=await manager.acquire(document.tileBundle,()=>true);assert.equal(initial.ok,true);assert.equal(manager.promote(initial.record),true);
  const resources=createTileAuthoringResourcePorts({presentation,atlasLease,baseLease,readSessionResources:()=>manager.snapshot(),availableProfiles:['public-v1-source-validation','owner-local-level-top-v1']});
  const recipe=examples.surfaceRecipe('lease.new',8,4,{segments:16});recipe.interior.skinId='skin.brick-pavers';
  const source=document.tileBundle.layout,contextToken='a'.repeat(64),request={version:1,id:'lease.prepare',expected:{revision:source.revision,layoutDigest:tiles.tileLayoutToken(source),catalogueDigest:source.catalogueDigest,contextToken},selection:source.selection,replaceIds:[],removeIds:[],slots:[{id:'lease.owner',origin:[20,20,0],floorBindings:{base:'F00'},alternatives:[{recipeId:recipe.id,transform:{quarterTurns:0,mirrorX:false}}],locked:false,anchorIds:recipe.anchors.map(a=>a.id)}],joins:[],relations:[],recipeUpdates:[recipe],maxSteps:256,maxClosure:32,maxSpatialTests:100000,maxGeometryWork:100000,neighbourRadiusM:0};
  const prepared=tiles.prepareTileEdit(document.tileBundle,request,{contextToken});assert.equal(prepared.ok,true,JSON.stringify(prepared));
  return {document,manager,presentation,resources,atlasLease,baseLease,target:prepared.next.bundle,dispose(){manager.dispose();presentation.dispose();if(released.atlas)atlas.dispose();if(released.base)base.dispose();}};
}

test('C1 admits exactly the actual native owned candidate without restamping captured ledger/Expected data',async t=>{
  const h=await native();t.after(()=>h.dispose());const lease=h.resources.capture(h.document),data=structuredClone(lease.data),accepted=h.manager.accepted;
  assert.equal(lease.isCurrent({sourceUnchanged:true}),true);const candidate=await h.manager.acquire(h.target,()=>true);assert.equal(candidate.ok,true);
  assert.equal(lease.isCurrent(),false);lease.admit({record:candidate.record,acceptedView:accepted,targetBundle:h.target});assert.equal(lease.isCurrent(),true);assert.equal(lease.isCurrent({sourceUnchanged:true}),false);assert.deepEqual(lease.data,data);
  assert.throws(()=>lease.admit({record:candidate.record,acceptedView:accepted,targetBundle:h.target}));
  h.manager.cancel();assert.equal(lease.isCurrent(),false);assert.equal(h.manager.accepted,accepted);
});

test('C1 rejects foreign actual allocations and wrong target bundles before admission and after admission',async t=>{
  const h=await native();t.after(()=>h.dispose());const lease=h.resources.capture(h.document),accepted=h.manager.accepted,candidate=await h.manager.acquire(h.target,()=>true);assert.equal(candidate.ok,true);
  assert.throws(()=>lease.admit({record:candidate.record,acceptedView:accepted,targetBundle:h.document.tileBundle}));
  lease.admit({record:candidate.record,acceptedView:accepted,targetBundle:h.target});assert.equal(lease.isCurrent(),true);
  const foreign=await h.presentation.acquire(h.target,{maxTriangles:50000,maxCells:1024,current:()=>true});t.after(()=>foreign.dispose());assert.equal(lease.isCurrent(),false);
  assert.throws(()=>h.resources.capture(h.document));foreign.dispose();assert.equal(lease.isCurrent(),false);
});

test('C1 foreign native allocation/release ABA cannot be admitted as the legitimate candidate transition',async t=>{
  const h=await native();t.after(()=>h.dispose());const lease=h.resources.capture(h.document),accepted=h.manager.accepted;
  const foreign=await h.presentation.acquire(h.target,{maxTriangles:50000,maxCells:1024,current:()=>true});foreign.dispose();
  const candidate=await h.manager.acquire(h.target,()=>true);assert.equal(candidate.ok,true);assert.throws(()=>lease.admit({record:candidate.record,acceptedView:accepted,targetBundle:h.target}),error=>error.code==='FOREIGN_ALLOCATION_TRANSITION');
  assert.equal(lease.isCurrent(),false);
});

test('C1 metadata resource lease checks detect borrowed object substitution and changed material appearance',async t=>{
  const h=await native();t.after(()=>h.dispose());const lease=h.resources.capture(h.document),base=h.baseLease.value;
  base.color.set('#ff0000');assert.equal(lease.isCurrent({sourceUnchanged:true}),false);base.color.set('#ffffff');assert.equal(lease.isCurrent({sourceUnchanged:true}),true);
  h.baseLease.value=new T.MeshStandardMaterial();assert.equal(lease.isCurrent({sourceUnchanged:true}),false);assert.deepEqual(h.resources.missingBindings(h.document),['NATIVE_PRESENTATION_LEASE_REQUIRED']);h.baseLease.value.dispose();h.baseLease.value=base;
});
