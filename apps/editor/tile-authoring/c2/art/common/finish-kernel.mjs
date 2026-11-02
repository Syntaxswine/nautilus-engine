// Private source-hashed extraction;accepted public guard/kernel remain untouched.
import {fail as refuse} from './common.mjs';
const textureMaps=['alphaMap','aoMap','bumpMap','normalMap','displacementMap','roughnessMap','metalnessMap','emissiveMap','lightMap'];
function nativeBase(T,base){
 const ordinary=base instanceof T.MeshStandardMaterial&&Object.getPrototypeOf(base)===T.MeshStandardMaterial.prototype&&base.type==='MeshStandardMaterial'&&base.isMeshStandardMaterial===true&&base.isMeshPhysicalMaterial!==true;
 if(!ordinary||base.transparent||base.opacity!==1||base.vertexColors||base.alphaTest!==0||base.onBeforeCompile!==T.Material.prototype.onBeforeCompile||textureMaps.some(k=>base[k]))refuse('FINISH_BASE_MATERIAL','Bind an exact opaque MeshStandardMaterial; Physical, subclasses, other profiles, fields, special maps, alpha and custom shaders need another reviewed adapter.');
}

export {nativeBase};
export const FINISH_MAP_FRAGMENT="\n   #ifdef USE_MAP\n    vec2 finishUV = vMapUv / tileFinishRepeat;\n    vec2 atlasUV = (tileFinishRect + vec2(0.012) + fract(finishUV) * 0.976) / 4.0;\n    vec4 sampledDiffuseColor = texture2D(map, atlasUV);\n    // Broad flagstone joints are albedo marks; no displacement/extra geometry.\n    vec2 flagGrid = vMapUv / vec2(1.2, 0.8);\n    flagGrid.x += mod(floor(flagGrid.y),2.0)*0.5;\n    vec2 flag = fract(flagGrid);\n    float joint = max(1.0-smoothstep(0.0,0.024, min(flag.x,1.0-flag.x)),1.0-smoothstep(0.0,0.024,min(flag.y,1.0-flag.y)));\n    float pigment = fract(sin(dot(floor(flagGrid),vec2(127.1,311.7)))*43758.5453);\n    vec3 flagPaint = mix(vec3(0.34,0.36,0.34),sampledDiffuseColor.rgb,0.14)*(0.9+0.2*pigment);\n    sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb,flagPaint,tileFinishFlags);\n    sampledDiffuseColor.rgb *= 1.0 - 0.27 * joint * tileFinishFlags;\n    diffuseColor *= sampledDiffuseColor;\n   #endif\n  ";
