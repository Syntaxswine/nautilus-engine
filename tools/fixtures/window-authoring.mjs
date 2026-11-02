// Executable authoring fixtures only; no handwritten compiled/runtime records.
import {blankMap,engineManifest} from '../../packages/map-core/index.js';
import {WINDOW_HOST_SERVICES} from '../../packages/windows-core/index.js';
import {createWindowAuthoring,windowPlacementAtEdge,windowAuthoringDimensions,WINDOW_AUTHORING_CONTRACT} from '../../packages/windows-authoring/index.js';
export function windowAuthoringFixture({tall=false,empty=false}={}) {
  const base=blankMap('Native window authoring');
  base.edges={'s:20:21':'wall-brick','s:21:21':'window-brick','s:22:21':'wall-concrete'};
  base.metadata={retained:{hp:37,ap:0,clock:.125,ordered:['keep',7,'7']}};
  const placement=windowPlacementAtEdge(tall?{id:'sheet-'+('native-'.repeat(10)),definitionId:'window.full.borderless',edge:'s:40:60',dimensions:windowAuthoringDimensions(20,5,'storeys')}:{id:'native-pane-a',definitionId:'window.full.clear.3m',edge:'s:20:21'});
  return createWindowAuthoring({id:'authoring-scene',worldId:'authoring-world',baseBlueprint:base,placements:empty?[]:[placement],bindings:empty?[]:[{placementId:placement.id,engineInstanceId:'native-visual-a'}]});
}
export function windowAuthoringConsumer({bound=false}={}) {
  const consumer=engineManifest();consumer.id='window-authoring-test-consumer';
  if(!consumer.schemas.some(s=>s.id===WINDOW_AUTHORING_CONTRACT.kind))consumer.schemas.push({id:WINDOW_AUTHORING_CONTRACT.kind,versions:[1]});
  if(bound)consumer.capabilities.push(...WINDOW_HOST_SERVICES.map(s=>({id:s.id,versions:[1]})));
  return consumer;
}
