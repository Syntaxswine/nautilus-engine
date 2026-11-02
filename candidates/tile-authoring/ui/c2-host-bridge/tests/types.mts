import {createC2HostBridge} from '../bridge.mjs';
import type {BorrowedWorkbench} from '../bridge.mjs';
import type {IdOwner,SourceReadOwner} from '../ports.js';
import type {Form,RetainedFirstMarkForm} from '../vendor/ui057/projection.js';
declare const workbench:BorrowedWorkbench;
declare const sourceOwner:SourceReadOwner<object>;
const bridge=createC2HostBridge(workbench,{sourceOwner});
const read=bridge.getSnapshot();
declare const form:Form;
declare const retained:RetainedFirstMarkForm;
const data=bridge.overlayPorts.constructOverlayCommand(read,form);
if(data.status==='constructed'){
 const id:string=data.command.requestId;
 // @ts-expect-error Construction is finite data, not an authoring attempt.
 data.authoringAttempt;
}
const two=bridge.overlayPorts.constructOverlayCommand(read,retained);
if(two.status==='constructed'){
 const kind:'surface.layers'=two.command.operations[0].kind;
 // @ts-expect-error Retained first mark has exactly two operations.
 two.command.operations[2];
}
// @ts-expect-error Complete displayed Expected cannot be refreshed in place.
read.overlay.basis.expected.workspaceRevision=42;
// @ts-expect-error No eighth service cancellation verb is introduced.
workbench.service.cancelPendingPreparation;
// @ts-expect-error The removed construction-attempt port is not accepted.
createC2HostBridge(workbench,{sourceOwner,constructionOwner:{begin(){}}});
const allocator:IdOwner<object>={
 // @ts-expect-error Pre-command allocation receives source/counts, no attempt.
 allocate(source,attempt,counts){return{requestId:'r',opIds:[],layerIds:[],markIds:[],chunkIds:[]};}
};
