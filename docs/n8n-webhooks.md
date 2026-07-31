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

## 1. Project synthesis webhook (create this one next)

The dashboard's "Project synthesis — final acquisition judgment" panel calls
`GET webhook/d19d24da-21d4-40f8-8626-a06a7dd54ac7` and expects the
project-level rows the consolidator workflow writes. Until this webhook
exists, the panel shows a friendly "not connected yet" notice — nothing else
breaks.

### Workflow shape (mirrors the history workflow)

> **Live status:** this workflow is already active in Pod 1. The instructions
> below describe its required contract; they are not a creation TODO.

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
request open until the consolidator finishes. The document-counter workflow
should upsert `projectStatus: synthesis_pending` before it starts the
consolidator. The consolidator should update that same row to `synthesized`
only after its final table upsert succeeds (or `failed` on its error path).

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
