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

- Use your Gemini Palm API Key for now until anthropic nodes are back?

- We have a huge bug in the diligence and synthesis tab that the batch processing progress finished bar isn't syncing with live n8n progress and does not show any data for most recent doc submission? Always just says pending pending pending etc?

- There is obviously a database sync gap between n8n tables and supabase

- Should we make the ground truth less strict?

- For evals and harness tab, fix the cost optimization? Are we reporting exactly the model we are using as well as the tokens spent, and then calculating the cost mathematically, or no?

- Check if the anthropic keys are refilled yet or no? [BRAD TODO]

- May need to switch gemini models for the api key for n8n since you're running low of the tpm rate limits?

- Need to work on the video assignment for this week?

- For brad, going through all the tabs, went through diligence, synthesis, valuation, working on returns tab (on levered cash flow timeline)

- For brad - need to rerun all the evals docs again through the n8n pipeline using the anthropic api keys instead of your gemini api keys

- And maybe if the user wants to find more facts and flags we can set up a button to find more facts and red flags or tell them to ask the chatbot what do you think?
  - Since our agent doesn't get all the facts/flags but the classification is usually right

- Have to understand how the evals work to present on saturday (for brad)

- For Brad - need to keep testing the website and trying different documents, can always expand the eval suite and trying to break the system, and also i think a lot of financial facts like ebitda and sde are not filled even though we put 4 long docs through? Why?

- Add even more granular confidence score so every fact on the page has a confidence score?

- Check where the explanations for vocab like MOIC and IRR are?

- Also look through all the tabs for each submission and see if anything is broken or no

- Need to expand the eval set to be like the golden test set we takled about, mostly more happy path, messy path, edge case, and red team packets

- Why we are not showing investment thesis for latest doc submission?

- Have to do this: Track A · Ran cost analysis on your workflow · identified top 3 spend drivers

- Add the old edge cases to test sets and make them a little more complicated? Add the ground truth for them too and automated scoring.

- Have to make sure to do these 2:
  - Track B · Eval harness shipped · 20-input golden dataset + automated pass/
  - Track B · Eval runs on every deployment (regression check)


# BRAD MORE TODO

1.  [DONE?] n8n API Token Access:
Yes, absolutely! You can add your n8n API Key to frontend/.env as:
dotenv

N8N_API_KEY=<your-n8n-api-key>
With an n8n API key, we can interact directly with the n8n Cloud REST API (https://merge-works.app.n8n.cloud/api/v1/) to:

List running executions
View detailed node execution logs & error tracebacks
Programmatically cancel stalled executions (POST /api/v1/executions/{id}/stop)

3. [DONE?] Bring Your Own Key (BYOK) Scope: (Check if this is supported)
AI Chatbot: Uses the custom key saved in browser localStorage directly for instant Q&A.
Document & Synthesizer Workflows: Background AI extraction and synthesis run on n8n Cloud. The BYOK key is attached as a request header (x-user-anthropic-key) in the upload payload, allowing custom keys to be forwarded when default team credits are exhausted.