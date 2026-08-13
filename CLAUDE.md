# CLAUDE.md — MergeWorks Due Diligence Dashboard

## Project overview

React + Vite single-page app for M&A financial due diligence. Ingests documents through n8n workflows (LlamaParse + Claude Haiku 4.5), stores results in Supabase, and renders AI-powered cross-document synthesis with valuation, risk scoring, and citation tracking.

## Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui. Entry: `frontend/pages/DueDiligenceDashboard.tsx`
- **Backend**: Supabase (PostgreSQL) via `backend/supabaseClient.ts`. All reads from Supabase; writes go to both n8n data tables and Supabase.
- **AI pipeline**: n8n cloud workflows handle per-document extraction and project-level synthesis. Triggered via webhooks.
- **Deployment**: Vercel (frontend), n8n cloud (automation), Supabase (database + storage)

## Key patterns

- `project_syntheses` table stores one row per synthesis version (keyed by unique `id`, not upserted by `project_id`). Multiple rows per project represent version history.
- Project matching uses fuzzy matching in `frontend/utils/projectWorkspace.ts` — deals are identified by project_id, company name, or filename patterns.
- The synthesis tab in the frontend shows all DB versions for the active project. Session/localStorage is NOT used for synthesis versioning — the DB is the single source of truth.
- Document-level analysis results live in `submission_history` / n8n data tables with `extractedJson`, `aiSummary`, flags, and citations.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run eval         # Run evaluation harness (npx tsx scripts/run-evals.ts)
npm run eval:failures # Generate failure report
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
