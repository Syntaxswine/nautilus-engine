import {createGroundApplication} from './application.js';
const started=performance.now();
try{const installation=await fetch('./installation.json').then(r=>r.json());window.testGround=await createGroundApplication(document.querySelector('#ground'),{installation});window.testGroundStarted={elapsedMs:performance.now()-started,scope:'Installed page startup, including native actor and shared UI.'};document.querySelector('#loading').remove();}
catch(error){document.querySelector('#loading').textContent=error.code+': '+error.message;throw error;}
