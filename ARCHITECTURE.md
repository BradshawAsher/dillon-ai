# Dillon AI — End-to-End System Architecture & Technical Specification

> **MergeWorks Flagship Platform**: Autonomous Financial Due Diligence Engine  
> **Author**: MergeWorks Engineering Team  
> **Purpose**: Complete architectural reference, system design diagrams, and interview preparation guide.

---

## 1. Executive Summary & Problem Statement

Private equity sponsors, search funds, and M&A advisory teams spend **60–120 hours per deal** manually reviewing Virtual Data Rooms (VDRs). Deal teams must ingest unstructured, multi-modal documents (audited P&Ls, tax returns, messy QuickBooks exports, management Q&A call recordings, customer concentration tables, and executed Letters of Intent), extract financial metrics, audit seller EBITDA bridges, and detect accounting discrepancies.

**Dillon AI** automates this entire diligence pipeline into a deterministic, high-throughput, multi-modal intelligence workspace:
1. **Multi-Modal VDR Ingestion**: Direct client-to-cloud presigned ingestion of PDFs, multi-tab Excel models, Word memos, email threads (`.eml`), visual scans (`.webp`), pitch decks (`.pptx`), audio interviews (`.mp3`), and video walkthroughs (`.mp4`).
2. **Hybrid Multi-Model Extraction**: High-precision extraction routing via `OpenAI 5.6 Terra` (Primary) with automated fallback to `OpenAI 5.6 Sol` (Backup).
3. **Deterministic Math & Contradiction Engine**: Zero-hallucination arithmetic verification, checking seller add-backs, balance sheet equations, and cross-document revenue reconciliation (e.g., CIM revenue vs. bank statement cash vs. tax returns).
4. **Acquisition Judgment & Deal Synthesis**: Automated EV/SDE valuation modeling, purchase price negotiation levers, working capital peg adjustments, closing escrows, and IC-ready Deal Memos.
5. **Continuous Benchmark Evaluation Harness**: 58-document golden benchmark dataset scoring extraction accuracy, risk recall, and acquisition judgment across 5 core dimensions.

---

## 2. High-Level System Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer["1. Client Application Layer (Browser)"]
        UI["React 19 + TypeScript SPA (Vite + Tailwind v4)"]
        VDRModal["Multi-Modal VDR Explorer (9 Asset Classes)"]
        ZipWorker["Client-Side ZIP Extraction Worker"]
        EvalDashboard["Interactive Benchmark Dashboard (1-Card Pre/Post-LOI Toggle)"]
        WorkspaceHooks["Optimistic State & Real-Time CDC Sync"]
        ClientCache["3s SessionStorage Deduplication Cache"]
    end

    subgraph EdgeLayer["2. Edge Proxy & Caching Layer (Cloudflare & Vercel)"]
        CFWorker["Cloudflare Edge Worker (Reverse Proxy & Edge Caching)"]
        CFEdgeCache["Edge Cache (s-maxage=10, stale-while-revalidate=59)"]
        VercelCDN["Vercel Edge Network (Immutable Static Delivery)"]
    end

    subgraph EdgeStorage["3. Ingestion & Storage Layer (Supabase)"]
        SupabaseStorage["Supabase Object Storage (Presigned S3 Uploads)"]
        SupabaseDB["Supabase PostgreSQL (Deal Models, Eval Runs, Action Logs)"]
        PostgresRPC["Postgres Server-Side Aggregate RPC (get_portfolio_diligence_kpis)"]
        RealtimeWS["Supabase Realtime CDC (WebSockets Engine)"]
    end

    subgraph OrchestrationLayer["4. Workflow Orchestration Engine (Pod 1 n8n Cloud)"]
        IntakeWebhook["Intake Dispatcher Webhook (vBnMdx8cvSFIFx6m)"]
        DocExtractor["Parallel Document Extraction Workers (W5Jp7CJIQbNy0qlY)"]
        DocCounter["Idempotent Document Counter Subworkflow (0OVTAMMp2iMx53Aw)"]
        MathEngine["Deterministic Accounting & Math Rule Engine"]
        CrossDocSynthesizer["Project Synthesis Consolidator (IoSad3rTYJMk4Mon)"]
        Watchdog["3-Tier Stuck Document Watchdog (BaQO1dHCAm0Tf6kk)"]
        N8nTables["n8n High-Throughput Data Tables (Dual-Write Mirror)"]
    end

    subgraph LLMLayer["5. Multi-Model AI Routing Layer"]
        PrimaryModel["Primary Extraction Model: OpenAI 5.6 Terra"]
        BackupModel["Backup Extraction Model: OpenAI 5.6 Sol"]
        SynthesisModel["Primary Synthesis Model: OpenAI 5.6 Terra"]
        TranscribeModel["Audio/Video Transcription & Vision Worker"]
    end

    %% Interactions
    UI -->|1. Request Presigned URL| SupabaseStorage
    ZipWorker -->|2. Stream File Blobs Direct to S3| SupabaseStorage
    UI -->|3. Read History / Synthesis| CFWorker
    CFWorker -->|Cache Hit <15ms| CFEdgeCache
    CFWorker -.->|Cache Miss| SupabaseDB
    UI -->|4. Query Portfolio KPIs| PostgresRPC
    UI -->|5. Dispatch Deal Batch| IntakeWebhook
    IntakeWebhook --> DocExtractor
    DocExtractor --> PrimaryModel
    DocExtractor -.->|Fallback Routing| BackupModel
    DocExtractor --> TranscribeModel
    DocExtractor --> MathEngine
    DocExtractor --> N8nTables
    DocExtractor --> SupabaseDB
    DocExtractor --> DocCounter
    
    DocCounter -->|Idempotent Synthesis Gate| CrossDocSynthesizer
    CrossDocSynthesizer --> SynthesisModel
    CrossDocSynthesizer --> SupabaseDB
    CrossDocSynthesizer --> N8nTables
    
    Watchdog -->|3-Tier Auto-Reconcile & Heal| DocExtractor
    Watchdog -->|Trigger Stalled Batches| DocCounter
    RealtimeWS -->|Push Row Updates <100ms| WorkspaceHooks
```

---

## 3. End-to-End Data Flow Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor DealTeam as Deal Lead / Analyst
    participant Browser as React SPA (Client)
    participant CF as Cloudflare Edge Worker
    participant Storage as Supabase Storage / S3
    participant n8n as n8n Orchestrator (Pod 1)
    participant LLM as OpenAI 5.6 Terra / Sol
    participant Math as Deterministic Math Engine
    participant DB as Supabase PostgreSQL (RPC / CDC)

    DealTeam->>Browser: Drops Deal Room Packet (ZIP / PDF / XLSX / MP3 / EML)
    Browser->>Browser: Decompresses ZIP client-side & validates format signatures
    Browser->>Storage: Requests presigned upload URLs & streams blobs directly
    Storage-->>Browser: Storage Keys generated (Bypasses Vercel FOT bottleneck)
    
    Browser->>n8n: POST /webhook/intake-batch (Deal metadata, asking price, file URLs)
    n8n->>n8n: Splits batch into parallel sub-workflow extraction jobs
    
    par Parallel Per-Document Extraction
        n8n->>LLM: Ingest document tokens + Structured JSON Output Parser
        LLM-->>n8n: Extracted Financials, Line Items, Risk Flags, Citations
        n8n->>Math: Execute deterministic arithmetic & cross-table balance check
        Math-->>n8n: Verified Math Score & Variance Flags
        n8n->>DB: Write document extraction record to PostgreSQL & n8n Tables
    end

    n8n->>n8n: Document Counter checks Project State (Idempotency Lock)
    n8n->>LLM: Execute Cross-Document Contradiction & Valuation Synthesis Pass
    LLM-->>n8n: Synthesized Base/Downside Valuation, Red Flags, Negotiation Levers
    n8n->>DB: Save final Deal Synthesis, Valuation Bridge, and IC Deal Memo
    
    DB-->>Browser: Instant Push via Supabase Realtime CDC (<100ms)
    Browser->>CF: Query History & Synthesis (Served from Edge Cache / ETag)
    Browser->>DB: RPC get_portfolio_diligence_kpis (<2ms, <400B payload)
    Browser->>DealTeam: Renders Interactive Deal Scorecard, Valuation Bridge & Memo
```

---

## 4. Deep-Dive Component Architecture

### A. Client-Side Workspace & Ingestion (`frontend/`)
* **Framework & Tooling**: React 19, TypeScript, Vite 8, Tailwind CSS v4.
* **TanStack Query & Table Architecture**:
  - **`@tanstack/react-query` (v5)**: Manages all asynchronous server state with a unified `QueryClient` (`staleTime: 10,000ms`, `gcTime: 300,000ms`, `refetchOnWindowFocus: true`). Eliminates redundant network calls, manages background refetches, and provides typed hooks (`useSubmissionHistoryQuery`, `useProjectSynthesisQuery`, `usePortfolioKpisQuery`, `useDealModelsQuery`).
  - **`@tanstack/react-table`**: Powers high-performance, virtualized, multi-column sorting and filtering across deal history and financial fact reconciliation tables.
* **Direct-to-Cloud Storage**: Rather than streaming multi-gigabyte VDR uploads through serverless proxies (which causes Fast Origin Transfer bottlenecks and function timeouts), the client requests presigned URLs via `/api/diligence/upload-url` and streams binaries directly to **Supabase Object Storage**.
* **In-Browser ZIP Decompressor**: Client-side worker recursively unpacks multi-folder ZIP archives (`utils/zipExtractor.ts`), preserving folder taxonomy and queuing individual files into the extraction pipeline.
* **Optimistic State & Real-Time CDC Sync**: Uses **Supabase Realtime (Postgres Change Data Capture over WebSockets)** to push instantaneous row updates (<100ms latency) to the browser without continuous background polling. When a CDC event arrives, it automatically invalidates TanStack Query in-memory caches, reducing egress by over 99.9% while guaranteeing instant UI responsiveness.

### B. Cloudflare Edge Worker & Reverse Proxy Layer (Steps A & C)
* **REST Edge Reverse Proxy (Step A)**: High-performance Cloudflare Worker sitting in front of REST read endpoints (`/api/diligence/history`, `/api/diligence/synthesis`, benchmark feeds) with `Cache-Control: public, s-maxage=10, stale-while-revalidate=59` and ETags, serving repeated reads from global Edge PoPs in sub-15ms.
* **Storage CDN Proxy & Egress Shield (Step C)**: High-throughput CDN proxy intercepting `/storage/v1/object/public/*` requests to Supabase Object Storage (`deal-documents`). Serves document downloads and inline PDF/image previews through Cloudflare's global edge cache with `Cache-Control: public, max-age=31536000, immutable`, completely shielding Supabase Storage from redundant egress.
* **DDoS & Origin Protection**: Absorbs concurrent user refreshes and automated benchmark evaluation runs, preventing high query volume from hitting Supabase PostgreSQL or triggering serverless function invocation limits.

### C. Postgres Server-Side Aggregate RPC & Egress Optimization (Step B)
* **Stored Procedure Aggregations (`get_portfolio_diligence_kpis`)**: Replaced multi-megabyte client-side table aggregations (which previously downloaded entire historical records for 88+ projects and 700+ documents) with a native PostgreSQL RPC. The database computes project totals, document counts, status breakdowns, and financial sums in sub-2ms and returns a compact JSON payload (<400 bytes), slashing network payload size by **99.8%**.
* **Lightweight Column Projections**: Endpoints like `getSubmissionHistory.ts` utilize optimized projection queries (`lightweightColumns`), selecting essential metadata and visual flags (`ai_red_flags`, `ai_yellow_flags`, `ai_green_flags`, `ai_summary`) while excluding heavy multi-megabyte `ai_extractedJson` payloads until an analyst opens a specific document Evidence Drawer.
* **Full Portfolio Navigation Scope**: Sets a global limit of 1,000 for top-level history queries, ensuring all 88 projects are immediately searchable and selectable in workspace dropdowns without pagination clipping.

### D. Multi-Modal Ingestion Matrix
Dillon AI supports 9 discrete asset classes natively:
1. **Financial Statements**: Multi-year P&Ls, Trial Balances, General Ledgers (`.pdf`, `.xlsx`, `.csv`).
2. **Multi-Tab Workbooks**: Complex financial models with cell coordinate references (`.xlsx`, `.xlsm`, `.xlsb`).
3. **Legal & Transaction**: Executed Letters of Intent, Purchase Agreements, Employment Contracts (`.docx`, `.pdf`).
4. **Tax Filings**: IRS Form 1120/1120-S, Form 1065, Schedule K-1 schedules (`.pdf`).
5. **Correspondence**: Deal emails, customer contract renewals, broker threads (`.eml`, `.msg`).
6. **Visual Scans & Inspections**: Equipment photo scans, facility condition surveys, asset tags (`.webp`, `.png`, `.jpeg`, `.tiff`).
7. **Investor Presentations**: Management pitch decks, CIM slides (`.pptx`, `.key`, `.ppt`).
8. **Audio Recordings**: Management Q&A calls, founder interviews (`.mp3`, `.m4a`, `.wav`).
9. **Video Walkthroughs**: Facility drone footage, plant equipment inspections (`.mp4`, `.mov`).

### E. Multi-Model Extraction & AI Router
* **Primary Extraction Model (`OpenAI 5.6 Terra`)**: High-throughput reasoning model configured with strict 2-space indented LangChain Structured Output Parsers. Extracts normalized revenue, COGS, reported EBITDA, payroll records, and risk flags with exact source page/cell citations.
* **Backup Extraction Model (`OpenAI 5.6 Sol`)**: Automated fallback router activated upon API rate limits, non-standard tax schedule layouts, or prompt token overflow.
* **Zero Hallucination Ground Truth Guard**: Prompt templates enforce strict citation boundaries; if an exact financial fact cannot be proven from document text, the model flags it as `UNVERIFIED_SELLER_CLAIM` rather than guessing.

### F. Deterministic Accounting & Math Engine (`frontend/utils/dealMath.ts`)
LLMs are notoriously prone to arithmetic hallucinations. Dillon AI solves this by **completely decoupling math from the LLM**:
1. The LLM is used **strictly for information extraction and semantic parsing**.
2. Extracted line items are piped into a **deterministic TypeScript/Node.js calculation engine**:
   $$\text{Normalized EBITDA} = \text{Reported EBITDA} + \text{Audited Add-backs} - \text{Unsupported Owner Add-backs} - \text{Pro-forma Market Wage Deficits}$$
3. **Contradiction Detection Matrix**: Automatically cross-references independent documents within the same deal:
   * **Apex Precision Dynamics**: Catches **$730,000 variance** between CIM EBITDA ($3.15M) and Monthly P&L ($2.42M).
   * **TerraNova Environmental**: Catches **$6.6M gap** between Teaser Revenue ($14.8M) and Bank Reconciliation Cash Receipts ($8.2M).

### G. Project Synthesis & Deal Memo Formulation
Once all documents in a project batch complete, the **Project Synthesis Consolidator** triggers:
* **Valuation Bounds Engine**: Computes Fair Market Enterprise Value across 3 distinct scenarios:
  * **Base Case**: Normalized EBITDA $\times$ Industry Median Multiple.
  * **Downside Case**: Haircut for top-customer concentration, unrecorded tax liabilities, and working capital deficits.
  * **Upside Case**: Expansion multiple unlocked by addressing operational bottlenecks.
* **Negotiation Levers**: Generates dollar-for-dollar purchase price reduction recommendations, escrow holdbacks, and earnout milestones.
* **IC Deal Memo Generation**: Produces an executive-ready Investment Committee memo with full audit trail citations.

### H. Automated Evaluation Harness & Golden Benchmarks (`EVALS.md`)
* **Golden Dataset**: 58 production M&A documents across 6 full deal packets.
* **5-Dimension 100-Point Rubric**:
  1. *Classification (10 pts)*: Document type detection.
  2. *Financial Facts (10 pts)*: Precision of numerical extraction ($\le 1\%$ error tolerance).
  3. *Risk Recall (20 pts)*: Detection of critical red/yellow deal hazards.
  4. *Valuation Fidelity (15 pts)*: Agreement with ground-truth valuation bounds.
  5. *Acquisition Judgment (10 pts)*: Recommendation alignment (`PROCEED`, `RENEGOTIATE`, `ESCALATE`).
* **Interactive Evals Tab**: Unified 1-card-per-deal UI with real-time `Pre-LOI Discovery` $\leftrightarrow$ `Post-LOI Negotiation` toggle.

---

## 5. Technical Decision Matrix & Interview Masterclass

When explaining this architecture in technical interviews, focus on these core design decisions and trade-offs:

| Technical Decision | Why We Built It This Way | Alternative Considered & Why Rejected |
| :--- | :--- | :--- |
| **Deterministic Math Engine vs. LLM Calculations** | Financial due diligence requires zero tolerance for math hallucinations. Extracted line items are calculated in code. | *Letting the LLM calculate multiples*: Rejected due to floating-point drift and unpredictable rounding errors. |
| **Server-Side Postgres RPC Aggregation (`get_portfolio_diligence_kpis`)** | Calculates all portfolio totals in sub-2ms in the database, reducing client payload from 180KB+ to <400 bytes (99.8% bandwidth cut). | *Client-side aggregation over raw tables*: Rejected due to massive egress consumption and slow rendering with 88+ projects. |
| **Cloudflare Edge Worker & S-Maxage Caching** | Serves high-frequency history and benchmark reads in sub-15ms from the edge, protecting Supabase database connections from traffic spikes. | *Direct origin queries without edge cache*: Rejected due to database connection exhaustion during multi-analyst sessions. |
| **Direct Supabase Uploads via Presigned URLs** | Uploading 50MB VDR ZIPs directly to cloud storage keeps Vercel Fast Origin Transfer at 0 MB and avoids 30s serverless timeouts. | *Proxying uploads through Vercel Serverless Functions*: Rejected due to 10 GB/mo origin bandwidth limits and payload caps. |
| **n8n Cloud Orchestrator + Supabase PostgreSQL** | Provides visual workflow observability, asynchronous retry queues, map-reduce batching, and watchdog auto-recovery. | *Custom Microservices (FastAPI/Temporal)*: High operational overhead without added throughput benefits for M&A batch cadences. |
| **Client-Side ZIP Decompression** | Decompressing archives in the browser offloads CPU compute from the backend and allows immediate client-side file validation. | *Server-side unzipping*: Heavy server memory footprint and security exposure to decompression zip-bomb exploits. |
| **Dual-Tier State Management** | n8n Data Tables act as the high-speed scratchpad for active pipelines; Supabase PostgreSQL acts as the permanent relational ledger. | *Single Database*: Risk of locking main application tables during heavy concurrent batch writes. |

---

## 6. Failure Modes & Self-Healing Architecture

1. **3-Tier Stuck Document Watchdog (`BaQO1dHCAm0Tf6kk`)**: A background watchdog cron runs every 5 minutes with a 3-tier recovery architecture:
   - *Tier 1 (Batch Auto-Reconciliation)*: Identifies batches where all documents completed extraction but synthesis was not triggered, auto-initiating the Consolidator pass.
   - *Tier 2 (Single-Document Recovery)*: Detects documents stuck in `processing` for $>180\text{ seconds}$ without heartbeat, resetting status or routing to the backup model (`OpenAI 5.6 Sol`).
   - *Tier 3 (Reliability Audit & Deduplicated Slack Escalation)*: Suppresses noisy transient alerts using a 30-minute cooldown in `reliability_alert_state`, dispatching to `#pod-1-agent-alerts` only after 3 sustained consecutive failures.
2. **Document Counter Idempotency Lock (`0OVTAMMp2iMx53Aw`)**: Contains a `Get Project State` gate that inspects `DD Project-Level Fields` before evaluating `batchReady`. If another document completion triggered synthesis milliseconds prior (or if synthesis is in progress), subsequent calls mark `batchReady: false` to eliminate twin/duplicate Consolidator passes.
3. **Database-Validated Auth Alerts**: `frontend/services/supabaseAuth.ts` inspects `session.user.created_at` (< 2 minutes old) rather than browser-local `localStorage` keys, ensuring returning users logging in on new browsers, mobile devices, or private tabs never trigger false "New Account Created" Slack notifications.
4. **Rate Limit Exponential Backoff**: OpenAI API calls employ a 3-tier jittered backoff ($2\text{s} \rightarrow 5\text{s} \rightarrow 15\text{s}$) with automated switchover to secondary API keys and proxy fallbacks.
5. **Structured JSON Validation & Auto-Correction**: Extraction schemas are strictly validated via Zod/JSON-Schema. If an LLM returns malformed JSON or trailing commas, the parser auto-sanitizes before dispatching to the database.

---

## 7. Performance & Cost Benchmarks

* **Average Per-Document Latency**: $21\text{s} - 25\text{s}$ (OCR $\rightarrow$ Structured Parsing $\rightarrow$ Math Verification).
* **Project Synthesis Latency**: $45\text{s} - 60\text{s}$ (Cross-document contradiction reconciliation $\rightarrow$ Deal Memo synthesis).
* **Portfolio KPI Query Latency**: $< 2\text{ms}$ via Postgres RPC (`get_portfolio_diligence_kpis`).
* **Edge Cache Hit Latency**: $< 15\text{ms}$ via Cloudflare Edge Worker.
* **Per-Document Cloud Cost**: $\approx \$0.055$ / document (OpenAI 5.6 Terra).
* **Per-Project Synthesis Cost**: $\approx \$0.065$ / deal synthesis.
* **Network Egress Optimization**: $> 99.8\%$ bandwidth reduction across portfolio and history feeds.
* **Evaluation Harness Score**: **$98\%$ Overall Accuracy** across all 58 golden test documents.
