// Headless content metadata. No optional presentation imports or asset loading.
export const BEAR_SOURCE=Object.freeze({project:'aft-bear',commit:'4f5f53917990ec03b2f14c65f067e4b99ec8fcaa'});
export const BEAR_OUTFITS=Object.freeze(['normal','red-hats']);
export const BEAR_WEAPONS=Object.freeze(['hands','knife','pistol','rifle','assault','smg','hmg','shotgun','sniper','grenade','launcher','rpg','flamethrower']);
export const BEAR_FEATURE='nautilus-bear-appearance-v1';
export const BEAR_PRESENTATION_CONTRACT=Object.freeze({id:'nautilus-bear-presentation',version:1,metresPerUnit:1,standardStoryHeightM:2.12});
const resources=Object.freeze({mesh:'dist/tactics/bear-10k-data.json',capMesh:'dist/tactics/pig-foreman-10k-data.json',speakingHead:'dist/tactics/speaking-heads/bear-10k.json',normal:'dist/assets/characters/lowpoly-proof/bear-worker-model-paint-v1.png','red-hats':'dist/assets/characters/lowpoly-proof/bear-red-hat-model-paint-v1.png',capPaint:'dist/assets/characters/lowpoly-proof/pig-foreman-model-paint-v1.png',weaponAtlas:'dist/assets/characters/lowpoly-proof/horse-worker-light-atlas.png',grenadeSurface:'dist/assets/equipment/painted-ui/grenade-surface.png'});
export function bearResourceURL(key){if(typeof key!=='string'||!Object.hasOwn(resources,key))throw Error('Unknown bear resource: '+String(key));return new URL('../../vendor/aft-bear/'+BEAR_SOURCE.commit+'/'+resources[key],import.meta.url).href;}
export function bearResources(){return Object.entries(resources).map(([id,path])=>({id,path,url:bearResourceURL(id)}));}
export function bearSelection({outfit='normal',weapon='rifle',speaking=false}={}){if(!BEAR_OUTFITS.includes(outfit)||!BEAR_WEAPONS.includes(weapon)||typeof speaking!=='boolean')throw Error('Choose a supported bear outfit, equipment and speaking flag.');return {species:'bear',outfit,weapon,speaking};}
export function bearAsset(){return {id:'people:bear',name:'Bear worker',category:'People',dimensions:{metresPerUnit:1},source:{...BEAR_SOURCE},availability:'appearance-binding-required',requiredFeature:BEAR_FEATURE,appearanceSchema:{id:'nautilus-appearance-document',version:1},outfits:[...BEAR_OUTFITS],weapons:[...BEAR_WEAPONS],note:'Native bear provider; Guard/NPC placement requires the negotiated appearance document.'};}
export function bearMotionCapabilities(){return [
  {id:'idle',unit:'seconds',weapons:[...BEAR_WEAPONS]}, {id:'walk',unit:'metres',weapons:[...BEAR_WEAPONS]},
  {id:'posture',unit:'sample',weapons:[...BEAR_WEAPONS]}, {id:'crawl',unit:'metres',weapons:[...BEAR_WEAPONS]},
  {id:'aim-fire',unit:'seconds',weapons:['rifle'],speaking:false},
  {id:'throw',unit:'seconds',weapons:['grenade']},{id:'ladder',unit:'progress',weapons:[...BEAR_WEAPONS]},
  {id:'roof-mantle',unit:'progress',weapons:[...BEAR_WEAPONS]},{id:'descent',unit:'progress',weapons:[...BEAR_WEAPONS]},
  {id:'chair',unit:'seconds',weapons:['hands'],speaking:false},{id:'fire',unit:'seconds',weapons:['flamethrower']},{id:'burn',unit:'seconds',weapons:[...BEAR_WEAPONS],requiresRoute:true},
  {id:'speaking',unit:'radians',weapons:[...BEAR_WEAPONS],requiresSpeaking:true}
].map(capability=>({...capability,capabilityId:'nautilus-bear-motion-'+capability.id+'-v1',version:1}));}
export function bearPresentationManifest(){return {id:BEAR_PRESENTATION_CONTRACT.id,contractVersion:1,schemas:[],capabilities:bearMotionCapabilities().map(capability=>({id:capability.capabilityId,versions:[capability.version]}))};}
