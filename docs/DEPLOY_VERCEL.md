# Deploying on Vercel

This is an additive deployment path. The existing Render service, its
render.yaml, and frontend/server.ts remain unchanged as a rollback option.

## Create the Vercel project

1. Import the existing GitHub repository into Vercel.
2. Leave the project's Root Directory at the repository root.
3. Use Node `22.x` for the Vercel build, matching `frontend/package.json` and
   `.nvmrc`.
4. Vercel reads `vercel.json`, installs the frontend dependencies, builds the
   Vite app, and exposes the serverless API routes under `/api/diligence`.
5. Add this Production and Preview environment variable:

   N8N_WEBHOOK_SECRET=<the existing Render secret>

Do not expose this value with a `VITE_` prefix. It is used only by the
serverless API when it calls n8n.

## Validate before switching

Use Vercel's preview URL first and confirm:

1. The dashboard loads and project history appears.
2. A test upload receives an acknowledgement.
3. Batch processing progress updates and the project synthesis endpoint loads.
4. A production upload reaches n8n with the expected project and batch fields.

The supported Vercel API paths are:

- GET /api/diligence/history?environment=production|test
- GET /api/diligence/synthesis?environment=production|test
- POST /api/diligence/submit

## Rollback

Keep the Render service deployed while testing Vercel. If Vercel does not
validate cleanly, continue using the existing Render URL; no code or workflow
rollback is necessary. If a production Vercel deployment needs to be undone,
promote the previous Vercel deployment or direct users back to Render.
