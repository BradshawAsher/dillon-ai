# MergeWorks Due Diligence Dashboard — Team & Project Handoff

*Updated: August 2026*

## Purpose

This document is the operational handoff for the MergeWorks team and engineering handoffs. It covers the live project-based diligence dashboard, its n8n and Supabase integration, evaluation harness, pipeline resiliency features, and operating procedures needed to maintain and scale it.

---

## Product Overview

MergeWorks is a document-first, post-LOI M&A diligence workspace. An analyst creates or selects a project, uploads one or more deal documents, and follows:

1. **Per-Document Processing & AI Extraction**: n8n runs document-level AI analysis (financial facts, risk flags, classification, citations, and deterministic math checks).
2. **Batch Progress & 20s Stall Auto-Detection**: Real-time batch progress with automatic 20-second stall detection if n8n halts or hits API credit limits.
3. **Audio & Chrome Browser Alerts**: Pure Web Audio API two-tone sound alerts and native OS notifications on AI failures.
4. **Project Portfolio & Dynamic Statuses**: Cross-references live Supabase syntheses to render accurate states (`Extracting documents...`, `Awaiting processing`, `Ready for synthesis`, `Synthesized`).
5. **Project-Wide Synthesis**: Consolidator workflow synthesizes findings, cross-document conflicts, negotiation levers, and valuation ranges.
6. **Automated Evaluation Harness (`npm run eval`)**: Full ground-truth benchmarking across 17 test documents and 5 sample deals in `test_sets/ground_truth/`.

---

## Ownership & Data Sources

| Area | Source of truth / owner | Location |
| --- | --- | --- |
| **Live Workflow Behavior** | Pod 1 n8n Cloud project (`2606-ai-fellows-mergeworks`) | `merge-works.app.n8n.cloud` via n8n MCP |
| **Primary Data Layer** | Supabase Postgres (`sihpsqrunkwkxhhnwoqe`) | Tables: `documents`, `project_syntheses`, `deal_models`, `workflow_errors`, `project_action_trackers` |
| **Legacy Backup Writes** | n8n Data Tables (written in parallel) | Tables: `Document Specific Fields`, `Project-Level Fields`, `Deal Models` |
| **Evaluation Suite** | Local test harness | `test_sets/ground_truth/` + `scripts/run-evals.ts` |
| **Dashboard Web UI** | React + TypeScript + Express API | `frontend/` (Vercel deployment: `https://due-diligence-dashboard.vercel.app`) |

---

## System Architecture

```text
Browser
  -> /api/diligence/* (Express/Vite server layer)
  -> Supabase/Postgres (Primary Read Layer for history, synthesis, deal models, action trackers)
  -> n8n Webhooks (Async Write Layer: document submit, retry, consideration, deal model save)

n8n Workflows (Async Background AI Pipeline)
  -> Reads file from Google Drive / Webhook payload
  -> Runs LLM Extraction + Deterministic Math Checks (Revenue - COGS = GP, Assets - Liab = Equity)
  -> Writes results in parallel to Supabase Postgres AND n8n Data Tables
  -> Counter subworkflow triggers Project Consolidator asynchronously upon batch completion
```

---

## Active Production AI Model Architecture

The production pipeline utilizes a 4-model hybrid routing architecture:

- **Per-Document Primary Extraction Model**: `OpenAI 5.6 Terra` ($0.055/doc)
- **Per-Document Backup Extraction Model**: `OpenAI 5.6 Sol` (fallback routing)
- **Project Synthesis Pass Primary Model**: `OpenAI 5.6 Terra` ($0.065/synthesis)
- **Project Synthesis Pass Backup Model**: `OpenAI 5.6 Sol` (fallback routing)

---

## Key Workspace Views & Tabs

| Workspace Tab | Purpose & Features |
| --- | --- |
| **Overview** | Executive Deal Memo, Deal Health KPIs, Deal Grade (A–F), Top Risks, Top Levers, Seller Questions, Business Snapshot, Buyer Profile, and Pipeline Error Alert Banner. |
| **Diligence** | Document Intake Dropzone, Project Portfolio with status indicators, Submission History Table with inline error boxes, Evidence Drawer, and Project Synthesis Card. |
| **Valuation** | Multimodal method comparison (Asset-based, Revenue multiple, EBITDA/SDE multiple, Blended), Valuation Impact Bridge, Comparable Transactions, and Sensitivity Heatmap. |
| **Returns** | All-Cash vs. Financed returns modeling, Cash-on-Cash calculator, Annual Cash Flow breakdown, Payback timeline, Debt Service Coverage (DSCR), and Monte Carlo simulation. |
| **Growth** | 5-Year Revenue & EBITDA projections, Business Value Evolution, Growth Sensitivity Tornado chart, Exit Readiness assessment, and 100-Day Action Plan. |
| **Deal Structure** | Deal Stack / Sources & Uses visual builder, Leverage Safety margin, Downside Protection, Cash Reserve analysis, and Working Capital requirements. |
| **Evals & Harness** | Live execution dashboard displaying automated accuracy scores against the 17 ground truth test documents across Classification, Facts, Risk, Valuation, Employees, and Math Checks. |

---

## Evaluation Suite & Ground Truth Benchmarking

The workspace includes a complete automated evaluation harness to verify AI extraction quality against sample deals before deploying prompt/workflow changes.

- **Run Command**:
  ```bash
  npm run eval
  ```
- **Ground Truth Files**: Located in `test_sets/ground_truth/` (17 JSON specifications).
- **Scoring Rubric**:
  - **Document Classification**: 10 pts max
  - **Financial Facts Extraction**: 10 pts max per metric (1% tolerance = 10 pts, 5% = 5 pts)
  - **Risk Assessment & Flags**: 20 pts max (Traffic light + Red/Yellow flag recall)
  - **Valuation Bounds**: 15 pts max
  - **Employee Evidence**: 5 pts max
  - **Math Checks**: 10 pts max
- **Pass Threshold**: **>= 80% (Ship-Ready)** across all 17 documents.

---

## Environment & Deployment

Required environment variables (`frontend/.env` locally & Vercel project settings):

```dotenv
N8N_WEBHOOK_SECRET=<header-auth-secret>
SUPABASE_URL=https://sihpsqrunkwkxhhnwoqe.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-dashboard>
PORT=3000
```

### Build & Typecheck Commands:

```bash
cd frontend
npm run typecheck   # Type-checks all React components & API normalizers
npm run build       # Production bundle build
npm run check       # Runs typecheck + tests + build in a single gate
```

---

## Operational Smoke Test (Post-Release)

1. Open **`https://due-diligence-dashboard.vercel.app`**.
2. Verify existing projects populate with correct status badges (`Synthesized`, `Extracting documents...`, `Awaiting processing`).
3. Upload a sample document to a new project.
4. Verify document appears in the history table, displays status transitions, and shows inline errors if n8n hits an API limit.
5. Confirm audio alert tone plays and desktop Chrome notification fires if a processing error occurs.
6. Verify Project Synthesis Card renders at the top of the Diligence view once document extraction completes.
7. Open the **Evals & Harness** tab or run `npm run eval` in terminal to view evaluation scores.

---

## Documentation Index

- **`README.md`**: Core repository architecture & setup.
- **`ACTIVE_TODOS.md`**: Current active todo list & pipeline roadmap.
- **`docs/HOW_TO_RUN.md`**: Local development setup & debugging rules.
- **`docs/LIVE_N8N_WORKFLOWS.md`**: Verified Pod 1 n8n Cloud workflows & table schema map.
- **`docs/n8n-webhooks.md`**: API endpoints, payloads, and response contracts.
- **`test-case-plan.md`**: Test plan for the 5 sample deals & 17 test documents.

