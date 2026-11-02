import {createSharedTileAuthoringController} from '../hub.mjs';
import type {BorrowedWorkbench} from '../../c2-host-bridge/bridge.mjs';
import type {ResourceActions} from '../resource-control.mjs';
import {mountSharedTileAuthoringUI} from '../mount.mjs';
import type {PairingAdapter} from '../../c2-read-pairing/adapter.mjs';
declare const binding:BorrowedWorkbench;
const hub=createSharedTileAuthoringController(binding,{isAdditionalConnectionCurrent:()=>true});
const library=hub.attach(binding,{}),overlay=hub.attach(binding,{strictCallbackReads:true,readAdditionalData:v=>v.overlay,isAdditionalConnectionCurrent:()=>true});
library.stage('recipe.create',(_snapshot,_view,raw)=>({expected:raw.snapshot.expected}));overlay.history('save');
// @ts-expect-error Overlay comparison and currentness must be supplied together.
hub.attach(binding,{strictCallbackReads:true});
// @ts-expect-error No injectable replacement executor/controller factory exists.
createSharedTileAuthoringController(binding,{isAdditionalConnectionCurrent:()=>true,createController(){}});
// @ts-expect-error Borrowed view cannot refresh Expected in place.
library.view!.snapshot.expected.workspaceRevision=8;
// @ts-expect-error Pending is an observation of the same actual Root controller.
overlay.pending=false;
// @ts-expect-error Diagnostics do not grant permission and are readonly.
hub.diagnostics().attachments=100;
// @ts-expect-error No new pending-prepare cancellation alias/service verb.
overlay.cancelPendingPreparation();
// @ts-expect-error Only existing borrowed history alternatives are forwarded.
library.history('commit');
const resourceActions:ResourceActions={loadSelected:actualIssuedRead=>({ready:true,observed:actualIssuedRead.overlay.chosenArtwork})};
declare const paired:PairingAdapter,container:HTMLElement;
mountSharedTileAuthoringUI({libraryContainer:container,overlayContainer:container,binding:paired.binding,isAdditionalConnectionCurrent:()=>paired.isConnectionCurrent(),libraryOptions:{tiles:{},authoring:{},rectangleSpec:()=>({})},resourceActions});
// @ts-expect-error Root's optional load action must be an actual function port.
const invalidResourceAction:ResourceActions={loadSelected:true};
