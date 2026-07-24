# MergeWorks Active TODO

`TODO.md` is preserved as the original brainstorming list. This is the clean, active version; completed work from the current build session is intentionally omitted.

# Brad list
- The takeaways are still too long, change to bullet points and even shorter
- Make the project synthesis and even doc counter asynchronous, or just find a way to have finished be returned faster for the latest doc submission thing?
- Instead of citations, just make each thing like each green flag or each open question clickable and then it shows the citation that way instead of having the citations
- Is there a way to check if the doc is over like 100 pages and reject in that case or something
- Ask Codex how we are handling edge cases and make sure its not too strict

## Immediate live-data fixes

- [x] Confirm a provider parse failure retries and then reaches a graceful terminal failure state instead of crashing the Pod 1 pipeline. A broader post-fix regression remains open below.
- [x] Prevent newly created project-synthesis rows from being orphaned: the consolidator now writes its `projectId` on upsert. Existing blank-ID rows still need a one-time manual data cleanup.
- [x] Persist a usable document-type fallback: every completed document now saves primary and multi-type classification, falling back to the selected intake type or `Other` when the model omits it.
- [x] Correct the per-document yellow/green flag mappings and calibrate prompts so ordinary document incompleteness does not automatically produce `RED` / escalation.
- [x] **P0 — Wire live Deal Model hydration.** The successful per-document path now runs the Documented Facts Bridge before the document counter can trigger project synthesis.
- [-] **P0 — Verify live Deal Model hydration.** The UI now safely hydrates display-only confirmed facts from completed documents while the Deal Model bridge catches up. Confirm the n8n bridge still writes `financialFactsJson` to `documentedFactsJson`; purchase price, tax, financing, and scenario values remain analyst assumptions unless explicitly supplied or confirmed.
- [ ] **P0 — Clean up the existing blank-`projectId` synthesis row** and verify it no longer appears as an invisible/orphaned record.
- [ ] **P0 — Run a clean-document live regression.** Confirm a normal financial document can return GREEN/YELLOW, types populate the coverage checklist, confirmed facts reach the Deal Model, and a new synthesis row has its project ID.
- [ ] Run the remaining end-to-end cases: normal document, combined P&L/balance sheet, lax CSV, malformed CSV, duplicate, retry after provider failure, three-document batch, and final synthesis.
- [x] Add a repeatable clean-document test guide: [evals/LIVE_CLEAN_DOCUMENT_REGRESSION.md](evals/LIVE_CLEAN_DOCUMENT_REGRESSION.md).

### Friend checklist status

- [-] **Pod 1 pipeline is error-free:** the observed parse-failure retry and graceful terminal handling are fixed; certify this only after the full live regression passes.
- [-] **Live Deal Model inputs:** bridge wiring is complete; verify a real completed document populates `documentedFactsJson` and the quantitative cards.
- [-] **Document-type data flow:** persistence fallback is complete; verify live rows update project coverage from detected types.
- [-] **All results are RED:** prompt calibration is complete; verify a clean document can produce GREEN or YELLOW before closing this item.
- [-] **Orphan synthesis row:** new rows are prevented and blank-ID rows are hidden in the app; the existing raw n8n record still needs targeted cleanup if desired.

## Immediate product experience

- [x] Provide an example-data workspace toggle alongside live n8n data.
- [-] Show illustrative analyst assumptions for Returns, Growth, Deal Structure, and valuation-method comparison. Example mode is populated; the live workspace now fills only missing generic starting inputs after documented revenue or EBITDA arrives and preserves analyst entries. Returns, Growth, Deal Structure, and valuation comparison each show an explicitly non-saved preview while key live inputs are still missing. Verify live persistence and revise values per project.
- [ ] Make citations clickable and open an interactive document viewer at the cited page, cell, row, or excerpt.

## Now — validate what is already built

- [ ] Run the six quantitative-model test cases on a real processed project: documented facts, math checks, saved Deal Model inputs, all-cash returns, financed returns, and bear/base/bull scenarios.
- [ ] Add repeatable regression fixtures/mock projects for the quantitative cases, including missing inputs, mismatched periods, and negative/downside outcomes.
- [ ] Verify saved Deal Model values persist correctly after refresh, project switching, and another user/session.
- [ ] Check completion notifications end-to-end in a browser: first production queue should request permission; batch and synthesis completion should show a desktop notification when permission is granted.

## Highest product priority — finish the evidence workflow

- [x] Extend the evidence drawer to Valuation, Returns, Growth, and Deal Structure metrics. Every current quantitative metric now exposes its formula and documented versus analyst-entered inputs.
- [ ] Build an interactive document viewer: open the cited uploaded file and highlight the cited page, cell, row, or excerpt when available.
- [-] Normalize source-file names and citations so a synthesis citation reliably matches one uploaded document and its stored URL. The UI now normalizes paths/extensions/punctuation and safely uses high-confidence filename-token matching; validate this on live synthesis citations, especially generic labels such as “Document 1”.
- [-] Return/store granular citation metadata for every document and project-level fact: source file, page/cell, excerpt, period, currency, confidence, and status. The per-document schema already returns it; the project consolidator now requires structured citations and stores them in its synthesis JSON, which the UI exposes in the evidence drawer. Validate one new project synthesis in production; historical syntheses retain their legacy filename-only citations.
- [-] Add explicit `confirmed`, `estimated`, and `contradicted` labels consistently across facts, findings, and calculations. A shared status vocabulary now labels Evidence Drawer items and Deal Model documented facts as Confirmed, Estimated, Contradicted, Illustrative, Calculated, Synthesized, or Needs review. Extend the same badges to remaining finding/list surfaces after live validation.
- [-] Add project-level finding filters for workstream, severity, and status, plus a material-impact view linking each finding to valuation, cash flow, closing conditions, or negotiation actions. Project Portfolio now filters documents by workstream, status, and risk signal; material-impact mapping remains missing.

## Project and document experience

- [-] Finish document deletion/exclusion: accidental or duplicate uploads can be marked Excluded while retaining their audit row, excluded rows are omitted from coverage/synthesis, and analysts can now Include again through the same n8n audit workflow. Validate both directions on a live project; permanent deletion remains intentionally unsupported.
- [x] Make each project document selectable from a project list and show its analysis, status, detected type(s), and citations. The Project Synthesis card now exposes a document-detail panel and source-document action.
- [-] Support multiple detected document types per file and update the coverage checklist from detected types rather than only the intake selection. The document LLM returns all material types; its n8n table-write schema and the history API fallback now preserve/use them for coverage. Validate a combined financial-statement upload in production.
- [ ] Test mixed/multi-sheet spreadsheet uploads and documents that represent more than one financial statement type.
- [-] Improve synthesis formatting: four key acquisition takeaways, four document-level investment-thesis takeaways, digestible negotiation levers, and readable open questions. The consolidator now returns an evidence-backed key-takeaways brief, persists cross-document reconciliation findings, and the synthesis card renders expandable project-level takeaways, negotiation levers, open questions, and up to four clickable document-level thesis takeaways. Validate a new live synthesis before closing.
- [ ] Make long text fields consistently expandable/scrollable.
- [-] Add a management-question tracker with owner, priority, status, response, and resulting thesis impact. The checklist and question tracker now read/write through the authenticated shared n8n API, while retaining browser-local fallback. Validate cross-browser persistence and simultaneous edits before closing this item.

## Quantitative modeling — next enhancements

- [-] Add financed bear/base/bull scenarios, including levered cash-flow paths, debt amortization, MOIC, and IRR by scenario. The Returns tab now calculates levered Bear/Base/Bull MOIC, IRR, exit proceeds, and DSCR from saved financing terms; scenario-level cash-flow charts and evidence links remain future refinement.
- [-] Build a quantified valuation bridge: evidence-linked adjustments for unsupported add-backs, customer concentration, working-capital gaps, debt, and asset quality, with a negotiation translation for each adjustment. The Valuation tab now provides an evidence-linked, analyst-entered price/terms bridge saved in the browser; shared persistence and source-specific quantitative defaults remain missing.
- [-] Add ROI timeline and revenue/EBITDA projection charts from the deterministic model; never show a chart when required inputs are missing. The Returns tab now shows annual cash flow and a cumulative payback timeline when exit inputs are available, and Growth already shows bear/base/bull revenue paths. EBITDA projection and live-model validation remain.
- [-] Add sources-and-uses / deal-stack visualization with leverage and downside-resilience indicators. Deal Structure now separates Uses from Sources and shows debt funding, Debt/EBITDA, DSCR, and practical downside warnings; validate against saved live financing inputs.
- [ ] Add industry benchmarks only with a source, as-of date, comparability notes, and analyst review.
- [ ] Add an optional buyer profile and explainable acquisition-fit reasons; do not create opaque scores.

## Data quality and model assurance

- [-] Add extraction checks for swapped fields, wrong units, powers-of-ten errors, and implausible metric relationships. The Overview flags implausible margins, entry multiples, leverage, and rate-decimal errors. The per-document n8n reconciliation now also flags raw-to-normalized scale errors, materially conflicting duplicate facts, and implausible EBITDA margins; validate this on a live document before closing the item.
- [ ] Add the remaining structured outputs where supported: reconstructed EBITDA, margin compression, customer concentration, add-back quality, and financial-data completeness.
- [ ] Add a second independent quality-of-earnings check for recurring versus one-time findings, plus a project-level reconciliation review.
- [ ] Consider independent second-pass LLM review only after deterministic checks, with explicit comparison and review flags rather than silent overwrites.
- [ ] Obtain external test sets and create additional realistic mock diligence packages.

## Workflow reliability and operations

- [ ] Periodically review n8n retry/error logs and stuck-job behavior with real provider failures.
- [ ] Add refresh/upload rate limiting where production traffic demonstrates a need.
- [ ] Add per-project/person authorization before sharing the app beyond the current internal team.
- [ ] Track cost per document/project run with a transparent provider-cost estimate.
- [ ] Keep the README and operating/runbook documentation synchronized with workflow and UI changes.

## Later / only after the core workflow is proven

- [ ] Public-web enrichment for target-company information, with provenance and a user-visible separation from uploaded-document evidence.
- [ ] Email/Slack automation for material red flags after alert rules and ownership are established.
- [ ] WebSocket/event-driven progress updates if polling becomes a measured UX or scaling problem.
- [ ] API gateway evaluation if deployment/security requirements justify it.
- [ ] Visual polish and additional inspiration review, while preserving the document-first, post-LOI product focus.

# Even later - Brad's Ideas
- Make a chatbot for the website for the user to chat with about the deal, maybe uses RAG or something to have more context about the deal to give better answers
- Turn LLM chains to agents nodes in n8n to have memory and tool calls? Do we need this or no? Can we implement this somehow for our resumes so we can say that we used AI agents instead of just LLM chains?
- Any way we can make this workflow better using some sort of backend agent orchestration?
- Start working on some account system so that the user can only see their stuff and their stuff is saved?
