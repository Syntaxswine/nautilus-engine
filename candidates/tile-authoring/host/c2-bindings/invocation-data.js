// A current observed authority fact is temporary, not an allow-pending flag.
// This pure guard is used only inside the real same-owner Host; it does not
// authenticate a constructor or mint authority. No recursive authority read.
import {need,own,field} from './data.js';
export function matchesActualAuthorityInvocation(input){
 const v=own(input,['authority','codec','observation','invocation','purpose','before','operation','pending','wal']);
 const {authority,codec,observation,invocation,purpose,before,operation,pending,wal}=v;
 try{
  need((purpose==='stage'||purpose==='commit')&&authority.codec===codec,'C2_HOST_INVOCATION');
  need(invocation&&observation.isCurrentInvocation(invocation)===true,'C2_HOST_INVOCATION');
  need(field(invocation,'method')===purpose&&field(invocation,'phase')===purpose&&field(invocation,'requestId')===field(operation,'id'),'C2_HOST_INVOCATION');
  const args=field(invocation,'arguments');need(Array.isArray(args)&&args.length===2&&args[0]===(purpose==='stage'?operation:pending),'C2_HOST_INVOCATION');
  const expectedBefore=purpose==='stage'?codec.serialize(before):field(field(wal,'pending'),'checkpointJSON');
  const expectedNext=field(field(wal,purpose==='stage'?'pending':'committed'),'checkpointJSON');
  // Full checkpoint JSON includes the pending operation. codec.token excludes
  // pending and therefore cannot fence this actual-WAL domain by itself.
  need(codec.serialize(field(invocation,'before'))===expectedBefore&&codec.serialize(field(invocation,'next'))===expectedNext,'C2_HOST_INVOCATION');
  need(observation.isCurrentInvocation(invocation)===true,'C2_HOST_INVOCATION');return true;
 }catch{return false;}
}
