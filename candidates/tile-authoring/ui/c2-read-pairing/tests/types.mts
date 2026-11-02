import {createC2ReadPairingAdapter} from '../adapter.mjs';
import type {BorrowedWorkbench} from '../../c2-host-bridge/bridge.mjs';
import {formFromFields,formInputOwner,fieldDefaults,createFormProducer} from '../form-producer.mjs';
declare const workbench:BorrowedWorkbench;
const adapter=createC2ReadPairingAdapter(workbench),read=adapter.getSnapshot();
const form=formFromFields(read,fieldDefaults,new Set(['width']),'first-mark');
const touches=formInputOwner.touched(read,form);
if(touches){
 // @ts-expect-error Intrinsic touches are readonly; no caller mutation.
 touches.push('mask');
 // @ts-expect-error Only explicit graphic fields, not permission/readiness flags.
 const credit:'editingWorkCredit'=touches[0];
}
// @ts-expect-error Touch provenance is not a serialized Form field.
form.touched;
// @ts-expect-error No public registration for arbitrary forms or capabilities.
formInputOwner.register(form,[]);
// @ts-expect-error Dirty intent comes from the existing Set argument, no bool flag.
formFromFields(read,fieldDefaults,true,'first-mark');
// @ts-expect-error Cannot substitute an arbitrary capability for acquisition.
adapter.acquireSelected(read,{bytes:{}});
// @ts-expect-error Returned lease identity is opaque at compile time as well.
adapter.leaseOwner.release({});
// @ts-expect-error No new source/capability adoption API exists.
adapter.adopt(read,{});
// @ts-expect-error No eighth service verb is added.
adapter.binding.service.cancelPendingPreparation;
const other=createFormProducer();other.formInputOwner.touched(read,form); // runtime foreign lookup returns null.
