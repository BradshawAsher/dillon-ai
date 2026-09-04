# MergeWorks — Key Active Priorities & Roadmap Focus

*Updated: September 2026*

---

### Priority 1: Institutional Investment Committee (IC) Deal Memo Export (PDF) (P0) — *IN PROGRESS*
- **What it is:** An executive, publication-grade printable / PDF Investment Committee Deal Memo generated directly from the current deal synthesis and valuation model.
- **Why it's important:** In private equity, search funds, and M&A advisory, analysts must present a structured IC Deal Memo before submitting an LOI or advancing to Phase 2. This complements our live Excel model (`.xlsx`) with a print-ready, formatted PDF deliverable.
- **Key Sections:**
  1. Executive Summary & Buy/Pass/Renegotiate Verdict.
  2. Transaction Economics & Sources/Uses Capital Stack.
  3. Quality of Earnings (QoE) Add-Back Disallowance Schedule.
  4. Valuation Bridge & Net Counter-Offer Sizing.
  5. Top Diligence Red Flags & Suggested APA Contract Indemnity Covenants (Section 2.3 & 8.2).
  6. 5-Tier Data Origin Provenance Audit Trail (Verified Facts vs. Underwriting Assumptions).
  7. Investment Committee Sign-off Signature Block.

---

### Priority 2: Virtual Data Room (VDR) Bulk Folder / Zip Ingestion (P1)
- **What it is:** Ingest entire nested directories (`01_Financials/`, `02_Tax_Returns/`, `03_CIM/`) via drag-and-drop `.zip` or folder upload.
- **Why it's important:** Real-world M&A deal rooms provide 20–100 documents organized in folders. Unpacking client-side with `JSZip` and auto-routing files to their diligence classification eliminates manual file-by-file upload friction.

---

### Priority 3: Supabase Realtime WebSocket Transition (P2)
- **What it is:** Transitioning background status checks from HTTP polling (`/api/diligence/history?full=false`) to Supabase Realtime Change Data Capture (CDC) over WebSockets.
- **Why it's important:** Drops background HTTP requests to zero and provides sub-15ms live UI updates when extraction workers complete documents.

---

### ✅ Recently Completed Milestones
- [x] **5-Tier Financial Data Origin & Lineage System** (Valuation, Returns, Growth, Structure, Negotiation).
- [x] **Deal War Room Bot** for Slack and Microsoft Teams with automated completion alerts.
- [x] **11-Sector Vertical Benchmark Taxonomy** with automatic industry peer detection.
- [x] **Live Formula Excel Model Generator (`.xlsx`)** with 5 dynamic tabs and APA escrow covenants.
- [x] **Blank-`projectId` Orphan Purge Utility** (`backend/diligence/cleanOrphans.ts`).
- [x] **1,111 Passing Tests & Playwright E2E Suite** (100% clean test suite).
