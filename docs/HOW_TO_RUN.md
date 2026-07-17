# How to run the Due Diligence Dashboard

Quick reference for the team. Deeper background lives in the root
[README](../README.md) and `frontend/notes/project-handoff.md`.

## Use the deployed app (most people)

1. Open **https://due-diligence-dashboard.onrender.com**
2. Enter the **team password** (ask Srijan — it's the `APP_PASSWORD` on Render).
3. Enter **your name and email** — every document you submit is stamped with it.
4. Upload documents into a project and watch the history table poll results.

Free-tier quirks: after ~15 minutes idle the app sleeps, so the first visit
can take ~30–60 seconds to wake. Every deploy also logs everyone out.

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

The **Data: Mock / Live n8n** pill at the bottom-right of the page switches
data sources at runtime:

- **Live n8n** (default): real webhooks. **Submitting a file triggers the real
  production workflow** — real Drive upload, real AI processing run.
- **Mock**: in-memory sample data, zero network calls. Safe for demos and UI
  work; simulated submissions complete after ~8 seconds.

The choice sticks in localStorage per browser.

## Deploying changes

Push to `main` on GitHub → Render auto-builds and deploys (~2–4 minutes).
Watch progress under the Render service's **Events/Logs** tabs. Broken builds
keep the previous version running.

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
| Hosting | Render web service `due-diligence-dashboard` (Blueprint-managed from `render.yaml`) |
| Secrets | `APP_PASSWORD`, `N8N_WEBHOOK_SECRET` — Render env vars + local `frontend/.env` |

## Troubleshooting

- **"Synthesis endpoint not reachable"** on the synthesis panel → the
  project-synthesis webhook hasn't been created in n8n yet; see
  [`docs/n8n-webhooks.md`](n8n-webhooks.md).
- **History shows an error / 403** → your `N8N_WEBHOOK_SECRET` is missing or
  doesn't match the n8n Header Auth credential.
- **401 errors locally** → you set `APP_PASSWORD` in `.env`; either log in or
  comment it out.
- **Render build fails after a dependency change** → run `npm install` in
  `frontend/` and commit the updated `package-lock.json`.
