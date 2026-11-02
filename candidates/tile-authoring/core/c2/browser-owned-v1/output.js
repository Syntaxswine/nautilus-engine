// One compact UTF-8 logical DTO output, charged by the actual Core sink.
// Fixed-point metadata is reconciled with 16 bounded seven-field visits. No
// returned work field grants credit or stands in for transport/Host codec work.
import {jsonBytes,utf8Bytes,fail} from './budget.js';
import {freeze} from './data.js';
export function finishData(value,b,{work=false}={}){
 const get=()=>work?value.work:value.costBounds?.planning,set=v=>{if(work)value.work=v;else value.costBounds.planning=v;};
 const planning=get();
 b.take(planning?112:1);
 if(planning)set(b.snapshot());
 let n=jsonBytes(value,b.limits.outputBytes);
 if(planning){
  const fixed=n-jsonBytes(get());
  for(let i=0;i<16;i++){
   set({...b.snapshot(),unitsCharged:b.snapshot().unitsCharged+Math.ceil(n/64),outputBytes:n});
   n=fixed+jsonBytes(get());
  }
 }
 if(n>b.limits.outputBytes)fail('AUTHORING_OUTPUT_LIMIT','/output','Complete output must fit.');
 b.take(Math.ceil(n/64));b.outputFlow(n);
 if(planning)set(b.snapshot());
 const encoded=JSON.stringify(value);
 if(utf8Bytes(encoded)!==n)fail('BROWSER_OUTPUT_FIXED_POINT','/output','Output metadata failed exact byte reconciliation.');
 return freeze(value);
}
