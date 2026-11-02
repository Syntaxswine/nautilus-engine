// Proof-process bookkeeping only; loaded before each Node foreground child and
// inherited by Node's own test-file workers. No runtime/API substitution.
import fs from 'node:fs';
const target=process.env.NAUTILUS_STACK_PROCESS_RECORD;
if(!target)throw Error('A task-owned process record is required.');
const Clock=Date,observedStartAt=new Clock().toISOString();
const identity={owner:process.env.NAUTILUS_STACK_PROCESS_OWNER,project:'Nautilus Engine',purpose:process.env.NAUTILUS_STACK_PROCESS_PURPOSE,pid:process.pid,parentPid:process.ppid,executable:process.execPath,observedStartAt,foreground:true,ports:[],endCondition:'foreground command exit',stopMethod:'owning synchronous process handle'};
fs.appendFileSync(target,JSON.stringify({...identity,event:'start'})+'\n');
process.once('exit',code=>fs.appendFileSync(target,JSON.stringify({...identity,event:'exit',endedAt:new Clock().toISOString(),code})+'\n'));
