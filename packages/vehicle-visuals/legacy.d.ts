/** Explicit synchronous historical geometry API. Browser painting awaits ready. */
export function createRoadVehicleKit(THREE:any,options?:{loadSkin?:(url:string)=>Promise<any>}):{ready:Promise<void>;skinsAvailable:boolean;create(id:string,options?:{lod?:'game'|'sculpt'}):{root:any;dispose():void};build(id:string,options?:{lod?:'game'|'sculpt'}):{root:any;dispose():void};dispose():void};
