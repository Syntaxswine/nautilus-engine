# Small live capture / upload-owner proposal

Proposal only. Root and Editor must review it against the new exact Core capture manifest before any live binding. C1 0b72d5129c7ceedf1a6f371d8b01bd9c4ba4b9f9 is coordination context, not an imported dependency. This checkpoint deliberately keeps strict admission UNBOUND.

## Existing allocation owners

| Actual resource | Owner and present evidence | Missing binding or limitation |
| --- | --- | --- |
| Read-only encoded input | Reader owns its returned Uint8Array; PhysicalMemory retains and charges its actual entire backing buffer. | Reader must report any additional retained physical stores; no hash deduplication of foreign stores. |
| Retained encoded snapshot and decoder's private encoded snapshot | Artist pool/decoder own separate real typed buffers. Both borrowed and copied backing stores remain charged. | Default JS CPU retirement is unverified. Dropping a reference is not a receipt. |
| Decoder scratch and exact 16 KiB caller window | Artist ScratchSlab owns actual 256 KiB and 16 KiB backing stores; every scratch view aliases the charged slab. | These stay allocated; they are reused serially. |
| Whole-page straight RGBA8 and upload input | Artist image pool owns one actual 6291456-byte buffer, reused for both originals after completion. Portable decoder validates exact original bytes and full RGBA hashes. | The buffer remains charged. Reuse does not retire opaque upload copies. |
| Two artwork texture allocations | Artist WebGLTextureOwner owns distinct actual WebGLTexture objects; each exact original RGBA8 logical image is charged at least width x height x 4. | API dimensions/format imply logical pixel storage; they do not measure physical driver VRAM, padding or internal copies. |
| Borrowed base atlas | Host retains its existing texture/source and supplies live context/epoch and baseline ownership. Current probe uses the existing public atlas and an actual native handle, including the intended mip chain in its baseline reservation. | A complete Host owner must account for its CPU/native backing and copies. An HTML image's opaque decode storage is not a measured typed allocation. |
| Sparse data CPU/GPU page | Artist owns one actual 262144-byte Float32Array and one distinct RGBA32F texture. Each source/candidate lease references its own ranges and the same attested native allocation. | GPU storage bytes are the logical format/dimension calculation, not a physical VRAM query. Bound ranges require a live retirement owner; caller JSON cannot free them. |
| Source and candidate base geometry | Artist public-provider owner constructs two independent roots and BufferGeometry/buffer sets from one unchanged complete bundle per view. It holds actual CPU buffer identities. | No positive aggregate view/material retirement owner is bound. Actual disposal requests retain root/cell/triangle/mark/material debt. |
| Uploaded geometry buffers | The optional NEW-context observer records actual WebGLBuffer handles, bufferData storage queried with getBufferParameter(BUFFER_SIZE), and subsequent bufferSubData update counts. | An already shared renderer needs an equivalent supported live observer; this observer never patches one. |
| Appearance materials and idle caches | Artist owns its fresh Standard materials and hooks. Host supplies a complete list of all other actual appearance materials, including idle caches. | Current public finish-pool counts cannot substitute for this live identity enumeration. Root/Editor must supply or factor the real owner. |
| Native/browser upload staging | Artist retains a separate reservation for each upload and marks unknown native-copy bounds. | A diagnostic one-image reservation is NOT an attested upper bound. Ordinary WebGL JS currently supplies no real staging-bound owner. |

Current measured peak: 31735808 known/reserved additional decoded bytes; 7680600 encoded bytes; 1049088 derived typed-buffer bytes; four sampled allocation/context/epoch identities. Those totals do not prove the opaque native-copy upper bound. All unknown reservations remain charged and strict admission refuses.

## Which calls prove what

- The portable decoder proves source width/height and output byte length from the exact validated PNG profile. The actual DataTexture input supplies dimensions, RGBA8/RGBA32F format, no mip chain for art/data, and actual caller typed-buffer bytes.
- Three renderer.initTexture requests upload. renderer.properties.get(texture).__webglTexture is a private, version-specific observation of the actual native identity. gl.isTexture, the same live renderer context and captured epoch guard its currentness. A changed source/image/version/sampler state invalidates the observation. A production binding must explicitly accept or replace this Three-private observation seam.
- Actual gl.bufferData followed by gl.getBufferParameter(target, gl.BUFFER_SIZE) observes logical native buffer storage. The context observer retains the source backing identity, tracks uploads/sub-updates and seals each view.
- gl.finish establishes completion of prior calls and permits reuse of this caller-owned input buffer. It supplies no staging byte upper bound and no CPU backing retirement proof.
- After actual owned texture disposal in the same live context/epoch, gl.isTexture(handle) becoming false can attest deletion of that texture object. The GPU driver may still own opaque internal storage; this is not an aggregate driver-memory receipt. The current default view/material path keeps its debt even after public disposal.
- Hashes bind observations to data. Actual live owner capabilities and currentness checks establish resource identity. Repeated hashes, dimensions, IDs or forged DTO rows never establish physical sharing.

## Minimal ports for review

1. **Editor retention/preserved-world owner.** Mint intrinsic source/history/redo/pending/export leases from real owners. Capture the actual source geometry, all sampled/native/data/material bindings and preserved world. Prove currentness without treating a document digest as authority. Live undo/redo is distinct from persisted checkpoint/journal; a cold reopen begins fresh live history.
2. **Core closed capture producer.** Accept the actual live Artist/Editor observations, effective normalized limits and cumulative charged work. Assemble and validate the newly approved exact SourceCapture/PreparedCapture shape. Keep the capacity phase, reversible preparation, actual admission and pure final bind distinct. The artist never creates tickets, operations, Review or durable writes.
3. **Native upload owner.** Before a strict upload, begin an intrinsic lease over the actual context/epoch, source pixel backing, dimensions/format and upload operation. Observe every application-owned staging allocation with its actual backing identity/bytes; record completion separately from retirement. The owner must return a proven upper bound for any remaining native staging. If the platform cannot bound opaque browser/driver copies, return unbounded/unsupported and refuse strict admission. Do not manufacture a zero or nominal one-copy upper bound.
4. **Verified retirement owner.** Positively attest complete ownership release per allocation/view/material/data lease. Keep unknown or partial retirements charged. A receipt must come from the owning live capability and same epoch; a serialized verified flag alone is insufficient.

The current WebGLTextureOwner accepts a proposed stagingOwner.begin / observe / isCurrent seam, but no available implementation proves the required native bound. The existing diagnostic renderer is useful without satisfying this port. Root can evaluate a supported platform-native instrumented allocator or another separately agreed renderer contract; neither is supplied or presumed here.

No more browser probing is needed to discover these absent capabilities. The fixed native identity/pixel/lifecycle evidence is preserved for review. Plan3 placement/restore, combined geometry-plus-appearance preparation and public/Host adoption remain outside this packet.
