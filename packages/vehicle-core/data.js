export function keys(value,allowed,required=allowed){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(value,k)))throw Error('VEHICLE_SCHEMA: unknown or missing fields.');}
export function identifier(value){if(typeof value!=='string'||!value.match(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/))throw Error('VEHICLE_IDENTIFIER');return value;}
export {plain as vehicleData} from '../native-actors/data.js';
