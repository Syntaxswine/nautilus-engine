import {mountVehicleYard} from '../../packages/vehicle-ui/yard.js';
import {vehicleYardContent} from '../../packages/vehicle-core/index.js';
const params=new URL(location.href).searchParams;
try{const contentPin=params.get('contentPin'),mount=checkpoint=>mountVehicleYard(document.querySelector('#game'),{...(contentPin?{content:vehicleYardContent({sourcePin:contentPin})}:{}),profile:params.get('quality')==='full'?'full':'game',autoClock:params.get('manual')!=='1',...(checkpoint?{checkpoint}:{}),onError:(e,c)=>console.error(c.phase+': '+e.message)});window.restoreVehicleYard=mount;window.vehicleYard=await mount();document.querySelector('#loading')?.remove();addEventListener('pagehide',()=>{void window.vehicleYard.dispose();},{once:true});}
catch(e){document.querySelector('#loading').textContent='The yard could not start: '+e.message;throw e;}
