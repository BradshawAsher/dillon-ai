# Live Pod 1 n8n workflows

This is a compact operating map of the live workflows backing the dashboard.
It is intentionally not a workflow export: the live Pod 1 n8n Cloud project is
the source of truth. Inspect it through n8n MCP before changing behavior.

Last verified: 2026-07-22 via n8n MCP.

| Workflow | Live ID | Purpose | Key dependency |
| --- | --- | --- | --- |
| Submit Button Webhook Trigger | `vBnMdx8cvSFIFx6m` | Receives a document submission and starts document processing. | Document Specific Fields table; Per Document AI Analysis |
| PER DOCUMENT AI ANALYSIS SUBWORKFLOW | `x5xGcD4P1e9WTVUt` | Downloads, parses, analyzes, and updates one document row. | Google Drive; Document Counter |
| DOCUMENT COUNTER UTILITY SUBWORKFLOW | `0OVTAMMp2iMx53Aw` | Tracks batch completion and starts project synthesis when considered documents are terminal. | Document Specific Fields; Project-Level Fields; Consolidator |
| SUBWORKFLOW PROJECT-WIDE CONSOLIDATOR WORKFLOW | `IoSad3rTYJMk4Mon` | Reconciles considered document outputs into a project-level synthesis. | Document Specific Fields; Project-Level Fields |
| Project Synthesis Webhook | `35Hmd7f0EyXKpc4x` | Serves saved project-level synthesis rows to the dashboard. | Project-Level Fields table |
| Refresh Button Load History in UI | `bjtY6gjRnLe7YQ4c` | Serves document-submission history to the dashboard. | Document Specific Fields table |
| Document Consideration Webhook | `lXz9fVKY4RaTlDFM` | Marks a document `isConsidered=false` without deleting it, then refreshes batch readiness. | Document Specific Fields; Document Counter |
| Workflow Error Audit | `4dqKa3CyLjjaFn8C` | Records uncaught production errors after local recovery has been exhausted. It does not notify humans. | Workflow Error Log table |

## Live Data Table contract

- **Document Specific Fields** (`rBFHVB1W7ldSiObM`): one row per submitted
  document. It carries submission metadata, per-document AI output, batch
  fields, and `isConsidered`.
- **Project-Level Fields** (`DTrLU8hBUwYzmBig`): one row per project with
  batch counts, project status, and the final synthesis fields.
- **Workflow Error Log** (`aSPSRYm0ScfGsV0b`): an append-only audit trail for
  uncaught production errors. It captures the failed workflow/node, execution
  ID, error message, and raw error context. It is intentionally not an alert
  channel.

`isConsidered` is backward compatible: rows that predate the field are treated
as considered. Explicit `false` excludes the document from batch completion,
project counts, coverage, and future synthesis while retaining it for audit.

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
three times with a two-second delay. The per-document analysis workflow already
uses the same retry policy and routes exhausted processing failures to a terminal
document status so the batch can continue.

The shared Error Audit workflow is published and ready. Attaching it through
`settings.errorWorkflow` is currently blocked by an n8n server-side SQLite
schema error (`distinctAlias.SharedWorkflow_projectId`); no workflow settings
were changed by those rejected updates. Once n8n resolves that issue, attach
`4dqKa3CyLjjaFn8C` as the shared last-resort production error handler.
