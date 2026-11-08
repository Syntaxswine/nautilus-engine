import {ShaderChunk} from '../../packages/render-effects/three.js';

const coordinates = `
varying vec2 vSolidPaintEdge, vSolidPaintOutward;
varying float vSolidPaintDepth;
`;
const vertex = `
#include <begin_vertex>
mat4 solidPaintTransform = modelMatrix;
#ifdef USE_INSTANCING
solidPaintTransform *= instanceMatrix;
#endif
vec3 solidPaintPoint = (solidPaintTransform * vec4(position, 1.)).xyz;
vSolidPaintEdge = solidPaintPoint.xz;
vSolidPaintOutward = vec2(0.);
vSolidPaintDepth = 0.;
if (abs(normal.y) < .5) {
  vec3 solidPaintTop = (solidPaintTransform * vec4(position.x, .5, 0., 1.)).xyz;
  vSolidPaintEdge = solidPaintTop.xz;
  vSolidPaintOutward = normalize((solidPaintTransform * vec4(0., 0., 1., 0.)).xz);
  vSolidPaintDepth = solidPaintTop.y - solidPaintPoint.y;
}
`;
const fragment = `
vec2 solidGroundUV() {
  // Fold into the painted one-metre footprint. Mirroring every metre keeps
  // the pattern at native scale through a full-height face. Sample inside
  // the edge so directional road paint stays on this tile's side of fract().
  float inward = 1. - abs(mod(vSolidPaintDepth, 2.) - 1.);
  return vSolidPaintEdge - vSolidPaintOutward * clamp(inward, .00001, .99999);
}
`;

export function createSolidTileMaterial(source) {
  const material = source.clone();
  material.name = source.name ? source.name + ' solid tile' : 'Solid ground paint';
  material.customProgramCacheKey = () => source.customProgramCacheKey() + '-solid-ground-wrap-v1';
  material.onBeforeCompile = (shader, renderer) => {
    source.onBeforeCompile(shader, renderer);
    shader.vertexShader = coordinates + shader.vertexShader.replace('#include <begin_vertex>', vertex);
    shader.fragmentShader = coordinates + fragment + shader.fragmentShader
      .replace('#include <map_fragment>', ShaderChunk.map_fragment.replace('vMapUv', 'solidGroundUV()'))
      .replaceAll('vBiomePosition.xz', 'solidGroundUV()')
      // Use the donor's horizontal paint sample, even on a vertical face.
      // Keep the actual face normal in the lighting and shadow calculations.
      .replace('vec3 weights=pow(abs(normalize(vNatureNormal)),vec3(4.));', 'vec3 weights=vec3(0.,1.,0.);')
      .replace('vec3 q=vNaturePosition*', 'vec3 q=vec3(solidGroundUV().x,vNaturePosition.y,solidGroundUV().y)*')
      .replaceAll('vNaturePosition.xz', 'solidGroundUV()')
      .replace(/vNaturePosition\.(x|z)\b/g, (_, axis) => 'solidGroundUV().' + (axis === 'x' ? 'x' : 'y'));
  };
  return material;
}
