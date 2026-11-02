import type {Form,Mark,Pin} from '../c2-host-bridge/vendor/ui057/projection.js';
import type {GraphicField,FormInputOwner} from '../c2-host-bridge/ports.js';
export type FormFields=Readonly<Record<'u'|'v'|'width'|'height'|'rotation'|'pivotU'|'pivotV'|'red'|'green'|'blue'|'opacity'|'form'|'mask'|'cells'|'firstLayerLabel'|'firstLayerOpacity',string>&{mirror:boolean}>;
export interface FormProducer {
 formFromFields(read:Readonly<{overlay:unknown}>,values:FormFields,actualDirty:ReadonlySet<string>,kind:'first-mark'|'decoration.add'|'decoration.update'|'decoration.remove'):Form;
 readonly formInputOwner:FormInputOwner<unknown>;
}
export const fieldDefaults:FormFields;
export function valuesForMark(mark:Mark|null,artwork?:Pin|null):FormFields;
export function createFormProducer():FormProducer;
export const formFromFields:FormProducer['formFromFields'];
export const formInputOwner:FormProducer['formInputOwner'];
