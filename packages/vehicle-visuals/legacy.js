// Adapted historical all-body API: tint-mask-safe owned data textures.
import {loadVehicleSkin} from './skin.js';
import {roadVehicle,VEHICLE_BODIES,VEHICLE_FINISHES} from '../vehicle-core/catalogue.js';
import {sculptRoadVehicle} from './sculpt.js';
import {reducedRoadVehicle} from '../../vendor/nautilus-road-vehicles/5d8962e7764bce3fcfff8f4dfd4883bfec97b0ee/packages/vehicle-visuals/reduced.js';

function release(resources){
  const errors=[];for(const resource of resources)try{resource.dispose();}catch(error){errors.push(error);}
  if(errors.length)throw new AggregateError(errors,'Road vehicle cleanup failed.');
}
// loadSkin is injectable for non-DOM renderers. Without a DOM or loader, geometry
// inspection works synchronously; a host must provide images to render the skins.
export function createRoadVehicleKit(THREE,{loadSkin}={}){
  const T=THREE;
  if(!T?.ShapeUtils||!T?.LatheGeometry||!T?.DataTexture)throw new TypeError('Supply the renderer Three namespace to create road vehicles.');
  const resources=[],templates=new Map(),live=new Set(),coats=new Map(),loads=[];
  let disposed=false;
  const own=resource=>{resources.push(resource);return resource;};
  const loader=loadSkin??(typeof document!=='undefined'?url=>loadVehicleSkin(T,url):null);
  function skin(file){
    const texture=own(loader?new T.Texture():new T.DataTexture(new Uint8Array([235,231,212,255]),1,1,T.RGBAFormat));
    texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;
    if(loader){
      const promise=Promise.resolve().then(()=>loader(new URL('../../vendor/nautilus-road-vehicles/5d8962e7764bce3fcfff8f4dfd4883bfec97b0ee/packages/vehicle-visuals/skins/'+file,import.meta.url).href)).then(loaded=>{
        try{
          if(!disposed){texture.isDataTexture=loaded.isDataTexture===true;texture.image=loaded.image;texture.flipY=loaded.flipY;texture.generateMipmaps=true;
            texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=4;texture.needsUpdate=true;}
        }finally{loaded.dispose();}
      });
      loads.push(promise);
    }return texture;
  }
  let details;
  try{
    details=own(new T.MeshStandardMaterial({map:skin('running-gear.png'),roughness:.92}));
    for(const body of VEHICLE_BODIES){
      const map=skin(body.id+'.png');
      for(const finish of VEHICLE_FINISHES){
        const material=own(new T.MeshStandardMaterial({map,roughness:.87}));
        const tint=new T.Color(finish.colour);
        // Skin RGB contains painted glass/trim. Alpha is the BODY TINT MASK, not
        // transparency. Windows stay blue-gray for every finish, on the same hull.
        material.onBeforeCompile=shader=>{
          shader.uniforms.vehicleFinish={value:tint};
          shader.fragmentShader='uniform vec3 vehicleFinish;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
            '#ifdef USE_MAP\nvec4 paintedSkin=texture2D(map,vMapUv);\ndiffuseColor.rgb*=paintedSkin.rgb*mix(vec3(1.0),vehicleFinish,paintedSkin.a);\n#endif');
        };
        material.customProgramCacheKey=()=> 'nautilus-painted-vehicle-skin-v2';
        coats.set(body.id+':'+finish.id,material);
      }
    }
  }catch(error){release(resources.reverse());throw error;}
  const ready=Promise.all(loads).then(()=>undefined);
  // The caller still receives the original rejection through ready. This handler
  // prevents an abandoned/disposed kit from reporting an unhandled rejection.
  ready.catch(()=>{});
  function create(id,{lod='game'}={}){
    if(disposed)throw new Error('Road vehicle kit is disposed.');
    if(!['game','sculpt'].includes(lod))throw new RangeError('Choose game or sculpt detail.');
    const spec=roadVehicle(id),key=spec.form+':'+lod;
    if(!templates.has(key)){
      const parts=lod==='sculpt'?sculptRoadVehicle(T,spec.form):reducedRoadVehicle(T,spec.form);
      for(const geometry of parts.values())own(geometry);templates.set(key,parts);
    }
    const root=new T.Group();root.name=spec.id;
    root.userData={vehicleId:spec.id,form:spec.form,finish:spec.finish,metresPerUnit:1,
      cells:[...spec.cells],lengthM:spec.lengthM,widthM:1.97,bodyWidthM:spec.widthM,heightM:spec.heightM,lod,skin:'painted-image-v2'};
    for(const [group,geometry]of templates.get(key)){
      const mesh=new T.Mesh(geometry,group==='body'?coats.get(spec.form+':'+spec.finish):details);
      mesh.name=group==='body'?'Painted body':'Tyres, rims and structural details';
      mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
    }
    const model={root,dispose(){if(live.delete(model))root.removeFromParent();}};live.add(model);return model;
  }
  return{ready,skinsAvailable:!!loader,create,build:create,dispose(){
    if(disposed)return;disposed=true;templates.clear();const handles=[...live];live.clear();
    release(handles.map(({root})=>({dispose:()=>root.removeFromParent()})).concat(resources.splice(0).reverse()));
  }};
}
