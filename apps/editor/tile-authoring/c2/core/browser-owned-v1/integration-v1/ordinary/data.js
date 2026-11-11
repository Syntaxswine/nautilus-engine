// Complete paid metadata reader/clone and original C1 schema interpreter.
// Budget construction returns the SAME persistent source-owned Budget.
export {Budget} from './scope.js';
export {readData,fail,freeze,clone,plain,fields,corePort,hash,equal,sourceWork,compileSource,openSourceBundle,refusal} from '../../data.js';
import {shape as originalC1Shape} from '../../../../../../../../packages/tile-authoring-core/data.js';
import {currentOrdinaryBudget} from './scope.js';
export function shape(t,name,value,b=currentOrdinaryBudget()){return originalC1Shape(t,name,value,b);}
export {utf8Bytes,jsonBytes} from '../../budget.js';
