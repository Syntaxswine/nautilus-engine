// Private pre-command resource adapter. No edit credit, decode or authority.
import {sharedArtworkImage} from '../../../../packages/assets/index.js';

const CHUNK=65536;
const abortGet=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const reasonGet=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'reason').get;
const typed=Object.getPrototypeOf(Uint8Array.prototype);
const bufferGet=Object.getOwnPropertyDescriptor(typed,'buffer').get;
const lengthGet=Object.getOwnPropertyDescriptor(typed,'byteLength').get;
const capacityGet=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength').get;
const resizeGet=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'resizable')?.get;
const nativeFetch=globalThis.fetch;
const getReader=globalThis.ReadableStream?.prototype.getReader;
const readByob=globalThis.ReadableStreamBYOBReader?.prototype.read;
const cancelByob=globalThis.ReadableStreamBYOBReader?.prototype.cancel;
const closedGet=globalThis.ReadableStreamBYOBReader&&Object.getOwnPropertyDescriptor(ReadableStreamBYOBReader.prototype,'closed')?.get;
const releaseByob=globalThis.ReadableStreamBYOBReader?.prototype.releaseLock;
const cancelBody=globalThis.ReadableStream?.prototype.cancel;

function error(code,cause){const e=new Error(code,{cause});e.code=code;return e;}
function need(value,code){if(!value)throw error(code);}
function own(value,allowed,required=allowed){
 need(value&&[Object.prototype,null].includes(Object.getPrototypeOf(value)),'ENCODED_STREAM_DATA');
 const out={};for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);need(typeof key==='string'&&allowed.includes(key)&&d.enumerable&&Object.hasOwn(d,'value'),'ENCODED_STREAM_DATA');Object.defineProperty(out,key,{value:d.value,enumerable:true});}
 for(const key of required)need(Object.hasOwn(out,key),'ENCODED_STREAM_DATA');return out;
}
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function bytes(value){const buffer=bufferGet.call(value);need(!resizeGet?.call(buffer),'ENCODED_STREAM_FIXED_BYTES');return {buffer,length:lengthGet.call(value),capacity:capacityGet.call(buffer)};}
const blobKeys=['sha256','byteLength','mediaType','widthPx','heightPx','colorSpace','alphaMode'];

/** Root supplies an installed public asset anchor. Browser origin is measured;
 * Node consumers must explicitly bind their trusted HTTP origin/anchor. */
export function createBuiltinEncodedStream(options){
 const v=own(options,['artwork','profile','assetAnchorURL','origin'],['artwork']);
 need(v.assetAnchorURL===undefined||typeof v.assetAnchorURL==='string'&&v.assetAnchorURL.length<=4096,'ENCODED_STREAM_ANCHOR');
 need(v.profile===undefined||typeof v.profile==='string','ENCODED_STREAM_PROFILE');
 need(v.origin===undefined||typeof v.origin==='string'&&v.origin.length<=2048,'ENCODED_STREAM_ORIGIN');
 const pin=own(v.artwork,['id','revision','contentDigest']);
 const delivery=sharedArtworkImage(pin),profile=v.profile??'compatibility';
 const location=delivery.locations.find(x=>x.profile===profile);need(location,'ENCODED_STREAM_PROFILE');
 const measured=typeof globalThis.location?.origin==='string'&&/^https?:$/.test(globalThis.location.protocol)?globalThis.location.origin:null;
 const origin=v.origin??measured;need(typeof origin==='string','ENCODED_STREAM_ORIGIN_UNBOUND');
 const originURL=new URL(origin);need(['http:','https:'].includes(originURL.protocol)&&originURL.origin===origin&&originURL.href===origin+'/','ENCODED_STREAM_ORIGIN');
 if(measured)need(origin===measured,'ENCODED_STREAM_CROSS_ORIGIN');
 const anchor=new URL(v.assetAnchorURL??new URL('../../../../packages/assets/index.js',import.meta.url));
 need(anchor.origin===origin&&anchor.pathname.endsWith('/'+location.anchorFile)&&!anchor.search&&!anchor.hash&&!anchor.username&&!anchor.password,'ENCODED_STREAM_ANCHOR');
 const root=new URL('../../',anchor),url=new URL(location.relativeToAnchor,anchor),expected=new URL(location.packagePath,root);
 need(url.href===expected.href&&url.origin===origin&&['http:','https:'].includes(url.protocol)&&!url.search&&!url.hash&&!url.username&&!url.password,'ENCODED_STREAM_LOCATION');
 const descriptor=freeze(structuredClone(delivery.blob)),selected=freeze(structuredClone(delivery.artwork));
 need(descriptor.mediaType==='image/png'&&descriptor.byteLength>0&&descriptor.byteLength<=4000000,'ENCODED_STREAM_PNG_PROFILE');
 let occupied=false,last=null;
 function open(blob,raw){
  const supplied=own(blob,blobKeys),{signal}=own(raw,['signal']);for(const key of blobKeys)need(supplied[key]===descriptor[key],'ENCODED_STREAM_BLOB_MISMATCH');
  abortGet.call(signal);need(!occupied,'ENCODED_STREAM_BUSY');
  need(typeof nativeFetch==='function'&&typeof getReader==='function'&&typeof readByob==='function'&&typeof cancelByob==='function'&&typeof closedGet==='function'&&typeof AbortSignal.any==='function','ENCODED_STREAM_BYOB_UNAVAILABLE');
  occupied=true;const controller=new AbortController(),combined=AbortSignal.any([signal,controller.signal]);
  const state={phase:'unstarted',responses:0,receivers:0,deliveredViews:0,deliveredBytes:0,maxBacking:0,detachedReceivers:0,cancelAcknowledged:false,closedAcknowledged:false,physicalReclamation:'UNMEASURED'};last=state;
  let response=null,reader=null,fetching=null,pending=null,closing=null,returning=false,finished=false,terminal=null,received=0;
  function wrapped(code,cause){return error(abortGet.call(signal)?'ENCODED_STREAM_ABORTED':code,cause);}
  async function start(){
   if(fetching)return fetching;
   fetching=(async()=>{
    if(abortGet.call(signal))throw wrapped('ENCODED_STREAM_ABORTED',reasonGet.call(signal));
    state.phase='fetching';response=await nativeFetch(url.href,{signal:combined,redirect:'error',credentials:'same-origin',cache:'no-store'});state.responses++;
    need(response.status===200&&!response.redirected&&response.url===url.href,'ENCODED_STREAM_RESPONSE');
    need(response.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()==='image/png','ENCODED_STREAM_MEDIA_TYPE');
    const encoding=response.headers.get('content-encoding');need(!encoding||encoding.toLowerCase()==='identity','ENCODED_STREAM_CONTENT_ENCODING');
    const length=response.headers.get('content-length');need(length===null||length===String(descriptor.byteLength),'ENCODED_STREAM_DECLARED_LENGTH');
    need(response.body,'ENCODED_STREAM_BODY');
    try{reader=getReader.call(response.body,{mode:'byob'});}catch(cause){throw error('ENCODED_STREAM_BYOB_UNAVAILABLE',cause);}
    // Observe rejection immediately; the real closed promise is still joined.
    closedGet.call(reader).catch(()=>{});state.phase='reading';
   })();return fetching;
  }
  function release(){if(reader)releaseByob.call(reader);finished=true;occupied=false;state.phase='closed';}
  async function normalEnd(){await closedGet.call(reader);state.closedAcknowledged=true;release();}
  const iterator={
   [Symbol.asyncIterator](){return this;},
   next(){
    if(finished)return Promise.resolve({done:true});
    if(returning||pending)return Promise.reject(error('ENCODED_STREAM_REENTRY'));
    if(terminal)return Promise.reject(terminal);
    pending=(async()=>{
     let receiver=null;
     try{
      await start();if(abortGet.call(signal))throw wrapped('ENCODED_STREAM_ABORTED',reasonGet.call(signal));
      // The byte owner reserved before next(). No whole-response/default-reader
      // buffering: one native BYOB receiver, bounded including its full backing.
      receiver=new Uint8Array(Math.min(CHUNK,Math.max(1,descriptor.byteLength-received+1)));state.receivers++;
      const packet=await readByob.call(reader,receiver);if(capacityGet.call(bufferGet.call(receiver))===0)state.detachedReceivers++;
      if(packet.value!==undefined){const x=bytes(packet.value);state.deliveredViews++;state.deliveredBytes+=x.length;state.maxBacking=Math.max(state.maxBacking,x.capacity);received+=x.length;}
      if(packet.done){if(!returning)await normalEnd();}
      // Preserve real late/partial values even if return/abort raced the read.
      return packet;
     }catch(cause){
      terminal=wrapped(typeof cause?.code==='string'?cause.code:'ENCODED_STREAM_READ_FAILED',cause);state.phase='failed';
      // A synchronous read refusal may leave a still-owned receiver. Hand its
      // actual backing to the byte owner as a zero-length refusal/debt view.
      // Detached transfers are not physical-GC/driver reclamation receipts.
      if(receiver){const x=bytes(receiver);if(x.capacity){const value=new Uint8Array(x.buffer,0,0);state.deliveredViews++;state.maxBacking=Math.max(state.maxBacking,x.capacity);return {done:false,value};}}
      throw terminal;
     }
    })();pending.finally(()=>{pending=null;}).catch(()=>{});return pending;
   },
   return(){
    if(closing)return closing;if(finished)return Promise.resolve({done:true});returning=true;
    closing=(async()=>{
     try{
      if(!fetching){release();return {done:true};}
      if(!reader){controller.abort(error('ENCODED_STREAM_RETURN'));await fetching.catch(()=>{});}
      if(reader){await cancelByob.call(reader,'encoded resource return');state.cancelAcknowledged=true;await pending?.catch(()=>{});await closedGet.call(reader);state.closedAcknowledged=true;}
      else if(response?.body){await cancelBody.call(response.body,'unavailable encoded resource');state.cancelAcknowledged=true;}
      else throw error('ENCODED_STREAM_CLOSE_UNVERIFIED');
      release();controller.abort(error('ENCODED_STREAM_RETURN'));return {done:true};
     }catch(cause){state.phase='unverified-close';terminal=wrapped('ENCODED_STREAM_CLOSE_UNVERIFIED',cause);throw terminal;}
    })();return closing;
   }
  };return Object.freeze(iterator);
 }
 return Object.freeze({open,describe:()=>freeze({artwork:structuredClone(selected),blob:structuredClone(descriptor),location:structuredClone(location),url:url.href,scope:'pre-command encoded resource only',editingWorkCredit:0,authoringAttempt:'UNBOUND',decoder:false,physicalReclamation:'UNMEASURED'}),inspect:()=>freeze({occupied,...(last??{phase:'idle'})})});
}
