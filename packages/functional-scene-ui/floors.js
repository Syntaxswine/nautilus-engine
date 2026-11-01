import {createFloorNavigation} from '../floor-navigation/index.js';
import {mountFloorNavigation} from '../floor-navigation/dom.js';
// Observes host-confirmed floor identity. Visibility never changes queries or movement.
export function mountPlayerFloors(container,{floors,initialFloorId,onVisibility=()=>{},onError=()=>{}}={}){
  const doc=container.ownerDocument,element=doc.createElement('section');element.className='nautilus-player-floors';
  const controls=doc.createElement('div'),transition=doc.createElement('p');transition.className='npf-transition';transition.setAttribute('role','status');transition.setAttribute('aria-live','polite');element.append(controls,transition);container.append(element);
  const controller=createFloorNavigation({floors,selectedId:initialFloorId}),widget=mountFloorNavigation(controls,controller,{keyboardTarget:element,onError});let actor=null,lastVisibility='',disposed=false;
  const unsubscribe=controller.subscribe(state=>{
    const value={selectedFloorId:state.selectedId,visibleFloorIds:controller.visibleFloors.map(floor=>floor.id),mode:state.mode};
    const key=JSON.stringify(value);if(key===lastVisibility)return;lastVisibility=key;try{onVisibility(value);}catch(error){onError(error);}
  });
  function updateActor(value){
    if(disposed)return;
    try{
      if(value===null){actor=null;controller.setCharacter(null);transition.textContent='No confirmed character floor.';return;}
      const floor=floors.find(floor=>floor.id===value.confirmedFloorId);
      if(!floor)throw Error('The host has not confirmed an available character floor.');
      if(!actor||actor.id!==value.id||actor.confirmedFloorId!==value.confirmedFloorId){
        const first=!actor;controller.setCharacter({id:value.id,floorId:value.confirmedFloorId});actor={id:value.id,confirmedFloorId:value.confirmedFloorId};if(first)controller.followCharacter();
      }
      if(value.transition){
        const from=floors.find(floor=>floor.id===value.transition.fromFloorId),to=floors.find(floor=>floor.id===value.transition.toFloorId);
        if(!from||!to)throw Error('The host traversal references an unavailable floor.');
        transition.textContent='Between floor '+from.label+' and '+to.label+' · last confirmed floor '+floor.label;
      }else transition.textContent='Character confirmed on floor '+floor.label;
      return true;
    }catch(error){transition.textContent='Floor tracking unavailable. '+error.message;onError(error);return false;}
  }
  return Object.freeze({element,controller,updateActor,dispose(){if(disposed)return;disposed=true;unsubscribe();widget.dispose();controller.dispose();element.remove();}});
}