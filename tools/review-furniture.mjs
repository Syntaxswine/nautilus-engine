// Bounded native-WebGL proof of the public API; no editor/game code is changed.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
const owner=process.env.CODEX_THREAD_ID||'manual-furniture-review';
const sourceCommit=execFileSync('git',['-C',projectRoot,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
const runtimeFiles=['packages/furniture-core/index.js','packages/furniture-core/three.js','packages/furniture-core/factory.js','packages/furniture-core/soft-box.js','vendor/farmyard-furniture/fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b/sites/tactical-animal/dist/art/library/catalog.js'].map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(projectRoot,file))).digest('hex')}));
const buildProvenanceSha256=createHash('sha256').update(fs.readFileSync(path.join(projectRoot,'dist/build-provenance.json'))).digest('hex');
await withArtReview('FC-fb6e20a host-Three furniture and cold-context acceptance',async({page,baseURL,out,browser,errors,failedRequests})=>{
  await page.setViewportSize({width:1240,height:830});
  // Only the fixture HTML is supplied by the test. All module/paint requests
  // below use the actual built server; the data favicon avoids an unrelated
  // browser-generated /favicon.ico request from the JSON navigation viewer.
  const html='<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>body{margin:0;background:#102726;color:#efe4c9;font:16px Georgia,serif}main{margin:20px}h1{font-size:25px;margin:0 0 8px}p{margin:8px 0 14px}canvas{display:block;width:1200px;height:650px}footer{display:flex;justify-content:space-around;margin:10px 0}</style></head><body><main><h1>Nautilus · shared library furniture</h1><p>Native metre scale · plain and ornate full-tile cabinets · communal reading table · visual borrowing</p><canvas id="stage"></canvas><footer><span>Plain · oak · books</span><span>Frieze · walnut · books</span><span>2 × 4 table · sage · books</span></footer></main></body></html>';
  await page.route(baseURL+'/furniture-review.html',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
  await page.goto(baseURL+'/furniture-review.html');
  const initial=await page.evaluate(async base=>{
    const T=await import(base+'/packages/render-effects/three.js'),{loadFurnitureAssets,furnitureTextureURLs}=await import(base+'/packages/furniture-core/three.js');
    const urls=furnitureTextureURLs(),bases=Object.fromEntries(await Promise.all(Object.entries(urls).map(async([kind,url])=>[kind,await new T.TextureLoader().loadAsync(url)])));
    let baseDisposals=0;for(const texture of Object.values(bases))texture.addEventListener('dispose',()=>baseDisposals++);
    const counts=root=>{let triangles=0,batches=0;root.traverse(mesh=>{if(mesh.isMesh){batches++;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);}});return {triangles,batches};};
    async function setup(){
      const canvas=document.getElementById('stage'),renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,650);renderer.setPixelRatio(1);
      const scene=new T.Scene();scene.background=new T.Color(0x193936);scene.add(new T.HemisphereLight(0xfff1d5,0x3c5446,2.1));
      const light=new T.DirectionalLight(0xfff0dc,2.6);light.position.set(5,8,6);scene.add(light);
      const grid=new T.GridHelper(14,14,0x8a9c76,0x415d50);scene.add(grid);
      const library=await loadFurnitureAssets(T,{textures:bases});
      const definitions=[['bookcase-double-thick','oak',-3.5],['bookcase-double-ornate','walnut',-.5],['library-table-large','sage',3.2]],models=[];
      for(const [form,finish,x]of definitions){const model=library.create(`furniture:library.${form}.${finish}.books`);model.root.position.x=x;scene.add(model.root);models.push(model);}
      const camera=new T.OrthographicCamera(-6.6,6.6,3.575,-3.575,.1,60);
      function render(view='front'){camera.up.set(0,1,0);camera.position.set(...(view==='top'?[0,14,.001]:view==='back'?[-8,6,-10]:[8,6,10]));camera.lookAt(0,.7,0);renderer.render(scene,camera);const gl=renderer.getContext(),pixels=new Uint8Array(1200*650*4);gl.readPixels(0,0,1200,650,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;}
      function dispose(){library.dispose();grid.geometry.dispose();grid.material.dispose();renderer.dispose();renderer.forceContextLoss();}
      return {renderer,models,render,dispose,geometry:models.map(model=>({id:model.spec.id,...counts(model.root),declaredSize:model.spec.size,visualSize:model.getBounds().getSize(new T.Vector3()).toArray()}))};
    }
    const first=await setup(),pixels=first.render();window.furnitureReview={T,bases,first,pixels,setup,get baseDisposals(){return baseDisposals;}};
    return {geometry:first.geometry,urls,renderer:first.renderer.getContext().getParameter(0x1F01),baseDisposals};
  },baseURL);
  await page.screenshot({path:path.join(out,'front.png')});
  await page.evaluate(()=>window.furnitureReview.first.render('back'));await page.screenshot({path:path.join(out,'back.png')});
  await page.evaluate(()=>window.furnitureReview.first.render('top'));await page.screenshot({path:path.join(out,'top.png')});
  const cold=await page.evaluate(async()=>{
    const state=window.furnitureReview;state.first.dispose();const old=document.getElementById('stage'),canvas=document.createElement('canvas');canvas.id='stage';old.replaceWith(canvas);
    const second=await state.setup();state.second=second;const pixels=second.render();let maxChannelDelta=0,changedChannels=0;
    for(let index=0;index<pixels.length;index++){const delta=Math.abs(pixels[index]-state.pixels[index]);if(delta)changedChannels++;maxChannelDelta=Math.max(maxChannelDelta,delta);}
    return {maxChannelDelta,changedChannels,comparedChannels:pixels.length,baseDisposals:state.baseDisposals,geometry:second.geometry};
  });
  await page.screenshot({path:path.join(out,'cold-context.png')});
  if(cold.maxChannelDelta>1||cold.baseDisposals!==0)throw Error('Cold-context paints/borrowed ownership changed: '+JSON.stringify(cold));
  const disposed=await page.evaluate(()=>{const state=window.furnitureReview;state.second.dispose();for(const texture of Object.values(state.bases))texture.dispose();return {sourceTexturesDisposed:state.baseDisposals};});
  if(disposed.sourceTexturesDisposed!==3)throw Error('Source texture retirement mismatch.');
  const captures=['front.png','back.png','top.png','cold-context.png'].map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')}));
  const report={candidate:'FC-fb6e20a-library-furniture',sourceCommit,sourcePin:'fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b',runtimeFiles,buildProvenanceSha256,browser:browser.version(),rendering:'Isolated software WebGL; visual correctness evidence, not a GPU/FPS benchmark',initial,cold,disposed,errors,failedRequests,captures};
  fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
},{owner,output:'furniture-core',timeoutMs:240000});
