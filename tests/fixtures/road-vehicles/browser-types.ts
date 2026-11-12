import {mountVehicleYard} from '@nautilus-engine/map-core/vehicles/browser';
import {createRoadVehicleKit} from '@nautilus-engine/map-core/vehicles/three';
import {createSetupConfiguration} from '@nautilus-engine/map-core/player-setup';
import {retainVehicleYard} from '@nautilus-engine/map-core/player-setup/browser';
import {createPlayerConfiguration,type PlayerIntent,type RoadVehicleCameraFrame} from '@nautilus-engine/map-core/player-ui';
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
const frame:RoadVehicleCameraFrame={version:1,kind:'road-vehicle',connectorId:'road-yard',vehicleId:'compact',centre:{x:6,y:7,h:0},headingRad:0,bounds:{min:{x:5,y:5,h:0},max:{x:7,y:9,h:2}}};
// @ts-expect-error the optional frame has an explicit version1 contract
const futureFrame:RoadVehicleCameraFrame={...frame,version:2};
// @ts-expect-error ground x/y and height h cannot be replaced with renderer z
const wrongFrame:RoadVehicleCameraFrame={...frame,centre:{x:6,y:7,z:0}};
