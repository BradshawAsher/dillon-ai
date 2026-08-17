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

- # For brad, going through all the tabs, went through diligence, synthesis, valuation, working on returns tab (on levered cash flow timeline)

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

- For brad, continue exploring the website and thiings you need to add

- add chrome webmcp for agents?

- Make a more native demo in your website than actually just the supademo

- Have to make a short YouTube video and long YouTube video to almost mirror your supademos

- For brad, explore and test features using the vercel link instead of localhost since the vercel lacks some functionality still compared to the localhost

- Chatbot is still not good enough, on the vercel link I asked him tell me about this deal and he just told me to ask him other questions instead of just telling me straight up

- and new slides and script and preparation for questions they might ask and things to explain if you have more time

- try to open out and expand the js nodes and the code nodes and json schemas that claude code or antigravity made to have indentation and not be one squished block

- Finish adding the apply for access to go slack and maybe email too

- Is there a lot of overview in the analysis and overview tab with the other more indepth tabs like valuation, returns, growth, negotiation, etc?

- Why is the med spa wellness clinic when i first open the tab $5 price and 0 multiple?

- Some of the TOC didn't work on the vercel when i was on some tabs?

- For brad, maybe rewrite gh commit history the names of the commits so we know what actually happened? This is hard since somtimes when you did commit, like the changes you hoped for didn't actually happen so how can we label which one actually worked and which one didn't?

- Environment separation for prod API keys separate from testing API keys? Have we done this?

- Consider whether your UI works across all screen sizes? Can we turn it into a mobile app too or not yet? Is it installable as an app right now like in chrome save page as?

- Should we move the nav bar to the side like how many apps do it instead of vertically stacked?

- Verify github mcp works for claude code, for brad, add it to your other AIs

- Verify supademo mcp works

- Make the TOCs don't get cut off but just keep going and maybe increase height if you have to?

- Why claude code and codex don't give notification but antigravity does?

- Should we make like tutorials and interactive walkthroughs especially for new users, like how AWS or GCP tutorials work?

- [Mostly done] Are we separating error handling well? Like regular "we hit an issue" vs we hit a rate limit

- Find a real domain name on Porkbun and then swap to cloudflare for this

- Make successful deployment ready for businesses meeting for them to try it

- Understand how the AI Deal Assistant works and if we can make it better?

- Should we consier downgrading our models to reduce cost? To like gemini 3.5 flash or deepseek v4?

- Make sure the evals and harness the numbers and cards are right and now buggy and that the varainces show for cross doc conflicts?

- [done, need to verify] If LOI is detected, in projects, evals, and synthesis tab for that project, have an option to "run without LOI for unbiased deal discovery/analysis" to see results without the LOI? Would this require us to first have labels which doc is the LOI? Is this even a good idea? And if LOI is not detected, then we can even add like a disclaimer to "add LOI for post-LOI evaluation" or something?

-  [done, need to verify] And also in like projects tab or synthesis tab when I click exclude on a file does it give me a disclaimer like "can re-run synthesis again without this file for different results" as well as a button to re-run synthesis while excluding results for that doc?  And if we exclude a file is there an option to reinclude it or is there like a separate section for like "excluded files" or something? I just want to confirm whether we've already finished this implementation yet or no?

- Need to run business 1-5 without LOI for those that had an LOI, also add the pre-LOI or post-LOI for mergeworks suite 2-4

- Add options to use gemini 3.5 flash lite/3.1 flash lite for both per doc and synthesizer?
- Add options to use deepseek v4 flash and/or v4 pro?
- Maybe even have dropdowns for the user to choose and customize which model to use for the 4 options for doc primary, doc backup, synth primary, synth backup?

- Are we only scoring 1 doc per dd-00x business? But we're claiming to give each doc an individual scoring? What is going on? [For brad] - understand how this works and reconcile this?

- Why we are not showing confidence levels for key acquisition takeaways? or for document-level thesis takeaways? These are in syntehsis tab? Confidence levels in material impact mapping should be multiplied by 100 right?

- # Prepare slides, presentation script (?), backup recording, and supademo and supademo case study for tuesday business meeting, also prepare for example questions that they may ask and extra things you can mention if there's more time

- is there anywhere else in our website like FAQs or something or just how our agent currently operates that needs to be updated in order to really like distinctly highlight and support functionality for both modes or no?

- Is there a way I can automate the pushing of docs under different projects to save time? Or can I upload multiple projects at a time? Like this might require a side panel of like docs in progress or something? Or multiple batches at a time?

- Right now the bullet points for acquisition judgement are parsed in the frontend, it may be good to do it on the backend so things are not cut off?

- Can we open citation from points in the overview tab or in other tabs? Like for instance, in valuation tab, if it extracted a fact, can we click on the fact and it shows exactly how it got that?

- Chatbot should also be able to guide people with functionality like an advanced FAQ if the user is stuck or doesn't know which feature is where, and add clickable links that the user can click to take them to the real places

-  make a more custom and personalized business meeting slides with screenshots from your actual dashboard instead of generic images

- Change your fixed window + scrolling to more of fixed window + 20 per page, or 50 per page, or view all, like big websites like AWS when you have to look at IAM and admin permissinos stuff?

- Add even more granular confidence score so every fact on the page has a confidence score?

- Check where the explanations for vocab like MOIC and IRR are?

- Also look through all the tabs for each submission and see if anything is broken or no

- Check what the scope of current BYOK implementation is