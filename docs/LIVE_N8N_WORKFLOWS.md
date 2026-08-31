# Live Pod 1 n8n workflows

This is a compact operating map of the live workflows backing the dashboard.
It is intentionally not a workflow export: the live Pod 1 n8n Cloud project is
the source of truth. Inspect it through n8n MCP before changing behavior.

Last verified: August 2026 via n8n MCP.

## Active write workflows

All write workflows now write to **both** n8n Data Tables AND Supabase in
parallel. The Supabase credential used is ID `2bjegcUtAn2gvy8A`.

| Workflow | Live ID | Purpose | Read Layer (Primary) | Write Layer (Dual-Write) |
| --- | --- | --- | --- | --- |
| Submit Button Webhook Trigger | `vBnMdx8cvSFIFx6m` | Receives a document submission, checks duplicates, and starts processing. | Supabase `documents` | Supabase `documents` + `project_syntheses` + `deal_models` & n8n tables |
| Per Document AI Analysis | `W5Jp7CJIQbNy0qlY` | Downloads, parses, analyzes, and updates one document row. | Drive / Inbound Payload | Supabase `documents` & n8n `rBFHVB1W7ldSiObM` |
| DOCUMENT COUNTER UTILITY SUBWORKFLOW | `0OVTAMMp2iMx53Aw` | Tracks terminal documents, builds a sorted evidence manifest, and atomically claims that manifest through `claim_project_synthesis`. Only the claim owner may set `synthesis_pending` or start the Consolidator. | Supabase `documents` + `DD Project-Level Fields` | Supabase `synthesis_runs` & n8n `DTrLU8hBUwYzmBig` |
| SUBWORKFLOW PROJECT-WIDE CONSOLIDATOR WORKFLOW | `IoSad3rTYJMk4Mon` | Reconciles exactly the request IDs and terminal states in the claimed evidence manifest, stores one signed synthesis version, and completes or releases the claim. Cross-store completion timestamps are not compared because each dual-write target stamps independently. | Supabase `documents` + `synthesis_runs` | Supabase `project_syntheses` + `synthesis_runs` & n8n `DTrLU8hBUwYzmBig` |
| Project Documented Facts Bridge | `uAI6pABZWdIy2V17` | Reads considered documents, consolidates LOI terms and accounting facts, and syncs full metric columns. | Supabase `documents` | Supabase `deal_models` & n8n `eU2nnH4bVmdPocI8` |
| Deal Model Write API | `O2fi0mKmKHxewuN5` | Saves user-entered deal model assumptions (30 financial parameters). | Inbound HTTP Payload | Supabase `deal_models` & n8n `eU2nnH4bVmdPocI8` |
| Retry Failed Document | `iOaYHcZLktC6aO2u` | Retries a failed document via Drive file ID and dispatches to per-document analysis. | Supabase `documents` | Dispatches to `W5Jp7CJIQbNy0qlY` (Dual-Writes) |
| Document Consideration Webhook | `lXz9fVKY4RaTlDFM` | Marks a document `isConsidered=false` without deleting it, then refreshes batch readiness. | Supabase `documents` | Supabase `documents` & n8n `rBFHVB1W7ldSiObM` |
| Stuck Document Watchdog | `BaQO1dHCAm0Tf6kk` | 3-tier self-healing cron: Auto-reconciles stalled batches, resets stuck docs (>180s), and logs deduplicated Slack alerts with a 30-min cooldown. | Supabase `documents` + `workflow_errors` + `reliability_alert_state` | Supabase `reliability_alert_state` & n8n `FSvRhLe3YI4EZcJk` |
| Workflow Error Audit | `4dqKa3CyLjjaFn8C` | Records uncaught production errors after local recovery has been exhausted. | Error Trigger Payload | Supabase `workflow_errors` & n8n `aSPSRYm0ScfGsV0b` |
| Chat Assistant | `LBZVN8zeFT03Wn12` | Answers analyst questions with rich deal context and cross-project portfolio analysis. | Inbound Context Payload | Stateless Agent Response |

## Archived read-only webhooks (no longer needed)

These workflows served data to the dashboard via polling. They have been
replaced by direct Supabase reads in the backend API and were archived on
2026-07-31 to stop burning n8n executions.

| Workflow | Archived ID | Was used for |
| --- | --- | --- |
| Refresh Button Load History in UI | `bjtY6gjRnLe7YQ4c` | Submission history |
| Project Synthesis Webhook | `35Hmd7f0EyXKpc4x` | Project syntheses |
| Deal Model Read API | `t0gzUuJ8rmYBhXuv` | Deal model reads |
| Error Log API | `a5swO2SfagTR190o` | Workflow error log |
| Workflow Error Log Review | `toZjJcNlFLQddfDK` | Error log review |
| Project Action Tracker API | `qpxmBSnbeQXdSuwo` | Action tracker reads |

## Supabase tables (primary read layer)

The dashboard backend reads exclusively from Supabase. Schema lives in
`supabase/migrations/001_initial_schema.sql`. Project ref: `sihpsqrunkwkxhhnwoqe`.

| Table | Supabase | Purpose |
| --- | --- | --- |
| `documents` | one row per submitted document | Submission metadata, per-document AI output, batch fields, `is_considered` |
| `project_syntheses` | one row per synthesis version | Project judgment, valuation, flags, evidence signature, and owning synthesis run |
| `synthesis_runs` | one row per automatic evidence set or manual attempt | Atomic ownership, lease/retry state, evidence manifest, and completion audit |
| `deal_models` | one row per project | User-entered and AI-derived deal model assumptions |
| `workflow_errors` | append-only | Production error audit trail |
| `project_action_trackers` | one row per project | User checklists and management questions |
| `reliability_alert_state` | one row per alert key | Watchdog cooldown timestamps and alert deduplication state |

### Dashboard read-efficiency contract

- Unscoped portfolio reads use compact column projections. They must not include
  full document flags, citations, extracted JSON, or project judgment JSON.
- The selected project loads full document and synthesis rows with a
  `projectId` filter, then merges them into the compact portfolio snapshot.
- Supabase Realtime subscriptions are filtered to the active project. A change
  refreshes only the corresponding project dataset.
- The fallback heartbeat is project-scoped and runs only while document or
  synthesis work is non-terminal. Completed, interrupted, stopped, and errored
  batches must not keep polling.

### Nested source-path contract

Every new submission carries `sourceRelativePath`, a normalized path relative
to the browser-selected folder or ZIP root (for example,
`Target/2025 Financials/P&L.xlsx`). The backend persists it as
`documents.source_relative_path`; the n8n Document Specific Fields mirror uses
`sourceRelativePath`.

- A path is used with the base filename and file size to identify a duplicate,
  so equally named documents in different folders are separate submissions.
- Retries keep the original path and may only reuse a stored file from the same
  project and path.
- Per-document prompts and project synthesis use the relative path as the
  citation label, while preserving the original filename separately.
- Paths are normalized to forward slashes and reject absolute or parent-
  traversing values. Folder labels are organizational metadata, never evidence
  that a document is audited, final, or otherwise substantively correct.

## Legacy n8n Data Table contract (Dual-Write Fallback Mirror)

- **Document Specific Fields** (`rBFHVB1W7ldSiObM`): mirrors `documents`.
- **Project-Level Fields** (`DTrLU8hBUwYzmBig`): mirrors `project_syntheses`.
- **Deal Models** (`eU2nnH4bVmdPocI8`): mirrors `deal_models`.
- **Workflow Error Log** (`aSPSRYm0ScfGsV0b`): mirrors `workflow_errors`.
- **Reliability Alert State** (`FSvRhLe3YI4EZcJk`): mirrors `reliability_alert_state`.
- **Pod1_Project_Action_Tracker** (`QW6bQq9KdE77D0FP`): mirrors `project_action_trackers`.

These are maintained as parallel backup stores for disaster recovery and rollback safety.
Workflows execute primary reads from Supabase PostgreSQL, while write nodes dispatch identical
payloads to both Supabase and n8n Data Tables.

`isConsidered` / `is_considered` is backward compatible: rows that predate the
field are treated as considered. Explicit `false` excludes the document from
batch completion, project counts, coverage, and future synthesis while
retaining it for audit.

## Operating rules

1. Do not rely on old local workflow JSON or screenshots.
2. Before an n8n change, inspect the relevant live workflow and Data Table via
   n8n MCP; if unavailable, ask Trisha for Pod 1 access.
3. Publish a workflow after updating it—editing a draft does not update the
   active production version.
4. Keep dashboard webhook paths and response fields aligned with
   [n8n-webhooks.md](n8n-webhooks.md).
5. Never replace the `synthesis_runs` claim with a Data Table read/check/write
   sequence. See [Synthesis Idempotency](SYNTHESIS_IDEMPOTENCY.md).

### Webhook-auth contract

The active Submit, Consolidator, Per-Document, Document Counter, Document
Consideration, Deal Model Write, Facts Bridge, Watchdog, Error Audit, and Retry
webhooks use the shared n8n Header Auth credential. Browser code must never
receive the header value: server-side dispatch goes through
`n8nFinancialAgent.rawRequest`, which attaches `x-webhook-secret` from the
server-only `N8N_WEBHOOK_SECRET` variable.

Internal Execute Workflow, Schedule, and Error Trigger invocations do not use
HTTP and therefore do not send this header. Their public webhook triggers may
remain available for authenticated diagnostics.

Chat Assistant must use the same-origin `/api/diligence/chat` relay before its
Header Auth draft is published; the browser must not call `dd-chat` directly or
embed the shared credential.

## Reliability baseline

The submit, counter, consolidator, document-consideration, history, and
project-synthesis workflows retry their external/Data Table/subworkflow calls
three times with a two-second delay. The per-document analysis workflow uses
provider-specific backoff. Before each retry it restores the original downloaded
binary and re-runs validation and media routing. Unsupported-input and missing-
binary errors are terminal; exhausted processing failures retain the provider's
detailed message and route to a terminal document status so the batch can
continue.

Media routing happens before LlamaParse. MP4, MOV, WebM, and M4V files use the
Gemini video-analysis node. MP3, M4A, WAV, AAC, OGG, and FLAC files use the OpenAI
audio-transcription node. Other document formats use LlamaParse, after which the
configured per-document extraction model analyzes the resulting text. Extension
and MIME checks use direct string comparisons rather than regular expressions so
workflow serialization cannot change escaping behavior.

The three extraction routes normalize into one shared `text` field before the
financial-analysis model runs. This includes Gemini responses under
`content.parts[].text`. Token and cost estimates use that normalized text rather
than referencing a provider-specific node. Starting a retry clears stale failure
markers in both mirrors. If either Supabase persistence step fails after its
built-in retries, the error output marks the document failed in the n8n Data Table
and Supabase instead of leaving an indefinitely running document.

Automatic synthesis ownership lives in Supabase, not the n8n mirror. The claim
function uses a unique `(project_id, evidence_signature)` key and a 15-minute
lease. Duplicate document-completion executions exit before changing the
project status or calling the model. A failed claim can be retried immediately;
an execution that disappears without running its error path can be reclaimed
after its lease expires.

Measured from live executions (2026-08): per-document analysis runs at ~p50 71 s
/ p95 125 s wall-clock, and the robust output-recovery path (schema validation →
Haiku repair pass) has been observed correcting an invalid first-pass result in
production. Note the shared execution pool: at month-end the account can hit the
n8n Cloud execution limit — read traffic was moved to direct Supabase queries and
the legacy read webhooks archived specifically to reduce that execution burn.

The shared Error Audit workflow is published and ready. Attaching it through
`settings.errorWorkflow` is currently blocked by an n8n server-side SQLite
schema error (`distinctAlias.SharedWorkflow_projectId`); no workflow settings
were changed by those rejected updates. Once n8n resolves that issue, attach
`4dqKa3CyLjjaFn8C` as the shared last-resort production error handler.

## Production AI Model Routing Architecture

The live workflows invoke 4 primary and backup model endpoints:

- **Per-Document Primary Extraction Model**: `OpenAI 5.6 Terra` ($0.055/doc) — Handles document categorization, line-item P&L parsing, and fact extraction.
- **Per-Document Backup Extraction Model**: `OpenAI 5.6 Sol` — Automatic fallback on complex multi-tab spreadsheets, tax schedules, or LLM rate-limit errors.
- **Project Synthesis Pass Primary Model**: `OpenAI 5.6 Terra` ($0.065/synthesis) — Handles project-wide cross-document reconciliation, valuation range calibration, and deal memo generation.
- **Project Synthesis Pass Backup Model**: `OpenAI 5.6 Sol` — Secondary fallback model for project synthesis if primary endpoints experience elevated latency or API errors.

