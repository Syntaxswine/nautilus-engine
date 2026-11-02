// PRIVATE construction seam for Root adapters; never shipped or registered.
// Source-internal registry/observer functions are deliberately not re-exported.
export {createPrivateSourceOwner} from './owner.js';
export {createActualKernelSource} from './kernel.js';
export {createActualJournal} from './journal.js';
export {createContinuedCore} from './core.js';
