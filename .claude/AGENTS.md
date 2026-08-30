# Agent guidance for n8n workflow changes

## Source of truth

Pod 1's live n8n Cloud/Enterprise workflows are the source of truth for all
workflow behavior, node configuration, and Data Table contracts. Use the n8n
MCP connection to inspect and, when authorized, update those live workflows.

## Default behavior for future agents

- For any question or change involving n8n workflow behavior, first inspect
  Pod 1's workflows through MCP rather than relying on local workflow files.
- If n8n MCP access is unavailable, insufficient, or does not expose the
  needed Pod 1 workflow, stop and ask the user for access or the specific
  workflow details needed to proceed.
- Do not infer live workflow configuration from stale exports, screenshots, or
  repository history.
- Make live workflow changes only through the n8n MCP connection and only when
  the user has requested the change. Verify the resulting workflow state when
  MCP supports verification.
- Keep repository documentation and the frontend/backend contract in sync with
  confirmed live workflow behavior.

## Strict Cloudflare R2 Zero-Egress Storage Protocol

- **Zero Supabase Storage Egress**: ALL document uploads, diagnostic test scripts, synthetic upload probes, and test file fixtures MUST route through **Cloudflare R2** (`https://dillon-ai-worker.bradshin231.workers.dev` and `https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev`) to prevent incurring Supabase Storage egress bandwidth costs.
- **Testing & Diagnostics**: NEVER upload test files or mock PDF/XLSX attachments directly to Supabase Storage (`storage.objects` / `sihpsqrunkwkxhhnwoqe.supabase.co`) during automated testing, manual testing, or diagnostic probes. Always target Cloudflare R2 bucket `dillon-deal-documents`.
- **Download Edge Caching**: All backend streaming utilities (`storedFileMultipart.ts`) MUST fetch storage assets through the Cloudflare Worker CDN edge proxy (`resolveCdnStorageFetchUrl`) so that downloads hit Cloudflare's free edge cache (`Cache-Control: public, max-age=31536000`).
- **Heartbeat Query Efficiency**: Background heartbeats and status polling MUST explicitly specify `full=false` to fetch compact status columns, avoiding redundant transmission of heavy JSON fields (`extracted_json`, `reconciliation_json`, `financial_facts_json`).
