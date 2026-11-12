import {createSetupConfiguration,validatePlayerSetup,SETUP_PORTS,output,createDefaultWorld,flatYardContent,type SetupProvider} from '@nautilus-engine/map-core/player-setup';
import {mountPlayerSetup} from '@nautilus-engine/map-core/player-setup/browser';
import {nativeActor} from '@nautilus-engine/map-core/native-actors';
import {createVehicleYard,vehicleYardContent,type VehicleQueries} from '@nautilus-engine/map-core/vehicles';
import {contactShape,moveWithContacts} from '@nautilus-engine/map-core/traversal';
const content=flatYardContent({sourcePin:'0640dab2f8dfe5d9facbe9ded831855e0376d22a'});
const config=createSetupConfiguration({content:content.identity,model:'goat'});
const provider:SetupProvider={descriptor:{id:'fixture',version:1,ports:[output(SETUP_PORTS.pose)]},services:{}};
validatePlayerSetup(config,{providers:[provider],content});nativeActor('goat');
const world=createDefaultWorld(content,{actorId:'player'});world.walking.request({version:1,actorId:'player',vector:{x:1,y:0},seconds:.1});
void mountPlayerSetup(document.createElement('main'),{content,configuration:config});
// @ts-expect-error unsupported native model is not inferred
createSetupConfiguration({content:content.identity,model:'bear'});
// @ts-expect-error recipe version is explicit
config.version=2;
// @ts-expect-error ground vectors require both axes
world.walking.request({version:1,actorId:'player',vector:{x:1},seconds:.1});
// @ts-expect-error service ports carry semantic roles, not arbitrary strings
provider.descriptor.ports=[{...SETUP_PORTS.pose,role:'button-click'}];
// @ts-expect-error setup needs actual DOM container
void mountPlayerSetup({}, {content,configuration:config});
const disc=contactShape({id:'walker',points:[{x:1,y:1}],radiusM:.28,minH:0,maxH:1.8});
const roadContent=vehicleYardContent({sourcePin:'98064c34c7bb4fc3c1343f2e450d570ec38615f2'});
const legacyQueries:VehicleQueries={check:()=>({ok:true}),snapshot:()=>({})};void legacyQueries;
moveWithContacts(disc,{x:.2,y:.3},[],{profile:'slide-v1'});
// @ts-expect-error unknown contact policies require an explicit implementation
moveWithContacts(disc,{x:1,y:0},[],{profile:'slippery-magic'});
// @ts-expect-error contact geometry has numeric metre units
contactShape({id:'bad',points:[{x:1,y:1}],radiusM:'wide'});
// @ts-expect-error vehicle collision profiles cannot be silently invented
createVehicleYard(roadContent, {collisionProfile:'ghost'});
// @ts-expect-error walking policies cannot be silently invented
createVehicleYard(roadContent, {movementProfile:'ghost'});
