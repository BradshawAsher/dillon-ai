# Deploying on Vercel

This guide details the Vercel production deployment configuration.
The standalone Express server (`frontend/server.ts`) also supports local operation.

## Create the Vercel project

1. Import the existing GitHub repository into Vercel.
2. Leave the project's Root Directory at the repository root.
3. Use Node `22.x` for the Vercel build, matching `frontend/package.json` and
   `.nvmrc`.
4. Vercel reads `vercel.json`, installs the frontend dependencies, builds the
   Vite app, and exposes the serverless API routes under `/api/diligence`.
5. Add these server-only Production and Preview environment variables:

   N8N_WEBHOOK_SECRET=<the configured n8n webhook secret>
   SUPABASE_SERVICE_ROLE_KEY=<the key for the configured Supabase project>

Never expose either secret with a `VITE_` prefix or commit its value. The API
uses them for n8n Header Auth, database access, and signed upload tickets.

## Upload runtime and release requirements

Deploy the frontend and API together. The committed build command runs
`node scripts/build-api.mjs` before building the frontend; do not deploy a stale
`api/diligence/[...route].js` bundle. Commit `frontend/package-lock.json` with
the `tus-js-client` dependency used for resumable uploads.

- All files upload primarily to **Cloudflare R2** (`dillon-deal-documents`,
  $0 egress). Files larger than 6 MiB fall back to resumable Supabase uploads
  in 6 MiB chunks only if R2 upload fails. The browser must be able to reach
  the Cloudflare Worker CDN and, as a fallback, the direct Supabase storage host.
- The API receives a storage URL and metadata, then downloads to temporary disk,
  verifies the byte count, and sends the multipart attachment n8n expects.
  Node `22.x` provides `fs.openAsBlob` for the disk-backed attachment.
- `vercel.json` sets the diligence function's `maxDuration` to 300 seconds.
  Download, send, and acknowledgment-body reading share a 180-second deadline.
  Background AI processing is separate from this deadline.
- Temporary files are cleaned after success/failure, and aggregate attachments
  are capped at 256 MiB per handoff. Concurrent handoffs still share instance
  disk capacity; this is not a multi-gigabyte file transport.
- No database migration or n8n workflow change is required for this release.

From the repository root, run:

```sh
node scripts/build-api.mjs
cd frontend
npm run check
```

## Validate before switching

Use Vercel's preview URL first and confirm:

1. The dashboard loads and project history appears.
2. Submit an approved test batch of three documents including an approximately
   18 MiB PDF. This triggers real analysis; a storage-only probe does not verify
   this complete path.
3. Confirm all three document records and matching n8n executions, including
   the PDF's filename, byte count, project, and batch fields.
4. Confirm all three analyses and project synthesis finish, not just upload
   acknowledgment. Verify 3/3, the final status, and a stopped timer.
5. Exercise failure behavior with local fixtures: the third failed document
   stays in the carousel; missing analysis is unavailable; a missing upload
   produces Incomplete rather than 2/2 Complete. Do not deliberately interrupt
   customer submissions to test this.

The supported Vercel API paths are:

- GET /api/diligence/history?environment=production|test
- GET /api/diligence/synthesis?environment=production|test
- POST /api/diligence/submit
- POST /api/diligence/upload-url

For recovery and opt-in storage diagnostics, see
[Upload and Batch Recovery](UPLOAD_AND_BATCH_RECOVERY.md). A lost acknowledgment
does not authorize an automatic retry: inspect history and executions first.

## Rollback
 
If a production Vercel deployment needs to be rolled back, use the Vercel Dashboard
or CLI (`vercel rollback`) to instantly promote the previous successful deployment.
