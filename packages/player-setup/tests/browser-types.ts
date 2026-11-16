import {mountPlayerSetup,createSetupConfiguration,flatYardContent,retainTrainYard,createRetainedFrameSource,type SetupSurface,type RetainedTrainHost,type SetupCheckpoint} from '../browser.js';
import {prepareNativeActor} from '../../native-actors/three.js';
declare const container:HTMLElement,host:RetainedTrainHost,surface:SetupSurface;
const content=flatYardContent({sourcePin:'290926270b04c739e78efb427f330db9483ec847'});
const configuration=createSetupConfiguration({content:content.identity});
const setup=await mountPlayerSetup(container,{content,configuration});
setup.dispatch({version:1,type:'configuration',configuration});setup.dispatch({version:1,type:'menu',open:true});
setup.readActions().actions.forEach(action=>setup.dispatch(action.intent));
const saved:SetupCheckpoint=setup.checkpoint();await setup.restoreCheckpoint(saved);await setup.dispose();
const clock=createRetainedFrameSource();retainTrainYard({host,surface,clock,content:content.identity,setUIPaused(blocked){void blocked;}});
const actor=await prepareNativeActor({renderer:surface.renderer,actorId:'player',model:'goat'});actor.updateConfirmed({actorId:'player',revision:0,mode:'on-foot',position:{x:0,y:0,h:0}});actor.dispose();
// @ts-expect-error The retained clock and explicit pause gate are required services.
retainTrainYard({host,surface,content:content.identity});
// @ts-expect-error Native animation must consume a confirmed pose rather than a move request.
actor.updateConfirmed({actorId:'player',vector:{x:1,y:0},seconds:.05});
// @ts-expect-error Setup dispatch uses its full recipe kind, not a UI-only recipe.
setup.dispatch({version:1,type:'configuration',configuration:{...configuration,kind:'nautilus-player-ui-configuration'}});
// @ts-expect-error Setup checkpoints cannot stand in for arbitrary world saves.
await setup.restoreCheckpoint({kind:'save',version:1});
// @ts-expect-error Only documented native motion profiles are available.
await prepareNativeActor({renderer:surface.renderer,actorId:'player',motion:'run-and-fire'});
