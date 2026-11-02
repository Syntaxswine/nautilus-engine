import module0 from './pako-esm/inflate.js';
import module1 from './pako-esm/zstream.js';
import module2 from './pako-esm/adler32.js';
import module3 from './pako-esm/crc32.js';
import module4 from './pako-esm/inffast.js';
import module5 from './pako-esm/inftrees.js';
import module6 from './pako-esm/constants.js';
const factories={"lib/zlib/inflate.js":module0,"lib/zlib/zstream.js":module1,"lib/zlib/adler32.js":module2,"lib/zlib/crc32.js":module3,"lib/zlib/inffast.js":module4,"lib/zlib/inftrees.js":module5,"lib/zlib/constants.js":module6};
export function loadPako(ledger){const cache=new Map(),quota=ledger.pakoPort();function load(file){if(!Object.hasOwn(factories,file))throw Error("DEPENDENCY_UNBOUND");if(cache.has(file))return cache.get(file);const value=factories[file](quota,spec=>{if(!/^\.\/[a-z0-9]+$/.test(spec))throw Error("DEPENDENCY_UNBOUND");return load("lib/zlib/"+spec.slice(2)+".js");});cache.set(file,value);return value;}return {inflate:load("lib/zlib/inflate.js"),ZStream:load("lib/zlib/zstream.js"),crc32:load("lib/zlib/crc32.js"),constants:load("lib/zlib/constants.js"),moduleCount:()=>cache.size};}
