import grammar from './browser.schema.json' with {type:'json'};
import profile from './profile.json' with {type:'json'};
import digest from './profile-digest.json' with {type:'json'};
import catalogue from './resource-catalogue.json' with {type:'json'};
import coverage from './coverage.json' with {type:'json'};
import {freeze} from '../data.js';
export {LIMITS,CAPS,REQUIRED,STAGE_A,STAGE_B} from '../contract.js';
export const BROWSER_SCHEMA=freeze(grammar),PROFILE=freeze(profile),PROFILE_DIGEST=digest.profileDigest,COVERAGE=freeze(coverage);
export const PROFILES=freeze({host:profile.hostProfile,appearance:'owner-local-rectangle-appearance-v1',ledger:profile.ledgerProfile,accounting:profile.id+'@'+profile.version,decoder:'png-rgba8-srgb-straight-v1',sampler:'linear-premultiplied-bilinear-frame-v1',clip:'candidate.level-rectangle-top-v1'});
export const SCOPE=profile.accountingScope;

export const RESOURCE_CATALOGUE=freeze(catalogue),RESOURCE_CATALOGUE_BINDING=freeze(profile.resourceCatalogue);
