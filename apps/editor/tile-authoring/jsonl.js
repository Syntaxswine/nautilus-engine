// Transport syntax only. Core owns canonical Command/Query validation; this
// port forwards to the same authorized live HostService used by the UI.
import {smartTileData,fields,fail,bytes} from '../smart-tile/checkpoint.js';

export function readAuthoringJSON(input,{maxBytes=1_000_000,maxNodes=100_000,maxDepth=40}={}){
  if(typeof input!=='string'){
    const data=smartTileData(input);let nodes=0;
    const visit=(v,d)=>{if(++nodes>maxNodes||d>maxDepth)fail('INPUT_LIMIT','/','Input exceeds the transport node/depth bound.');if(typeof v==='number'&&Object.is(v,-0))fail('INVALID_NUMBER','/','Negative zero is not canonical authoring input.');if(v&&typeof v==='object')Object.values(v).forEach(x=>visit(x,d+1));};
    visit(data,0);if(bytes(JSON.stringify(data))>maxBytes)fail('INPUT_LIMIT','/','Input exceeds the transport byte bound.');return data;
  }
  if(bytes(input)>maxBytes)fail('INPUT_LIMIT','/','Input exceeds the transport byte bound.');
  let i=0,nodes=0;const bad=()=>fail('INVALID_JSON','/','Supply one complete canonical JSON value.');
  const space=()=>{while(/[\x20\t\r\n]/.test(input[i]??'\0'))i++;};
  function string(){
    const start=i++;while(i<input.length){const c=input[i++];if(c==='"'){try{return JSON.parse(input.slice(start,i));}catch{bad();}}if(c==='\\')i++;else if(c<' ')bad();}bad();
  }
  function value(depth){
    space();if(++nodes>maxNodes||depth>maxDepth)fail('INPUT_LIMIT','/','Input exceeds the transport node/depth bound.');
    const c=input[i];if(c==='"')return string();
    if(c==='{'||c==='['){
      const array=c==='[',out=array?[]:{},seen=new Set(),end=array?']':'}';i++;space();if(input[i]===end){i++;return out;}
      while(i<input.length){
        let key;if(!array){if(input[i]!=='"')bad();key=string();if(seen.has(key))fail('DUPLICATE_JSON_KEY','/','Duplicate JSON members refuse before calling the host.');seen.add(key);space();if(input[i++]!==':')bad();}
        const v=value(depth+1);if(array){if(out.length>=65536)fail('INPUT_LIMIT','/','Array exceeds its bounded length.');out.push(v);}else Object.defineProperty(out,key,{value:v,enumerable:true,writable:true,configurable:true});
        space();if(input[i]===end){i++;return out;}if(input[i++]!==',')bad();space();
      }bad();
    }
    for(const [word,result]of [['true',true],['false',false],['null',null]])if(input.startsWith(word,i)){i+=word.length;return result;}
    const match=/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(input.slice(i));
    if(!match)bad();i+=match[0].length;const number=Number(match[0]);if(!Number.isFinite(number)||Object.is(number,-0))fail('INVALID_NUMBER','/','Use finite canonical numbers without negative zero.');return number;
  }
  const result=value(0);space();if(i!==input.length)bad();return result;
}

export function transportRefusal(error,requestId='invalid-request'){
  const safe=typeof requestId==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}$/.test(requestId)?requestId:'invalid-request';
  let diagnostics;try{const own=error&&Object.getOwnPropertyDescriptor(error,'diagnostics');if(own&&Object.hasOwn(own,'value'))diagnostics=smartTileData(own.value);}catch{}
  if(!Array.isArray(diagnostics)||!diagnostics.length)diagnostics=[{code:'TRANSPORT_REFUSED',path:'/',message:'The authorized host could not accept this packet.',action:'Keep source and retry the original request only when its outcome is known.'}];
  return {kind:'nautilus-tile-authoring-refusal',version:1,requestId:safe,ok:false,targetDocument:null,diagnostics:diagnostics.slice(0,16).map(value=>{const d=value&&typeof value==='object'?value:{};return {code:typeof d.code==='string'?d.code.slice(0,128):'TRANSPORT_REFUSED',path:typeof d.path==='string'?d.path.slice(0,512):'/',message:typeof d.message==='string'?d.message.slice(0,2048):'The request was refused.',action:typeof d.action==='string'?d.action.slice(0,2048):'Keep accepted source.',ownerIds:Array.isArray(d.ownerIds)?d.ownerIds.filter(v=>typeof v==='string').slice(0,32):[]};})};
}

export function createTileAuthoringJSONL(service,{isAuthorized}={}){
  if(typeof isAuthorized!=='function')fail('HOST_AUTHORIZATION_REQUIRED','/transport','Bind an explicit live authorization check.');
  for(const name of ['describe','snapshot','query','prepare','apply','cancel','recover'])if(typeof Object.getOwnPropertyDescriptor(service??{},name)?.value!=='function')fail('HOST_SERVICE_REQUIRED','/transport/'+name,'Borrow the actual workspace HostService.');
  let active=false;
  return Object.freeze({
    async dispatch(input){
      let packet;
      try{
        if(!isAuthorized())fail('HOST_UNAUTHORIZED','/transport','This connection is not authorized for the workspace.');
        if(active)fail('TRANSPORT_BUSY','/transport','Finish the current finite request before sending another.');
        packet=readAuthoringJSON(input);const names={describe:[],snapshot:[],query:['query'],prepare:['command'],apply:['request'],cancel:['reviewToken'],recover:['requestId']},keys=Object.hasOwn(names,packet?.action)?names[packet.action]:null;
        if(!keys)fail('UNKNOWN_TRANSPORT_ACTION','/action','Use the canonical HostService transport actions.');fields(packet,['action',...keys],'/transport');
        active=true;try{return await service[packet.action](...keys.map(k=>packet[k]));}finally{active=false;}
      }catch(error){return transportRefusal(error,packet?.command?.requestId??packet?.request?.requestId??packet?.requestId);}
    },
    async *run(lines){for await(const line of lines)yield JSON.stringify(await this.dispatch(line))+'\n';}
  });
}
