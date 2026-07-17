# n8n webhook contracts

The dashboard talks to n8n exclusively through webhooks on
`https://merge-works.app.n8n.cloud/`. All of them require **Header Auth**
(credential name `x-webhook-secret`, value = the `N8N_WEBHOOK_SECRET` env var).

| Purpose | Method | Path | Status |
| --- | --- | --- | --- |
| Submit a document | POST | `webhook/d6884691-1689-479d-b1b3-ee7a8bca7380` | ✅ live |
| Poll submission history | GET | `webhook/1d02344c-0512-4a40-9c5b-ad8172bc91e8` | ✅ live |
| **Get project syntheses** | GET | `webhook/d19d24da-21d4-40f8-8626-a06a7dd54ac7` | ⏳ needs to be created |
| Mark row nonconsidered / delete | POST | *(not yet assigned)* | 💤 future |

## 1. Project synthesis webhook (create this one next)

The dashboard's "Project synthesis — final acquisition judgment" panel calls
`GET webhook/d19d24da-21d4-40f8-8626-a06a7dd54ac7` and expects the
project-level rows the consolidator workflow writes. Until this webhook
exists, the panel shows a friendly "not connected yet" notice — nothing else
breaks.

### Workflow shape (mirrors the history workflow)

1. **Webhook** node — Method `GET`, Path `d19d24da-21d4-40f8-8626-a06a7dd54ac7`,
   Authentication → Header Auth → reuse the existing **"Header Auth account"**
   credential, Respond → Using 'Respond to Webhook' Node.
2. **Get row(s)** node — read all rows from the **project-level table** the
   consolidator upserts into.
3. **Code** node (optional) — shape the rows (see field names below).
4. **Respond to Webhook** node — return the rows as JSON.
5. **Publish.**

### Response format

Either a bare JSON array of rows, or an object wrapping them in `rows`,
`data`, or `items`. The backend normalizer
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
