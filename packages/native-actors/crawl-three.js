import {prepareNativeActor} from './three.js';
import {createNativeCrawlBody} from './crawl-body.js';
import {NATIVE_CRAWL_CONTRACT} from './crawl.js';
export {NATIVE_CRAWL_CONTRACT,createNativeCrawlBody};

// Borrow the existing native loader, full-resolution paint and shared renderer.
// This optional entry does not change legacy native actor/save behavior.
export function prepareNativeCrawler({surface,equipment='hands',...options}={}){
  return prepareNativeActor({...options,motion:'native-crawl-v1',crawl:{surface,equipment}});
}
