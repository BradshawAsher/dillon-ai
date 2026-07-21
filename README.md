# Due Diligence Dashboard

Internal M&A / financial due-diligence workspace. Documents are uploaded into
projects, processed asynchronously by n8n, and displayed in a React dashboard
through polling.

## Current architecture

```text
Browser
  -> same-origin REST API (/api/diligence/*)
  -> n8n webhooks
  -> n8n Data Tables
  -> document processing and project synthesizer workflows
  -> polling responses back to the dashboard
```

The browser never calls n8n directly. The local REST layer is part of this
repository:

| Runtime | REST implementation | Purpose |
| --- | --- | --- |
| `npm start` | `frontend/server.ts` | Express server that serves the production build and `/api/diligence/*` |
| `npm run dev` | `frontend/localApi.ts` | Vite dev-server middleware with the same API contract |

The API invokes the normalized backend functions in `backend/diligence/`,
which forward requests to n8n through `frontend/retoolRuntime.ts`.

### Data ownership

- **n8n Data Tables** are the source of truth for submitted documents, their
  AI output, and project-level synthesis results.
- **n8n Cloud workflows** perform intake, document analysis, document counts,
  and project-wide synthesis.
- The legacy `getDiligenceData` query still references Retool DB, but the
  standalone app does not use that database. Its retired sample data is kept
  only as a code backup and is not rendered in the UI.

Pod 1's live n8n Cloud/Enterprise workflows are the workflow source of truth.
Inspect them through n8n MCP. If MCP access is unavailable, request access
before diagnosing or changing workflow behavior.

## Run locally

Use a current Node LTS release (Node 22+ recommended).

```sh
cd frontend
npm install
npm run dev
```

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
npm run build
npm run preview
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
The committed vercel.json supplies the install, build, and output settings.
Set N8N_WEBHOOK_SECRET in Vercel for both Preview and Production; never
expose it with a VITE_ prefix.

Use a Vercel preview deployment to validate live history, a test upload,
batch progress, and project synthesis before promoting a change. See
[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) for the full checklist.

## Render backup (legacy)

`render.yaml` defines the Render service. Create a Render Blueprint from the
repository and set `APP_PASSWORD` and `N8N_WEBHOOK_SECRET` in Render.

The configured deployment URL is:

<https://due-diligence-dashboard.onrender.com/>

## Project map

| Path | Role |
| --- | --- |
| `frontend/pages/` and `frontend/components/` | React interface |
| `frontend/hooks/backend/diligence.ts` | Live/mock query hooks used by the UI |
| `frontend/server.ts` | Standalone Express API and production static server |
| `frontend/localApi.ts` | Development API middleware |
| `frontend/retoolRuntime.ts` | Node-side n8n client and Retool-global compatibility shim |
| `backend/diligence/` | Submit, history, and synthesis normalizers |
| `docs/n8n-webhooks.md` | n8n webhook contracts and troubleshooting |
| `docs/HOW_TO_RUN.md` | Additional operating notes |

## Retool provenance

The dashboard originated as a Retool export. Some compatibility names remain
(`n8nFinancialAgent`, generated-hook-shaped APIs, and `retoolRuntime.ts`), but
the standalone dashboard's active document and synthesis data path is n8n,
not Retool DB.

## Team handoff

For the operational handoff to MergeWorks and Trisha—including ownership, live
n8n expectations, and the release smoke test—see
[docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md). The older Retool-to-VS
Code handoff is archived under `docs/archive/` for historical context only.
