# n8n webhook contracts

> **Architecture change (2026-07-31):** Dashboard reads now go directly to
> Supabase/Postgres via the backend API. The read webhooks listed below have
> been **archived** and are no longer called. Only write/trigger webhooks
> remain active.

The dashboard talks to n8n for **writes only** through webhooks on
`https://merge-works.app.n8n.cloud/`. All of them require **Header Auth**
(credential name `x-webhook-secret`, value = the `N8N_WEBHOOK_SECRET` env var).

| Purpose | Method | Path | Status |
| --- | --- | --- | --- |
| Submit a document | POST | `webhook/d6884691-1689-479d-b1b3-ee7a8bca7380` | ✅ live |
| Exclude a document from synthesis | POST | `webhook/dd-document-consideration` | ✅ live |
| Retry a failed document | POST | `webhook/dd-retry-failed-document` | ✅ live |
| Save deal model | POST | `webhook/dd-deal-models` | ✅ live |
| ~~Poll submission history~~ | ~~GET~~ | ~~`webhook/1d02344c-...`~~ | 🗄️ archived — reads from Supabase |
| ~~Get project syntheses~~ | ~~GET~~ | ~~`webhook/d19d24da-...`~~ | 🗄️ archived — reads from Supabase |
| ~~Deal model read~~ | ~~GET~~ | ~~`webhook/dd-deal-models`~~ | 🗄️ archived — reads from Supabase |
| ~~Error log~~ | ~~GET~~ | ~~`webhook/dd-workflow-errors`~~ | 🗄️ archived — reads from Supabase |
| ~~Action tracker~~ | ~~GET~~ | ~~`webhook/dd-project-action-tracker`~~ | 🗄️ archived — reads from Supabase |

## Document submission and storage handoff (2026-08-28)

The browser requests `POST /api/diligence/upload-url`, uploads to storage, then
calls `POST /api/diligence/submit` with metadata, the storage URL/path, and the
project/batch identifiers. Large files do not travel in the API's JSON body.
Only files at most 3 MiB may use inline base64 when storage is unavailable.

The backend registers a queued row before dispatch. The live submit webhook
still expects **multipart form-data with a binary `file` attachment**, alongside
`fileName`, `fileSize`, `fileType`, `requestID`, `projectId`, `submissionBatchId`,
`expectedBatchDocumentCount`, and other submission metadata. A storage URL alone
does not replace that attachment contract. The shared Node handoff downloads and
verifies a temporary file first, then native FormData supplies the multipart
boundary and Content-Length. The webhook secret remains server-side.

The app rejects missing/error acknowledgments and requires a recognized status:
`queued`, `accepted`, `received`, `processing`, `completed`, or `duplicate`.
Download, send, and acknowledgment reading share a 180-second deadline; this
does not wait for final background analysis. A lost acknowledgment is not
automatically retried, because n8n may already have accepted the document.
Dispatch failure updates only the matching row still in `queued` state.

See [Upload and Batch Recovery](UPLOAD_AND_BATCH_RECOVERY.md) for recovery and
tests. This release does not modify the n8n workflow or require a schema migration.

## 1. Archived project synthesis read webhook

The following section preserves the former read-webhook contract for historical
reference. Current history/synthesis reads go through the app API to Supabase;
do not recreate this webhook to diagnose a current read failure.

### Workflow shape (mirrors the history workflow)

> **Archived contract:** these were the read workflow's response requirements,
> not current setup instructions. The document submission webhook remains live.

1. **Webhook** node — Method `GET`, Path `d19d24da-21d4-40f8-8626-a06a7dd54ac7`,
   Authentication → Header Auth → reuse the existing **"Header Auth account"**
   credential, Respond → Using 'Respond to Webhook' Node.
2. **Get row(s)** node — read all rows from the **project-level table** the
   consolidator upserts into.
3. **Code** node (optional) — shape the rows (see field names below).
4. **Respond to Webhook** node — return the rows as JSON.
5. **Publish.**

### Recommended query scope: all projects

This dashboard is a project portfolio, so its synthesis hook deliberately
fetches **all** Project-Level Fields rows. It does **not** send a `projectId`
when polling. The UI joins each returned row to the matching project using the
row's `projectId` and can therefore update every visible project in one
request.

Configure the Data Table **Get row(s)** node with no filter conditions, then
wire it exactly as follows:

```text
Webhook -> Get row(s) -> Code in JavaScript -> Respond to Webhook
```

Do not wire **Get row(s)** directly to the response node; that bypasses the
wrapper the backend consumes. The webhook's `path` and internal webhook ID
must also be unique to this workflow (the synthesis path is
`d19d24da-21d4-40f8-8626-a06a7dd54ac7`, not the history workflow's ID).

If the product later needs one-project API calls, use a query string such as
`?projectId=project-1`, read it in n8n as `$json.query.projectId`, and update
the backend to append that query parameter. Do not use `$json.projectId` for a
Webhook trigger: query parameters are nested under `query`.

### Response format

Either a bare JSON array of rows, one bare row object, or an object wrapping
rows in `rows`, `data`, or `items`. The backend normalizer
(`backend/diligence/getProjectSynthesis.ts`) accepts camelCase or
snake_case for every field, and list fields may be real JSON arrays,
JSON-encoded strings, or newline/semicolon-separated text:

| Field (either style) | Type | Notes |
| --- | --- | --- |
| `projectId` / `project_id` | string | must match the `projectId` used at intake — this is how the UI joins synthesis to a project |
| `projectStatus` / `project_status` | string | e.g. `synthesized`, `waiting_for_documents` |
| `documentsReceivedCount`, `documentsCompletedCount` | number | |
| `missingDocumentsJson` / `missing_documents` | list | missing diligence materials |
| `crossDocumentConflictsJson` / `cross_document_conflicts` | list | contradictions found across documents |
| `openQuestionsJson` / `open_questions` | list | questions for management |
| `negotiationLeversJson` / `negotiation_levers` | list | price/terms leverage |
| `finalRiskLevel`, `finalTrafficLight`, `finalRecommendation` | string | Red/Yellow/Green etc. |
| `finalJudgmentJson` / `final_judgment` | string or object | the full judgment; a `summary` key (or plain text) becomes the headline paragraph |
| `lower_bound_estimate`, `base_estimate`, `upper_bound_estimate`, `currency` | string | valuation range (same names the per-document rows use) |
| `projectProcessedAt` / `project_processed_at` | ISO timestamp | |
| `id`, `createdAt`, `updatedAt` | table metadata | |

Extra columns are ignored, so it's safe to add more fields to the table
(TODO #9) before the frontend knows about them.

### Completion and polling

The project-level data-table row is the completion signal; do not keep an HTTP
request open until the consolidator finishes. When all considered documents are
terminal, the counter first calls the Supabase `claim_project_synthesis` RPC
with a sorted evidence manifest. Only the returned claim owner may upsert
`projectStatus: synthesis_pending` and start the consolidator. The consolidator
must scope its input to that manifest, write the evidence signature and run ID
on the final version, then mark the claim `succeeded` (or `failed` on its error
path). See [Synthesis Idempotency](SYNTHESIS_IDEMPOTENCY.md).

The dashboard polls both submission history and this webhook every five
seconds while either document processing or a project synthesis has an active
status. The synthesis read webhook must therefore return in-progress rows as
well as completed ones.

To mirror the working history webhook, place this Code node between **Get
row(s)** and **Respond to Webhook**:

```js
return { rows: $input.all().map((item) => item.json) };
```

Ensure the Webhook node is set to **Respond using Respond to Webhook Node**
and that the Code node is connected to the response node. A default response
body of `{}` is accepted by n8n but means the dashboard has no rows to show.

## 2. Row update webhook (future — TODO #2/#14)

### Stop Batch Contract (Verified 2026-08-27)

`POST /api/diligence/stop-batch` accepts `projectId`, `environment`, and either
`submissionBatchId` or explicit `requestIDs`. Project-only stops are rejected.
Explicit IDs must belong to the selected project, batch (when supplied), and
environment. Completed/failed documents are retained.

The server requires `N8N_API_KEY` with execution list/read/stop permissions.
It paginates running, waiting, new (queued), and unknown executions. Matching
uses structured trigger input, not arbitrary strings in later node results.
These filters and cursor pagination follow the [n8n executions API contract](https://github.com/n8n-io/n8n/blob/master/packages/cli/src/public-api/v1/handlers/executions/spec/paths/executions.yml).
Project-wide synthesis executions with only a project ID are deliberately not
canceled by a batch action. Missing execution input or API access returns an
unconfirmed stop rather than guessing ownership.

The browser stops dispatching local uploads and waits for requests already in
flight before asking the server to cancel. The server verifies cancellation,
marks active documents through the published consideration webhook, then
checks executions again. This cannot undo provider calls already submitted,
and independent submissions from another browser are not globally locked.

The consideration workflow `lXz9fVKY4RaTlDFM` now validates project/batch scope,
preserves terminal rows, writes `ai_processedAt` in the n8n Data Table, and
maps that value to Supabase `processed_at`. The Data Table has no environment
column; environment verification is performed against Supabase, including
the sync filter. Its confirmed order is:

```text
Webhook -> Validate request -> Get document -> Validate scope
        -> Update Data Table -> Sync Supabase -> Refresh readiness -> Respond
```

The response includes `{ ok, requestID, action, status }`. Test-environment
documents use this same published control webhook, not `webhook-test`, which
requires an active editor listener.

The API returns `{ ok, stopped, requestIDs, matchedExecutions,
canceledExecutions, cancellationAvailable, errors }`. Any failed cancellation,
unreadable execution, or unconfirmed document write makes `ok: false`.
Clients must inspect this body even on HTTP 200. Only confirmed success closes
the batch and freezes the timer; partial failure leaves Retry Stop available.

Published version verified: `3d7e10f3-3221-4c0d-8c01-14ff643b320e`.
No customer executions were stopped during verification. Live write behavior
still needs a controlled end-to-end test after the app code is deployed.

Verification evidence: 32 assertions evaluated the published workflow's
expressions against synthetic records (active, completed, failed, stopped,
and mismatched scopes). Read-only authenticated API checks returned HTTP 200
for all four execution-state filters. An isolated browser fixture exercised
the actual dashboard: simulated 503 -> Retry Stop with advancing timer ->
confirmed success -> 0 running and stable elapsed time. Its request contained
only the selected batch, not the other batch/project present in the fixture.

### Historical Row Update Proposal

For "delete document" / "mark row nonconsidered" from the dashboard. When
someone builds it, use this contract so the frontend work is a drop-in:

- **POST**, new UUID path, Header Auth like the others.
- Request body: `{ "requestID": "...", "action": "nonconsidered" | "delete" }`
- Behavior: find the row by `requestID`; either delete it or set a
  `nonconsidered: true` column (preferred — keeps an audit trail, and the
  consolidator should skip nonconsidered rows).
- Response: `{ "ok": true, "requestID": "...", "action": "..." }`

Then add the path to a new `backend/diligence/updateSubmissionRow.ts`, mirror
the route in `frontend/server.ts` + `frontend/localApi.ts`, and add the row
action UI in `SubmissionHistoryCard` / the portfolio document list.
