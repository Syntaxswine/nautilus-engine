import {typedArrayStorage} from '../common/typed-array-storage.mjs';
import {fail,frozen} from './policy.mjs';
// Observe supported actual Texture/Source data slots without invoking instance
// getters. Native inventory is a private live observer, never a caller DTO.
const slot=(v,k)=>{const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!Object.hasOwn(d,'value'))fail('SAMPLER_DATA_SLOT');return d.value;};
const method=(v,k)=>{for(let n=0;v&&n<8;n++,v=Object.getPrototypeOf(v)){const d=Object.getOwnPropertyDescriptor(v,k);if(d){if(!Object.hasOwn(d,'value')||typeof d.value!=='function')fail('SAMPLER_DATA_SLOT');return d.value;}}fail('SAMPLER_DATA_SLOT');};
const xy=v=>[slot(v,'x'),slot(v,'y')];
export function samplerState(texture,{id,nativeInventory}){
 const source=slot(texture,'source'),image=slot(source,'data');let imageState;
 const P=globalThis.HTMLImageElement?.prototype;
 if(P&&image instanceof globalThis.HTMLImageElement)imageState={id:id(image),url:Object.getOwnPropertyDescriptor(P,'currentSrc').get.call(image),width:Object.getOwnPropertyDescriptor(P,'naturalWidth').get.call(image),height:Object.getOwnPropertyDescriptor(P,'naturalHeight').get.call(image)};
 else {const a=slot(image,'data');let backing=null;if(a!==null){const s=typedArrayStorage(a);backing={arrayId:id(a),bufferId:id(s.buffer),bytes:s.byteLength,capacity:s.bufferBytes,offset:s.byteOffset,brand:s.brand};}imageState={id:id(image),width:slot(image,'width'),height:slot(image,'height'),backing};}
 const scalar={};for(const k of ['version','mapping','channel','wrapS','wrapT','magFilter','minFilter','anisotropy','format','internalFormat','type','colorSpace','generateMipmaps','premultiplyAlpha','flipY','unpackAlignment','rotation','matrixAutoUpdate'])scalar[k]=slot(texture,k);
 return frozen({textureId:id(texture),sourceId:id(source),sourceVersion:slot(source,'version'),image:imageState,...scalar,offset:xy(slot(texture,'offset')),repeat:xy(slot(texture,'repeat')),center:xy(slot(texture,'center')),matrix:slot(slot(texture,'matrix'),'elements').map(v=>Object.is(v,-0)?0:v),dispose:id(method(texture,'dispose')),updateMatrix:id(method(texture,'updateMatrix')),onUpdate:slot(texture,'onUpdate')===null?null:id(slot(texture,'onUpdate')),native:nativeInventory(texture)});
}
// Owned textures only. No borrowed Three prototype/service is modified. This
// preflight also runs before Three can decrement its private source use count.
export function protectOwnedTexture(texture,preflight){const original=texture.dispose;const dispose=function(){preflight();return original.call(texture);};Object.defineProperty(texture,'dispose',{value:dispose,writable:false,configurable:false});return dispose;}
