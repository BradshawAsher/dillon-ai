# MergeWorks Due Diligence Dashboard — Team Handoff

## Purpose

This is the current handoff for the MergeWorks team and Trisha. It covers the
live project-based diligence dashboard, its n8n integration, and the operating
checks needed to maintain it.

The [README](../README.md) is the setup and architecture reference. This
document is the operational handoff: who owns what, how the system behaves,
and what to verify after a change.

## Product today

The dashboard is an internal M&A diligence workspace. An analyst creates or
selects a project, uploads one or more files, and follows:

1. per-document processing and AI extraction;
2. batch progress;
3. project portfolio and document coverage; and
4. project-level synthesis, including risks, negotiation levers, and citations.

The frontend restores the latest document submission and latest project context
on a Live n8n page load. It also shows a synthesis-starting state while the
project consolidator has been triggered but has not yet published a final row.

## Ownership and source of truth

| Area | Source of truth / owner |
| --- | --- |
| Live workflow behavior, nodes, and Data Tables | Pod 1 n8n Cloud/Enterprise workflows; access coordinated with Trisha |
| Dashboard application | This repository |
| Submitted documents, document AI output, and synthesis rows | n8n Data Tables |
| Hosting and environment variables | Vercel deployment configuration |

Do not diagnose or modify workflow behavior from local exports or screenshots.
Use n8n MCP to inspect Pod 1's live workflows. If MCP access is unavailable or
does not expose the required workflow, ask Trisha for access before proceeding.

## Application architecture

```text
Browser
  -> /api/diligence/* (same-origin Express/Vite layer)
  -> n8n webhooks
  -> n8n Data Tables and background workflows
  -> polling responses back to the dashboard
```

The browser never calls n8n directly. The main implementation points are:

| Location | Responsibility |
| --- | --- |
| `frontend/pages/DueDiligenceDashboard.tsx` | Dashboard state, uploads, polling, latest-result restoration |
| `frontend/components/ProjectIntakeCard.tsx` | Project-based file intake |
| `frontend/components/ProjectPortfolioCard.tsx` | Project cards, synthesis download, project selection |
| `frontend/components/ProjectSynthesisCard.tsx` | Project synthesis display and report download |
| `frontend/components/SubmissionHistoryCard.tsx` | Document-level history and AI detail |
| `backend/diligence/` | n8n request/response normalization |
| `docs/n8n-webhooks.md` | API and expected n8n response contracts |

## Required live workflow behavior

For a successful multi-document flow, confirm the live Pod 1 workflows:

1. accept an upload and create a uniquely identifiable document row;
2. preserve `projectId`, `submissionBatchId`, and expected batch-document count;
3. write document status and AI output back to the document row;
4. start the project consolidator only after the batch is complete; and
5. publish a project-level synthesis row readable by the synthesis endpoint.

The dashboard recognizes active synthesis statuses including `queued`,
`pending`, `processing`, `running`, `synthesis_pending`, and `synthesizing`.
Writing one of these statuses when the document counter starts the consolidator
provides the most accurate progress signal.

## Environment and deployment

Required server-side environment variable:

```dotenv
N8N_WEBHOOK_SECRET=the-header-auth-secret
```

Optional local settings are documented in the README. Never expose the webhook
secret through a `VITE_` variable.

The primary deployment is Vercel. Before promoting a change, use a preview
deployment and perform the smoke test below.

## Smoke test after a dashboard or workflow change

1. Open the live dashboard and verify the latest project/document restores.
2. Upload one small test file to the test environment.
3. Confirm a history row appears and transitions through processing to a
   terminal status.
4. Confirm the document result renders AI summary, flags, citations, and raw
   extracted JSON as applicable.
5. For a one-document batch, confirm batch progress reaches completion and the
   synthesis-starting state appears.
6. Confirm the project synthesis row appears and its report downloads from both
   Project Synthesis and Project Portfolio.
7. Confirm no secret, personal data, or raw document content is exposed in the
   browser console or deployment logs.

## Known operating notes

- The active UI is project-centric; the retired Retool sample finding UI is
  intentionally hidden and retained only as code backup.
- Long AI sections are collapsible and scroll internally when expanded.
- A project marked **Needs triage** has a failed/error/rejected document;
  **Needs review** means document processing succeeded but at least one result
  requires human review.
- If a project appears mismatched in synthesis, verify the `projectId` written
  by the live document and synthesis workflows before changing frontend logic.

## Historical reference

The older Retool-to-VS Code-era document is preserved at
[docs/archive/OLD_PROJECT_HANDOFF_RETOOL_TO_VSCODE.md](archive/OLD_PROJECT_HANDOFF_RETOOL_TO_VSCODE.md).
It is historical context only and must not be used as the current workflow
source of truth.
