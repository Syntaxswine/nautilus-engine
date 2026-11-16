import {createVehicle,stepVehicle,vehicleYardContent,createVehicleYard,type VehicleControl,type VehicleCommand} from '@nautilus-engine/map-core/vehicles';
const car=createVehicle({id:'car',body:'pickup',position:{x:6,y:7,h:0}});
stepVehicle(car,{throttle:1,steering:.3,held:true},.05);
const content=vehicleYardContent({sourcePin:'0000000000000000000000000000000000000000'}),yard=createVehicleYard(content);
const expected=yard.connector.readForActor('player').expected;
yard.connector.dispatch({version:1,type:'board',actorId:'player',vehicleId:'compact',seatId:'driver',expected});
// @ts-expect-error unknown body cannot become an approved native vehicle
createVehicle({id:'bad',body:'speedboat',position:{x:0,y:0,h:0}});
// @ts-expect-error held/released state is explicit
const missingHeld:VehicleControl={throttle:1,steering:0};
// @ts-expect-error throttle is normalised numeric data
const wrongAxis:VehicleControl={throttle:'forward',steering:0,held:true};
// @ts-expect-error leases are required for every drive request
const noExpectation:VehicleCommand={version:1,type:'control',actorId:'player',owner:'ui',throttle:1,steering:0,held:true};
// @ts-expect-error only authored seats are supported
yard.connector.dispatch({version:1,type:'board',actorId:'player',vehicleId:'compact',seatId:'roof',expected});
