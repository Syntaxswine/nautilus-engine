// Adapter for the existing native paint projection. Keep vendor untouched and
// restore the borrowed renderer even when a projection draw fails.
import * as T from '../render-effects/three.js';
const cancelled=()=>Object.assign(new Error('Native grenade paint preparation cancelled.'),{name:'AbortError'});
function onceDispose(object){const dispose=object.dispose;let ended=false;object.dispose=function(){if(ended)return;ended=true;dispose.call(this);};}
export async function prepareNativeHorsePaint({renderer,worker,texture,signal}){
  const native=await import('../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-model-paint.js');
  if(signal.aborted)throw cancelled();
  const anisotropy=renderer.capabilities.getMaxAnisotropy();
  // Segmentation can fail (for example, a tainted external image). Do it before
  // allocating a GPU target. This texture belongs to this preparation lifetime.
  texture.userData.paintValidity=native.textureValidity(texture);
  const saved={target:renderer.getRenderTarget(),color:renderer.getClearColor(new T.Color()),alpha:renderer.getClearAlpha(),tone:renderer.toneMapping,space:renderer.outputColorSpace,
    viewport:renderer.getViewport(new T.Vector4()),scissor:renderer.getScissor(new T.Vector4()),scissorTest:renderer.getScissorTest()},ratio=renderer.getPixelRatio();
  const scene=new T.Scene(),materials=[],frame=native.PAINT_FRAME;
  const target=new T.WebGLRenderTarget(2048,1024,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthTexture:new T.DepthTexture(2048,1024,T.UnsignedIntType)});
  onceDispose(target.depthTexture);const disposeTarget=target.dispose;let targetEnded=false;
  target.dispose=function(){if(targetEnded)return;targetEnded=true;target.depthTexture.dispose();disposeTarget.call(target);};
  let painted=false,restored=false;
  try{
    for(let i=0;i<worker.parts.length;i++){
      const part=worker.parts[i],material=new T.ShaderMaterial({uniforms:{partId:{value:i+1}},vertexShader:'attribute vec3 paintPosition;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(paintPosition,1.0);}',fragmentShader:'uniform float partId;void main(){float d=floor(gl_FragCoord.z*65535.0+.5);gl_FragColor=vec4(partId/255.0,floor(d/256.0)/255.0,mod(d,256.0)/255.0,1.0);}',toneMapped:false});
      materials.push(material);scene.add(new T.Mesh(part.geometry,material));part.geometry.setAttribute('paintPart',new T.Float32BufferAttribute(new Float32Array(part.geometry.attributes.position.count).fill(i+1),1));
    }
    const camera=new T.OrthographicCamera(-frame.width/2,frame.width/2,frame.height/2,-frame.height/2,frame.near,frame.far);
    renderer.setRenderTarget(target);renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.setClearColor(0,0);renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
    for(let i=0;i<4;i++){
      if(signal.aborted)throw cancelled();
      const angle=i*Math.PI/2;camera.position.set(frame.distance*Math.cos(angle),frame.centerY,frame.distance*Math.sin(angle));camera.lookAt(0,frame.centerY,0);camera.updateProjectionMatrix();
      renderer.setViewport(i*512/ratio,0,512/ratio,1024/ratio);renderer.setScissor(i*512/ratio,0,512/ratio,1024/ratio);renderer.render(scene,camera);
    }
    painted=true;
  }finally{
    try{renderer.setRenderTarget(saved.target);renderer.outputColorSpace=saved.space;renderer.toneMapping=saved.tone;renderer.setClearColor(saved.color,saved.alpha);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);restored=true;}
    finally{for(const material of materials)material.dispose();scene.clear();if(!painted||!restored)target.dispose();}
  }
  try{
    if(signal.aborted)throw cancelled();
    // With a prepared projection the native material builder only needs this
    // already-validated capability. It performs no further renderer mutation.
    const paint=native.createModelPaint({capabilities:{getMaxAnisotropy:()=>anisotropy}},worker,texture,{species:'horse',frame,sceneLighting:true,preparedProjection:target});
    onceDispose(paint);return paint;
  }catch(error){target.dispose();throw error;}
}
