import {createBuiltinByteOwner,produceSelectedBuiltinPack} from '../index.mjs';
import type {AuthenticatedMetadataPorts,SourceScopeOwner,PortableValidator,EncodedStreamPort,ExportCopyLease,VerifiedByteScope} from '../index.mjs';
import type {TilesV1,WorkbenchDocument,Pin} from '../../../../../packages/tile-authoring-core/index.js';
import type {Basis,C2Read,ExistingC1Read,BuiltinDependencyPrefixOwner} from '../vendor/ui057/projection.js';
declare const tiles:TilesV1,metadata:AuthenticatedMetadataPorts,sourceOwner:SourceScopeOwner<C2Read<ExistingC1Read>>,portable:PortableValidator,reader:EncodedStreamPort;
declare const read:C2Read<ExistingC1Read>,selected:Pin,document:WorkbenchDocument,basis:Basis;
const owner=createBuiltinByteOwner({tiles,metadata,sourceOwner,portable,reader});
const exact057:BuiltinDependencyPrefixOwner<ExistingC1Read,VerifiedByteScope>=owner;
exact057.constructBuiltinDependencyPrefix(read,selected);
const pack=produceSelectedBuiltinPack(tiles,{document,basis,selected,metadata});
const route:'builtin-prefix'|'retained-two-ops'=pack.route;
declare const exportLease:ExportCopyLease;
owner.release(exportLease);
// @ts-expect-error export data is not an original verified byte capability.
owner.copyOut(exportLease);
// @ts-expect-error no caller numeric usage/reservation completion API exists.
owner.consume({success:true,workUnits:0});
void route;
