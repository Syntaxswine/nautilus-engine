// Optional only: standalone map/rules/assets imports do not depend on this layer.
export {ModuleConfigurationError,planModules,assertModulePlan} from './planner.js';
export {ModuleStartError,startModules} from './lifecycle.js';
export const MODULE_CONTRACT=Object.freeze({version:1,configurationVersion:1,schemaId:'nautilus-module-configuration',
  schemaUri:'urn:nautilus:schema:module-configuration:1',capability:'nautilus-module-composition-v1',maximumModules:128,
  maximumHostProviders:128,maximumServicesPerProvider:64,time:'host-owned',state:'host-owned',
  activation:'explicit',factory:'synchronous-resource-free-handle',cleanup:'reverse-dependency-order'});
