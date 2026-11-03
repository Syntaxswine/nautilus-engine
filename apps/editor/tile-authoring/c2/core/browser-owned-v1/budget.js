// Separate adapter: real Core reference charges go to the intrinsic owner.
import {Budget as StrictBudget,fail,jsonBytes,utf8Bytes} from '../budget.js';
export {fail,jsonBytes,utf8Bytes};
export class Budget extends StrictBudget {
 constructor(limits,sink){super(limits);if(!sink||typeof sink.take!=='function')fail('BROWSER_CORE_COUNTER_UNBOUND','/budget','Actual construction-paired Core charge sink required.');this.sink=sink;}
 attach(sink){this.sink=sink;}
 take(n=1){if(!Number.isSafeInteger(n)||n<0||this.units+n>this.limits.plannerUnits)fail('AUTHORING_WORK_LIMIT','/limits/plannerUnits','Core reference ceiling exhausted.');this.sink.take(n);super.take(n);}
 input(n){this.sink.flow('inputBytes',n);super.input(n);}
 readFlow(n,input){if(input&&this.inputBytes+n>this.limits.inputBytes)fail('AUTHORING_INPUT_LIMIT','/input','Aggregate Core metadata input bound exhausted.');this.sink.flowMany(input?{inputBytes:n,copyBytes:n}:{copyBytes:n});if(input)super.input(n);}
 copied(n){this.sink.flow('copyBytes',n);}
 outputFlow(n){this.sink.flow('outputBytes',n);this.sink.flow('copyBytes',n);this.outputBytes=n;}
 snapshot(){return {...super.snapshot(),unitsCharged:this.sink.snapshot().reference.charged};}
 stamp(hash){return this.sink.stamp(hash);}
 verifyStamp(v){return this.sink.verifyStamp(v);}
 bindSource(d){this.sink.bindSource(d);}
 get boundSourceDigest(){return this.sink.sourceDigest();}
}
