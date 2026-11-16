export const copy=value=>structuredClone(value);
export const fail=(code,message)=>{throw Object.assign(Error(message),{code});};
export function record(v){if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('STEALTH_DATA','Use plain records.');return v;}
export function fields(v,required,optional=[]){record(v);if(required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>![...required,...optional].includes(k)))fail('STEALTH_DATA','Unsupported or missing fields: '+required.join(', '));return v;}
export function number(v,min=0,max=1e9){if(!Number.isFinite(v)||v<min||v>max)fail('STEALTH_DATA','Finite bounded numbers required.');return v;}
export function integer(v,min=0,max=1e9){number(v,min,max);if(!Number.isSafeInteger(v))fail('STEALTH_DATA','Integer required.');return v;}
export function id(v){if(typeof v!=='string'||!/^[a-zA-Z][a-zA-Z0-9_.:-]{0,127}$/.test(v))fail('STEALTH_DATA','Stable ID required.');return v;}
export function point(v){fields(v,['x','y','h']);for(const a of ['x','y','h'])number(v[a],-1e6,1e6);return v;}
export const stable=v=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(stable(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(stable(v[k]))])):v);
export const same=(a,b)=>stable(a)===stable(b);
export const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
