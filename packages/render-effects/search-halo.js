// Adapted from Farmyard Commando 7db49df29a9ff412d06d205f4bc48f75297bce51; see upstream.json and docs/render-effects.md.
import * as T from './three.js';

export const HALO_WIDTHS = Object.freeze({standard:1, wide:1.75});

const vertexShader=`varying vec2 haloUv;void main(){haloUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const edgeShader=`
uniform sampler2D haloMask,maskDepth,sceneDepth;uniform vec2 screenSize;uniform float radiusScale;varying vec2 haloUv;
vec3 sampleLight(vec2 direction,float radius,float surfaceDepth){
  vec2 at=haloUv+direction*radius*radiusScale/screenSize;
  if(any(lessThan(at,vec2(0.)))||any(greaterThan(at,vec2(1.))))return vec3(0.);
  vec4 light=textureLod(haloMask,at,0.);float sourceDepth=textureLod(maskDepth,at,0.).x;
  return surfaceDepth+.00006>=sourceDepth?light.rgb*light.a:vec3(0.);
}
void main(){
  float inside=textureLod(haloMask,haloUv,0.).a;
  if(inside>.99){gl_FragColor=vec4(0.);return;}
  float surfaceDepth=textureLod(sceneDepth,haloUv,0.).x;vec3 rim=vec3(0.),spill=vec3(0.);
  for(int i=0;i<8;i++){
    float a=float(i)*.785398163;vec2 d=vec2(cos(a),sin(a));
    rim+=sampleLight(d,1.8,surfaceDepth);
    spill+=sampleLight(d,4.6,surfaceDepth)*.48+sampleLight(d,8.0,surfaceDepth)*.16;
  }
  gl_FragColor=vec4((rim*.30+spill*.25)*(1.-inside),1.);
}`;
const compositeShader=`uniform sampler2D field,halo;varying vec2 haloUv;
void main(){vec4 base=texture2D(field,haloUv);vec3 glow=texture2D(halo,haloUv).rgb;
gl_FragColor=vec4(base.rgb+glow,base.a);
#include <colorspace_fragment>
}`;
const maskColor=`
  vec2 screenUv=gl_FragCoord.xy/haloViewport;
  if(gl_FragCoord.z>texture2D(haloSceneDepth,screenUv).x+.00004)discard;
  float drift=.5+.5*sin(dot(haloWorld,vec3(2.1,1.4,1.7))-haloTime*.58);
  float eddy=.5+.5*sin(dot(haloWorld,vec3(-1.3,2.4,.7))+haloTime*.33+1.9);
  float pool=pow(drift*.68+eddy*.32,1.6);
  vec3 gold=mix(vec3(1.,.42,.065),vec3(1.,.77,.29),pool);
  gl_FragColor=vec4(gold*mix(.48,1.16,pool)*haloStrength,1.);
`;

function actuallyVisible(object) {
  for (let at=object; at; at=at.parent) if (!at.visible) return false;
  return true;
}

function checkMaterial(material) {
  if (!material) return;
  if (material.isShaderMaterial || material.displacementMap || material.clippingPlanes?.length ||
      material.onBeforeCompile !== T.Material.prototype.onBeforeCompile) {
    throw new TypeError('SearchHalo supports standard alpha-cutout materials without custom shaders, displacement or clipping.');
  }
}

/** Full-frame, standard-depth WebGL2 contour effect. Games supply already eligible visible roots. */
export class SearchHalo {
  constructor({reducedMotion=()=>typeof matchMedia==='function' && matchMedia('(prefers-reduced-motion: reduce)').matches}={}) {
    if (typeof reducedMotion !== 'function') throw new TypeError('reducedMotion must be a function.');
    this.reducedMotion=reducedMotion;
    this.disposed=false;
    this.proxies=new Map();
    this.maskScene=new T.Scene();
    this.size=new T.Vector2();
    this.drawingSize=new T.Vector2();
    const target=depth=>new T.WebGLRenderTarget(1,1,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:depth,stencilBuffer:false});
    this.field=target(true);
    this.field.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
    this.field.texture.colorSpace=T.LinearSRGBColorSpace;
    this.mask=target(true);
    this.mask.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
    this.light=target(false);
    this.time={value:0};
    this.maskSize={value:new T.Vector2(1,1)};
    this.logicalSize={value:new T.Vector2(1,1)};
    this.edges=new T.ShaderMaterial({vertexShader,fragmentShader:edgeShader,uniforms:{haloMask:{value:this.mask.texture},maskDepth:{value:this.mask.depthTexture},sceneDepth:{value:this.field.depthTexture},screenSize:this.logicalSize,radiusScale:{value:1}},transparent:true,blending:T.AdditiveBlending,depthTest:false,depthWrite:false,toneMapped:false});
    this.composite=new T.ShaderMaterial({vertexShader,fragmentShader:compositeShader,uniforms:{field:{value:this.field.texture},halo:{value:this.light.texture}},depthTest:false,depthWrite:false,toneMapped:false});
    this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.edges);
    this.quad.frustumCulled=false;
    this.screen=new T.Scene();
    this.screen.add(this.quad);
    this.screenCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  }

  maskMaterial(sprite) {
    const material=sprite ? new T.SpriteMaterial() : new T.MeshBasicMaterial();
    Object.assign(material,{transparent:false,depthWrite:true,depthTest:true,toneMapped:false,fog:false});
    material.userData.strength={value:1};
    material.userData.anchor={value:new T.Vector3()};
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,{haloTime:this.time,haloViewport:this.maskSize,haloSceneDepth:{value:this.field.depthTexture},haloStrength:material.userData.strength,haloAnchor:material.userData.anchor});
      shader.vertexShader='varying vec3 haloWorld;uniform vec3 haloAnchor;\n'+shader.vertexShader;
      shader.vertexShader=sprite ? shader.vertexShader.replace('void main() {','void main() {haloWorld=haloAnchor+vec3(uv.x*1.8,uv.y*1.2,0.);') :
        shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nhaloWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader='varying vec3 haloWorld;uniform float haloTime,haloStrength;uniform vec2 haloViewport;uniform sampler2D haloSceneDepth;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',maskColor);
    };
    material.customProgramCacheKey=()=> 'nautilus-search-halo-mask-'+(sprite?'sprite':'mesh')+'-v1';
    return material;
  }

  sync(targets=[]) {
    if (this.disposed) return;
    // Validate the complete list before allocating proxies. Borrow only ordinary geometry/rigs.
    const selected=new Map();
    for (const {root,strength=1,width=HALO_WIDTHS.standard} of targets) {
      if (!Number.isFinite(strength) || !Number.isFinite(width)) throw new TypeError('Halo strength and width must be finite numbers.');
      if (!root || strength<=0) continue;
      if (!root.isObject3D) throw new TypeError('Halo root must be a Three Object3D.');
      for (let parent=root.parent; parent; parent=parent.parent) if (parent.isLOD && parent.autoUpdate) {
        throw new TypeError('Settle LOD visibility before SearchHalo and disable LOD autoUpdate.');
      }
      if (!actuallyVisible(root)) continue;
      root.traverseVisible(source=>{
        if (source.isLOD && source.autoUpdate) throw new TypeError('Settle LOD visibility before SearchHalo and disable LOD autoUpdate.');
        if (!(source.isMesh || source.isSprite)) return;
        if (source.isInstancedMesh || source.isBatchedMesh) throw new TypeError('SearchHalo does not support instanced or batched meshes.');
        const originals=Array.isArray(source.material) ? source.material : [source.material];
        if (!originals.some(material=>material?.visible!==false && material?.opacity>0)) return;
        if (source.isSprite && Array.isArray(source.material)) throw new TypeError('A halo sprite must use one SpriteMaterial.');
        for (const material of originals) checkMaterial(material);
        selected.set(source,{originals,array:Array.isArray(source.material),strength:T.MathUtils.clamp(strength,0,1),width:T.MathUtils.clamp(width,1,2.5)});
      });
    }
    for (const [source,selection] of selected) {
      let record=this.proxies.get(source);
      if (!record) {
        // Avoid subclass clone hooks: BatchedMesh and user meshes can allocate owned resources.
        const clone=source.isSprite ? new T.Sprite() : source.isSkinnedMesh ? new T.SkinnedMesh(source.geometry) : new T.Mesh(source.geometry);
        // Constructors create a default material; it is local and immediately retired.
        clone.material.dispose();
        clone.matrixAutoUpdate=false;
        clone.matrixWorldAutoUpdate=true;
        clone.castShadow=clone.receiveShadow=false;
        clone.frustumCulled=false;
        record={clone,materials:[]};
        this.proxies.set(source,record);
        this.maskScene.add(clone);
      }
      const {originals,array,strength,width}=selection;
      if (record.materials.length!==originals.length || record.array!==array) {
        record.materials.forEach(material=>material.dispose());
        record.materials=originals.map(()=>this.maskMaterial(source.isSprite));
        record.array=array;
        record.clone.material=array ? record.materials : record.materials[0];
      }
      record.width=width;
      record.clone.geometry=source.geometry;
      record.clone.layers.mask=source.layers.mask;
      record.clone.renderOrder=source.renderOrder;
      if (source.isSprite) record.clone.center.copy(source.center);
      if (source.isSkinnedMesh) {
        record.clone.skeleton=source.skeleton;
        record.clone.bindMode=source.bindMode;
        record.clone.bindMatrix.copy(source.bindMatrix);
        record.clone.bindMatrixInverse.copy(source.bindMatrixInverse);
      }
      record.clone.morphTargetInfluences=source.morphTargetInfluences;
      record.clone.morphTargetDictionary=source.morphTargetDictionary;
      record.materials.forEach((material,i)=>{
        const original=originals[i];
        material.visible=Boolean(original && original.visible && original.opacity>0);
        if (!original) return;
        const values={map:original.map,alphaMap:original.alphaMap,alphaTest:Math.max(.05,original.alphaTest||0),side:original.side,vertexColors:original.vertexColors};
        if (source.isSprite) values.sizeAttenuation=original.sizeAttenuation;
        for (const [key,value] of Object.entries(values)) if (material[key]!==value) {
          material[key]=value;
          material.needsUpdate=true;
        }
        material.opacity=original.opacity;
        material.userData.strength.value=strength;
        material.userData.anchor.value.setFromMatrixPosition(source.matrixWorld);
        if (source.isSprite) material.rotation=original.rotation;
      });
      record.clone.matrix.copy(source.matrixWorld);
      record.clone.matrixWorld.copy(source.matrixWorld);
    }
    for (const [source,record] of this.proxies) if (!selected.has(source)) {
      record.clone.removeFromParent();
      record.materials.forEach(material=>material.dispose());
      this.proxies.delete(source);
    }
  }

  resize(renderer) {
    renderer.getSize(this.size);
    renderer.getDrawingBufferSize(this.drawingSize);
    const w=Math.max(1,this.drawingSize.x), h=Math.max(1,this.drawingSize.y);
    const mw=Math.max(1,Math.round(this.size.x*.75)), mh=Math.max(1,Math.round(this.size.y*.75));
    const samples=Math.min(2,renderer.capabilities.maxSamples||0);
    if (this.field.width!==w || this.field.height!==h || this.field.samples!==samples) {
      this.field.samples=samples;
      this.field.setSize(w,h);
    }
    if (this.mask.width!==mw || this.mask.height!==mh) {
      this.mask.setSize(mw,mh);
      this.light.setSize(mw,mh);
    }
    this.logicalSize.value.copy(this.size);
    this.maskSize.value.set(mw,mh);
  }

  checkRenderer(renderer,camera,scene) {
    if (renderer.toneMapping!==T.NoToneMapping || renderer.capabilities.logarithmicDepthBuffer || renderer.capabilities.reversedDepthBuffer || renderer.xr?.isPresenting || camera.isArrayCamera || renderer.clippingPlanes?.length) {
      throw new TypeError('SearchHalo requires NoToneMapping, standard depth and a single non-XR full-frame camera without clipping.');
    }
    if (renderer.getClearAlpha()!==1 && !scene.background?.isColor) {
      throw new TypeError('SearchHalo requires opaque scene coverage: clear alpha one or a Color background.');
    }
    const target=renderer.getRenderTarget();
    if (target && (target.isWebGLCubeRenderTarget || target.isWebGLArrayRenderTarget || target.isWebGL3DRenderTarget || renderer.getActiveMipmapLevel()!==0 || renderer.getActiveCubeFace()!==0)) {
      throw new TypeError('SearchHalo supports the canvas or a full-size 2D target at mip zero.');
    }
    renderer.getSize(this.size);
    renderer.getDrawingBufferSize(this.drawingSize);
    const viewport=renderer.getViewport(new T.Vector4());
    if (renderer.getScissorTest() || viewport.x!==0 || viewport.y!==0 || viewport.z!==this.size.x || viewport.w!==this.size.y ||
        target && (target.width!==this.drawingSize.x || target.height!==this.drawingSize.y || target.scissorTest || target.viewport.x!==0 || target.viewport.y!==0 || target.viewport.z!==target.width || target.viewport.w!==target.height)) {
      throw new TypeError('SearchHalo requires a full viewport and a 2D output matching the drawing buffer size.');
    }
  }

  render(renderer,scene,camera,targets=[],now=0) {
    if (this.disposed) return;
    this.sync(targets);
    if (!this.proxies.size) { renderer.render(scene,camera); return; }
    this.checkRenderer(renderer,camera,scene);
    if (!Number.isFinite(now)) throw new TypeError('Halo presentation time must be finite milliseconds.');
    this.resize(renderer);
    this.time.value=this.reducedMotion() ? 0 : now/1000;
    const previous=renderer.getRenderTarget(), face=renderer.getActiveCubeFace(), mip=renderer.getActiveMipmapLevel();
    const clear=renderer.getClearColor(new T.Color()), alpha=renderer.getClearAlpha();
    const shadows=renderer.shadowMap.autoUpdate, autoClear=renderer.autoClear;
    try {
      // Explicit clears make owned targets independent of the host's clear flags.
      renderer.autoClear=false;
      renderer.setRenderTarget(this.field);
      // Three converts clear colors for the active output; refresh after changing it.
      renderer.setClearColor(clear,alpha);
      renderer.clear(true,true,true);
      renderer.render(scene,camera);
      for (const [source,record] of this.proxies) {
        record.clone.matrix.copy(source.matrixWorld);
        record.clone.matrixWorld.copy(source.matrixWorld);
        for (const material of record.materials) material.userData.anchor.value.setFromMatrixPosition(source.matrixWorld);
      }
      renderer.shadowMap.autoUpdate=false;
      renderer.setClearColor(0,0);
      renderer.setRenderTarget(this.light);
      renderer.clear(true,true,true);
      const widths=[...new Set([...this.proxies.values()].map(record=>record.width))].sort((a,b)=>a-b);
      for (const width of widths) {
        for (const record of this.proxies.values()) record.clone.visible=record.width===width;
        renderer.setRenderTarget(this.mask);
        renderer.clear(true,true,true);
        renderer.render(this.maskScene,camera);
        renderer.setRenderTarget(this.light);
        this.edges.uniforms.radiusScale.value=width;
        this.quad.material=this.edges;
        renderer.render(this.screen,this.screenCamera);
      }
      renderer.autoClear=autoClear;
      renderer.setRenderTarget(previous,face,mip);
      renderer.setClearColor(clear,alpha);
      this.quad.material=this.composite;
      renderer.render(this.screen,this.screenCamera);
    } finally {
      renderer.autoClear=autoClear;
      renderer.setRenderTarget(previous,face,mip);
      renderer.setClearColor(clear,alpha);
      renderer.shadowMap.autoUpdate=shadows;
    }
  }

  dispose() {
    if (this.disposed) return;
    this.sync([]);
    this.disposed=true;
    this.field.dispose(); this.mask.dispose(); this.light.dispose();
    this.edges.dispose(); this.composite.dispose(); this.quad.geometry.dispose();
    this.screen.clear();
  }
}
