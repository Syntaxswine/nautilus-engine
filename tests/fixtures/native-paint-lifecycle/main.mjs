import {prepareNativeActor} from '@nautilus-engine/map-core/native-actors/three';
import {T,rows,records,mark,setPhase,watch,id,hooks,holdImage,outstandingBlobs,attachRenderer,state,memory,errorTree,snapshot,cursor} from './observation.mjs';
const base=new URL(document.baseURI).pathname.replace(/\/examples\/$/,''),old=new URL(location.href).searchParams.has('old');
const {createTrainYardApplication}=await import(base+'/examples/train-yard-application.js');
let badAssetCountdown=0;
const app=createTrainYardApplication({container:document.querySelector('#player-layer'),canvas:document.querySelector('#yard'),autoClock:false,resourceURL:url=>badAssetCountdown&&String(url).endsWith('.png')&&--badAssetCountdown===0?'/artifacts/native-paint-fixture-corrupt.png':url});
window.paintApp=app;
const checks=[];window.paintChecks=checks;
const check=(value,message)=>{if(!value)throw Error('Lifecycle assertion: '+message);};
const equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message+'\n'+JSON.stringify({expected:b,actual:a}));
const failed=async operation=>{try{await operation();}catch(error){return error;}throw Error('Expected injected failure.');};
const messages=e=>[e.message,...(e.errors||[]).flatMap(messages)];
window.paintReady=app.ready.then(result=>{document.querySelector('#startup').remove();return result;});

export async function runLifecycle(){
  await window.paintReady;const r=app.renderer,gl=r.getContext(),observe=attachRenderer(r),prepare=(actorId,options={})=>prepareNativeActor({renderer:r,actorId,model:'goat',...options});
  const closed=(start,label)=>{const resources=snapshot(start);check(resources.every(v=>v.calls===1),label+' every observed owned resource released exactly once: '+JSON.stringify(resources.filter(v=>v.calls!==1)));equal(outstandingBlobs(),[],label+' blob leases');return resources;};
  const record=(name,detail)=>{checks.push({name,...detail});mark('case-passed',{name});};

  setPhase('throwing-disposal');{
    const before=memory(r),start=cursor();let input,view,mask,observerCalls=0,reentryCalls=0;
    hooks({input:t=>{input=t;t.addEventListener('dispose',()=>{observerCalls++;throw Error('FIXTURE_INPUT_OBSERVER');});t.addEventListener('dispose',()=>{reentryCalls++;view?.dispose();});}});
    try{view=await prepare('fixture-dispose');}finally{hooks();}
    mask=[...records].find(([t,v])=>v.id>start&&t.isDataTexture&&t.format===T.RedFormat)?.[0];check(input&&mask,'native input/mask observed');
    // Both GL allocations exist; the throwing listener predates renderer hooks.
    r.initTexture(input);r.initTexture(mask);const allocated=memory(r),error=await failed(()=>view.dispose()),after=memory(r);view.dispose();
    check(messages(error).includes('FIXTURE_INPUT_OBSERVER'),'truthful disposal AggregateError');check(observerCalls===1,'one throwing observer');
    if(old){check(after.textures>before.textures,'old input observer leaks mask');record('old-throwing-disposal-defect',{before,allocated,after,error:errorTree(error),resources:snapshot(start),reentryCalls});return {old:true,checks,rows};}
    check(reentryCalls===1,'later reentrant observer still runs once');equal(after,before,'throwing disposal drains GL allocations');const resources=closed(start,'throwing-disposal');record('throwing-disposal-drained',{before,allocated,after,error:errorTree(error),observerCalls,reentryCalls,resources});
  }
  setPhase('all-owned-observers');{
    const before=memory(r),start=cursor(),observed=new Set(),counts=new Map();let view;
    const throwing=resource=>{if(!resource||observed.has(resource))return;observed.add(resource);resource.addEventListener('dispose',()=>{counts.set(resource,(counts.get(resource)||0)+1);view?.dispose();throw Error('FIXTURE_OWNED_OBSERVER_'+id(resource));});};
    hooks({input:throwing,texture:t=>{if(t.isDataTexture)throwing(t);}});
    // Projection materials dispose during construction, so defer their faults
    // until a complete actor exists; body/main resources still fail together.
    observe.inject({target:target=>{if(target){throwing(target);throwing(target.texture);throwing(target.depthTexture);}}});
    try{view=await prepare('fixture-all-owned');}finally{hooks();observe.inject();}
    view.root.traverse(o=>{throwing(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])throwing(m);o.frustumCulled=false;});view.updateConfirmed({actorId:'fixture-all-owned',revision:0,position:{x:0,y:0,h:0},mode:'on-foot'});view.setActive(true);r.render(view.root,app.camera);
    const newTextures=[...records].filter(([t,v])=>v.id>start&&t.isTexture).map(([t])=>t);for(const t of newTextures){throwing(t);if(!t.isRenderTargetTexture)r.initTexture(t);}
    const allocated=memory(r),error=await failed(()=>view.dispose());view.dispose();check([...counts.values()].every(c=>c===1)&&counts.size===observed.size,'all throwing/reentrant observers drain exactly once');const causes=messages(error);for(const resource of observed)check(causes.includes('FIXTURE_OWNED_OBSERVER_'+id(resource)),'every observer error reported');equal(memory(r),before,'target/depth/mask/input/body GL all retired');record('all-owned-observers-drained',{observed:observed.size,allocated,after:memory(r),error:errorTree(error),resources:closed(start,'all-owned-observers')});
  }
  setPhase('concurrent-native');{
    const before=memory(r),start=cursor(),views=await Promise.all([prepare('fixture-alpha'),prepare('fixture-beta')]);
    try{const inputs=views.map(nativeInput);check(inputs[0]&&inputs[1]&&inputs[0]!==inputs[1]&&inputs[0].source!==inputs[1].source,'private current image Sources retained');views[0].dispose();check(records.get(inputs[1]).calls===0,'independent borrower survives peer release');views[1].dispose();equal(memory(r),before,'concurrent native cleanup');record('safe-within-candidate-concurrency',{resources:closed(start,'concurrent-native')});}finally{for(const view of views)view.dispose();}
  }

  setPhase('projection-failure');{
    const before=memory(r),start=cursor();r.setViewport(17,19,113,89);r.setScissor(5,7,93,59);r.setScissorTest(true);r.toneMapping=T.ACESFilmicToneMapping;r.setClearColor(0x243456,.4);const expected=state(r);let draws=0;
    observe.inject({draw:()=>{if(++draws===2)throw Error('FIXTURE_SECOND_DRAW');}});
    let error;try{error=await failed(()=>prepare('fixture-second-draw'));}finally{observe.inject();}
    check(messages(error).includes('FIXTURE_SECOND_DRAW'),'second draw preserved');equal(state(r),expected,'second draw renderer state restored');equal(memory(r),before,'second draw GL allocation cleanup');const resources=closed(start,'second-draw');
    const retry=await prepare('fixture-second-draw-retry');retry.dispose();equal(state(r),expected,'production retry state restored');equal(memory(r),before,'production retry owns cleanup');record('second-draw-cleanup-and-production-retry',{before,after:memory(r),error:errorTree(error),draws,resources});
  }
  setPhase('primary-and-cleanup-failure');{
    const before=memory(r),start=cursor(),expected=state(r);let draws=0;
    hooks({texture:t=>{if(t.isDataTexture&&t.format===T.RedFormat&&!t.userData.fixtureObserver){t.userData.fixtureObserver=true;t.addEventListener('dispose',()=>{throw Error('FIXTURE_MASK_OBSERVER');});}}});
    observe.inject({draw:()=>{if(++draws===2)throw Error('FIXTURE_PRIMARY_DRAW');}});
    let error;try{error=await failed(()=>prepare('fixture-two-errors'));}finally{hooks();observe.inject();}
    const causes=messages(error);check(causes.includes('FIXTURE_PRIMARY_DRAW')&&causes.includes('FIXTURE_MASK_OBSERVER'),'primary and cleanup errors both retained');equal(memory(r),before,'error cleanup GL');equal(state(r),expected,'error cleanup renderer');record('truthful-primary-and-cleanup-aggregate',{error:errorTree(error),resources:closed(start,'primary-and-cleanup')});
  }
  setPhase('borrowed-cube-face-mip');{
    // Real allocated cube/mipmap framebuffer and disjoint logical/physical rects.
    const cube=new T.WebGLCubeRenderTarget(32,{generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});r.setRenderTarget(cube,0,0);r.clear();r.render(new T.Scene(),new T.PerspectiveCamera());r.setRenderTarget(cube,4,2);check(gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE,'real borrowed cube mip framebuffer complete');
    const borrowedHandle=r.properties.get(cube.texture).__webglTexture;let borrowedDisposals=0;cube.addEventListener('dispose',()=>borrowedDisposals++);
    r.setViewport(7.5,8.5,21,19);r.setScissor(3,4,17,15);r.setScissorTest(true);r.setClearColor(0x385173,.37);r.toneMapping=T.NeutralToneMapping;
    const before=memory(r),expected=state(r),start=cursor();let draws=0;observe.inject({draw:()=>{if(++draws===2)throw Error('FIXTURE_CUBE_DRAW');}});
    let error;try{error=await failed(()=>prepare('fixture-cube-failure'));}finally{observe.inject();}
    equal(state(r),expected,'borrowed cube complete failure state');equal(memory(r),before,'cube projection-owned allocation cleanup');const resources=closed(start,'cube-failure'),view=await prepare('fixture-cube-success');equal(state(r),expected,'borrowed cube complete success state');view.dispose();equal(memory(r),before,'cube retry allocation cleanup');check(borrowedDisposals===0&&gl.isTexture(borrowedHandle),'borrowed target/GL handle stay live');
    record('borrowed-cube-face-mip-restored',{state:expected,error:errorTree(error),borrowedDisposals,resources});r.setRenderTarget(null);cube.dispose();r.setViewport(0,0,canvasWidth(),canvasHeight());r.setScissor(0,0,canvasWidth(),canvasHeight());r.setScissorTest(false);r.toneMapping=T.NoToneMapping;r.setClearColor(0,1);
  }
  setPhase('partial-acquisition');{
    const before=memory(r),start=cursor(),create=URL.createObjectURL;URL.createObjectURL=()=>{throw Error('FIXTURE_BLOB_ACQUISITION');};let error;
    try{error=await failed(()=>prepare('fixture-blob-failure'));}finally{URL.createObjectURL=create;}
    check(messages(error).includes('FIXTURE_BLOB_ACQUISITION'),'partial body failure preserved');equal(memory(r),before,'partial CPU-body acquisition frees any GL');const resources=closed(start,'partial-body');check(resources.some(v=>v.kind==='geometry')&&resources.some(v=>v.kind==='material'),'partially constructed body actually drained');
    const gate=holdImage(),pending=prepare('fixture-image-error');await gate.ready;gate.fail();const imageError=await failed(()=>pending);check(messages(imageError).includes('FIXTURE_IMAGE_FAILURE'),'load error preserved');equal(memory(r),before,'image-error allocations cleaned');gate.deliver();await Promise.resolve();
    const oldTone=r.toneMapping,expected=state(r);r.toneMapping=987654;let draws=0;observe.inject({draw:()=>draws++});let unsupported;try{unsupported=await failed(()=>prepare('fixture-unsupported-state'));check(draws===0,'unsupported borrowed state refused before draws');check(r.toneMapping===987654,'unsupported state unchanged');}finally{observe.inject();r.toneMapping=oldTone;}
    equal(state(r),expected,'unsupported configuration retains other state');equal(memory(r),before,'all partial acquisition cleanup');record('partial-acquisition-and-unsupported-state',{error:errorTree(error),imageError:errorTree(imageError),unsupported:errorTree(unsupported),resources:closed(start,'partial-acquisition')});
  }
  setPhase('held-callback-cancellation');{
    const before=memory(r),start=cursor(),gate=holdImage(),controller=new AbortController(),pending=prepare('fixture-never-callback',{signal:controller.signal});await gate.ready;controller.abort();const error=await failed(()=>pending);check(error.code==='PREPARATION_CANCELLED','held callback cancelled promptly without release');const retired=closed(start,'held-callback');equal(memory(r),before,'held callback ownership retired');const rowsBefore=rows.length;gate.deliver();await Promise.resolve();await Promise.resolve();equal(memory(r),before,'late callback no GL resurrection');equal(snapshot(start),retired,'late callback no double release');check(rows.slice(rowsBefore).every(v=>!['blob-create','image-placeholder'].includes(v.type)),'late callback no new acquisitions');record('never-delivered-cancellation-and-late-success',{error:errorTree(error),resources:retired});
  }

  // The accepted host remains installed while candidate callbacks are held.
  setPhase('retained-yard-cancel-supersede');{
    const saved=JSON.stringify(app.checkpoint()),accepted=app.host,hostBefore=app.checkpoint().host,nativeBefore=app.checkpoint().npcNative,menuBefore=app.setup.ui.readContext().mode,before=memory(r),gate=holdImage(),controller=new AbortController();
    const pending=app.reload(saved,{signal:controller.signal}).then(value=>{mark('generation-settled',{generation:'old'});return value;});await gate.ready;check(app.host===accepted,'accepted host remains while waiting');app.step(.05);equal(JSON.parse(app.host.save()),hostBefore,'accepted host frozen during candidate');controller.abort();
    const middle=app.reload(saved);const last=app.reload(saved);const outcomes=await Promise.all([pending,middle,last]);check(outcomes[0].code==='PREPARATION_CANCELLED'&&outcomes[1].code==='PREPARATION_CANCELLED'&&outcomes[2].ok,'rapid generations cancel old/intermediate and commit latest');
    const settled=rows.findLast(v=>v.type==='generation-settled'&&v.generation==='old').sequence,held=rows.findLast(v=>v.type==='image-held').sequence,afterHeld=rows.slice(held+1),nextFetch=afterHeld.find(v=>v.type==='fetch');check(nextFetch&&nextFetch.sequence>settled,'replacement fetch begins after cancelled generation settlement/cleanup');
    const retiredInput=records.get(gate.texture);check(retiredInput.calls===1,'held input retired before release');const after=memory(r),nativeAfter=app.checkpoint().npcNative;equal(nativeAfter,nativeBefore,'native phases preserved after successful reload');equal(physicalHost(app.checkpoint().host),physicalHost(hostBefore),'physical host/resources preserved after reload');verifyLeaseRevision(hostBefore,app.checkpoint().host);gate.deliver();await Promise.resolve();await Promise.resolve();equal(memory(r),after,'late application callback cannot resurrect generation');check(records.get(gate.texture).calls===1,'no duplicate application input cleanup');check(app.setup.ui.readContext().mode===menuBefore,'supersession restores ordinary context');
    record('retained-yard-rapid-supersession',{outcomes,oldSettledSequence:settled,nextFetchSequence:nextFetch.sequence,before,after,nativePreserved:true,physicalResourcesPreserved:true,controlRevision:'intentional +1 on restored trains'});
  }
  setPhase('cancel-chain-retains-menu');{
    const saved=JSON.stringify(app.checkpoint()),accepted=app.host,checkpoint=app.checkpoint(),menuBefore=app.setup.ui.readContext().mode,gate=holdImage(),first=new AbortController(),last=new AbortController(),a=app.reload(saved,{signal:first.signal});await gate.ready;const b=app.reload(saved,{signal:last.signal});last.abort();const results=await Promise.all([a,b]);check(results.every(v=>v.code==='PREPARATION_CANCELLED'),'cancelled chain settles');check(app.host===accepted,'all-cancel keeps accepted host');equal(app.checkpoint(),checkpoint,'cancel chain full checkpoint preserved');check(app.setup.ui.readContext().mode===menuBefore,'cancel chain context unfreezes');gate.deliver();record('cancel-chain-accepted-scene-retained',{results,menuBefore});
  }
  setPhase('second-actor-hash-failure');{
    const saved=JSON.stringify(app.checkpoint()),accepted=app.host,checkpoint=app.checkpoint(),before=memory(r);badAssetCountdown=2;const failed=await app.reload(saved);check(!failed.ok&&failed.reason.includes('ACTOR_RESOURCE_HASH'),'second actor real authenticated hash refusal');check(app.host===accepted,'hash failure retains exact accepted host owner');equal(app.checkpoint(),checkpoint,'hash failure exact accepted checkpoint');equal(memory(r),before,'partial candidate all resources retired');const retry=await app.reload(saved);check(retry.ok,'ordinary production retry succeeds');equal(app.checkpoint().npcNative,checkpoint.npcNative,'retry native phase preserved');equal(physicalHost(app.checkpoint().host),physicalHost(checkpoint.host),'retry physical/resources preserved');verifyLeaseRevision(checkpoint.host,app.checkpoint().host);record('second-actor-hash-failure-retains-scene-and-retries',{failed,retry,before,after:memory(r)});
  }
  setPhase('reentrant-generation-cancellation');{
    const saved=JSON.stringify(app.checkpoint()),gate=holdImage();let nativeSignal,reentrant;hooks({fetch:(_input,options)=>{nativeSignal=options.signal;}});const old=app.reload(saved);await gate.ready;hooks();check(nativeSignal,'candidate cancellation signal observed through existing fetch');nativeSignal.addEventListener('abort',()=>{reentrant=app.reload(saved);},{once:true});const outer=app.reload(saved);check(reentrant,'abort observer reentered replacement synchronously');const outcomes=await Promise.all([old,outer,reentrant]);check(outcomes[0].code==='PREPARATION_CANCELLED'&&outcomes[1].code==='PREPARATION_CANCELLED'&&outcomes[2].ok,'reentrant latest generation owns commit without deadlock');check(records.get(gate.texture).calls===1,'reentrant cancelled input retired');gate.deliver();await Promise.resolve();record('reentrant-cancellation-generation-order',{outcomes});
  }
  app.render();check(!gl.isContextLost(),'same borrowed renderer remains usable');equal(outstandingBlobs(),[],'all native blob leases released');return {status:'passed',old:false,checks,rows,final:memory(r),checkpoint:app.checkpoint(),backend:{three:T.REVISION,renderer:gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL),version:gl.getParameter(gl.VERSION),dpr:r.getPixelRatio()},claims:'Lifecycle correctness only; no source sharing, pose sweep or performance claim.'};
}
function physicalHost(value){const copy=structuredClone(value);for(const [,train]of copy.trains.trains)delete train.controlRevision;return copy;}
function nativeInput(view){let input;view.root.traverse(o=>{if(input||!o.material?.onBeforeCompile)return;const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>\n#include <color_fragment>'};o.material.onBeforeCompile(shader);input=shader.uniforms.uModelPaint?.value;});return input;}
function verifyLeaseRevision(before,after){for(let i=0;i<before.trains.trains.length;i++)check(after.trains.trains[i][1].controlRevision===before.trains.trains[i][1].controlRevision+1,'intentional train control lease revision invalidation');}
function canvasWidth(){return app.renderer.domElement.getBoundingClientRect().width;}function canvasHeight(){return app.renderer.domElement.getBoundingClientRect().height;}
window.runPaintLifecycle=runLifecycle;
window.retirePaintFixture=async()=>{await app.dispose();const inputs=[...records].filter(([,v])=>v.kind==='input').map(([,v])=>({...v}));check(inputs.every(v=>v.calls===1),'all native inputs retired exactly once by application/factory owners');equal(outstandingBlobs(),[],'final application blob leases released');return {status:'passed',inputs,finalMemory:memory(app.renderer),contextLost:app.renderer.getContext().isContextLost(),scope:'Native ownership retired; known pre-existing application shadow allocation remains until disposable browser context closes.'};};
window.runOldProjection=async()=>{
  await window.paintReady;const r=app.renderer,observe=attachRenderer(r);r.setViewport(17,19,113,89);r.setScissor(5,7,93,59);r.setScissorTest(true);r.toneMapping=T.ACESFilmicToneMapping;r.setClearColor(0x243456,.4);const expected=state(r),before=memory(r);let draws=0;observe.inject({draw:()=>{if(++draws===2)throw Error('FIXTURE_SECOND_DRAW');}});let error;try{error=await failed(()=>prepareNativeActor({renderer:r,actorId:'old-second-draw',model:'goat'}));}finally{observe.inject();}check(messages(error).includes('FIXTURE_SECOND_DRAW'),'old draw error observed');check(JSON.stringify(state(r))!==JSON.stringify(expected),'old borrowed renderer state defect');check(memory(r).textures>before.textures,'old projection leak');return {status:'old-defect-observed',expected,actual:state(r),before,after:memory(r),error:errorTree(error),draws,cleanup:'No diagnostic repair; disposable browser context closes after observation.'};
};
addEventListener('pagehide',()=>{void app.dispose();},{once:true});
