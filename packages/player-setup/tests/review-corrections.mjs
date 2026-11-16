import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {withArtReview} from '../../../tools/art-review-browser.mjs';
import {root,inventory,record} from './inventory.mjs';
import {reviewContent} from './review-fixtures.mjs';
const baseline='7a019ed555f6b263dc675e9e43349a1d15bf99fb',inputs=inventory(),installed=JSON.parse(fs.readFileSync(path.join(root,'artifacts/player-setup-installed-overlay/latest.json'))),groups=[],scopes=[];
for(const r of installed.selectedFiles)assert.deepEqual(record(r.path),r,'Installed correction bytes differ: '+r.path);
await withArtReview('Stage 2 corrections: malformed recipes, retired authority and real door bounds',async({page,baseURL,out,browser})=>{
  await page.route(baseURL+'/setup-corrections',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body,#game{margin:0;width:100%;height:100%;overflow:hidden}#game{position:relative}</style><div id="game"></div>'}));
  await page.goto(baseURL+'/setup-corrections');
  for(const [label,moduleRoot]of [['source','/packages/player-setup'],['installed',installed.installedURL+'/packages/player-setup']]){
    const invalid=await page.evaluate(async moduleRoot=>{
      const api=await import(moduleRoot+'/browser.js'),content=api.flatYardContent({sourcePin:'290926270b04c739e78efb427f330db9483ec847'}),setup=await api.mountPlayerSetup(document.querySelector('#game'),{content,configuration:api.createSetupConfiguration({content:content.identity}),autoClock:false,onError:e=>console.error(e.message)});
      window.correctionSetup=setup;setup.ui.openMenu();const before=setup.checkpoint(),bad=setup.readConfiguration();bad.components=[null];const validation=setup.validate(bad),applied=await setup.applyConfiguration(bad);return {before,after:setup.checkpoint(),bad,validation,applied};
    },moduleRoot);
    assert.equal(invalid.validation.ok,false);assert.ok(invalid.validation.errors.some(e=>e.code==='INVALID_COMPONENT'&&e.path==='/components/0'));assert.equal(invalid.applied.code,'SETUP_NOT_READY');assert.equal(invalid.applied.committed,false);assert.deepEqual(invalid.after,invalid.before);
    await page.getByText('Save or load recipe',{exact:true}).click();await page.locator('textarea').fill(JSON.stringify(invalid.bad));await page.getByRole('button',{name:'Load recipe into menu',exact:true}).click();
    assert.match(await page.locator('.pui-setup [role=status]').textContent(),/Recipe not loaded/);assert.equal(await page.locator('.pui-setup').evaluate(e=>e.open),true);assert.deepEqual(await page.evaluate(()=>window.correctionSetup.checkpoint()),invalid.before);
    await page.evaluate(()=>window.correctionSetup.dispose());groups.push(label+': malformed imported components return diagnostics through validate/apply/generated menu and preserve accepted state');

    const result=await page.evaluate(async({content,moduleRoot,label})=>{
      const {createDefaultWorld}=await import(moduleRoot+'/index.js'),{createDefaultSurface}=await import(moduleRoot+'/surface.js'),T=await import(moduleRoot.replace(/player-setup$/,'render-effects')+'/three.js');
      const retired=createDefaultWorld(content,{actorId:'player'}),offer=retired.actions.read(),before=retired.checkpoint();retired.dispose();const refused=retired.actions.request('yard-gate',offer.context);let advanceCode;try{retired.advance(.05);}catch(e){advanceCode=e.code;}const after=retired.checkpoint();
      const samples=[],cleanups=[],captures={};let savedOpen,savedNull;
      function exercise(name,c,{checkpoint,transition=false}={}){
        const world=createDefaultWorld(c,{actorId:'player',...(checkpoint?{checkpoint}:{})}),surface=createDefaultSurface({document,world,content:c});document.querySelector('#game').append(surface.element);surface.resize();surface.camera.position.set(8,7,10);surface.camera.lookAt(4,1,5);surface.camera.updateProjectionMatrix();
        const leaf=surface.scene.children.filter(n=>n.isMesh).at(-1),geometry=leaf.geometry,geometries=new Map(),materials=new Map();
        surface.scene.traverse(n=>{if(n.geometry)geometries.set(n.geometry,0);if(n.material)materials.set(n.material,0);});for(const g of geometries.keys())g.addEventListener('dispose',()=>geometries.set(g,geometries.get(g)+1));for(const m of materials.keys())m.addEventListener('dispose',()=>materials.set(m,materials.get(m)+1));let rendererDisposals=0;const closeRenderer=surface.renderer.dispose.bind(surface.renderer);surface.renderer.dispose=()=>{rendererDisposals++;closeRenderer();};
        function sample(state){surface.scene.updateMatrixWorld(true);const door=world.read().interactions.doors[0],expected=door.open?door.openBounds:door.closedBounds,b=new T.Box3().setFromObject(leaf);samples.push({name,state,visible:leaf.visible,expected,actual:leaf.visible?{min:{x:b.min.x,y:b.min.z,h:b.min.y},max:{x:b.max.x,y:b.max.z,h:b.max.y}}:null,sameGeometry:leaf.geometry===geometry});}
        try{sample('initial-before-draw');surface.draw();if(transition){for(const state of ['open','closed']){const offer=world.actions.read(),r=world.actions.request('yard-gate',offer.context);if(!r.committed)throw Error('Door test request refused: '+r.reason);surface.draw();sample(state);if(state==='open')savedOpen=world.checkpoint();if(label==='source')captures[state]=surface.canvas.toDataURL('image/png');}}
          if(c.interactions.doors[0].openBounds===null)savedNull=world.checkpoint();
        }finally{surface.dispose();surface.dispose();cleanups.push({name,geometries:[...geometries.values()],materials:[...materials.values()],rendererDisposals,removed:!surface.element.isConnected,worldStillReadable:!!world.read().actor});world.dispose();}
      }
      exercise('closed-open-closed',content,{transition:true});
      const initiallyOpen=structuredClone(content);initiallyOpen.interactions.doors[0].open=true;exercise('initially-open',initiallyOpen);
      exercise('restored-open',content,{checkpoint:savedOpen});
      const noOpenLeaf=structuredClone(content);noOpenLeaf.interactions.doors[0].open=true;noOpenLeaf.interactions.doors[0].openBounds=null;exercise('initially-null-open-bounds',noOpenLeaf);exercise('restored-null-open-bounds',noOpenLeaf,{checkpoint:savedNull});
      return {retired:{offer,before,after,refused,advanceCode},samples,cleanups,captures};
    },{content:reviewContent(),moduleRoot,label});
    assert.equal(result.retired.offer.actions.find(a=>a.id==='yard-gate').enabled,true);assert.equal(result.retired.refused.committed,false);assert.equal(result.retired.refused.code,'WORLD_RETIRED');assert.equal(result.retired.advanceCode,'WORLD_RETIRED');assert.deepEqual(result.retired.after,result.retired.before);groups.push(label+': stale door offers and advancement cannot mutate retired world');
    for(const sample of result.samples){assert.equal(sample.sameGeometry,true);assert.equal(sample.visible,!!sample.expected,sample.name);if(sample.expected)for(const end of ['min','max'])for(const axis of ['x','y','h'])assert.ok(Math.abs(sample.actual[end][axis]-sample.expected[end][axis])<1e-6,JSON.stringify(sample));}
    groups.push(label+': real Three Box3 matches confirmed closed/open/close-again and initially/restored-open bounds; null open bounds hide the leaf');
    for(const c of result.cleanups){assert.ok(c.geometries.every(n=>n===1),JSON.stringify(c));assert.ok(c.materials.every(n=>n===1));assert.equal(c.rendererDisposals,1);assert.equal(c.removed,true);assert.equal(c.worldStillReadable,true);}groups.push(label+': door geometry is reused and each owned geometry/material/renderer retires once');for(const [name,data]of Object.entries(result.captures))fs.writeFileSync(path.join(out,'door-'+name+'.png'),Buffer.from(data.split(',')[1],'base64'));delete result.captures;scopes.push({label,...result});
  }
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({status:'passed',baseline,browser:browser.version(),groups,scopes,runtime:inputs.runtime,fixture:record('packages/player-setup/tests/review-fixtures.mjs'),installedPackage:installed.package,physicalHandset:false},null,2)+'\n');
},{source:true,owner:'01a1810c-62da-7210-a1ca-b72b449ce024',output:'player-setup-corrections-r1',timeoutMs:180000});
console.log(JSON.stringify({status:'passed',groups:groups.length}));
