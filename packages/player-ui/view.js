import {mountTrainControls} from '../train-ui/index.js';
import {mountVehicleControls} from '../vehicle-ui/index.js';
import {mountTitleScreen} from '../game-ui/title.js';
import {mountWalkingControl} from './walking.js';
import {componentSettings,VIEW_SERVICE} from './configuration.js';
import {PLAYER_PORTS} from './descriptors.js';
import {prepareSkin} from './resources.js';

const endpoint=(services,name)=>services[PLAYER_PORTS[name].id];
export function assertScene(scene,configuration) {
  if(!scene||typeof scene.read!=='function'||typeof scene.subscribe!=='function')throw Error('SCENE_NOT_READY: bind a retained scene reader/subscription.');
  if(!['id','version','sourcePin'].every(k=>scene.content?.[k]===configuration.content[k]))throw Error('CONTENT_REBIND_REQUIRES_STAGE2: bind the exact retained content version and source pin.');
  if(!scene.actorIds?.includes(configuration.actorId))throw Error('ACTOR_NOT_READY: bind a retained mover for the selected actor.');
  const s=scene.read(configuration.actorId);
  if(s.version!==1||s.actorId!==configuration.actorId||!['on-foot','driver','rider'].includes(s.mode)||typeof s.contextId!=='string')throw Error('SCENE_SCHEMA: provide confirmed version1 player state.');
  return s;
}

// Existing runtime-core owns prepare/rollback/disposal. This module prepares
// detached owned DOM only; activation is the shell's single pointer transfer.
export function viewFactory({doc,configuration,signal,resourceURL,inScope,isCurrent,onVisibility,onFocus,onSettings,onError,titleVisible}) {
  return () => {
    const view={active:false,stage:null,titleStage:null,walking:null,train:null,vehicle:null,title:null,camera:null,services:null};let disposed=false;
    const handle={services:{[VIEW_SERVICE]:view},
      async prepare({services}) {
        view.services=services;assertScene(endpoint(services,'scene'),configuration);
        for(const [name,methods]of [['pause',['acquire']],['bounds',['publish']],...(componentSettings(configuration,'player.walking')?[['walking',['request']]]:[])])for(const method of methods)if(typeof endpoint(services,name)?.[method]!=='function')throw Error(name.toUpperCase()+'_NOT_READY: bind '+method+'.');
        view.material=await prepareSkin(doc,componentSettings(configuration,'player.shell').skin,signal,resourceURL);
        if(signal.aborted)throw Error('PREPARATION_CANCELLED');
        const camera=componentSettings(configuration,'player.camera');
        if(camera){if(typeof endpoint(services,'camera')?.prepare!=='function')throw Error('CAMERA_NOT_READY: bind staged camera settings.');view.camera=await endpoint(services,'camera').prepare({...camera},{signal});if(typeof view.camera?.commit!=='function'||typeof view.camera?.dispose!=='function')throw Error('CAMERA_SCHEMA: prepare must return commit/dispose.');}
        view.stage=doc.createElement('div');view.stage.className='pui-control-stage';view.titleStage=doc.createElement('div');
        if(componentSettings(configuration,'player.walking'))view.walking=mountWalkingControl(view.stage,{inScope:node=>view.active&&isCurrent(view)&&inScope(node)});
        else {const placeholder=doc.createElement('div');placeholder.hidden=true;view.stage.append(placeholder);view.walking={element:placeholder,release(){},setEnabled(){placeholder.hidden=true;},read:()=>({x:0,y:0}),focus(){},dispose(){placeholder.remove();}};}
        const trains=componentSettings(configuration,'player.trains');
        if(trains){view.train=mountTrainControls(view.stage,{session:endpoint(services,'trains'),actorId:configuration.actorId,walkingElement:view.walking.element,steamProfile:trains.steamProfile,muted:trains.muted,actionPresentation:'external',setWalkingEnabled:enabled=>{if(!enabled)view.walking.setEnabled(false);},focusWalking:()=>{if(view.active&&isCurrent(view))onFocus();},onError});view.train.setBlocked(true);}
        if(componentSettings(configuration,'player.vehicles'))view.vehicle=mountVehicleControls(view.stage,{connector:endpoint(services,'vehicles'),actorId:configuration.actorId,inScope:node=>view.active&&isCurrent(view)&&inScope(node),onError});
        view.walking.setEnabled(false);
        if(componentSettings(configuration,'player.title')){
          const title=endpoint(services,'title');if(!title||typeof title.options?.onStart!=='function')throw Error('TITLE_NOT_READY: bind the existing title-flow callbacks.');
          const options=title.options,owned=callback=>async args=>{if(!view.active||!isCurrent(view)||args.signal.aborted)throw Error('TITLE_RETIRED');return callback(args);};
          view.title=mountTitleScreen(view.titleStage,{...options,focus:false,onStart:owned(options.onStart),onContinue:options.onContinue&&owned(options.onContinue),onSettings:async()=>{if(view.active&&isCurrent(view))onSettings();},focusGame:()=>{if(view.active&&isCurrent(view))onFocus();},onVisibilityChange:visible=>{if(view.active&&isCurrent(view))onVisibility(visible);},onError});
          if(!titleVisible)view.title.hide();
        }
        if(signal.aborted)throw Error('PREPARATION_CANCELLED');
      },
      start(){},
      stop(){view.active=false;view.walking?.release();view.train?.releaseInput('view-stopped');view.vehicle?.releaseInput();},
      dispose(){if(disposed)return;disposed=true;view.active=false;const errors=[];for(const close of [()=>view.title?.dispose(),()=>view.train?.dispose(),()=>view.vehicle?.dispose(),()=>view.walking?.dispose(),()=>view.camera?.dispose(),()=>view.stage?.remove(),()=>view.titleStage?.remove()])try{close();}catch(error){errors.push(error);}if(errors.length)throw new AggregateError(errors,'Player view cleanup failed.');}
    };
    return handle;
  };
}
