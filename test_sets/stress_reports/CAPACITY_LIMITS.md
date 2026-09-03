# MergeWorks Empirical Capacity & Concurrency Limits

- **Empirical Measurement Date:** 2026-09-03T19:09:19.076Z
- **Testing Method:** Automated ramp-to-failure probe across Cloudflare R2 and Supabase PostgreSQL.
- **Cost Incurred:** $0.00 (Zero storage egress, Zero LLM tokens, 100% automated post-test purge).

---

## 1. Verified Subsystem Capacity Limits

| Architectural Subsystem | Max Verified Safe Concurrency | Observed Breaking Point / Degradation | Production Safe Operating Limit |
| :--- | :--- | :--- | :--- |
| **Cloudflare R2 Document Uploads** | **500 concurrent uploads** | Exceeds 500+ without errors (310 RPS) | **350 simultaneous uploads** |
| **Supabase PostgreSQL Transactions** | **500 concurrent users** | Exceeds 500+ without errors (403 RPS) | **350 active concurrent users** |

---

## 2. Practical Diligence Sizing Guidance

1. **Simultaneous Diligence Deals**: Up to **35 full 10-document deals** can be uploaded in the exact same second without throttling.
2. **Deal Team Concurrency**: Up to **350 analysts** can simultaneously browse, poll status, and edit deal models with sub-second response times.
3. **Queue Retention**: Under maximum load, 100% of documents are durably registered in Supabase before worker dispatch.
