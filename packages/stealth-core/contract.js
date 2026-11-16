import {FEATURE_IDS} from '../map-core/contract-manifest.js';
export const FOLIAGE_CAPABILITY=FEATURE_IDS.foliage;
export const STEALTH_PROFILE='aft-exposure-v1';
export const STEALTH_CONTRACT=Object.freeze({id:'nautilus-shared-stealth',version:1,profile:STEALTH_PROFILE,units:'metres, seconds, degrees; AP and stamina are host resources',headings:'0=+x,90=+y',clock:'confirmed host time/action boundaries only',geometry:'host owns body exposure/illumination/solid collision; foliage queries are separate',randomness:'none; no combat or acquisition RNG',saves:'complete strict v1 state, portable characters, durable command receipts; host saves world/native/clock atomically'});
