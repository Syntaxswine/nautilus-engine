import {RAW,int,fail,current,frozen} from './policy.mjs';
// Raw input/output/copy limits are METADATA flows. Native/Pako movements do not
// become Core metadata copies; their normalized source hooks still pay once.
export function createLocalWork({purpose='component-control',isCurrent=()=>true,signal=null,limits={}}={}){
 const caps={...RAW};for(const [k,v]of Object.entries(limits)){if(!(k in caps)||int(v)>caps[k])fail('TIGHTENING_ONLY');caps[k]=v;}
 let byteCount=0,byteUnits=0,closed=false;const used=Object.fromEntries(Object.keys(RAW).map(k=>[k,0])),movement={encodedStreamBytes:0,decodedMovementBytes:0,derivedWriteBytes:0,nativeUploadBytes:0,checkpointHistoryBytes:0};
 const check=()=>{if(closed)fail('WORK_CLOSED');current(isCurrent,signal);};
 function charge(delta){check();for(const [k,n]of Object.entries(delta))if(!(k in caps)||used[k]+int(n)>caps[k])fail('WORK_LIMIT_'+k);for(const [k,n]of Object.entries(delta))used[k]+=n;}
 function take(n=1){charge({authoringReferenceUnits:n,artistPreparationTicks:n});}
 function bytes(n){int(n);const next=byteCount+n,u=Math.ceil(next/64);take(u-byteUnits);byteCount=next;byteUnits=u;}
 function observe(domain,n,{normalized=true}={}){check();if(!(domain in movement))fail('UNBOUND_MOVEMENT_DOMAIN');int(n);if(normalized)bytes(n);movement[domain]+=n;}
 const port=Object.freeze({check,take,bytes,metadataCopy(n){charge({copyBytes:n});bytes(n);},copy(n,{normalized=true,domain='derivedWriteBytes'}={}){observe(domain,n,{normalized});},decoder(n){charge({decoderTicks:n});bytes(n);},encodedStream:n=>observe('encodedStreamBytes',n),nativeUpload:n=>observe('nativeUploadBytes',n),boundary(k,n){if(!['inputBytes','outputBytes','hostNodeVisits'].includes(k))fail('UNBOUND_WORK_DOMAIN');charge({[k]:n});},snapshot:()=>frozen({purpose,formalPairing:'UNBOUND',localOnly:true,raw:{...used},rawByteScope:'Core metadata/JSON boundary flows only',movement:{...movement},byteWork:byteCount,normalizedByteUnits:byteUnits,normalizedLimit:1000000,unbound:['Core whole-attempt','Host/history','codec/WAL','native constructor internal work']}),finish(){check();closed=true;return port.snapshot();}});return port;
}
// Palette acquisition is separately bounded by the SAME 1M normalized ceiling,
// 64M decoder tick ceiling and 15 resource stock caps. No invented PNG raw cap,
// request/operation IDs, authoring credit or resetting authoring counters.
export function createPaletteWork({isCurrent=()=>true,signal=null}={}){
 let bytes=0,units=0,ticks=0,closed=false;const movement={encodedStreamBytes:0,encodedSnapshotBytes:0,decodedMovementBytes:0,nativeUploadBytes:0};
 const check=()=>{if(closed)fail('PALETTE_WORK_CLOSED');current(isCurrent,signal);};
 const p={check,take(n=1){check();int(n);if(units+n>1000000)fail('PALETTE_REFERENCE_LIMIT');units+=n;},bytes(n){check();int(n);const u=Math.ceil((bytes+n)/64)-Math.ceil(bytes/64);p.take(u);bytes+=n;},decoder(n){check();if(ticks+int(n)>64000000)fail('PALETTE_DECODER_LIMIT');p.bytes(n);ticks+=n;},copy(n,{normalized=true,domain='decodedMovementBytes'}={}){check();if(!(domain in movement))fail('UNBOUND_MOVEMENT_DOMAIN');int(n);if(normalized)p.bytes(n);movement[domain]+=n;},encodedStream(n){p.copy(n,{domain:'encodedStreamBytes'});},nativeUpload(n){p.copy(n,{domain:'nativeUploadBytes'});},snapshot:()=>frozen({purpose:'palette-acquisition-only',authoringCredit:false,requestIds:false,referenceUnits:units,decoderTicks:ticks,movement:{...movement},byteWork:bytes,caps:{referenceUnits:1000000,decoderTicks:64000000},formalPairing:'UNBOUND'}),finish(){check();closed=true;return p.snapshot();}};return Object.freeze(p);
}
