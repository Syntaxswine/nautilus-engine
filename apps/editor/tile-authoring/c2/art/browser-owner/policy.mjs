// New PRIVATE browser/logical component. The strict owner is unchanged.
export const CAPS=Object.freeze({additionalDecodedOwnedLogicalBytes:33554432,derivedOwnedLogicalBytes:4194304,encodedOwnedLogicalBytes:67108864,sampledAllocationsAndReservationsAllOwners:4,rootsAllOwners:2,trianglesAllOwners:50000,cellsAllOwners:1024,residentMarksAllOwners:1024,appearanceMaterialsAllOwners:64,layersPerSurface:8,storedMarksPerChunk:4096,contributorsPerBin:8,binReferencesAllOwners:32768,activeOrUnverifiedAllocationRows:1024,recentDiagnosticEvents:64});
export const RAW=Object.freeze({authoringReferenceUnits:1000000,artistPreparationTicks:1000000,decoderTicks:64000000,publicSteps:256,publicSpatialTests:100000,publicGeometryEvaluations:100000,inputBytes:6000000,outputBytes:4000000,hostNodeVisits:1000000,copyBytes:6000000});
export const SCOPE='engine-owned-and-api-logical-only';
export const OPAQUE=Object.freeze(Object.fromEntries(['browserManagedDecodedBacking','browserInternalUploadCopies','driverPaddingCachesDeferredDeletion','gcAllocatorPhysicalReclamation','unobservedJavaScriptHeap','browserProcessMemory'].map(k=>[k,'UNMEASURED'])));
export function fail(code){const e=new Error(code);e.code=code;throw e;}
export function int(n){if(!Number.isSafeInteger(n)||n<0)fail('NONNEGATIVE_SAFE_INTEGER');return n;}
export function current(check,signal){if(signal?.aborted)fail('CANCELLED');if(check()!==true)fail('STALE_SOURCE');if(signal?.aborted)fail('CANCELLED');}
export const frozen=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))frozen(x);Object.freeze(v);}return v;};
let lifetime=0;
export const newLifetime=()=>++lifetime;
