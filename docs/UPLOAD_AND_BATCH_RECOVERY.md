# Upload and batch recovery

## Scope of the change

The 2026-08-28 fix changes browser upload transport, the app-to-n8n handoff,
and client batch state together. It is a reliability change across multiple
layers, not a database migration, AI prompt change, or n8n workflow rewrite.
Deploy frontend and API together; see [deployment requirements](DEPLOY_VERCEL.md).

## Large documents

Files larger than 6 MiB use signed, resumable Supabase Storage uploads in 6 MiB
chunks on the direct `*.storage.supabase.co` host. Use the
`/storage/v1/upload/resumable/sign` endpoint with `x-signature`, not the ordinary
session-authenticated resumable endpoint. Interrupted transfers resume from the
server's acknowledged byte offset within the current upload; upload URLs/tokens
are not saved for cross-session resume. Browser reads materialize only one chunk
at a time, so an unreadable local/cloud-placeholder file is reported explicitly.

Smaller files use the Cloudflare storage Worker/R2, with a signed Supabase
fallback. R2 also remains an alternative if the resumable endpoint is unavailable.
Supabase upload and public URLs stay independent of the Cloudflare proxy, even
when the backend Supabase client uses that proxy for API reads.
After a successful storage upload,
`/api/diligence/submit` receives metadata and the storage URL only, regardless
of document size. It never receives an 18 MB document encoded in JSON.

The current n8n submission webhook still expects a multipart binary attachment.
The server first downloads to a private, uniquely named temporary file and
verifies the byte count, restricting downloads to configured storage origins
and rejecting redirects. Only after that succeeds does it open the n8n request.
A disk-backed Blob lets native FormData send an ordinary multipart attachment
with a known Content-Length, without a full-file memory buffer or base64 copy.
Temporary files are removed after success or failure; per-handoff temporary
attachment storage is capped at 256 MiB. The Vercel function has a 300-second
budget; download, dispatch, and acknowledgment-body reading share a 180-second
deadline. This requires Node's `fs.openAsBlob` (available in the supported Node
20+ runtime).

Errors distinguish storage download, outbound send, and acknowledgment reading.
A lost connection during send does not prove whether n8n accepted the request,
so the server never automatically repeats it. Check history before retrying;
the existing retry action can reuse the registered storage URL without asking
for another browser upload.

A small-file inline fallback is allowed only when direct storage is unavailable
and the file is at most 3 MiB (leaving headroom for base64 and JSON). Large files
never fall back to an inline API request. See [Vercel's direct-upload guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).

## Failure handling

- A database history record must exist before dispatch starts.
- Dispatch errors are saved only while that exact record is still queued;
  a processing/completed workflow is not overwritten by a lost acknowledgment.
- Failed browser uploads remain in the batch's session-stored manifest even if
  they never reached the database. This manifest contains filenames, sizes,
  request IDs and errors, never document bytes or API keys.
- Failed files remain selected for re-upload while the page stays open. After
  a reload, the user must re-select the original file; browsers cannot restore
  its binary from session storage.
- Re-uploading a failed/stopped attempt is permitted. Completed or possibly
  running copies are still protected by duplicate checks.
- The document carousel merges server rows with the active batch's upload
  manifest. A pre-registration failure keeps its filename/card and the full
  document count. Failed/stopped cards preserve returned partial results and
  label absent results as unavailable, not pending, zero, or successfully analyzed.
  This display-only list is not used as synthesis evidence.

## Batch status and timer

The expected count is not reduced to the number of rows received. Only an
explicitly confirmed duplicate is removed from the new batch's expectation.

- All expected documents succeeded: **Complete**.
- All expected documents reached terminal status, some failed: **Finished with errors**.
- Fewer documents arrived than expected, and received documents are terminal:
  **Incomplete**, with a separately frozen timer (not a successful end time).
- Uploading/processing or unknown statuses are not counted as completed.

Late-arriving documents resume an incomplete batch's clock. Timeout-derived
failures expose a separate `statusResolvedAt` instant, without inventing an
actual `processedAt` analysis timestamp or blaming a particular AI provider.

## Verification and deployment

Run `npm run check` from `frontend`, and `node scripts/build-api.mjs` from the
repository root. The Vercel build command also regenerates the API bundle.
Tests include the 3-expected/2-received case, pre-registration upload failure,
failed submit-hook propagation, missing timestamps, and an 18 MiB staged file.
Handoff tests also send an 18,747,545-byte multipart attachment over real local
HTTP, check the payload and Content-Length, simulate an early socket closure,
verify temporary-file cleanup, and cover the acknowledgment-body deadline.
Additional coverage checks the third failed carousel card, partial-result
preservation, independent signed upload URLs, and resumable chunk recovery after
a lost acknowledgment. The opt-in storage-only probe is
`node --use-system-ca --import tsx scripts/verify-resumable-upload.mts --live`
from `frontend`; it requires a server-only service-role key, uploads a synthetic
18 MiB object, compares downloaded bytes by SHA-256, and removes its own object.
This probe passed against the live project on 2026-08-28 (HTTP 201/204/204).

### Live processing verified on 2026-08-28

Read-only checks matched the latest three-document batch to successful n8n
submit executions `65600`, `65601`, and `65603`. The formerly failing PDF was
received as an 18,747,545-byte binary attachment in execution `65603`, with
multipart Content-Length `18750602` (including fields and framing). It completed
at 21:05:13 UTC; all three documents had saved summaries and extracted results,
with no recorded errors. Project synthesis finished at 21:06:14 UTC with
3 received / 3 completed. No documents were resubmitted by the verification.

Local verification also passed all 641 tests, TypeScript, and the frontend/API
builds. Timer and carousel behavior were covered by regression tests, not a new
live browser walkthrough. These records verify the exercised path, not the
deployment status of every environment or the accuracy of every analysis claim.
The precise original network-disconnect cause remains unconfirmed; synthetic
probes reached n8n with and without Content-Length, so do not attribute the
original failure solely to that header.

References: [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
and [the official signed-upload example](https://github.com/supabase/supabase/blob/master/examples/storage/resumable-upload-signed-uppy/index.html).

These code changes do not resubmit existing documents or modify n8n workflows.
Deploy the app/API changes together. The latest verified batch already succeeded
and needs no retry. For other failed attempts, inspect history and n8n executions
before retrying from a stored copy. Files that never reached storage need
re-uploading. Do not treat a partial batch as a complete analysis.
