// Data-only lifecycle check; never enumerates or terminates a process.
export function assertPreviousReviewClosed(record,receipt){
  if(!record)return;
  const sameProcess=(a,b)=>!!a&&!!b&&Number.isInteger(a.pid)&&a.pid>0&&a.pid===b.pid&&a.executable===b.executable&&typeof a.executable==='string'&&(['creationFiletime','creationTicks'].some(key=>typeof a[key]==='string'&&a[key]===b[key]));
  if(!receipt||receipt.httpClosed!==true||receipt.browserClosed!==true||receipt.owner!==record.owner||receipt.purpose!==record.purpose||receipt.port!==record.port||!sameProcess(record.process,receipt.process)||!sameProcess(record.browser,receipt.browser))throw Error('Prior review helper has no matching PID/creation/port cleanup receipt. Investigate ownership and quiescence before a replacement.');
}
