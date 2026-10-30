// Foundation for the forthcoming parts facade; no renderer, IO or host IDs lost.
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const PART_IDENTITY=Object.freeze({version:1,maxInstanceLength:24,maxPartLength:32,kinds:Object.freeze(['instance','floor','surface','door','stairs','visual','portal','attachment'])});
function invalid(path,message){const error=new TypeError(message);error.code='INVALID_PART_ID';error.diagnostics=[{code:error.code,path,message,action:'Choose an explicit stable instance key (1–24 ASCII characters) and local part key (1–32); preserve the original source reference separately. IDs are never shortened or substituted.'}];throw error;}
function sourceId(value,max,path){if(typeof value!=='string'||value.length>max||!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*(?![\s\S])/.test(value))invalid(path,'Invalid or overlong functional-part identity.');}
function encode(value){let result='',bits=0,buffer=0;for(const character of value){buffer=(buffer<<8)|character.charCodeAt(0);bits+=8;while(bits>=6){bits-=6;result+=alphabet[(buffer>>>bits)&63];}buffer&=(1<<bits)-1;}if(bits)result+=alphabet[buffer<<(6-bits)];return result;}
function decode(value){let result='',bits=0,buffer=0;for(const character of value){const digit=alphabet.indexOf(character);if(digit<0)invalid('/id','Malformed generated part identity.');buffer=(buffer<<6)|digit;bits+=6;if(bits>=8){bits-=8;result+=String.fromCharCode((buffer>>>bits)&255);}buffer&=(1<<bits)-1;}if(encode(result)!==value)invalid('/id','Generated part identity is not canonical.');return result;}
export function partIdentity(instanceId,kind,partId){
  sourceId(instanceId,PART_IDENTITY.maxInstanceLength,'/instanceId');sourceId(partId,PART_IDENTITY.maxPartLength,'/partId');
  if(!PART_IDENTITY.kinds.includes(kind))invalid('/kind','Use a declared generated identity kind.');
  return 'fp:'+kind+':'+encode(instanceId)+':'+encode(partId);
}
export function decodePartIdentity(value){
  if(typeof value!=='string'||value.length>96)invalid('/id','Malformed generated part identity.');const sections=value.split(':');if(sections.length!==4||sections[0]!=='fp')invalid('/id','Malformed generated part identity.');
  const instanceId=decode(sections[2]),kind=sections[1],partId=decode(sections[3]);if(partIdentity(instanceId,kind,partId)!==value)invalid('/id','Generated part identity is not canonical.');return {instanceId,kind,partId};
}
