import {fail} from './common.mjs';
const P=Object.getPrototypeOf(Uint8Array.prototype),slot=name=>Object.getOwnPropertyDescriptor(P,name).get;
const bufferSlot=slot('buffer'),offsetSlot=slot('byteOffset'),bytesSlot=slot('byteLength'),lengthSlot=slot('length'),brandSlot=Object.getOwnPropertyDescriptor(P,Symbol.toStringTag).get,capacitySlot=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength').get,resizableSlot=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'resizable')?.get;
const types=new Map([[Float32Array,'Float32Array'],[Int8Array,'Int8Array'],[Uint8Array,'Uint8Array'],[Uint8ClampedArray,'Uint8ClampedArray'],[Int16Array,'Int16Array'],[Uint16Array,'Uint16Array'],[Int32Array,'Int32Array'],[Uint32Array,'Uint32Array']].map(([T,name])=>[name,{prototype:T.prototype,bytesPerElement:T.BYTES_PER_ELEMENT}]));
/** Read actual internal slots, never public instance/prototype metadata accessors. */
export function typedArrayStorage(value){
 let buffer,byteOffset,byteLength,length,brand,bufferBytes;
 try{buffer=bufferSlot.call(value);byteOffset=offsetSlot.call(value);byteLength=bytesSlot.call(value);length=lengthSlot.call(value);brand=brandSlot.call(value);bufferBytes=capacitySlot.call(buffer);if(resizableSlot?.call(buffer))fail('GEOMETRY_TYPED_STORAGE','Resizable geometry storage is unsupported');}catch{fail('GEOMETRY_TYPED_STORAGE','Real non-shared typed storage required');}
 const type=types.get(brand);if(!type||Object.getPrototypeOf(value)!==type.prototype||length*type.bytesPerElement!==byteLength||byteOffset+byteLength>bufferBytes)fail('GEOMETRY_TYPED_STORAGE','Supported ordinary typed storage required');
 return {buffer,byteOffset,byteLength,length,brand,bufferBytes,bytesPerElement:type.bytesPerElement};
}
/** BufferAttribute.array is an owned data slot in the supported public provider. */
export function attributeArray(attribute){const d=Object.getOwnPropertyDescriptor(attribute,'array');if(!d||!Object.hasOwn(d,'value'))fail('GEOMETRY_ATTRIBUTE_PROFILE','Attribute array accessors are unsupported');return d.value;}
