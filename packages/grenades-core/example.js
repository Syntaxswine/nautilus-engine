import {createGrenadeState} from './state.js';
import {FARMYARD_GRENADE_PROFILE as P} from './profile.js';
export function createGrenadeExample(){
 const actor=(id,team,x,y)=>({id,name:team==='squad'?'Thrower':'Guard '+id,team,species:team==='squad'?'sheep':'goat',stance:'standing',sneaking:false,cone:null,x,y,z:0,hp:90,ap:12,stamina:71.25,maxAp:12,endurance:40,weapon:'smg',grenades:team==='squad'?3:0,grenadePackRounds:team==='squad'?[3]:[],heading:0,isMoving:false,burningTurns:0,casualty:null,alert:false,lastKnown:null,alertAge:0});
 return createGrenadeState({id:'grenade-yard',world:{bounds:{x:0,y:0,w:40,h:30},grid:{width:40,height:30},visible:[],fogAt:{x:18,y:10},seen:Array.from({length:1200},(_,index)=>index%40+','+Math.floor(index/40)),boxes:[{id:'wall',x0:20.42,x1:20.58,y0:7.44,y1:13.56,z0:0,height:2,kind:'wall',windowPart:false}]},
  actors:[actor('thrower','squad',18,10),actor('near','guard',23,10),actor('far','guard',34,24)],control:{actorId:'thrower',phase:'player',status:'active',engaged:true,round:1,detected:[]},
  support:{windows:false,fueledTargets:false,volatileTargets:false,fire:false,multilevel:false,engagement:P.engagement,consequences:P.consequences}});
}
