# Private original-PNG stream adapter

This is a private Editor transport component, based on Main `1e6a97b67c57917160db89db34cbae9e4e46f90c`. It supplies the accepted `d8ff73ce63282e897cac146bc3077ea443c38e05` byte owner's `reader.open(blob,{signal})` port. It adds no public package entry, capability, consumer pin, Sites publication, decoder, source owner, authoring meter, history or Apply authority.

## Construction and use

In the same-origin browser module graph:

```js
import {createBuiltinEncodedStream} from '../../../../apps/editor/tile-authoring/c2/encoded-stream.js';
// fullPin is the exact selected public metadata pin, never an implicit latest ID.
const reader = createBuiltinEncodedStream({artwork: fullPin});
// Root passes reader into the actual createBuiltinByteOwner constructor's
// existing reader option. That owner reserves before next and validates bytes.
```

The snippet's import is relative to this review directory. The adapter's ordinary runtime import is `apps/editor/tile-authoring/c2/encoded-stream.js`; there is no engine export specifier for it. Existing approved byte-owner/source/portable dependencies must be supplied by Root. A browser origin comes from the actual document. The default public asset anchor is resolved from this module's installed URL. An explicit same-origin `assetAnchorURL` supports a Root-owned installed package anchor. Node tests/consumers require explicit trusted `origin` and `assetAnchorURL`; these constructor fields must never become palette/command/user URL inputs.

Construction queries only the actual public `sharedArtworkImage(fullPin)` API. It retains the selected descriptor and original `locations` row (renderer/assets/compatibility), checks the anchor, derives the reviewed relative/package path consistently, and pins one HTTP(S) URL. No catalogue is duplicated and no saved library is seeded. Unknown pins/profiles, file URLs, foreign origins, credentials, queries, fragments, wrong anchors and accessor/functional URL arguments refuse. Browser-supplied origins must also equal the measured current origin. `open` accepts only the exact seven-field original blob descriptor and an actual AbortSignal, never a URL or cost DTO.

Only one iterator is occupied per adapter. It is lazy: unused return opens no HTTP request. Actual Fetch uses same-origin credentials, `redirect:'error'` and `cache:'no-store'`. Status must be200, final URL exact, media type PNG, Content-Encoding absent/identity and Content-Length, when present, exactly the descriptor length. Fetch response bodies must support real BYOB; unavailable BYOB explicitly refuses. There is no default-reader, response.arrayBuffer, full-PNG staging or arbitrary-file fallback.

## Buffers, cancellation and cleanup

The actual byte owner reserves before `next`. Each native BYOB receiver has a full fixed backing of at most65,536bytes. Near EOF its capacity tightens to the remaining declared length plus one; the last EOF backing is forwarded too. Actual partial/late values are returned even if return/abort raced the read. A still-attached receiver left by a synchronous native refusal is exposed as a zero-length debt/refusal view so its actual backing is charged. A detached receiver is an API transfer observation, never evidence of physical browser/driver/GC reclamation.

The original signal is retained and propagated through a real `AbortSignal.any` with an adapter-owned return cancellation signal. The adapter never aborts/replaces the caller's controller or creates an editing allowance. Original abort reasons remain on the caller signal. Native errors are wrapped with string diagnostic codes (and their actual cause), avoiding numeric DOMException codes entering the byte owner's diagnostic contract.

Normal EOF joins `reader.closed`. An early return joins actual native cancel, all pending reads and `reader.closed` before positively returning `done:true`; the unused/no-request case has nothing native to retire. If no BYOB reader could be acquired, positive body.cancel is required instead. Failed/errored/unverified cancellation rejects and leaves this adapter occupied. The accepted byte owner then retains its slot and continuation/backing debt. Already delivered buffers remain charged in that owner. Creating a replacement owner/adapter must not be used to forget unknown debt; aggregate ownership/recovery remains Root's job. No socket/physical-VRAM/total-RAM reclamation is claimed.

Native network queues, driver/browser staging, internal decoded buffers and physical memory are UNMEASURED. The adapter describes only its actual API observations; its diagnostics grant no resource admission or editing work credit. The actual Host source owner, browser-wide resource ledger, attempt-wide meter and later authoring borrow/copy/validation remain UNBOUND. The selected prefix stays synchronous and nonempty after separate byte acquisition; the exact retained route has no prefix. No second commit/library acceptance is introduced.

## Builder checklist

1. Bind an exact selected pin and real installed public asset anchor under the current browser origin; retain original metadata fields, paths and notices.
2. Supply this port to the actual accepted byte owner alongside the real current SourceScopeOwner, actual public tiles and accepted portable importer. Do not substitute the test fixture source owner.
3. Let that owner reserve before reads, hash the complete PNG, check length/canonical pack and retain actual backing/debt. Use only its opaque verified byte scope for prefix construction.
4. Treat unavailable BYOB, bad headers, corruption, truncation, stale source, abort and unverified cleanup as refusal. Preserve complete source and all existing view/error/debt state.
5. Start the later actual authoring attempt before Source/history observation, using its one real meter and retained services. Pre-command transfer grants zero edit credit. This wiring is not implemented here.
6. Preserve original operation/request allocation order, one real ticket/WAL and same-ID unknown recovery when Root later accepts the Host integration. No adapter observation replaces those fences.

## Evidence and limits

`tests/tile-authoring-encoded-stream.test.mjs` runs actual local HTTP and Fetch against original PNGs, including the2,481,966-byte page through the exact accepted d8ff owner and Core53 importer. Those dependencies are staged from immutable Git objects into ignored artifacts without import adaptations. The public metadata module is the actual Main1e module, authenticated against42. The negative BYOB fixture simulates unavailable support only; it is not working-byte evidence. The fixture SourceScopeOwner is synthetic test ownership, not an accepted live Host.

The test stager requires exact objects `d8ff73ce63282e897cac146bc3077ea443c38e05` and `53d7d1f4bc4b5a8205e16cbbf6a29672e6f9db32` locally. Root must deliberately provide/publish the approved source checkpoints through its source-fence/CI workflow before a fresh CI clone can run these tests. There is no moving-branch, uncommitted-file, network-install or missing-object fallback; this helper does not push those checkpoints.

`tools/review-tile-authoring-encoded-stream.mjs` makes one finite isolated Edge transport check: exact78,234-byte original road page,65,536maximum backing, one-byte EOF backing, actual cancel/closed and measured-origin refusal. It stages no complete PNG in application JavaScript. Node accepted-owner hashing is separate evidence. All servers/browsers close in finally with actual deadlines and recorded identities. `source.json`/`validation.json` name exact hashes/results. Root requested focused controls plus an explicit unchanged-baseline audit here; the four whole-repository gates belong to Root's later composite integration.

Accuracy: selected original bytes and explicit native lifecycle acknowledgements are preferable to metadata-only readiness or assumed cancellation. Efficiency: bounded BYOB buffers avoid an extra application whole-response allocation; opaque network/GC behavior is not measured or bounded here. Narrative: this adds no asset variation or authoring behavior. For the browser editor, prefer this explicit same-origin BYOB route while keeping unsupported platforms unavailable rather than hiding an unbounded fallback.
