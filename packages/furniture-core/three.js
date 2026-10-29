// Optional renderer adapter. The host supplies the only live Three namespace.
import {furnitureAsset} from './index.js';
import {createFurnitureFactory} from './factory.js';

const source='../../vendor/farmyard-furniture/fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b/sites/tactical-animal/dist/art/library/';
const paints='../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/assets/environment/painted-study/';
export function furnitureTextureURLs() {
  return {atlas:new URL(paints+'material-atlas-v2.png',import.meta.url).href,cargo:new URL(paints+'cargo-materials-v1.png',import.meta.url).href,bookSkins:new URL(source+'book-spines.svg',import.meta.url).href};
}
const keys=['atlas','cargo','bookSkins'];
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const textureOK=value=>value?.isTexture===true&&typeof value.clone==='function'&&typeof value.dispose==='function';
const abortError=()=>Object.assign(new Error('Furniture loading was aborted.'),{name:'AbortError'});

export async function loadFurnitureAssets(THREE,settings={}) {
  const constructors=['Group','MeshStandardMaterial','Matrix4','Vector3','Quaternion','Euler','InstancedMesh','Box3','BoxGeometry','Shape','ExtrudeGeometry'];
  if(!THREE||constructors.some(name=>typeof THREE[name]!=='function')||typeof THREE.SRGBColorSpace!=='string')throw new TypeError('Pass the host Three.js namespace.');
  if(!record(settings)||Object.keys(settings).some(key=>!['loadTexture','textures','signal'].includes(key)))throw new TypeError('Unsupported furniture renderer options.');
  const {loadTexture,textures={},signal}=settings;
  if(!record(textures)||Object.keys(textures).some(key=>!keys.includes(key))||Object.values(textures).some(value=>!textureOK(value)))throw new TypeError('Borrowed furniture textures must be atlas, cargo or bookSkins Three textures.');
  if(loadTexture!==undefined&&typeof loadTexture!=='function')throw new TypeError('loadTexture must be a function.');
  if(signal!==undefined&&(typeof signal?.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw new TypeError('Pass an AbortSignal.');
  if(signal?.aborted)throw abortError();
  const missing=keys.filter(key=>!Object.hasOwn(textures,key));
  if(missing.length&&!loadTexture&&typeof THREE.TextureLoader!=='function')throw new TypeError('Supply loadTexture or the host Three.TextureLoader.');
  const loader=loadTexture||((url)=>new THREE.TextureLoader().loadAsync(url)),urls=furnitureTextureURLs();
  const borrowed=new Set(Object.values(textures)),owned=new Set(),released=new Set(),inputs={...textures};
  // A failure/abort rejects promptly; late successful requests still release
  // their owned textures exactly once. No image/Source is closed by this API.
  const release=texture=>{if(!texture||borrowed.has(texture)||released.has(texture))return;released.add(texture);try{texture.dispose?.();}catch{/* Complete cleanup even if a caller's dispose listener throws. */}};
  return new Promise((resolve,reject)=>{
    let pending=true;
    const detach=()=>signal?.removeEventListener('abort',aborted);
    const fail=error=>{if(!pending)return;pending=false;detach();for(const texture of owned)release(texture);reject(error);};
    const aborted=()=>fail(abortError());
    signal?.addEventListener('abort',aborted,{once:true});
    if(signal?.aborted){aborted();return;}
    Promise.all(missing.map(key=>Promise.resolve().then(()=>pending?loader(urls[key],{kind:key,signal}):undefined).then(texture=>{
      if(!pending){release(texture);return;}
      if(texture&&!borrowed.has(texture))owned.add(texture);
      if(!textureOK(texture))throw new TypeError('Furniture texture loader did not return a Three texture for '+key+'.');
      inputs[key]=texture;
    }))).then(()=>{
      if(!pending)return;
      let factory;
      try{
        factory=createFurnitureFactory(THREE,inputs);
        const library={
          create(id,options={}){
            if(factory.disposed)throw Error('Furniture library is disposed.');
            const spec=furnitureAsset(id,options),model=factory.build(spec.form,spec.finish,spec.contents,{rotation:spec.rotation});
            model.root.name=spec.id;model.root.userData={furnitureAsset:spec.id,tiles:[...spec.tiles]};
            const getBounds=()=>{if(model.disposed||factory.disposed)throw Error('Furniture instance is disposed.');model.root.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(model.root);};
            return {root:model.root,get spec(){return structuredClone(spec);},
              getBounds,get bounds(){return getBounds();},
              solidParts:()=>model.solidParts(),dispose:()=>model.dispose(),get disposed(){return model.disposed;}};
          },
          dispose(){try{factory.dispose();}finally{for(const texture of owned)release(texture);}},
          stats:()=>({...factory.stats()}),get disposed(){return factory.disposed;}
        };
        pending=false;detach();resolve(library);
      }catch(error){try{factory?.dispose();}catch{/* Keep the original failure after releasing what can be released. */}fail(error);}
    },fail);
  });
}
