// Tiny, independent recognition guard for legacy readers. Never read a getter,
// import the compiler, normalize geometry, or partially unwrap a parts envelope.
const kinds=new Set(['nautilus-functional-parts','nautilus-part-definition','nautilus-compiled-parts','nautilus-parts-runtime-save','nautilus-parts-runtime']);
export function refusePartsEnvelope(value){
  const kind=value&&typeof value==='object'?Object.getOwnPropertyDescriptor(value,'kind')?.value:null;
  if(!kinds.has(kind))return value;
  const reason='This legacy map/block/world reader cannot preserve '+kind+'.',action='Keep the complete parts envelope. Use the public ./parts compiler/runtime and negotiate its actual requirements; no automatic downgrade exists.';
  const error=new TypeError(reason);error.code='UNSUPPORTED_PARTS_ENVELOPE';error.diagnostics=[{code:error.code,path:'/kind',message:reason,action}];throw error;
}
