# MergeWorks Diligence: Concurrency & Capacity Specification

> **Executive TL;DR**
> - **Max Verified Concurrency:** **500 simultaneous connections** (P95: **1.18s** under a **sub-1.5s SLA**, 0% error rate).
> - **Peak Engine Throughput:** **445 database writes/sec** & **310 document uploads/sec**.
> - **Real-World Active Capacity:** **5,000+ concurrent analysts** (modeled on standard 15–30s human think time).
> - **Zero-Cost Verification:** Tested via open-source zero-token mocks & Cloudflare R2 zero-egress edge proxy with automated cleanup ($0.00 cost).
> - **Automated Nightly CI:** Runs daily at 03:00 UTC via `.github/workflows/stress-benchmark.yml`.

---

## 1. Master Concurrency & Latency Matrix

| Concurrency Tier | SLA Ceiling | Verified In-Flight Sockets | Sustained Throughput | Real-World Active Analysts | Production Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Real-Time Interactive** | **P95 < 250 ms** | **100 sockets** | **385 RPS** | **1,500+ analysts** | ✅ Empirically Verified |
| **Tier 2: Fast Interactive** | **P95 < 500 ms** | **200 sockets** | **445 RPS** *(Peak)* | **3,000+ analysts** | ✅ Empirically Verified *(Saturation Knee)* |
| **Tier 3: High-Burst Capacity** | **P95 < 1.5 s** | **500 sockets** | **403 RPS** | **5,000+ analysts** | ✅ Empirically Verified *(P95: 1.18s)* |
| **Tier 4: Theoretical SLA Limit** | **P95 = 2.0 s** | **~850 sockets** | **~420 RPS** | **8,000+ analysts** | 📐 Derived via Little's Law |

---

## 2. Interview Talking Track: "What is your concurrency limit?"

If an interviewer or investor asks about load testing or concurrency, use this concise 30-second answer:

> *"We built an automated 3-layer stress test harness in TypeScript that runs nightly in GitHub Actions. We ramped load from 10 up to 500 simultaneous in-flight sockets across Cloudflare R2 and Supabase PostgreSQL with zero cloud cost.*
>
> *Our database reached peak throughput at **445 writes/second**, and under our peak **500-socket burst**, our P95 latency was **1.18 seconds**—comfortably beating our **sub-1.5s SLA** with **0% dropped packets**.*
>
> *Because human analysts have 15 to 30 seconds of think time between actions, that 445 RPS throughput translates to supporting over **5,000 active analysts** across live deal rooms simultaneously."*

---

## 3. The Three Metrics Explained (Plain English)

1. **Sustained Throughput (RPS):** The speed of the engine. Measures completed transactions per second (**445 DB writes/sec**, **310 file uploads/sec**).
2. **Instantaneous Sockets (Concurrency):** The width of the pipe. How many requests hit the server at the exact same physical millisecond (**500 sockets at 1.18s P95**).
3. **Real-World Active Users:** Total analysts working across the platform. Because analysts read CIMs and review models between clicks, 445 RPS supports **5,000 to 8,000+ active analysts**.

---

## 4. Subsystem Sizing Limits

| Architectural Subsystem | Max Tested Safe Load | Measured Throughput | Production Operating Limit (70% Headroom) |
| :--- | :--- | :--- | :--- |
| **Cloudflare R2 Uploads** | **500 simultaneous uploads** | **310 uploads/sec** (P50: 804ms) | **350 simultaneous uploads** (35 deals/sec) |
| **Supabase PostgreSQL** | **500 simultaneous users** | **403–445 txns/sec** (P50: 142ms) | **350 concurrent active users** |

### Practical Deal Room Sizing Rules:
- **Batch Storage Intake (Layer 2):** Up to **35 full 10-document deals** can be uploaded to Cloudflare R2 in the exact same second without storage throttling or egress fees ($0.00).
- **Queue Resilience:** When pushed beyond 200 concurrency, Supavisor connection pooling queues connections in memory with sub-1.2s drain times rather than crashing or dropping packets.

---

## 5. LLM Extraction Concurrency & Batch Limits (The Real AI Bottleneck)

While the database and storage layers support 500 simultaneous sockets and 5,000+ interactive browsing analysts, **live document extraction is constrained by LLM provider token quotas (TPM)**.

### Master LLM Concurrency Matrix

| Operating Dimension | Single Shared Key (OpenAI Tier 4) | Single Shared Key (OpenAI Tier 5) | Enterprise BYOK Customer (Per Customer) |
| :--- | :--- | :--- | :--- |
| **Provider TPM Limit** | **800,000 – 2,000,000 TPM** | **5,000,000 – 10,000,000 TPM** | **Customer's own quota bucket** |
| **Max Safe Concurrent Workers** | **15 – 25 active document workers** | **150 – 250 active document workers** | **+15 – 25 workers per enterprise key** |
| **Simultaneous Active Batches** | **~3 to 4 active batches** | **~25 to 35 active batches** | **+3 to 4 concurrent batches per tenant** |
| **Average Document Duration** | **25 – 40 seconds / document** | **25 – 40 seconds / document** | **25 – 40 seconds / document** |
| **Tokens Burned / Active Worker** | **~20,000 – 25,000 TPM / worker** | **~20,000 – 25,000 TPM / worker** | **~20,000 – 25,000 TPM / worker** |
| **Safe Quota Utilization** | **50% – 65% of TPM ceiling** | **50% – 65% of TPM ceiling** | Isolated to customer's account |

### Why ~3 to 4 Active Batches at Once?

1. **The Token Math**:
   - A typical diligence document (financial statements, tax returns, CIM excerpt) passes **~8,000 – 12,000 input tokens** and produces **~1,500 – 3,000 output tokens** of normalized facts and citations ($\approx$ 10k–15k tokens total).
   - An extraction run requires **25 to 40 seconds** of reasoning and structured output validation.
   - 1 active document worker burns approximately **~25,000 Tokens Per Minute (TPM)**.
2. **The Batch Math**:
   - Standard deal batches contain **5 to 8 documents**.
   - With client-side chunking (`CONCURRENCY = 3`), each active batch has **3 to 6 documents** actively processing in parallel.
   - **3 to 4 active batches running simultaneously** = **12 to 20 documents in flight**.
   - $20 \text{ workers} \times 25,000 \text{ TPM} = \mathbf{500,000\text{ TPM}}$.
   - This operates at **~62% of an 800k TPM Tier 4 limit**, leaving safe headroom for token spikes and schema auto-fix retries.
   - Pushing beyond 30 simultaneous workers on a single shared key risks HTTP **429 (RateLimitError)** rejections from the provider.

### How the Architecture Scales Beyond 3–4 Batches

1. **Frontend Chunking (`CONCURRENCY = 3`)**:
   In `frontend/pages/DueDiligenceDashboard.tsx`, client uploads are staggered in groups of 3. Dropping 10 files feeds them into the pipeline gradually as earlier files finish, preventing instantaneous token spikes.
2. **Supabase & n8n Buffer Queueing (Zero Dropped Documents)**:
   If 6+ users queue deals at the same minute, excess documents remain safely registered in Supabase with `status: 'queued'`. As worker slots free up every 25–30 seconds, queued documents drain automatically without errors or timeouts.
3. **Enterprise BYOK (Linear Quota Isolation)**:
   Enterprise users configuring their own OpenAI, Anthropic, or Gemini keys in BYOK Settings completely bypass the platform's shared quota. 10 BYOK organizations provide **10 separate quota buckets**, scaling global platform extraction capacity to **150–250 simultaneous workers**.
4. **Triad Multi-Model Failovers**:
   If the primary model (`OpenAI 5.6 Terra`) experiences provider downtime or rate throttling, n8n's LangChain triad automatically fails over to `OpenAI 5.6 Sol` (`gpt-5.6-sol`) or Google Gemini (`gemini-3.7-flash`).
5. **Real-Time Capacity Telemetry**:
   The `GET /api/diligence/capacity-telemetry` endpoint and the **Spending & Analytics** tab (`#spending-capacity-telemetry`) track live in-flight workers, queued files, 30-day peak overlap, and provider rate-limit signals in real time.

---

## 6. Local Reproduction

```bash
# 1. Run Ramp-to-Failure Breakpoint Probe (10 to 500 concurrency)
npm run stress:breakpoint

# 2. Run Full 3-Layer Load Suite (Storage, DB, & Pipeline Queue)
npm run stress:all

# 3. Run individual subsystem tests
npm run stress:storage   # Cloudflare R2 & Supabase DB Concurrency
npm run stress:pipeline  # n8n Pipeline Queue Batch Ingestion
npm run stress:api       # HTTP API Endpoint Throughput (Autocannon)
```

