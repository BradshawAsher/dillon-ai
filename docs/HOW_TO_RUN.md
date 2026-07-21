# How to run the Due Diligence Dashboard

Quick reference for the team. Deeper background lives in the root
[README](../README.md) and [Project Handoff](PROJECT_HANDOFF.md).

## Use the deployed app (most people)

1. Open **https://due-diligence-dashboard.vercel.app**
2. Upload documents into a project and watch the history table poll results.

The password and name/email prompts are temporarily disabled. Submissions are
stamped as **MergeWorks Dashboard** while this test mode is active.

## Run it locally

Requirements: Node.js 18+ and npm. Then:

```sh
git clone https://github.com/SrijanChallapalli/Due-Diligence-Dashboard
cd Due-Diligence-Dashboard/frontend
npm install
```

Create `frontend/.env` (gitignored) with the webhook secret — without it,
live mode gets 403s from n8n:

```
N8N_WEBHOOK_SECRET=<ask Srijan / password manager>
```

Then either:

- `npm run dev` — hot-reload dev server at http://localhost:5173
- `npm start` — production-style build + serve at http://localhost:3000

## Mock vs Live data

The **Data: Example / Live n8n** pill at the bottom-right of the page switches
data sources at runtime:

- **Live n8n** (default): real webhooks. **Submitting a file triggers the real
  production workflow** — real Drive upload, real AI processing run.
- **Example**: pre-loaded sample data, zero network calls. Safe for demos and
  UI walkthroughs; it includes document analysis and project synthesis output.

The choice sticks in localStorage per browser.

## Deploying changes

Push to `main` on GitHub → Vercel automatically creates a deployment.
Use the Vercel deployment preview for validation, then promote it to
production. Vercel keeps prior deployments available for rollback.

Before pushing, run the checks locally from `frontend/`:

```sh
npm run typecheck   # strict TypeScript across app + backend functions
npm run build       # what Render runs
```

## Where things live

| Thing | Where |
| --- | --- |
| React UI | `frontend/pages`, `frontend/components` |
| Backend functions (run in Node, originally Retool) | `backend/diligence/` |
| Local/standalone server | `frontend/server.ts` (+ dev twin `frontend/localApi.ts`) |
| n8n webhook contracts | [`docs/n8n-webhooks.md`](n8n-webhooks.md) |
| n8n workflows | `merge-works.app.n8n.cloud`, project `2606-ai-fellows-mergeworks` |
| Hosting | Vercel project `due-diligence-dashboard` |
| Secrets | `N8N_WEBHOOK_SECRET` — Vercel Preview and Production vars + local `frontend/.env` |

## Troubleshooting

- **"Synthesis endpoint not reachable"** on the synthesis panel → the
  project-synthesis webhook hasn't been created in n8n yet; see
  [`docs/n8n-webhooks.md`](n8n-webhooks.md).
- **History shows an error / 403** → your `N8N_WEBHOOK_SECRET` is missing or
  doesn't match the n8n Header Auth credential.
- **History or synthesis shows 500** → confirm `N8N_WEBHOOK_SECRET` is set
  in Vercel for the active environment, then redeploy.
- **Vercel build fails after a dependency change** → run `npm install` in
  `frontend/` and commit the updated `package-lock.json`.
