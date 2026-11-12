const wood='../../vendor/tinderbox-train-controls/fb0628605c274550ff8abad50b151843f08747d1/vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/hybrid-surfaces/wood-factory-v2.png';
const switches='../../vendor/farmyard/b2f2b6bd033cc3dbc8b572caa251244d283829c8/sites/tactical-animal/dist/assets/ui/industrial-switches/switch-skins-v2.webp';
export const PLAYER_SKIN_RESOURCES=Object.freeze({farmyard:Object.freeze([new URL(switches,import.meta.url).href]),tinderbox:Object.freeze([new URL(wood,import.meta.url).href])});
export async function prepareSkin(doc,skin,signal,resolve=url=>url) {
  const urls=[];
  for(const original of PLAYER_SKIN_RESOURCES[skin])await new Promise((accept,reject)=>{
    const resolved=new URL(resolve(original),doc.baseURI),local=new URL(doc.baseURI);
    if(!['http:','https:','file:','blob:'].includes(resolved.protocol)||resolved.origin!==local.origin)throw Error('RESOURCE_ORIGIN: keep prepared skin resources in the package origin.');
    const img=new doc.defaultView.Image(),url=resolved.href;urls.push(url);let settled=false;
    const finish=error=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);img.onload=img.onerror=null;img.removeAttribute('src');error?reject(error):accept();};
    const abort=()=>finish(new DOMException('Player UI preparation cancelled.','AbortError'));
    if(signal.aborted){abort();return;}
    signal.addEventListener('abort',abort,{once:true});img.onload=()=>finish();img.onerror=()=>finish(Error('RESOURCE_NOT_READY: '+url));img.src=url;
  });
  return urls[0];
}
