import data from './work-profiles.json' with {type:'json'};
import {freeze} from '../data.js';
export const WORK_PROFILES=freeze(data.profiles);
