// Generated from AFT 4f5f53917990ec03b2f14c65f067e4b99ec8fcaa dist/tactics/pig-foreman.js; source SHA-256 e4d68b177e0890d61078f6112f7f6629cb8fbc54d620847648ff2b0a1ee307ed.
import * as THREE from '../three.js';
import {createLightHorse as createWorkerRig} from './horse-light-model.js';
export const PIG_FOREMAN_PAINT='../assets/characters/lowpoly-proof/pig-foreman-model-paint-v1.png';
// Shared skeleton and equipment attachment; geometry, face and paint are species-specific.
export function createPigForeman(data,rifleTexture=null){
 const worker=createWorkerRig(data,rifleTexture),materials=worker.parts.map((p,i)=>new THREE.MeshStandardMaterial({color:[0x767440,0x5e4433,0xd9947a,0x302b25,0xd9947a,0x302b25,0xd9947a,0xd9947a,0x963e22][i],roughness:.9}));
 worker.rifle.carry={position:[.39,1.035,.035],axis:[.03,.38,-.924],hands:[1,-1],handPoses:{grip:{elbowPole:[.65,-1,.8]},support:{elbowPole:[.65,-1,-.8]}}};
 worker.setGrey=value=>worker.parts.forEach((p,i)=>{p.material=value?worker.grey:materials[i];});worker.setGrey(false);
 const dispose=worker.dispose;worker.dispose=()=>{materials.forEach(m=>m.dispose());dispose();};return worker;
}
