import {createTrainYardApplication} from './train-yard-application.js';
const app=createTrainYardApplication({container:document.querySelector('#player-layer'),canvas:document.querySelector('#yard')});
window.trainYard=app;
addEventListener('pagehide',()=>{void app.dispose();},{once:true});
try{await app.ready;document.querySelector('#startup').remove();}catch(error){document.querySelector('#startup').textContent='Yard unavailable: '+error.message;}
