// Private C1 arithmetic. Never replace or normalize the saved Number source.
export class PlanarRefusal extends Error {
  constructor(code,message,path='/shape'){super(message);this.code=code;this.path=path;}
}
export const PLANAR_C1_LIMITS=Object.freeze({maxGraphNodes:128,maxDepth:12,maxOperands:16,maxLeaves:16,maxRingsPerLeaf:8,maxSegments:128,maxPairTests:8128,maxVertices:2048,maxAtomicEdges:4096,maxHalfEdges:8192,maxContours:128,maxBoundarySegments:4096,maxProvenanceLinks:16384,maxQueries:256,maxSerializedBytes:4000000,maxInputBits:128,maxRationalBits:512,maxIntermediateBits:4096,maxWork:10000000});
const buckets=['source','exact','pairs','split','sort','membership','graph','topology','provenance','serialization'];
export class PlanarBudget {
  constructor(limits){this.limits=limits;this.units=Object.fromEntries(buckets.map(k=>[k,0]));this.counts={};this.total=0;}
  take(bucket,n=1){if(this.total+n>this.limits.maxWork)throw new PlanarRefusal('C1_WORK_LIMIT','The complete exact evaluation exceeds the captured work budget.','/options/limits/maxWork');this.total+=n;this.units[bucket]+=n;}
  count(name,n=1){const next=(this.counts[name]||0)+n;if(next>this.limits[name])throw new PlanarRefusal('C1_'+name.replace(/^max/,'').replace(/[A-Z]/g,c=>'_'+c).toUpperCase().replace(/^_/, '')+'_LIMIT','The complete result exceeds '+name+'.','/options/limits/'+name);this.counts[name]=next;}
  peak(name,n){const old=this.counts[name]||0;if(n>old)this.count(name,n-old);}
  snapshot(){return {total:this.total,units:{...this.units},counts:{...this.counts}};}
}
export function arithmetic(budget){
  const bits=n=>n===0n?0:(n<0n?-n:n).toString(2).length,words=n=>Math.max(1,Math.ceil(bits(n)/32)),zero={n:0n,d:1n},one={n:1n,d:1n};
  function guard(n){if(n>budget.limits.maxIntermediateBits)throw new PlanarRefusal('C1_INTERMEDIATE_BITS','A conservative arithmetic intermediate-size bound exceeds the captured limit.','/options/limits/maxIntermediateBits');budget.peak('maxIntermediateBits',n);}
  function product(a,b){guard(bits(a)+bits(b));budget.take('exact',words(a)*words(b));return a*b;}
  function sum(a,b){guard(Math.max(bits(a),bits(b))+1);budget.take('exact',Math.max(words(a),words(b)));return a+b;}
  function gcd(a,b){if(a<0n)a=-a;if(b<0n)b=-b;while(b){budget.take('exact',words(a)*words(b));[a,b]=[b,a%b];}return a;}
  function make(n,d=1n,input=false){
    guard(Math.max(bits(n),bits(d)));if(d===0n)throw new PlanarRefusal('C1_ZERO_DIVISOR','An exact construction has no finite divisor.');if(d<0n){n=-n;d=-d;}if(n===0n)return zero;
    const g=gcd(n,d);budget.take('exact',words(n)*words(g)+words(d)*words(g));n/=g;d/=g;
    const size=Math.max(bits(n),bits(d)),name=input?'maxInputBits':'maxRationalBits',limit=budget.limits[name];if(size>limit)throw new PlanarRefusal(input?'C1_INPUT_BITS':'C1_RATIONAL_BITS','The reduced exact rational exceeds its captured bit limit.','/options/limits/'+name);budget.peak(name,size);return {n,d};
  }
  function number(value){
    budget.take('exact',2);if(value===0)return zero;const buffer=new ArrayBuffer(8),v=new DataView(buffer);v.setFloat64(0,value);const raw=v.getBigUint64(0),negative=(raw>>63n)!==0n,exp=Number((raw>>52n)&2047n),fraction=raw&((1n<<52n)-1n);let n=exp?fraction+(1n<<52n):fraction,e=exp?exp-1023-52:-1074;
    // Remove powers of two before shifting, so even rejected subnormal input
    // never allocates an oversized denominator.
    while(e<0&&(n&1n)===0n){budget.take('exact');n>>=1n;e++;}
    if(Math.max(bits(n)+Math.max(e,0),1+Math.max(-e,0))>budget.limits.maxInputBits)throw new PlanarRefusal('C1_INPUT_BITS','The original binary64 value exceeds the captured dyadic input limit.','/options/limits/maxInputBits');
    guard(Math.max(bits(n)+Math.max(e,0),1+Math.max(-e,0)));budget.take('exact',Math.abs(e)+1);return make((negative?-n:n)<<BigInt(Math.max(e,0)),1n<<BigInt(Math.max(-e,0)),true);
  }
  const add=(a,b)=>make(sum(product(a.n,b.d),product(b.n,a.d)),product(a.d,b.d)),neg=a=>({n:-a.n,d:a.d}),sub=(a,b)=>add(a,neg(b)),mul=(a,b)=>make(product(a.n,b.n),product(a.d,b.d)),div=(a,b)=>make(product(a.n,b.d),product(a.d,b.n));
  const cmp=(a,b)=>{budget.take('exact');const x=product(a.n,b.d),y=product(b.n,a.d);return x<y?-1:x>y?1:0;},eq=(a,b)=>{budget.take('exact',words(a.n)+words(a.d)+words(b.n)+words(b.d));return a.n===b.n&&a.d===b.d;},sign=a=>{budget.take('exact');return a.n<0n?-1:a.n>0n?1:0;};
  const vector=(a,b)=>a.map((v,i)=>sub(v,b[i])),plus=(a,b)=>a.map((v,i)=>add(v,b[i])),scale=(a,t)=>a.map(v=>mul(v,t)),cross=(a,b)=>sub(mul(a[0],b[1]),mul(a[1],b[0])),pointEq=(a,b)=>eq(a[0],b[0])&&eq(a[1],b[1]),pointCmp=(a,b)=>cmp(a[0],b[0])||cmp(a[1],b[1]);
  function encode(a){const size=Math.max(bits(a.n),bits(a.d));if(size>budget.limits.maxRationalBits)throw new PlanarRefusal('C1_RATIONAL_BITS','An emitted rational exceeds the captured result bit limit.','/options/limits/maxRationalBits');budget.peak('maxRationalBits',size);budget.take('serialization',words(a.n)+words(a.d));return [a.n.toString(),a.d.toString()];}
  const key=a=>{const [n,d]=encode(a);return n+'/'+d;},pointKey=p=>key(p[0])+','+key(p[1]),encodePoint=p=>p.map(encode),affineSign=(a,b)=>sign(a)||sign(b);
  const half=make(1n,2n),mid=(a,b)=>scale(plus(a,b),half);
  function onSegment(p,a,b){if(sign(cross(vector(b,a),vector(p,a)))!==0)return false;return [0,1].every(k=>cmp(p[k],cmp(a[k],b[k])<=0?a[k]:b[k])>=0&&cmp(p[k],cmp(a[k],b[k])<=0?b[k]:a[k])<=0);}
  // q=m+epsilon*n, epsilon a formal positive infinitesimal. All comparisons
  // have degree <=1. No finite probe distance or floating ray construction.
  function parity(segments,m,n=[zero,zero]){
    let inside=false;for(const {a,b}of segments){budget.take('membership');const ay=affineSign(sub(a[1],m[1]),neg(n[1]))>0,by=affineSign(sub(b[1],m[1]),neg(n[1]))>0;if(ay===by)continue;const d=vector(b,a),s=affineSign(cross(d,vector(m,a)),cross(d,n));if(s===sign(d[1]))inside=!inside;}return inside;
  }
  const witness=(a,b,left=true)=>{const d=vector(b,a);return {m:mid(a,b),n:left?[neg(d[1]),d[0]]:[d[1],neg(d[0])]};};
  const area=segments=>mul(segments.reduce((v,{a,b})=>add(v,cross(a,b)),zero),half);
  return {zero,one,half,number,make,add,sub,mul,div,neg,cmp,eq,sign,vector,plus,scale,cross,pointEq,pointCmp,encode,key,pointKey,encodePoint,affineSign,onSegment,parity,witness,area};
}
