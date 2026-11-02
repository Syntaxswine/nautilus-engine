import {createSharedTileAuthoringController} from '../hub.mjs';
import type {BorrowedWorkbench} from '../../c2-host-bridge/bridge.mjs';
declare const binding:BorrowedWorkbench;
const hub=createSharedTileAuthoringController(binding,{isAdditionalConnectionCurrent:()=>true}),surface=hub.attach(binding);
const displayed=surface.view;
if(displayed){
 const guard=hub.captureResourceDisplay(displayed),actualIssuedRead=guard.read();
 actualIssuedRead.overlay.chosenArtwork;
 // @ts-expect-error No caller-supplied DTO or ready flag can replace the issued read.
 guard.read({ready:true});
 // @ts-expect-error The guard cannot be retagged to return a chosen source.
 guard.read=()=>actualIssuedRead;
 // @ts-expect-error The guard observes; it cannot execute resource work.
 guard.loadSelected();
}
