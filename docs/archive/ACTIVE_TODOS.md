# MergeWorks — Active Todo & Roadmap Tracker

*Created: August 3, 2026*  
*Migrated & Consolidated from `TODO_CURRENT.md`*

---

## 🚀 High-Priority Pipeline & Testing Tasks

- [ ] **1. Refill Anthropic API Credits** *(Blocked on Admin)*
  - Pod 1 Anthropic credits are currently exhausted. System currently defaults to OpenAI 5.6 Terra / Sol with full BYOK support for Claude/Gemini/DeepSeek.

- [ ] **2. Execute & Evaluate Remaining Sample Deals**
  - Run all 17 test documents across sample businesses through n8n:
    - [x] **Business 5 (Medical Spa)** — 2/2 files executed & evaluated (`business5_medical-spa_actual_run.json`).
    - [ ] **Business 4 (ConversionXL)** — 4 files queued (`WC- Conversion XL OM.pdf`, `DD Memo.pdf`, `ConversionXL LLC_Profit and Loss by Month v2.xlsx`, `CXL_Screen.xlsx`).
    - [ ] **Business 1 (Roofing Co)** — 5 files queued (`Balance Sheet Jan 2023 to Dec 2024.pdf`, `Two years PL ended Dec 31 2024.pdf`, `Werkheiser P&L 2025.pdf`, `Werkheiser_LOI_MergeWorks.docx`, `MergeWorks_Financial_Due_Diligence_Model.xlsx`).
    - [ ] **Business 3 (TurnKey)** — 2 files queued (`1) TurnKey Product Management Business Summary.pdf`, `2) TurnKey Product Management P&L [Google Sheet].xlsx`).
    - [ ] **Business 2 (Iron Tree)** — 4 files queued (`Iron_Tree_Data_-_Teaser.pdf`, `Iron_Tree_Data_-_CIM.pdf`, `Adjusted_Financials_-_Iron-Tree_(2026.02)_final.xlsx`, `Financial Modeling for Iron Tree.xltx`).

- [x] **3. Run Automated Evaluation Suite**
  - All 1,111 unit & integration tests + 2 Playwright E2E tests pass with 0 errors. Benchmark evaluation runner in `test_sets/ground_truth/` validated.

- [x] **4. Clean Legacy Orphan Synthesis Record**
  - Server-side cleanup utility implemented in `backend/diligence/cleanOrphans.ts` with API route `/api/diligence/clean-orphans`.

---

## 💡 Completed Core Milestones & System Features

- [x] **5-Tier Financial Data Origin & Provenance Lineage**
  - Built `DataOriginBadge` and `DataLineageLegend` across Valuation, Returns, Growth, Deal Structure, and Negotiation workspaces. Re-badged heuristic comps and separated verified facts from model assumptions.
- [x] **Deal War Room Bot (Slack & Microsoft Teams)**
  - Automated webhook alerts upon synthesis completion with session-storage deduplication, platform detection, and config modal (`DealWarRoomModal.tsx`, `dealWarRoomService.ts`).
- [x] **Live Formula Excel Model Generator (.xlsx)**
  - 5-sheet financial model with 3-statement forecast, debt amortization, levered IRR, and dedicated M&A Valuation Bridge & APA Escrow schedule (`excelModelGenerator.ts`).
- [x] **11-Sector Vertical Benchmark Taxonomy**
  - Real-time peer multiples and automatic industry detection across 11 lower-middle-market sectors (`BenchmarkComparisonCard.tsx`, `verticalBenchmarks.ts`).
- [x] **Target Domain Public Enrichment**
  - `PublicDataEnrichmentCard.tsx` implemented with digital footprint scoring, tech stack detection, and sentiment analysis.
- [x] **Model Agnostic / Bring Your Own Key (BYOK)**
  - Full support for user-supplied OpenAI, Anthropic, Gemini, and DeepSeek API keys with cost estimators and confirmation modal (`ApiKeyModal.tsx`).
- [x] **Real-time Event Push (WebSockets / Supabase Realtime)**
  - WebSocket CDC event stream with 1,200ms batch debouncing and optimistic TanStack query cache invalidation.
- [x] **Cloudflare R2 Zero-Egress Cloud Storage Migration**
  - Migrated document binaries to Cloudflare R2 bucket (`dillon-deal-documents`) via unified edge worker (`dillon-ai-worker`), cutting Supabase egress by >99% ($0.00 egress).
