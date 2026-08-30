# CLAUDE.md — MergeWorks Due Diligence Dashboard

## Project overview

React 19 + Vite single-page app for M&A financial due diligence. Ingests documents through n8n workflows (LlamaParse + OpenAI 5.6 Terra / Claude Sonnet 5), stores metadata & synthesis in Supabase PostgreSQL, routes documents through Cloudflare R2 ($0 egress), and renders AI-powered cross-document synthesis with valuation, risk scoring, and citation tracking.

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, shadcn/ui. Entry: `frontend/pages/DueDiligenceDashboard.tsx`
- **Backend**: Supabase (PostgreSQL) via `backend/supabaseClient.ts`. All reads from Supabase; writes go to both n8n data tables and Supabase.
- **Document Storage & CDN**: Cloudflare R2 (`dillon-deal-documents` bucket) via Worker CDN proxy (`https://dillon-ai-worker.bradshin231.workers.dev` and `https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev`).
- **AI pipeline**: n8n cloud workflows handle per-document extraction and project-level synthesis. Triggered via webhooks.
- **Deployment**: Vercel (frontend & serverless API `/api/diligence/*`), n8n cloud (automation), Supabase (database), Cloudflare R2 (storage).

## Strict Cloudflare R2 Zero-Egress Storage Protocol

- **Zero Supabase Storage Egress**: ALL document uploads, diagnostic test scripts, synthetic upload probes, and test file fixtures MUST route through **Cloudflare R2** (`https://dillon-ai-worker.bradshin231.workers.dev` and `https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev`) to prevent incurring Supabase Storage egress bandwidth costs.
- **Testing & Diagnostics**: NEVER upload test files or mock PDF/XLSX attachments directly to Supabase Storage (`storage.objects` / `sihpsqrunkwkxhhnwoqe.supabase.co`) during automated testing, manual testing, or diagnostic probes. Always target Cloudflare R2 bucket `dillon-deal-documents`.
- **Download Edge Caching**: All backend streaming utilities (`storedFileMultipart.ts`) MUST fetch storage assets through the Cloudflare Worker CDN edge proxy (`resolveCdnStorageFetchUrl`) so that downloads hit Cloudflare's free edge cache (`Cache-Control: public, max-age=31536000`).
- **Heartbeat Query Efficiency**: Background heartbeats and status polling MUST explicitly specify `full=false` to fetch compact status columns, avoiding redundant transmission of heavy JSON fields (`extracted_json`, `reconciliation_json`, `financial_facts_json`).

## Key patterns

- `project_syntheses` table stores one row per synthesis version (keyed by unique `id`, not upserted by `project_id`). Multiple rows per project represent version history.
- Project matching uses fuzzy matching in `frontend/utils/projectWorkspace.ts` — deals are identified by project_id, company name, or filename patterns.
- The synthesis tab in the frontend shows all DB versions for the active project. Session/localStorage is NOT used for synthesis versioning — the DB is the single source of truth.
- Document-level analysis results live in `documents` table / n8n data tables with `extractedJson`, `aiSummary`, flags, and citations.

## Commands

```bash
npm run dev          # Start Vite dev server
npm --prefix frontend test -- --run # Run full Vitest test suite
npm --prefix frontend run typecheck # Run TypeScript typecheck
npm --prefix frontend run build    # Run production build
```

## Security constraints

- Do not expose credentials or webhook secrets. They live in n8n/environment configuration, not in source.
- Supabase service role key and n8n bearer tokens are environment-only.
- MCP server auth tokens must never be committed.

## Conventions

- Components under 400 lines; extract to `components/dashboard/` or `components/views/` when larger.
- Pure utility logic goes in `frontend/utils/`. No side effects in utils.
- Financial calculations must be deterministic (see `DETERMINISTIC_MATH_CHECKS.md`).
- Flags/findings carry per-item `confidence: number | null` — always propagate confidence when available.
- Use `isRowMatchingProject()` from `projectWorkspace.ts` for all project-row association logic.

## MCP servers (configured globally in ~/.claude/settings.json)

- **n8n**: streamableHttp at merge-works.app.n8n.cloud — workflow management, execution search, data tables
- **Supabase**: streamableHttp — database queries, schema inspection, debugging
- **Vercel**: stdio via vercel-mcp-server — deployment management

## Working with synthesis versions

Each synthesis run creates a NEW row in `project_syntheses`. The frontend deduplicates by `item.id` (DB primary key). Never cache synthesis data in localStorage/sessionStorage — it causes ghost duplicates when the DB schema evolves.

