# MergeWorks — Active Todo & Roadmap Tracker

*Created: August 3, 2026*  
*Migrated & Consolidated from `TODO_CURRENT.md`*

---

## 🚀 High-Priority Pipeline & Testing Tasks

- [ ] **1. Refill Anthropic API Credits** *(Blocked on Admin)*
  - Pod 1 Anthropic credits are currently exhausted. Refill credits to allow n8n document extraction and consolidator synthesis workflows to process new uploads.

- [ ] **2. Execute & Evaluate Remaining Sample Deals**
  - Run all 17 test documents across sample businesses through n8n:
    - [x] **Business 5 (Medical Spa)** — 2/2 files executed & evaluated (`business5_medical-spa_actual_run.json`).
    - [ ] **Business 4 (ConversionXL)** — 4 files queued (`WC- Conversion XL OM.pdf`, `DD Memo.pdf`, `ConversionXL LLC_Profit and Loss by Month v2.xlsx`, `CXL_Screen.xlsx`).
    - [ ] **Business 1 (Roofing Co)** — 5 files queued (`Balance Sheet Jan 2023 to Dec 2024.pdf`, `Two years PL ended Dec 31 2024.pdf`, `Werkheiser P&L 2025.pdf`, `Werkheiser_LOI_MergeWorks.docx`, `MergeWorks_Financial_Due_Diligence_Model.xlsx`).
    - [ ] **Business 3 (TurnKey)** — 2 files queued (`1) TurnKey Product Management Business Summary.pdf`, `2) TurnKey Product Management P&L [Google Sheet].xlsx`).
    - [ ] **Business 2 (Iron Tree)** — 4 files queued (`Iron_Tree_Data_-_Teaser.pdf`, `Iron_Tree_Data_-_CIM.pdf`, `Adjusted_Financials_-_Iron-Tree_(2026.02)_final.xlsx`, `Financial Modeling for Iron Tree.xltx`).

- [ ] **3. Run Automated Evaluation Suite**
  - Execute `npm run eval` after deal execution to verify that accuracy scores across all 17 ground truth specifications in `test_sets/ground_truth/` meet the **Ship-Ready (>= 80%)** threshold.

- [ ] **4. Clean Legacy Orphan Synthesis Record**
  - One legacy pre-existing synthesis row in Supabase has a blank `projectId`. The frontend hides it safely, but a one-time data layer delete can purge the old test row.

---

## 💡 Future Enhancements & Roadmap (Post-Core Release)

- [x] **Target Domain Public Enrichment**
  - `PublicDataEnrichmentCard.tsx` implemented with digital footprint scoring, tech stack detection, and sentiment analysis.
- [ ] **Email / Slack Webhook Alerts for Red Flags**
  - Trigger automated Slack / Email notifications when a high-severity red flag or escalation reason is detected during batch processing.
- [ ] **Real-time Event Push (WebSockets / Supabase Realtime)**
  - Optional enhancement to replace HTTP polling with WebSocket subscription events for batch status updates.
- [ ] **Cloud Storage & Data Retention Migration**
  - Migrate document storage from transient Google Drive / temporary storage to a permanent cloud bucket (AWS S3 / Supabase Storage).
