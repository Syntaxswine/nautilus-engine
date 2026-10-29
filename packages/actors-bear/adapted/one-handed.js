// Generated from AFT 4f5f53917990ec03b2f14c65f067e4b99ec8fcaa dist/tactics/one-handed.js; source SHA-256 7d0e87cbff4694b2cc53fa81d0e49d9b5f3b6111dc3e03fc77882299f4700884.
// A second pistol has its own magazine and condition. Its ammunition and art
// remain ordinary TT-33 ammunition and art; this key identifies the item only.
export const SECOND_PISTOL='pistol-offhand';
export const baseWeapon=kind=>kind===SECOND_PISTOL?'pistol':kind;
export const oneHanded=kind=>['pistol',SECOND_PISTOL,'grenade','knife'].includes(kind);
export function handWeapons(u){
 const slots=u?.slots||[];
 if(!slots.includes(u?.weapon)||slots.length!==2||slots[0]===slots[1]||!slots.every(k=>oneHanded(k)&&u.pack?.some(i=>i.type==='weapon'&&i.kind===k)))return [u?.weapon].filter(Boolean);
 return [u.weapon,...slots.filter(k=>k!==u.weapon)];
}
export const dualPistols=u=>handWeapons(u).length===2&&handWeapons(u).every(k=>baseWeapon(k)==='pistol');
export const pairedInHand=(u,kind)=>handWeapons(u).length===2&&handWeapons(u).includes(kind);
export function attackWeapon(u,weapons,burst=false){
 const w=weapons[u.weapon];return burst&&dualPistols(u)?{...w,dual:true,burstRounds:2,accuracy:(w.accuracy||0)-15}:w;
}
export const burstAvailable=(u,weapons)=>dualPistols(u)||weapons[u.weapon]?.burstRounds>1;
export function handAttackReady(u,w,rounds){
 if(w.dual)return handWeapons(u).every(k=>(u.ammo?.[k]||0)>=1&&!u.pack.find(i=>i.type==='weapon'&&i.kind===k)?.jammed);
 return (u.ammo?.[u.weapon]||0)>=rounds;
}
export function receivedWeapon(u,item){
 if(item?.type!=='weapon'||baseWeapon(item.kind)!=='pistol')return item;
 const owns=k=>u.pack?.some(i=>i.type==='weapon'&&i.kind===k);
 return {...item,kind:!owns('pistol')?'pistol':SECOND_PISTOL};
}
