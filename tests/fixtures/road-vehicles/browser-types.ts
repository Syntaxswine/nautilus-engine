import {mountVehicleYard} from '@nautilus-engine/map-core/vehicles/browser';
import {createRoadVehicleKit} from '@nautilus-engine/map-core/vehicles/three';
import {createSetupConfiguration} from '@nautilus-engine/map-core/player-setup';
import {retainVehicleYard} from '@nautilus-engine/map-core/player-setup/browser';
import {createPlayerConfiguration,type PlayerIntent} from '@nautilus-engine/map-core/player-ui';
declare const THREE:any;
const yard=await mountVehicleYard(document.querySelector('main')!);
const state=yard.setup.readControls();
const intent:PlayerIntent={version:1,type:'vehicle-control',context:state.context.token,offer:state.vehicle!.offer,control:{throttle:1,steering:.5,held:true}};
yard.setup.dispatch(intent);
createRoadVehicleKit(THREE,{bodies:['hatchback','pickup'],purpose:'authoring',profile:'game'});
createSetupConfiguration({content:yard.host.content,trains:false,vehicles:true});
createPlayerConfiguration({content:yard.host.content,vehicles:true});
retainVehicleYard({host:yard.host,content:yard.host.content,surface:yard.surface,clock:yard.clock,setUIPaused(){}});
// @ts-expect-error unknown texture profile
await yard.setVisualProfile('phone-fast');
// @ts-expect-error semantic control requires explicit release state
const incomplete:PlayerIntent={version:1,type:'vehicle-control',context:'c',offer:'o',control:{throttle:1,steering:0}};
