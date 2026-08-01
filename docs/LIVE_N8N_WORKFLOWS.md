# Live Pod 1 n8n workflows

This is a compact operating map of the live workflows backing the dashboard.
It is intentionally not a workflow export: the live Pod 1 n8n Cloud project is
the source of truth. Inspect it through n8n MCP before changing behavior.

Last verified: 2026-07-31 via n8n MCP.

## Active write workflows

All write workflows now write to **both** n8n Data Tables AND Supabase in
parallel. The Supabase credential used is ID `2bjegcUtAn2gvy8A`.

| Workflow | Live ID | Purpose | Key dependency |
| --- | --- | --- | --- |
| Submit Button Webhook Trigger | `vBnMdx8cvSFIFx6m` | Receives a document submission and starts document processing. | Supabase `documents` + `project_syntheses` + `deal_models`; Per Document AI Analysis |
| Per Document AI Analysis | `W5Jp7CJIQbNy0qlY` | Downloads, parses, analyzes, and updates one document row. | Google Drive; Supabase `documents`; Document Counter |
| DOCUMENT COUNTER UTILITY SUBWORKFLOW | `0OVTAMMp2iMx53Aw` | Tracks batch completion and starts project synthesis when considered documents are terminal. | Document Specific Fields; Project-Level Fields; Consolidator |
| SUBWORKFLOW PROJECT-WIDE CONSOLIDATOR WORKFLOW | `IoSad3rTYJMk4Mon` | Reconciles considered document outputs into a project-level synthesis. | Supabase `project_syntheses`; Document Specific Fields |
| Project Documented Facts Bridge | `uAI6pABZWdIy2V17` | Consolidates confirmed per-document facts into one cited Deal Model record. | Supabase `deal_models` |
| Deal Model Write API | `O2fi0mKmKHxewuN5` | Saves user-entered deal model assumptions. | Supabase `deal_models` |
| Document Consideration Webhook | `lXz9fVKY4RaTlDFM` | Marks a document `isConsidered=false` without deleting it, then refreshes batch readiness. | Supabase `documents`; Document Counter |
| Workflow Error Audit | `4dqKa3CyLjjaFn8C` | Records uncaught production errors after local recovery has been exhausted. | Supabase `workflow_errors` |

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
| `project_syntheses` | one row per project | Project status, synthesis judgment, valuation, flags |
| `deal_models` | one row per project | User-entered and AI-derived deal model assumptions |
| `workflow_errors` | append-only | Production error audit trail |
| `project_action_trackers` | one row per project | User checklists and management questions |

## Legacy n8n Data Table contract (still written in parallel)

- **Document Specific Fields** (`rBFHVB1W7ldSiObM`): mirrors `documents`.
- **Project-Level Fields** (`DTrLU8hBUwYzmBig`): mirrors `project_syntheses`.
- **Deal Models** (`eU2nnH4bVmdPocI8`): mirrors `deal_models`.
- **Workflow Error Log** (`aSPSRYm0ScfGsV0b`): mirrors `workflow_errors`.

These are retained for rollback safety. Once Supabase is confirmed stable,
they can be removed from the write workflows.

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

## Reliability baseline

The submit, counter, consolidator, document-consideration, history, and
project-synthesis workflows retry their external/Data Table/subworkflow calls
three times with a two-second delay. The per-document analysis workflow uses the
same policy (`maxTries: 3`, `waitBetweenTries: 2000ms`), except the two
model-adjacent nodes back off 5000ms; exhausted processing failures route to a
terminal document status so the batch can continue.

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
