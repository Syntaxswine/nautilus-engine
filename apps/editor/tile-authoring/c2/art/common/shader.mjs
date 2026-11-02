import {fail} from './common.mjs';
import {nativeBase,FINISH_MAP_FRAGMENT} from './finish-kernel.mjs';
import {tileFinishChoice,tileFinishFamily} from '../../../../../../packages/tile-finishes/catalogue.js';
import {DATA_LAYOUT as D} from './data-atlas.mjs';
const tones=[.94,.96,.98,1,1.02,1.04,1.01,.97];
const fragment=[
'uniform sampler2D c2Data;',
'uniform sampler2D c2Organic;',
'uniform sampler2D c2Road;',
'uniform vec4 c2PageSizes;',
'uniform vec4 c2Grid;',
'uniform vec4 c2Bins;',
'uniform float c2BinStart;',
'varying vec2 c2SurfaceM;',
'vec4 c2Read(float texel){return texture2D(c2Data,vec2((mod(texel,256.0)+0.5)/256.0,(floor(texel/256.0)+0.5)/64.0));}',
'vec4 c2Over(vec4 s,vec4 d){return s+d*(1.0-s.a);}',
'vec3 c2Linear(vec3 v){return mix(v/12.92,pow((v+0.055)/1.055,vec3(2.4)),step(vec3(0.04045001),v));}',
'vec4 c2Pixel(vec2 p,vec4 rect,float page,float floor8,float repeatFrame){vec2 q=repeatFrame>0.5?rect.xy+mod(mod(p-rect.xy,rect.zw)+rect.zw,rect.zw):clamp(p,rect.xy,rect.xy+rect.zw-vec2(1.0));vec2 size=page<0.5?c2PageSizes.xy:c2PageSizes.zw;vec4 raw=page<0.5?texture2D(c2Organic,(q+0.5)/size):texture2D(c2Road,(q+0.5)/size);if(floor(raw.a*255.0+0.5)<=floor8)return vec4(0.0);return vec4(c2Linear(raw.rgb)*raw.a,raw.a);}',
'vec4 c2Mark(float id){float start=id*6.0;vec4 t=c2Read(start),r=c2Read(start+1.0),rect=c2Read(start+2.0),tint=c2Read(start+3.0),flags=c2Read(start+4.0);vec2 d=c2SurfaceM-t.xy;vec2 uv=vec2(r.z+(r.x*d.x+r.y*d.y)*t.z,r.w-(-r.y*d.x+r.x*d.y)*t.w);if(flags.z<0.5&&(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0))return vec4(0.0);if(flags.z>0.5)uv=fract(uv);vec2 p=rect.xy+uv*rect.zw-0.5,a=floor(p),f=p-a;vec4 s=mix(mix(c2Pixel(a,rect,flags.x,flags.y,flags.z),c2Pixel(a+vec2(1.0,0.0),rect,flags.x,flags.y,flags.z),f.x),mix(c2Pixel(a+vec2(0.0,1.0),rect,flags.x,flags.y,flags.z),c2Pixel(a+vec2(1.0,1.0),rect,flags.x,flags.y,flags.z),f.x),f.y);return s*vec4(tint.rgb*tint.a,tint.a);}',
'float c2Ref(vec4 a,vec4 b,vec4 c,int n){if(n==0)return a.y;if(n==1)return a.z;if(n==2)return a.w;if(n==3)return b.x;if(n==4)return b.y;if(n==5)return b.z;if(n==6)return b.w;return c.x;}',
'vec4 c2Paint(){if(!gl_FrontFacing)return vec4(0.0);vec2 ij=floor((c2SurfaceM-c2Grid.xy)/c2Grid.zw)-c2Bins.xy;if(ij.x<0.0||ij.y<0.0||ij.x>=c2Bins.z||ij.y>=c2Bins.w)return vec4(0.0);float bin=6144.0+(c2BinStart+ij.y*c2Bins.z+ij.x)*3.0;vec4 a=c2Read(bin),b=c2Read(bin+1.0),c=c2Read(bin+2.0);vec4 outPaint=vec4(0.0),layer=vec4(0.0);float layerId=-1.0,opacity=1.0;for(int n=0;n<8;n++){if(float(n)>=a.x)break;float id=c2Ref(a,b,c,n);vec4 flags=c2Read(id*6.0+4.0),meta=c2Read(id*6.0+5.0);if(flags.w!=layerId){outPaint=c2Over(layer*opacity,outPaint);layer=vec4(0.0);layerId=flags.w;opacity=meta.x;}layer=c2Over(c2Mark(id),layer);}return c2Over(layer*opacity,outPaint);}'
].join('\n');
export const PRIVATE_SHADER_PROFILE='owned-combined-standard-sparse-frame-v1';
export function createCombinedMaterial({THREE:T,base,atlas,choice,surfaceBinding=null,dataAtlas=null,pages=[]}){
 nativeBase(T,base);const selected=tileFinishChoice(choice),family=tileFinishFamily(selected.skinId),material=new T.MeshStandardMaterial(),tile=family.borrowedResource.tile,rect=[tile%4,3-Math.floor(tile/4)],overlay=surfaceBinding&&!surfaceBinding.empty;
 material.map=atlas;material.color.setHex(family.appearance.tint).multiplyScalar(tones[selected.variantSeed%8]);material.roughness=base.roughness;material.metalness=base.metalness;material.envMap=base.envMap;material.envMapIntensity=base.envMapIntensity;material.side=T.DoubleSide;material.depthTest=base.depthTest;material.depthWrite=base.depthWrite;material.userData={role:'private-c2-owned-combined',skinId:selected.skinId,version:1};
 if(overlay&&(!dataAtlas||pages.length!==2||pages.some(p=>!(p.texture instanceof T.Texture)))){material.dispose();fail('COMBINED_RESOURCES');}
 let compiled=false,boundUniforms=null;
 material.onBeforeCompile=shader=>{if(!shader.fragmentShader.includes('#include <map_fragment>')||overlay&&!shader.vertexShader.includes('#include <project_vertex>'))fail('COMBINED_SHADER_PROFILE');shader.uniforms.tileFinishRect={value:rect};shader.uniforms.tileFinishRepeat={value:family.appearance.repeatUV};shader.uniforms.tileFinishFlags={value:family.appearance.pattern==='broad-flag-joints'?1:0};shader.fragmentShader='uniform vec2 tileFinishRect;\nuniform vec2 tileFinishRepeat;\nuniform float tileFinishFlags;\n'+shader.fragmentShader.replace('#include <map_fragment>',FINISH_MAP_FRAGMENT+(overlay?'\nvec4 c2Overlay=c2Paint();diffuseColor.rgb=c2Overlay.rgb+diffuseColor.rgb*(1.0-c2Overlay.a);\n':''));
  if(overlay){const s=surfaceBinding.surface;Object.assign(shader.uniforms,{c2Data:{value:dataAtlas.texture},c2Organic:{value:pages[0].texture},c2Road:{value:pages[1].texture},c2PageSizes:{value:[pages[0].width,pages[0].height,pages[1].width,pages[1].height]},c2Grid:{value:[...s.grid.originM,...s.grid.cellSizeM]},c2Bins:{value:[...s.min,surfaceBinding.width,surfaceBinding.height]},c2BinStart:{value:surfaceBinding.binStart},c2WorldToSurface:{value:new T.Matrix4().fromArray(s.worldToSurface)}});shader.fragmentShader=fragment+'\n'+shader.fragmentShader;shader.vertexShader='uniform mat4 c2WorldToSurface;\nvarying vec2 c2SurfaceM;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nc2SurfaceM=(c2WorldToSurface*modelMatrix*vec4(transformed,1.0)).xy;');}boundUniforms=shader.uniforms;compiled=true;
 };
 material.customProgramCacheKey=()=>PRIVATE_SHADER_PROFILE+':'+(overlay?'graphics-8-contributors-4-pages':'finish-only');
 return {material,bindingSnapshot:()=>boundUniforms?{compiled:true,rect:[...boundUniforms.tileFinishRect.value],repeat:[...boundUniforms.tileFinishRepeat.value],flags:boundUniforms.tileFinishFlags.value,...(overlay?{textures:[boundUniforms.c2Data.value,boundUniforms.c2Organic.value,boundUniforms.c2Road.value],matrix:[...boundUniforms.c2WorldToSurface.value.elements].map(v=>Object.is(v,-0)?0:v),grid:[...boundUniforms.c2Grid.value],bins:[...boundUniforms.c2Bins.value],binStart:boundUniforms.c2BinStart.value,pageSizes:[...boundUniforms.c2PageSizes.value]}:{})}:{compiled:false},diagnostics:()=>({compiled,overlay,ownedMaterial:true,borrowedBaseChanged:false,shaderProfile:PRIVATE_SHADER_PROFILE,extraMarkTriangles:0}),dispose(){material.dispose();}};
}
export const COMPOSITOR_FRAGMENT_SOURCE=fragment;
