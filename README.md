# Dillon AI (by MergeWorks) — Autonomous Financial Due Diligence Engine

**Dillon AI** is the flagship AI-powered M&A intelligence platform developed by **MergeWorks** for private equity sponsors, search funds, and M&A advisors. Deal documents are ingested into project data rooms, processed asynchronously by MergeWorks' Pod 1 n8n cloud pipeline, and synthesized in a high-performance React workspace.

## Dual Core Agent Capabilities

The Financial Due Diligence Agent automates two core M&A workflow stages (see [`PURPOSE.md`](PURPOSE.md) and [`LOI_DEPENDENCIES.md`](LOI_DEPENDENCIES.md) for full breakdown):

1. **Phase 1: Pre-LOI Valuation Discovery & Normalized EBITDA Extraction**
   - Extracts revenue, gross profit, and reported EBITDA from raw financial statements (P&L, Trial Balance, Tax Returns).
   - Audits seller EBITDA bridges to uncover unsupported forward-looking assertions or non-recurring items.
   - Computes mathematically defensible fair value bounds (**Base, Downside, Upside**).

2. **Phase 2: Post-LOI Deal Negotiation & Cross-Document Reconciliation**
   - Reconciles proposed LOI purchase prices against audited valuation estimates to quantify overpayment exposure.
   - Cross-checks bank statement cash, inventory subledgers, and tax filings to detect cross-document accounting discrepancies.
   - Auto-generates dollar-for-dollar purchase price reduction levers, working capital peg adjustments, closing escrows, and Deal Memos.

## Key Documentation Links

- **[System Architecture & Technical Specification (`ARCHITECTURE.md`)](ARCHITECTURE.md)** — Comprehensive architecture diagrams, data flow sequence charts, component deep-dives, and interview masterclass talking points.
- **[Evaluation Harness & Benchmark Guide (`EVALS.md`)](EVALS.md)** — 58-document golden benchmark dataset, 5-dimension scoring rubric, and 1-card Pre/Post-LOI toggle design.
- **[Dual Core Agent Capabilities (`PURPOSE.md`)](PURPOSE.md)** — Pre-LOI Valuation Discovery & Post-LOI Deal Negotiation frameworks.
- **[Deterministic Math Verification (`DETERMINISTIC_MATH_CHECKS.md`)](DETERMINISTIC_MATH_CHECKS.md)** — Zero-hallucination accounting verification rules.

## Current Architecture & Data Flow

```text
Browser (React 19 SPA)
  ├── 1. Direct-to-Cloud Uploads (Presigned URLs -> Supabase Storage S3)
  ├── 2. Edge Caching & Proxy (Cloudflare Edge Worker -> s-maxage=10 / ETag <15ms)
  ├── 3. Instant Portfolio Metrics -> PostgreSQL RPC (get_portfolio_diligence_kpis <2ms, <400B)
  ├── 4. Batch Dispatch -> same-origin REST API (/api/diligence/*) -> Pod 1 n8n Webhooks
  ├── 5. Parallel Extraction -> OpenAI 5.6 Terra (Primary) / Sol (Backup) -> Math Engine
  ├── 6. Project Synthesis -> Idempotent Counter Gate -> Cross-Doc Contradiction Engine -> IC Memo
  └── 7. Real-Time Stream -> Supabase Realtime CDC (WebSockets push <100ms) & PostgreSQL
```

See the full diagrams and sequence charts in **[`ARCHITECTURE.md`](ARCHITECTURE.md)**.

Pod 1's live n8n Cloud/Enterprise workflows are the workflow source of truth.
Inspect them through n8n MCP. If MCP access is unavailable, request access
before diagnosing or changing workflow behavior.

## Active Production AI Model Architecture

The Financial Due Diligence Agent utilizes a 4-model hybrid routing architecture designed for maximum accuracy, mathematical precision, and cost efficiency:

| Pipeline Stage | Model Role | Active Model | Purpose & Routing |
| --- | --- | --- | --- |
| **Per-Document Extraction** | **Primary** | `OpenAI 5.6 Terra` | Financial fact extraction, line-item P&L parsing, risk flag detection, and classification ($0.055/doc). |
| **Per-Document Extraction** | **Backup** | `OpenAI 5.6 Sol` | Automatic fallback routing on complex non-standard tax schedules, multi-tab workbooks, or rate-limit retry passes. |
| **Project Synthesis Pass** | **Primary** | `OpenAI 5.6 Terra` | Project-wide cross-document reconciliation, deal judgment generation, purchase price bridge calculations, and deal memo synthesis ($0.065/synthesis). |
| **Project Synthesis Pass** | **Backup** | `OpenAI 5.6 Sol` | Secondary fallback model for deal synthesis if primary model endpoints experience elevated latency or errors. |

## Measured performance & Egress Metrics

Numbers below are measured from live n8n execution telemetry and Supabase database metrics:

- **Portfolio KPI Query Latency**: < 2 ms via PostgreSQL stored procedure (`get_portfolio_diligence_kpis`).
- **Edge Cache Hit Latency**: < 15 ms via Cloudflare Edge Worker with `stale-while-revalidate`.
- **Egress Bandwidth Reduction**: > 99.8% reduction across portfolio feeds (payload cut from 180KB+ to < 400 bytes).
- **Per-document extraction latency**: ~21–25 s average per document (download → tabular preflight → LLM fact extraction → deterministic reconciliation → write).
- **Project synthesis pass latency**: ~45–60 s average per synthesis pass (cross-document reconciliation → EV/SDE multiple bridge → deal memo generation).
- **Combined full-deal latency**: ~p50 71 s / p95 125 s end-to-end when processing multi-document batches and final synthesis in sequence.
- **Per-document cost**: ~$0.055 per document using **OpenAI 5.6 Terra** primary extraction with **OpenAI 5.6 Sol** backup routing.
- **Synthesis pass cost**: ~$0.065 per project using **OpenAI 5.6 Terra** primary synthesis with **OpenAI 5.6 Sol** backup routing.
- **Retry/backoff**: external and sub-workflow calls retry 3× with a 2 s delay (5 s on model-adjacent nodes).
- **Self-Healing Watchdog**: 3-tier recovery cron (`BaQO1dHCAm0Tf6kk`) auto-reconciles stalled batches and heals documents stuck > 180 s.
- **Idempotent Synthesis Gate**: Document counter subworkflow (`0OVTAMMp2iMx53Aw`) locks project state to eliminate duplicate synthesis passes.

## Run locally

Use Node `22.x` for local development and Vercel compatibility.

On Windows, `nvm-windows` is recommended so you can switch to the project Node
version without affecting other repos.

```sh
nvm install 22.16.0
nvm use 22.16.0
cd frontend
npm install
npm run dev
```

If you do not use `nvm`, install a Node `22.x` release directly and then run
`npm install` from `frontend/`.

Open the URL Vite prints, normally `http://localhost:5173`. Dev mode supports
hot reload.

For a production-style local run:

```sh
cd frontend
npm start
```

This builds the frontend and starts the Express server at
`http://localhost:3000`. Restart `npm start` after source-code changes.

Useful checks:

```sh
npm run typecheck
npm run test
npm run build
npm run preview
```

Or run typecheck, tests, and the production build together as one gate:

```sh
npm run check
```

## Configuration

Create `frontend/.env` (it is gitignored):

```dotenv
N8N_WEBHOOK_SECRET=the-header-auth-secret-used-by-n8n
PORT=3000
VITE_USE_MOCKS=false
```

- `N8N_WEBHOOK_SECRET` is sent server-side as `x-webhook-secret`; it is never
  exposed to the browser.
- `VITE_USE_MOCKS=true` changes the initial local source to Example mode.
- Access gates are currently disabled. To restore the shared-password gate for
  the local/Render server, set `ENABLE_ACCESS_GATES=true` and `APP_PASSWORD`.

## Live n8n and Example mode

The bottom-right **Data: Example / Live n8n** control persists its selection in
browser local storage.

- **Live n8n** is the default. Uploads trigger the real Cloud workflow and
  refreshes read real n8n rows.
- **Example** is pre-loaded sample data. It does not send data to n8n and
  demonstrates the document-analysis and project-synthesis experience.

The retired legacy sample findings data is not rendered in either mode.

## API and webhook flow

The dashboard uses these same-origin endpoints:

| Dashboard API | Method | n8n purpose |
| --- | --- | --- |
| `/api/diligence/submit` | `POST` | Accept a document upload and quickly acknowledge it |
| `/api/diligence/history` | `GET` | Return document-specific rows for polling |
| `/api/diligence/synthesis` | `GET` | Return project-level synthesis rows for polling |

The detailed live n8n webhook paths, response schema, and required response
shape are documented in [docs/n8n-webhooks.md](docs/n8n-webhooks.md).
For the current workflow map, Data Table ownership, and operating rules, see
[docs/LIVE_N8N_WORKFLOWS.md](docs/LIVE_N8N_WORKFLOWS.md).

The asynchronous lifecycle is:

```text
submit document
  -> document row is queued/processing
  -> document AI workflow writes completed fields
  -> document counter updates project state
  -> project synthesizer writes project-level result
  -> UI polls history and synthesis rows until terminal statuses arrive
```

## n8n setup notes

All live n8n webhooks should use Header Auth with the `x-webhook-secret`
credential matching `N8N_WEBHOOK_SECRET`.

The project-synthesis read workflow must return project rows using the
documented shape, for example:

```json
{ "rows": [{ "projectId": "project-1", "projectStatus": "synthesized" }] }
```

For a live workflow change, use n8n MCP to inspect and update the Pod 1
workflow, then document the confirmed change in this repository. If MCP access
is unavailable, ask for access rather than relying on local exports.

## Deployment: Vercel (primary)

The production dashboard is deployed on Vercel:

<https://due-diligence-dashboard.vercel.app/>

Import the repository with the Root Directory set to the repository root.
The committed `vercel.json` supplies the install, build, and output settings.
Vercel should use Node `22.x`, matching `frontend/package.json`.
Set `N8N_WEBHOOK_SECRET` in Vercel for both Preview and Production; never
expose it with a `VITE_` prefix.

Use a Vercel preview deployment to validate live history, a test upload,
batch progress, and project synthesis before promoting a change. See
[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) for the full checklist.

## Render backup (legacy)

`render.yaml` defines the Render service. Create a Render Blueprint from the
repository and set `APP_PASSWORD` and `N8N_WEBHOOK_SECRET` in Render.

The configured deployment URL is:

<https://due-diligence-dashboard.onrender.com/>

## Key UI features

- **Multi-Modal VDR Ingestion Dropzone** — Ingests 9 asset classes (PDF, XLSX, DOCX, EML, WEBP, PPTX, MP3, MP4, and client-side unpacked ZIP archives) with direct presigned cloud uploads.
- **Interactive Evals & Harness Tab** — 1-Card per deal with real-time `Pre-LOI Discovery` ↔ `Post-LOI Negotiation` toggle, 58 golden benchmark documents, and per-document precision inspection.
- **Guided Walkthrough & Simulated VDR Modal** — macOS-style interactive VDR file explorer, step-by-step feature tours, and mission quests.
- **Overview tab** with Summary / Deep Analysis sub-tabs — Deal Memo shown first.
- **AI Chatbot** (floating panel) — context-aware Q&A about the active project and all other projects in the portfolio.
- **Deterministic math checks** — pure arithmetic cross-verification of extracted financials (see [DETERMINISTIC_MATH_CHECKS.md](DETERMINISTIC_MATH_CHECKS.md)).
- **Deal Grade** — letter grade (A–F) across pricing, profitability, risk, data quality, payback.
- **Quick Valuation & Bridge** — back-of-napkin valuation ranges with price markers, seller add-back adjustments, and escrow recommendations.
- **Radar Chart** — 5-dimension SVG spider chart (no Recharts dependency).
- **Risk Matrix** — 2×2 likelihood × impact grid with cross-document contradiction detection.
- **Confidence Meter** — circular gauge across 4 dimensions.
- **Seller Questions / DD Request List / Email Draft** — auto-generated from deal state.
- **Project Portfolio** — per-project "Add documents" button and synthesis download.
- **Keyboard shortcuts** — Cmd/Ctrl+K command palette, C for chat, Escape to close panels.
- **Resilient analysis modules** — 40+ analysis cards are lazy-loaded and wrapped in per-section error boundaries (`SafeSuspense`), so a single card failing degrades locally without breaking the dashboard.

## Project map

| Path | Role |
| --- | --- |
| `ARCHITECTURE.md` | **System architecture, end-to-end data flow diagrams & interview prep guide** |
| `frontend/pages/` and `frontend/components/` | React interface |
| `frontend/components/walkthrough/` | Interactive walkthrough tour engine & simulated VDR modal |
| `frontend/hooks/backend/diligence.ts` | Live/mock query hooks used by the UI |
| `frontend/server.ts` | Standalone Express API and production static server |
| `frontend/localApi.ts` | Development API middleware |
| `frontend/retoolRuntime.ts` | Node-side n8n client and Retool-global compatibility shim |
| `backend/diligence/` | Submit, history, and synthesis normalizers |
| `docs/n8n-webhooks.md` | n8n webhook contracts and troubleshooting |
| `docs/HOW_TO_RUN.md` | Additional operating notes |
| `PURPOSE.md` | Dual core capabilities: Pre-LOI Discovery & Post-LOI Negotiation |
| `DETERMINISTIC_MATH_CHECKS.md` | How deterministic math checks work |
| `GROUND_TRUTH_METHODOLOGY.md` | Ground truth creation methodology, gold standard datasets & high-accuracy architecture |
| `EVALS.md` | Evaluation harness guide, 7-dimension scoring & CI/CD benchmark tests |
| `EVAL_FAQ_AND_EDGE_CASES.md` | Evaluation edge-case handling & buyer defense FAQ |

## Retool provenance

The dashboard originated as a Retool export. Some compatibility names remain
(`n8nFinancialAgent`, generated-hook-shaped APIs, and `retoolRuntime.ts`), but
the standalone dashboard's active document and synthesis data path is n8n and
Supabase PostgreSQL/Storage, not Retool DB.

## Team handoff

For the operational handoff to MergeWorks and Trisha—including ownership, live
n8n expectations, and the release smoke test—see
[docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md). The older Retool-to-VS
Code handoff is archived under `docs/archive/` for historical context only.
