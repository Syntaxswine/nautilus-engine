import {createSetupConfiguration,flatYardContent,validatePlayerSetup,createDefaultWorld,SETUP_PORTS,output,type SetupPort} from '../index.js';
import {nativeActor,confirmedActorPose,type NativePoseCheckpoint} from '../../native-actors/index.js';
const content=flatYardContent({sourcePin:'290926270b04c739e78efb427f330db9483ec847'});
const config=createSetupConfiguration({content:content.identity,model:'donkey'});
const valid=validatePlayerSetup(config,{content});
valid.configuration?.components.forEach(c=>c.settings);
const world=createDefaultWorld(content,{actorId:'player'});
confirmedActorPose(world.readPose());world.walking.request({version:1,actorId:'player',vector:{x:1,y:0},seconds:.05});
const restored=createDefaultWorld(content,{actorId:'player',checkpoint:world.checkpoint()});restored.dispose();world.dispose();
const port:SetupPort=output(SETUP_PORTS.pose);port.role='confirmed-state';
nativeActor('goat',['idle','walk']);
// @ts-expect-error Native roles must exist in the selected reviewed provider.
nativeActor('goat',['attack']);
// @ts-expect-error Unsupported native models are not silently substituted.
createSetupConfiguration({content:content.identity,model:'hen'});
// @ts-expect-error Arbitrary numeric labels cannot replace semantic roles.
port.role='number';
// @ts-expect-error A requested vector is not a saved confirmed native pose.
const checkpoint:NativePoseCheckpoint={kind:'nautilus-native-pose',version:1,model:'goat',actorId:'player',motion:'native-gait',distanceM:0,heading:0,blend:0,last:{vector:{x:1,y:0}}};
// @ts-expect-error Unknown gameplay modules need a reviewed recipe version.
config.components.push({id:'quest-engine',version:1,settings:{}});
void checkpoint;
