import {fail} from './contracts.js';
// Private, bounded allocator; no arbitrary owner-ID concatenation/truncation.
export function allocateCrossingId(token,seed,occupied,budget){
  for(let attempt=0;attempt<=256;attempt++){
    budget.take(16);
    const candidate='stk.cross.'+token({...seed,attempt});
    if(!occupied.has(candidate))return candidate;
  }
  fail('STACK_ID_ALLOCATION_LIMIT','/intent/id','No short collision-free crossing ID exists within the captured bound.');
}
