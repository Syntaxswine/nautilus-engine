import * as T from '../render-effects/three.js';

export function capturePaintRenderer(renderer){
  const target=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel(),viewport=renderer.getViewport(new T.Vector4()),scissor=renderer.getScissor(new T.Vector4()),scissorTest=renderer.getScissorTest(),colour=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),space=renderer.outputColorSpace,tone=renderer.toneMapping,ratio=renderer.getPixelRatio(),gl=renderer.getContext();
  const unsupported=()=>{throw Error('ACTOR_RENDER_STATE_UNSUPPORTED: use a supported finite render target, face/mip and colour configuration.');};
  const validRect=v=>v?.isVector4&&v.toArray().every(Number.isFinite)&&v.z>=0&&v.w>=0;
  const validTarget=target===null||target instanceof T.WebGLRenderTarget&&Number.isInteger(target.width)&&target.width>0&&Number.isInteger(target.height)&&target.height>0&&validRect(target.viewport)&&validRect(target.scissor)&&typeof target.scissorTest==='boolean';
  if(!validTarget||!Number.isSafeInteger(face)||face<0||!Number.isSafeInteger(mip)||mip<0||target===null&&(face!==0||mip!==0)||target?.isWebGLCubeRenderTarget&&face>5||target&&!target.isWebGLCubeRenderTarget&&face>=(target.depth||1)||target&&mip>Math.floor(Math.log2(Math.max(target.width,target.height)))||![...viewport.toArray(),...scissor.toArray(),...colour.toArray(),alpha,tone,ratio].every(Number.isFinite)||viewport.z<0||viewport.w<0||scissor.z<0||scissor.w<0||ratio<=0||typeof scissorTest!=='boolean'||![T.SRGBColorSpace,T.LinearSRGBColorSpace].includes(space)||![T.NoToneMapping,T.LinearToneMapping,T.ReinhardToneMapping,T.CineonToneMapping,T.ACESFilmicToneMapping,T.CustomToneMapping,T.AgXToneMapping,T.NeutralToneMapping].includes(tone)||renderer.xr?.isPresenting||gl.isContextLost()||gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)unsupported();
  const physicalViewport=renderer.getCurrentViewport(new T.Vector4()),glViewport=Array.from(gl.getParameter(gl.VIEWPORT)),glScissor=Array.from(gl.getParameter(gl.SCISSOR_BOX)),glScissorTest=gl.getParameter(gl.SCISSOR_TEST),equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
  // r180 keeps logical default rectangles separately from a bound target's
  // physical rectangles. Rebuild them in public-API order without mutating the
  // borrowed target or bypassing Three's GL state cache.
  const targetViewport=target?target.viewport.clone():viewport.clone().multiplyScalar(ratio).floor(),targetScissor=target?target.scissor.clone():scissor.clone().multiplyScalar(ratio).floor();
  const postViewport=!physicalViewport.equals(targetViewport),postScissor=!equal(glScissor,targetScissor.toArray().map(Math.trunc)),postScissorTest=glScissorTest!==(target?target.scissorTest:scissorTest);
  if(!equal(glViewport,physicalViewport.toArray().map(Math.trunc))||postViewport&&!physicalViewport.equals(viewport.clone().multiplyScalar(ratio).round())||postScissor&&!equal(glScissor,scissor.clone().multiplyScalar(ratio).round().toArray())||postScissorTest&&glScissorTest!==scissorTest)unsupported();
  return {target,face,mip,viewport,scissor,scissorTest,colour,alpha,space,tone,postViewport,postScissor,postScissorTest};
}

// The callback is synchronous: no borrowed renderer state spans an image wait.
export function withPaintRenderer(renderer,build){
  const state=capturePaintRenderer(renderer),errors=[];let result;
  try{result=build();if(result&&typeof result.then==='function')throw Error('Native paint renderer state requires synchronous construction.');}catch(error){errors.push(error);}
  for(const restore of [()=>renderer.setViewport(state.viewport),()=>renderer.setScissor(state.scissor),()=>renderer.setScissorTest(state.scissorTest),()=>renderer.setRenderTarget(state.target,state.face,state.mip),()=>{if(state.postViewport)renderer.setViewport(state.viewport);},()=>{if(state.postScissor)renderer.setScissor(state.scissor);},()=>{if(state.postScissorTest)renderer.setScissorTest(state.scissorTest);},()=>{renderer.outputColorSpace=state.space;},()=>{renderer.toneMapping=state.tone;},()=>renderer.setClearColor(state.colour,state.alpha)])try{restore();}catch(error){errors.push(error);}
  if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,'Native paint/restoration failed.',{cause:errors[0]});return result;
}
