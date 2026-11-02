import {mountC2OverlayUI} from '../component.js';
import type {BorrowedWorkbench,BorrowedCoordinator,Options} from '../component.js';
import type {ExistingC1Read,RetainedFirstMarkForm} from '../../../../../docs/reviews/tile-authoring/ui/c2/projection/projection.js';
type Hit={readonly from:'existing-input-owner'};
type Thumbnail={readonly from:'existing-thumbnail-owner'};
declare const container:HTMLElement;
declare const workbench:BorrowedWorkbench<ExistingC1Read,Hit,Thumbnail>;
declare const coordinator:BorrowedCoordinator<ExistingC1Read>;
const options:Options<ExistingC1Read,Hit,Thumbnail>={attachCoordinator(binding,callbacks){const sameService= binding.service;const completeProjection=callbacks.readAdditionalData(binding.getSnapshot());const required:true=callbacks.strictCallbackReads;void [sameService,completeProjection,required];return coordinator;}};
const ui=mountC2OverlayUI(container,workbench,options);
ui.acceptCanvasSelection({from:'existing-input-owner'});ui.refresh();ui.dispose();
mountC2OverlayUI(container,workbench,{attachCoordinator:null});
// @ts-expect-error no alternate UI authority or new service constructor option
mountC2OverlayUI(container,workbench,{...options,authority:{}});
// @ts-expect-error canvas coordinates do not replace the existing input owner's hit
ui.acceptCanvasSelection({x:2,y:3});
// @ts-expect-error a thumbnail URL cannot replace the live owner presentation adapter
mountC2OverlayUI(container,workbench,{...options,thumbnailPresentation:{url:'image.png'}});
// @ts-expect-error optional canvas owner must supply cancellation/quarantine
mountC2OverlayUI(container,workbench,{...options,canvasInput:{subscribeSelection(){return()=>{};}}});
// @ts-expect-error borrowed service identity is not mutable through UI's contract
workbench.service={};
declare const first:RetainedFirstMarkForm;
// @ts-expect-error an otherwise valid form does not accept a UI-made request ID
workbench.overlayPorts.constructOverlayCommand(workbench.getSnapshot(),{...first,requestId:'ui-made'});
