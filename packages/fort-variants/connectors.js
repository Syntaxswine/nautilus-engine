import {FRONTIER_CONNECTORS} from '../frontier-fort/connectors.js';
import {freeze} from './designs.js';
const {frontendSpecific,...shared}=structuredClone(FRONTIER_CONNECTORS);
export const VARIANT_CONNECTORS=freeze({...shared,
  status:'Original castle / cyclone art variants; shared editor intake candidate',
  roles:[...FRONTIER_CONNECTORS.roles,'transition'],
  constructionProfiles:{
    castle:{rampartBodyDepth:1.82,bodyTop:2,deckTop:2.12,frontParapetThickness:.32,merlonTop:3.42,
      detail:'Filled masonry rampart, ashlar parapet/merlons, real stone arches and accessible tower battlements.'},
    cyclone:{fenceHeight:3.42,postRadius:.055,wireDiameter:.009,diagonalInterceptPitch:.15,catwalkTop:2.12,
      detail:'Explicit diamond-wire geometry, galvanized frame/posts, open grated catwalks, open-riser steel stairs, elevated glazed guard cabins at 4.24 m.'}},
  compatibility:'The wall-axis, inward walk offset, standard height, widths and clearances are identical to the fixed 6d9dfeca frontier profile. Native scale only.',
  collarOwnership:'Matching end posts/collars occupy the declared common joint envelope; they may coincide. Unrelated solids must stay clear of the walking lane and approach volumes.',
  transitions:['link-castle-to-cyclone','link-cyclone-to-castle'],
  futureReuse:'Descriptive roles and native socket semantics are shared by all three artist families.',
  futureChanges:'These variants author different construction geometry. Their common sockets do not imply common collision, terrain, structural, ballistic or fire behavior.'});
