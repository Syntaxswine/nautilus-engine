// Small serializable artist contract; no plugin framework or simulation implementation.
import {WALK,freeze} from './designs.js';
export const FRONTIER_CONNECTORS=freeze({
  schema:'nautilus-art-connectors',version:1,status:'Artist collection contract; pending architect promotion',units:'metres',
  profile:{...WALK,minimumClearHeight:1.8,meaning:'Wall-axis endpoint plus an inset walking-lane center at the standard datum.'},
  matching:['Same profile and coincident wall-axis endpoints','Opposite outward tangent directions',
    'Coincident walkway centers, widths and standard heights','Clearance volumes and reserved physical bounds fit the chosen neighbors'],
  roles:['wall-run','wall-corner','wall-return','main-gate','rear-gate','gate-leaves','corner-tower','platform','stair','shelter-bay','terminal-post','building'],
  rotations:[0,90,180,270],placement:'3 m perimeter grid; .5 m authored footprint subdivisions; exact unit instance scale.',
  ordinary:{wallHeight:2,wallThickness:.16,slabThickness:.12,floorInterval:2.12},
  stair:{profile:'nautilus-art-u-stair-v1',rise:2.12,risers:14,flightWidth:1.3,minimumClearFlightWidth:1.25,run:2.8,
    returnDepth:1.2,upperLandingDepth:1,sideExitVariantLandingDepth:1.5,
    note:'Upper side exits use the explicit extended landing and omit the guard on the connected side.'},
  frontendSpecific:{logDiameter:.25,logBodyHeight:3.12,maximumPointHeight:3.42,woodGuardConstruction:'Artist geometry; no structural rating.',
    gateOpening:'Main gate rough aperture 4 × 4.12 m; frame and fittings reduce the fully open envelope. See each portal record.'},
  futureReuse:'Roles, metre origins, quarter turns, native attachment datums, named pivots, clearances and matching rules can be reused by later castle or chain-link collections.',
  futureChanges:'Different wall thicknesses, panels, posts, corners, towers, walk widths, gates and stairs require their own geometry and explicit transition adapters. Material replacement alone does not prove compatibility.',
  unsupported:['Arbitrary-angle or scaled module joins','Automatic mirroring','Mixing unequal walkway heights/offsets without a transition',
    'Plugging a U return directly into a collinear straight-run socket','Automatic terrain fitting','Automatic collision, navigation, ballistics, structural or fire support'],
  consumerSupport:{editorProvider:false,collision:false,navigation:false,ballistics:false,fire:false}
});
