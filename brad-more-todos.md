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


- Should we make the ground truth less strict?

- Need to work on the video assignment for this week?

- For brad, going through all the tabs, went through diligence, synthesis, valuation, working on returns tab (on levered cash flow timeline)

- For brad - need to rerun all the evals docs again through the n8n pipeline using the anthropic api keys instead of your gemini api keys

- And maybe if the user wants to find more facts and flags we can set up a button to find more facts and red flags or tell them to ask the chatbot what do you think?
  - Since our agent doesn't get all the facts/flags but the classification is usually right

- For Brad - need to keep testing the website and trying different documents, can always expand the eval suite and trying to break the system, and also i think a lot of financial facts like ebitda and sde are not filled even though we put 4 long docs through? Why?


- Try seeing why Sonnet, Opus, and Fable are failing for the synthesizer workflow? Try seeing if they can work somehow for the fun of it by changing params?

- Why is anthropic nodes for per doc the only one that will generate an investment thesis?

- Have more robust fallbacks for per doc workflows? 
How to Properly Do Fallbacks in n8n (Based on Your Canvas)
Looking at your canvas layout, you have already built a robust error-handling architecture using n8n’s error branching:

The Error Flow Loop: Notice the top routing wires on your canvas (labeled "Classify LLM/Provider Error" looping into wait and retry nodes). This is the correct way to handle failures.

The Right Way to Fallback: Instead of stacking parsers serially, use an If/Else node or n8n’s built-in Error Trigger / On Error routing. If Anthropic throws a provider error, catch that specific error branch, route it to a secondary LLM node (like a Google Gemini or OpenAI model) with its own parser, and let it re-run the extraction cleanly.
- If both anthropic fail, then fallback to openai or gemini?

- Try using deepseek models since they are even cheaper than gemini?


- Need to grow your eval and harness set, 20 distinct projects, we currently have like 7. Trisha said she will add some, but we will need to collect our own or make gemini make it for you

- Environment separation for prod API keys separate from testing API keys? Have we done this?

- Are we setting good realistic caps for max file size but still dont max out really big excel file?

- Still need to finish video project by the end of the week?


- Prep for business meeting 3 and a website and walkthrough ready for them to try as well as prepare to be more professional with what to show when and example questions to ask and example questions to be ready to address

- Do we have to do some security stuff like SEC compliance and stuff like that?
  1. Data Security & Privacy Frameworks (The Tech Stuff)
  Financial due diligence documents contain highly confidential corporate numbers, cap tables, and private financial statements. Professional tools require strict security controls:

  SOC 2 Type II Compliance: The gold standard for B2B SaaS. It proves your cloud infrastructure, database controls (like Supabase), and automated pipelines (like n8n) securely handle sensitive customer data.

  Encryption: Ensuring data is encrypted both in transit (HTTPS/TLS) and at rest (database-level encryption).

  Data Residency: Guaranteeing that private financial data doesn't get leaked or stored insecurely when passed through third-party Large Language Model (LLM) APIs.

  2. Financial Regulatory & Fiduciary Boundaries (The Legal Stuff)
  Even though your tool uses AI to automate analysis, financial software must include strict liability disclaimers:

  "Not Investment Advice" Disclaimers: Clear legal notices stating that the dashboard's automated EBITDA reconstructions, risk flags, and deal summaries are for informational/analytical assistance only and do not constitute official financial, legal, or tax advice.

  Audit Trails & Explainability: Professional M&A teams cannot blindly trust an AI agent. Compliance-grade tools must maintain immutable logs (which your dashboard handles via its workflow error logs and submission histories) showing exact source attribution—linking every extracted metric back to the exact page of the original uploaded document.

  3. SEC & Regulatory Data Usage
  If your app pulls public data to benchmark deals:

  SEC EDGAR API Rules: When scraping or querying corporate filings from the SEC, developers must follow polite-pool guidelines (such as including a valid User-Agent header with contact info and respecting rate limits) to stay compliant with federal public data access rules.

  4. Professional Liability (E&O Insurance)
  If an enterprise financial advisory firm uses a due diligence tool and a critical AI hallucination misses a massive financial liability during a multi-million dollar acquisition, the software provider could face legal liability. Commercial financial platforms carry Errors & Omissions (E&O) / Professional Liability Insurance to protect against software bugs or inaccurate AI outputs.

- Have to make a landing page and walkthrough page like the example walkthrough for our project USE supademo

- Get github mcp?

- How to get more flags from the agent backend?

- Finding more datasets:
  Yes, there are several public repositories, open datasets, and disclosure platforms where you can find sample business deals, financial statements, and corporate filings to build out your evaluation dataset:

  SEC EDGAR (U.S. Securities and Exchange Commission): The official database for public company filings (10-Ks, 10-Qs, and 8-Ks). You can pull real corporate balance sheets, income statements, and merger disclosures to test your agent against complex financial data.

  Kaggle: Hosts various structured financial datasets, M&A datasets, and corporate financial report collections that can be downloaded and converted into mock PDFs or spreadsheets.

  Open-Source Financial Benchmark Datasets: Look for academic or industry-released financial QA benchmarks (such as FinQA or ConvFinQA), which provide raw financial text paired with verified ground-truth numerical answers.

  Investor Relations Pages of Public Companies: You can download investor presentation decks, quarterly earnings reports, and M&A press releases directly from corporate websites to test unstructured document parsing.

- How to increase accuracy?

- Is vercel now synced with localhost?

- Are we separating error handling well? Like regular "we hit an issue" vs we hit a rate limit

- Find a real domain name on Porkbun and then swap to cloudflare for this

- Make successful deployment ready for businesses meeting for them to try it

- How does your eval & harness work? Does it work on the synthesis or per doc for each doc in the project?

- Do we really have live regression checks working? How do we do that?

- Is there a way I can automate the pushing of docs under different projects to save time? Or can I upload multiple projects at a time?

- Need to rerun all your test docs with the anthropic for per doc and openai for synthesizer

- In eval and harness tab, have a button to view each business/project and to view each individual doc (either takes you to audit trail for that, or to diligence tab for most recent doc submission option for that doc results + sets the project being viewed to that project)

- How are we calculating the flags in general? Should we auto add all flags for per doc and then have synthesizer find more or reduce duplicates?

- View project workspace button and view doc results in evals and harness tab doesn't work right?

- Change your fixed window + scrolling to more of fixed window + 20 per page, or 50 per page, or view all, like big websites like AWS when you have to look at IAM and admin permissinos stuff?

- Add even more granular confidence score so every fact on the page has a confidence score?

- Check where the explanations for vocab like MOIC and IRR are?

- Also look through all the tabs for each submission and see if anything is broken or no

- Need to expand the eval set to be like the golden test set we takled about, mostly more happy path, messy path, edge case, and red team packets

- Why we are not showing investment thesis for latest doc submission?



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