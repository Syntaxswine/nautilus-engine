import {negotiateCapabilities} from '../map-core/requirements.js';
import {WINDOW_HOST_SERVICES} from './contract.js';
import {data,WindowGeometryError} from './data.js';
import {windowRequirements} from './state.js';
export function windowCompatibility(value,consumer){const result=negotiateCapabilities(windowRequirements(value),consumer===undefined?undefined:data(consumer));for(const error of result.errors){const service=WINDOW_HOST_SERVICES.find(s=>s.id===error.feature);if(service)error.action=service.action;}return result;}
export function assertWindowCompatible(value,consumer){const result=windowCompatibility(value,consumer);if(!result.ok){const e=new WindowGeometryError('WINDOW_COMPATIBILITY','/',result.errors.map(e=>e.message).join(' '));e.diagnostics=result.errors;throw e;}return result;}
