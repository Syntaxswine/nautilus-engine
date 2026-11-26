export const clone=value=>structuredClone(value);
export function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export function fail(code,message){throw Object.assign(new Error(message),{code});}
export function insist(value,code,message){if(!value)fail(code,message);}
export function record(value,keys,required=keys){insist(value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value)),'MELEE_DATA','Use a plain data record.');insist(Object.keys(value).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(value,k)),'MELEE_FIELDS','Unknown or missing melee field.');return value;}
export function number(value,min,max,label='number'){insist(Number.isFinite(value)&&value>=min&&value<=max,'MELEE_NUMBER',label+' is outside its finite supported range.');return value;}
export function integer(value,min,max,label){number(value,min,max,label);insist(Number.isSafeInteger(value),'MELEE_INTEGER',label+' must be a safe integer.');return value;}
export function identifier(value,label='ID'){insist(typeof value==='string'&&value.length>0&&value.length<=160&&!/[\u0000-\u001f]/u.test(value),'MELEE_ID','Supply a bounded '+label+'.');return value;}
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export const round=value=>Math.round(value*1e6)/1e6;
export const refused=error=>({ok:false,code:error.code||'MELEE_INVALID',reason:error.message,committed:false,repeated:false,events:[]});
