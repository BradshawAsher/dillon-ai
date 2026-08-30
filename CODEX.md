# CODEX.md — Instructions for OpenAI Codex & Autonomous Agents

## Project Overview
MergeWorks Due Diligence Dashboard is a production React 19 + TypeScript + Vite web application for M&A financial due diligence.
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite (`frontend/pages/DueDiligenceDashboard.tsx`).
- **Backend API**: Vercel Serverless Functions (`api/diligence/*` bundled via esbuild from `api/diligence/[...route].src.ts`).
- **Database**: Supabase PostgreSQL (`documents`, `project_syntheses`, `deal_models`, `synthesis_runs`).
- **Document Storage**: **Cloudflare R2** (`dillon-deal-documents` bucket) with $0 egress fees.
- **AI Automation**: n8n Cloud Webhooks (`https://merge-works.app.n8n.cloud`).

---

## 🛑 MANDATORY RULE: Strict Cloudflare R2 Zero-Egress Storage Protocol

When running tests, creating synthetic test fixtures, uploading files, or inspecting document pipelines:

1. **NEVER Upload to Supabase Storage**:
   - Supabase Storage charges high bandwidth egress fees on file downloads.
   - Do NOT upload test documents, synthetic PDFs, spreadsheets, or test fixtures directly to `sihpsqrunkwkxhhnwoqe.supabase.co` or `storage.objects` bucket `deal-documents`.
   - ALWAYS upload through **Cloudflare R2** via the Worker CDN (`https://dillon-ai-worker.bradshin231.workers.dev`) or the direct R2 public endpoint (`https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev`), which has **$0 egress fees**.

2. **Download Edge Caching**:
   - When streaming documents from storage to n8n (`backend/diligence/storedFileMultipart.ts`), always route requests through `resolveCdnStorageFetchUrl` so that any legacy Supabase storage URLs hit the Cloudflare Worker CDN edge cache (`Cache-Control: public, max-age=31536000`) instead of consuming Supabase bandwidth.

3. **Lightweight Polling Queries**:
   - When querying submission history for progress heartbeats or overview lists, always pass `full=false` to request lightweight projections.
   - Do NOT fetch heavy extracted JSON fields (`extracted_json`, `reconciliation_json`, `financial_facts_json`) on background polling ticks.

4. **Debounced Realtime Events**:
   - Supabase Realtime subscriptions must coalesce rapid burst notifications (2000ms debounce) to prevent multi-trigger query storms during batch runs.

---

## Testing & Verification Commands

```bash
# Run complete test suite (67 test files, 687 tests)
npm --prefix frontend test -- --run

# Run TypeScript typecheck
npm --prefix frontend run typecheck

# Run production build
npm --prefix frontend run build

# Rebuild Vercel Serverless API bundle
npx esbuild "api/diligence/[...route].src.ts" --bundle --platform=node --target=node18 --outfile="api/diligence/[...route].js"
```

---

## Git & Deployment Protocol
- **NEVER** run `git commit` or `git push` without explicit instruction from the user.
- Always verify all unit tests, typechecks, and builds before presenting code changes.
