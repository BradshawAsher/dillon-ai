# Brad's Feedback & Todo List (Audited & Organized — August 2026)

*This file tracks feedback, UI bug fixes, feature requests, and future architecture ideas submitted by Brad.*
*All active pipeline execution tasks are also tracked in [`ACTIVE_TODOS.md`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/ACTIVE_TODOS.md).*

---

## 🔮 Future Architecture Ideas & Open Considerations (`[ ]`)

- [ ] **Self-Improving Model / Feedback Loop**:
  - Ideas for automated self-improvement (e.g., chat thumbs up/down feedback logging to Supabase, offline prompt tuning against `npm run eval` benchmarks).
- [ ] **Split into 2 Specialized Sub-Chains**:
  - *Option B*: Chain 1 for Financials & Math (P&L, Balance Sheet, EBITDA) and Chain 2 for Qualitative & Thesis (Red Flags, LOI warranties, customer concentration).
- [ ] **Model Agnostic / Bring Your Own API Key (BYOK)**:
  - Option to let users supply their own Anthropic / OpenAI / Gemini API key.
- [ ] **Granular Confidence Schema Enhancements**:
  - *Per-document flag confidence*: Update n8n structured output schema so per-document red/yellow/green flags are returned as objects with `confidence_score` and `severity` instead of plain strings.
  - *Per-valuation-bound confidence*: Update n8n schema to return separate confidence scores for lower, base, and upper valuation bounds.
  - *Inline quant card confidence badges*: Render confidence badges directly on overview metric cards (revenue, EBITDA) in addition to the Evidence Drawer.
- [ ] **Company Intake Yap & AI Interview Flow**:
  - Place for users to describe/yap about their company, with an AI interviewing them to capture starting context before or after uploading documents.
- [ ] **Batch & Synthesis Stop / Cancel Controls**:
  - Add explicit "Cancel batch" / "Cancel synthesis" button to reset UI polling state if n8n stalls or enters a loop.
- [ ] **Google Drive to Cloud Bucket Migration**:
  - Migrate document storage from Google Drive to permanent AWS S3 / Supabase Storage buckets OR MERGEWORKS OWNED Shared Google Drive
- [ ] **Model Upgrades**:
  - Evaluate Claude Opus / Sonnet 3.7 / Gemini 1.5 Pro performance tradeoffs when available in n8n.

---

## ✅ Completed & Verified Work (`[x]`)

### Overview & Deep Analysis UX
- [x] **Digestible Deal Summary & Escalation Callouts**: Reformatted acquisition judgment callouts into prominent decision banners with distinct typography and bulleted assessments (`DealSummaryBanner.tsx`, `ProjectSynthesisCard.tsx`).
- [x] **Quick Valuation Price Spectrum**: Added visual price marker dots and range bars showing where asking price falls on the spectrum (`QuickValuationCard.tsx`).
- [x] **Interactive Seller Questions**: Added interactive question-and-answer inputs for seller questions that persist to local storage and feed directly into the AI Chat Assistant context (`SellerQuestionsCard.tsx`).
- [x] **Truncated Text & Expandable Show More/Less**: Converted long risks, negotiation levers, takeaways, and open questions into expandable text cards with Show More/Less toggles (`ExpandableInsightGroup.tsx`).
- [x] **Recurring vs. 1-Time Red Flag Coloring**: Red flag findings now render with high-visibility red badge callouts rather than generic muted/green styling.
- [x] **Customer Concentration Citation Fix**: Fixed citation links in the customer concentration view to reliably open the Evidence Drawer with source file, page/cell, and excerpt (`CustomerConcentrationCard.tsx`).

### Analysis & Quantitative Features
- [x] **Asking Price Navigation Fix**: Asking price inputs smoothly scroll and highlight the target model card without breaking page state.
- [x] **Risk Matrix Expansion**: Risk matrix cells feature expanded text formatting and clickable risk cards (`RiskMatrixCard.tsx`).
- [x] **Diligence Completeness Resolution Buttons**: Each of the 4 completeness sections includes action buttons routing directly to the workspace tab needed to resolve the missing data (`DiligenceCompletenessCard.tsx`).
- [x] **Dedicated Negotiation Playbook Tab/Card**: Scaled typography and dedicated layout for negotiation tactics and estimated dollar impacts (`NegotiationPlaybookCard.tsx`).
- [x] **DD Request List Show Rest Button**: Added pagination/expand toggle for long request lists with copy-to-clipboard functionality (`DueDiligenceRequestListCard.tsx`).
- [x] **Tab Transition Scroll-to-Top**: Switching workspace tabs automatically smooth-scrolls the viewport to the top of the new tab.
- [x] **Material Impact Mapping Documents**: Linked all findings to source document links and evidence drawer excerpts (`MaterialImpactView.tsx`).

### Data Model & Citation Fixes
- [x] **EBITDA / Decision Metrics Reconstructed Fact Deprioritization**: Reconstructed facts are deprioritized when an explicit document-sourced fact exists for the same period. Derived facts are labeled as calculated provenance.
- [x] **Risk Matrix Text Sizing & Card Formatting**: Text size increased with proper wrapping and tooltips.
- [x] **Disclaimers for Seller Questions & Action Trackers**: Added explicit callouts stating that seller answers and action tracker notes feed the AI Chatbot context without altering raw n8n document extraction.
- [x] **Diligence AI Summary Truncation Fix**: Full multi-line AI summary text is scrollable and expandable without text clipping.
- [x] **Missing Diligence Materials Synchronization**: Synced missing documents between ProjectSynthesisCard and Overview overview cards.
- [x] **Saved Model Assumptions Summary**: ModelAssumptionsSummary renders at the TOP of every quantitative tab (Returns, Growth, Valuation, Deal Structure) showing current saved values.
- [x] **Value-Risk Bridge Formatting**: Streamlined wording and added explicit action buttons in synthesis and overview.
- [x] **Financed Scenario Terminology**: Clarified analyst inputs vs model assumptions in financed return cards (`FinancedReturnsCard.tsx`).
- [x] **Year 1 Monthly Projection Number Formatting**: Fixed container width and currency formatting for 12-month cash projections (`WeeklyProjectionCard.tsx`).
- [x] **Tooltips & Explanations for Financial Metrics**: Added info tooltips (`i`) explaining MOIC, IRR, DSCR, Payback, and SDE across all quantitative cards.
- [x] **Document Type Classification in Projects Tab**: Project Portfolio and Document List display detected file types (P&L, Balance Sheet, LOI, CIM, etc.) per document.
- [x] **Comma-Separated Currency Formatting**: All numbers in audit trail, synthesis, and quantitative cards use proper thousand separators (e.g., `$25,000` instead of `25000`).
- [x] **Cited Excerpt Priority in Evidence Drawer**: Citations display the exact cited excerpt at the top before rendering the Drive preview/link.

### Infrastructure & Pipeline Resiliency
- [x] **Supabase Read Architecture Migration**: Converted all backend reads to direct Supabase queries, archived 6 read webhooks, and set up parallel dual-writing in n8n.
- [x] **Stall Auto-Detection & 20s Timeout**: Documents stalled in processing auto-fail after 20 seconds, preventing infinite loading state in the Diligence tab (`getSubmissionHistory.ts`).
- [x] **Audio & Chrome Browser Alerts**: Web Audio API two-tone alert sound and native Chrome desktop notifications fire on AI failure.
- [x] **Top-Level Pipeline Error Alert Banner**: High-visibility error banners display in Overview, Synthesis, and Diligence tabs when n8n hits API limits.
- [x] **Dynamic Project Portfolio Status Derivation**: Cross-references live Supabase syntheses to render accurate states (`Extracting documents...`, `Awaiting processing`, `Ready for synthesis`, `Synthesized`).
- [x] **100% Ground Truth Dataset (17/17 files)**: Ground truth JSON specifications created for all 17 test documents across all 5 sample deals in `test_sets/ground_truth/`.
- [x] **Automated Evaluation Suite (`npm run eval`)**: Benchmarking script measures accuracy out of 100 points across Classification, Facts, Risk, Valuation, Employees, and Math Checks.
- [x] **Drag-and-Drop Extension Filtering**: `FileDropzone.tsx` enforces extension checks (`.pdf`, `.xlsx`, `.docx`, `.xlsm`, `.xltx`) on drag-and-drop to reject unsupported files (e.g. `.numbers`).
- [x] **Extensionless File Fix**: Renamed `MergeWorks_Financial_Due_Diligence_Model` in Business 1 to `.xlsx`.

---

## 📌 Personal Notes for Brad

- [ ] **Understand Graph Interpretation**: Review the explanatory tooltips (`i`) on Returns, Growth, Valuation, and Deal Structure charts.
- [ ] **Review Deterministic Math Checks**: Review [`DETERMINISTIC_MATH_CHECKS.md`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/DETERMINISTIC_MATH_CHECKS.md) for how Revenue - COGS = GP and Assets - Liab = Equity formulas work.
- [ ] **Execute Sample Deals Post-Credit Refill**: Once Anthropic API credits are refilled by the admin, queue Business 4 (ConversionXL), Business 1 (Roofing Co), Business 3 (TurnKey), and Business 2 (Iron Tree), then run `npm run eval` to view the evaluation scorecard.
