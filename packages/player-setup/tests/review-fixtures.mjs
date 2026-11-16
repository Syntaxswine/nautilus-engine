// Focused conformance fixture from the already-reviewed standard interaction
// yard. No runtime package imports an example or gains a second authority.
import {starterFixture} from '../../../examples/game-starter-host.js';
import {flatYardContent} from '../index.js';
export function reviewContent(){
  const f=starterFixture(),content=flatYardContent({sourcePin:'290926270b04c739e78efb427f330db9483ec847'});
  content.identity.id='setup-review-threshold-yard';content.world.id=f.world.id;content.world.name=f.world.name;content.world.floorCount=2;
  content.surfaces=f.world.surfaces;content.interactions={doors:f.state.doors,stairs:f.state.stairs};content.actors[0].position=f.actor.position;
  return content;
}
