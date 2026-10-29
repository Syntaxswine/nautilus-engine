export class RockError extends TypeError {constructor(code,message){super(message);this.name='RockError';this.code=code;}}
export function fail(code,message){throw new RockError(code,message);}
export function fields(value,allowed,required=allowed,label='value'){
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('invalid-input',label+' must be a plain data object.');
  for(const key of Reflect.ownKeys(value)){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!allowed.includes(key)||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))fail('invalid-input','Unsupported '+label+' field.');
  }
  for(const key of required)if(!Object.hasOwn(value,key))fail('invalid-input','Missing '+label+' field: '+key+'.');
  return value;
}
export function finite(value,min,max,label){if(!Number.isFinite(value)||value<min||value>max)fail('invalid-input','Invalid '+label+'.');return value;}
export function integer(value,min,max,label){finite(value,min,max,label);if(!Number.isSafeInteger(value))fail('invalid-input',label+' must be a safe integer.');return value;}
export function id(value,label='ID',max=64){if(typeof value!=='string'||!new RegExp('^[A-Za-z0-9][A-Za-z0-9_.:-]{0,'+(max-1)+'}$').test(value))fail('invalid-input','Invalid '+label+'.');return value;}
export function flag(value,label){if(typeof value!=='boolean')fail('invalid-input','The host must supply '+label+' as a boolean.');return value;}
export function point(value,label='position'){fields(value,['x','y','h'],undefined,label);return {x:finite(value.x,-1e6,1e6,label+' x'),y:finite(value.y,-1e6,1e6,label+' y'),h:finite(value.h,-1e6,1e6,label+' h')};}
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.h-b.h);
export const samePoint=(a,b)=>a.x===b.x&&a.y===b.y&&a.h===b.h;
