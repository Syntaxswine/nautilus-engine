import {mountPlayerSetup,createSetupConfiguration,flatYardContent} from '../browser.js';
const content=flatYardContent({sourcePin:'290926270b04c739e78efb427f330db9483ec847'});
const setup=await mountPlayerSetup(document.querySelector('#game'),{content,
  configuration:createSetupConfiguration({content:content.identity}),resourceURL:url=>{if(window.rejectNative&&url.includes('donkey'))throw Error('TEST_NATIVE_PREPARATION_REFUSED');return url;},onError:(e,c)=>console.error(c.phase+': '+e.message)});
window.playerSetupFixture={setup,content};
addEventListener('pagehide',()=>{void setup.dispose();},{once:true});
