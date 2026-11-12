import {mountPlayerUI,createPlayerConfiguration,PLAYER_PORTS,providerPort,validatePlayerConfiguration} from '../index.js';
import type {PlayerProvider,PlayerIntent,PlayerUI,ControlContext} from '../index.js';
import {mountTrainControls} from '../../train-ui/index.js';
import type {TrainConnector} from '../../train-core/index.js';
declare const slot:HTMLElement,provider:PlayerProvider,session:TrainConnector,walking:HTMLElement;
const configuration=createPlayerConfiguration({content:{id:'yard',version:1,sourcePin:'7f50cb2a48aef87a16fc0465997549be9ed88dc2'}});
const mounted:Promise<PlayerUI>=mountPlayerUI(slot,{providers:[provider],configuration});void mounted;
validatePlayerConfiguration(configuration,{providers:[provider]});providerPort(PLAYER_PORTS.walking);
const action:PlayerIntent={version:1,type:'action',providerId:'trains',actionId:'entry',context:'1',offer:'displayed'};void action;
declare const ui:PlayerUI,context:ControlContext;
ui.dispatch({version:1,type:'control',context:context.token,offer:'cab/lease',control:{kind:'notch',notch:1}});ui.dispose();
const train=mountTrainControls(slot,{session,actorId:'player',walkingElement:walking,setWalkingEnabled(){},actionPresentation:'external'});train.requestAction('displayed',train.readActionView().context);train.requestControl({kind:'brake'},train.readControlView().context||'');
// @ts-expect-error Configuration versions cannot silently change.
configuration.version=2;
// @ts-expect-error Player UI has no world clock.
ui.advance(1);
// @ts-expect-error Agent intents cannot provide user-activation provenance.
ui.dispatch({...action,event:{isTrusted:true}});
// @ts-expect-error Input context is confirmed read-only state.
context.mode='driver';
// @ts-expect-error Requested notches are finite supported detents.
train.requestControl({kind:'notch',notch:7},'stamp');
// @ts-expect-error Only explicit action presentation profiles are accepted.
mountTrainControls(slot,{session,actorId:'player',walkingElement:walking,setWalkingEnabled(){},actionPresentation:'both'});
// @ts-expect-error No new actor is bootstrapped by the UI.
mountPlayerUI(slot,{providers:[provider],configuration,actorBootstrap:{}});
