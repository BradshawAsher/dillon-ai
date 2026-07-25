# MergeWorks Active TODO

`TODO.md` is preserved as the original brainstorming list. This is the clean, active version; completed work from the current build session is intentionally omitted.

## New-agent handoff (updated 2026-07-23)

### Start here

- **Product:** MergeWorks, an M&A due-diligence dashboard. Users upload deal documents, n8n runs document-level analysis and a project synthesis, and the React app presents findings, evidence, coverage, and illustrative financial models.
- **Repository:** `C:\Users\s-bas\MERGEWORKS REAL WEBSITE\Due-Diligence-Dashboard`
- **Frontend:** `frontend/`. Run `npm run dev` there for local development and `npm run build` before handoff. The last production build passed; its only warning is the existing large-chunk warning.
- **Do not expose credentials or webhook secrets.** They live in n8n/environment configuration, not in this document or source changes.
- **Treat this file as the active plan.** Preserve `TODO.md` as historical brainstorming. A `[-]` item is partly built and needs live validation or a remaining subtask; `[ ]` is unstarted; `[x]` is implemented.

### Current pipeline and important behavior

| Area | Current behavior | Key workflow / location |
|---|---|---|
| Per-document analysis | Lax by design: provider/format failures retry; terminal failures are recorded rather than crashing the batch. Suspect table layouts and large documents continue with an advisory rather than being blocked. | n8n **`[Pod 1] - Financial DD Agent - MCP Test - Robust Per Document AI Analysis`** (`W5Jp7CJIQbNy0qlY`) |
| Large documents | At roughly 100,000 extracted characters, analysis continues but stores a `largeDocumentAdvisory`. There is intentionally no ordinary page-count hard rejection. | Per-document workflow: `Assess Document Volume` → `Record Large Document Advisory` |
| Project readiness | Failed/excluded documents do not block synthesis if at least one considered completed document has usable extraction JSON. | n8n **`[Pod 1] Financial DD Agent - DOCUMENT COUNTER UTILITY SUBWORKFLOW`** (`0OVTAMMp2iMx53Aw`) |
| Synthesis execution | The counter writes `synthesis_pending` and starts the consolidator asynchronously (`waitForSubWorkflow: false`), so document processing can finish without waiting for project synthesis. | Counter → **`[Pod 1] Financial DD Agent - SUBWORKFLOW PROJECT-WIDE CONSOLIDATOR WORKFLOW`** (`IoSad3rTYJMk4Mon`) |
| Exclude/include | `isConsidered === false` retains the audit row but removes that document from coverage and synthesis. The consideration endpoint triggers a refreshed counter/synthesis. | n8n **Document Consideration** (`lXz9fVKY4RaTlDFM`); frontend synthesis and project document lists |
| Evidence | The Evidence Drawer can open Drive inline/new-tab and shows location/excerpt. It cannot reliably auto-highlight an exact page/cell across file types yet. | `frontend/components/EvidenceDrawer.tsx` |

### Recent changes that must not be accidentally reverted

- Format/structured-output failures from the document LLM are now retryable (up to three recovery attempts with 2/6/15-second waits). This fixed a real malformed-JSON failure from the Customer Concentration test document.
- Table-shape and large-document checks are **advisories**, not gates. Keep the system lax unless a request is clearly abusive/spam-like.
- The consolidator filters evidence to considered, completed rows with nonempty `ai_extractedJson`; failed documents must not create `null` evidence blocks.
- A retry action from Projects/Synthesis routes the user to Diligence. The synthesis screen also has retry/exclude actions and a safe “Run synthesis now” refresh path.
- Batch UI separates true failures from completed-with-advisory documents. Synthesis citations and document citations use fixed-height scrolling panels.
- `ProjectSynthesisCard.tsx` now owns the prominent acquisition-judgment callout; do not duplicate it at the parent page level.

### First work to do (in this order)

1. **Run one real two-document production regression:** one normal document plus one document that fails or is excluded. Confirm the normal document reaches `completed`, the counter shows `synthesis_pending`, synthesis completes asynchronously, and no timer/progress state remains stuck.
2. **Run a clean financial-document regression:** verify a GREEN/YELLOW result, detected types update coverage, documented facts reach the Deal Model, and the synthesis row has a real `projectId`.
3. **Verify live deal-model hydration:** real `financialFactsJson` / `documentedFactsJson` must populate the quantitative tabs. This is the highest-leverage unfinished capability for real deals.
4. **Clean the pre-existing blank-`projectId` synthesis record** directly in the data layer only after identifying its exact row. New rows are protected, but the legacy orphan remains.
5. After the live path is proven, finish per-finding clickable evidence and page/cell anchoring where the document provider supports it; then add finding filters/material-impact mapping.

### Fast verification checklist

- Build frontend: from `frontend`, run `npm run build`.
- Queue one ordinary document: expect document completion first, then an explicit synthesis-pending state, then synthesis completion/desktop notification if permission is granted.
- Queue a deliberately malformed/failed document alongside one normal document: expect the failed row to show Retry/Exclude, while the usable document can still synthesize.
- Exclude then include a completed document: confirm coverage and synthesis update, with audit history retained.
- Open Valuation, Returns, Growth, and Deal Structure on a real project: confirmed facts should displace illustrative values where available; all assumptions must remain visibly labeled.

### Useful files

- Main app orchestration: `frontend/pages/DueDiligenceDashboard.tsx`
- Project synthesis UI: `frontend/components/ProjectSynthesisCard.tsx`
- Evidence UI: `frontend/components/EvidenceDrawer.tsx`
- Expandable findings: `frontend/components/ExpandableInsightGroup.tsx`
- Live regression guide: `evals/LIVE_CLEAN_DOCUMENT_REGRESSION.md`

### Handoff rule

Before closing any `[-]` item, verify it against a **new live n8n run**, not example data or a historical database row. Update this file in the same change with: what was changed, what was verified, and the remaining limitation.

# Brad list
- [x] Make takeaways shorter and easier to scan. Project insight lists now collapse long items earlier, while document-level thesis cards show a concise first-sentence preview and open the full evidence on click.
- [x] Make the project synthesis/doc-counter handoff asynchronous. The counter now writes `synthesis_pending`, starts the consolidator without waiting, and returns document completion immediately; validate one production batch after this change.
- [x] Make every flag, open question, and decision driver clickable to open the relevant evidence. All 8 project-level insight groups, document-level flags (red/yellow/green), and document-level thesis takeaways now open the Evidence Drawer on click with source file, location, severity-status, and document links.
- [x] Handle exceptionally large documents without strict rejection. A 100,000-extracted-character threshold records a visible advisory and continues analysis; only clearly abusive requests should be stopped in a future policy.
- [x] Keep edge-case handling intentionally lax. Bad table shape and large-document detection are advisories; malformed provider output retries; a failed document can be retried/excluded without blocking synthesis of usable documents.

- Can we add estimated time is 1 min for doc specific latest doc submission?
- Can we make escalation reasons, ai summary also clickable for citations?
- I don't get what the bottom of the valuation page means?
- Show the saved model assumptions initially for returns, valuation, deal structure, and growth, so the user can see what they are? Why is there no place for saved model assumptions on valuation?
- Did we add parsing of pure numbers and deterministic double checking? Have that be explained to you?
- Can we make deterministic math checks, red flags, green flags, yellow flags, escalation reasons, and citations be clickable in audit trail? Why are there only deterministc math calcs in audit trail but not in latest doc submission nor synthesis?
- Can we refer to what n8n workflows and maybe even what files in the frontend are responsible for what in the edge cases? 
- Why does structured output parser oftentimes fail in per doc analysis?
- For latest doc submission, change the button from view project synthesis to view latest doc submission (scrolls them down a little bit), and then maybe in the middle and in the end of the latest doc submission stuff, have buttons for view this project's synthesis (could also show whether the synthesis is done or not)

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
- [-] Make citations/finding links open the interactive document viewer at the cited location or excerpt. Drive preview and source links work now; exact page/cell/row highlighting and conversion of every standalone citation panel to per-finding links remain unfinished.

## Now — validate what is already built

- [ ] Run the six quantitative-model test cases on a real processed project: documented facts, math checks, saved Deal Model inputs, all-cash returns, financed returns, and bear/base/bull scenarios.
- [ ] Add repeatable regression fixtures/mock projects for the quantitative cases, including missing inputs, mismatched periods, and negative/downside outcomes.
- [ ] Verify saved Deal Model values persist correctly after refresh, project switching, and another user/session.
- [ ] Check completion notifications end-to-end in a browser: first production queue should request permission; batch and synthesis completion should show a desktop notification when permission is granted.

## Highest product priority — finish the evidence workflow

- [x] Extend the evidence drawer to Valuation, Returns, Growth, and Deal Structure metrics. Every current quantitative metric now exposes its formula and documented versus analyst-entered inputs.
- [-] Build an interactive document viewer: the Evidence Drawer now opens an inline Drive preview or a new-tab source link and shows the cited location/excerpt. Automated page/cell highlighting remains unavailable because uploaded document formats and Drive previews do not expose a reliable common anchor API.
- [-] Normalize source-file names and citations so a synthesis citation reliably matches one uploaded document and its stored URL. The UI now normalizes paths/extensions/punctuation and safely uses high-confidence filename-token matching; validate this on live synthesis citations, especially generic labels such as “Document 1”.
- [-] Return/store granular citation metadata for every document and project-level fact: source file, page/cell, excerpt, period, currency, confidence, and status. The per-document schema already returns it; the project consolidator stores the full structured LLM output (with per-finding citations and confidence scores) in `finalJudgmentJson`; the frontend `MaterialImpactView` now parses this to show confidence badges and richer source info. The backend API (`getProjectSynthesis.ts`) still flattens findings to string[] — preserving the structured types in the API response remains optional (the frontend can already parse `finalJudgmentJson` directly). Validate one new project synthesis in production.
- [-] Add explicit `confirmed`, `estimated`, and `contradicted` labels consistently across facts, findings, and calculations. A shared status vocabulary now labels Evidence Drawer items and Deal Model documented facts as Confirmed, Estimated, Contradicted, Illustrative, Calculated, Synthesized, or Needs review. Extend the same badges to remaining finding/list surfaces after live validation.
- [x] Add project-level finding filters for workstream, severity, and status, plus a material-impact view linking each finding to valuation, cash flow, closing conditions, or negotiation actions. Project Portfolio filters by workstream/status/risk; Project Synthesis has severity + type filters; MaterialImpactView auto-classifies all findings into 5 impact categories (Valuation, Cash Flow, Closing Condition, Negotiation, Risk) with keyword heuristics, per-category chip filters, severity badges, and click-to-evidence. Validate on a live synthesis.

## Project and document experience

- [-] Finish document deletion/exclusion: accidental or duplicate uploads can be marked Excluded while retaining their audit row, excluded rows are omitted from coverage/synthesis, and analysts can now Include again through the same n8n audit workflow. Validate both directions on a live project; permanent deletion remains intentionally unsupported.
- [x] Make each project document selectable from a project list and show its analysis, status, detected type(s), and citations. The Project Synthesis card now exposes a document-detail panel and source-document action.
- [-] Support multiple detected document types per file and update the coverage checklist from detected types rather than only the intake selection. The document LLM returns all material types; its n8n table-write schema and the history API fallback now preserve/use them for coverage. Validate a combined financial-statement upload in production.
- [ ] Test mixed/multi-sheet spreadsheet uploads and documents that represent more than one financial statement type.
- [-] Improve synthesis formatting: four key acquisition takeaways, four document-level investment-thesis takeaways, digestible negotiation levers, and readable open questions. The consolidator now returns an evidence-backed key-takeaways brief, persists cross-document reconciliation findings, and the synthesis card renders expandable project-level takeaways, negotiation levers, open questions, and up to four clickable document-level thesis takeaways. Validate a new live synthesis before closing.
- [x] Make long text fields consistently expandable/scrollable. ExpandableText (gradient fade + Show more/less) now applied to: DealOverviewCard judgment summaries, SubmissionHistoryCard buy reasoning and notes, DueDiligenceDashboard live buy reasoning, EvidenceDrawer source excerpts, ProjectPortfolioCard recommendations, AcquisitionJudgmentCallout, and ProjectSynthesisCard AI summaries.
- [-] Add a management-question tracker with owner, priority, status, response, and resulting thesis impact. The checklist and question tracker now read/write through the authenticated shared n8n API, while retaining browser-local fallback. Validate cross-browser persistence and simultaneous edits before closing this item.

## Quantitative modeling — next enhancements

- [x] Add financed bear/base/bull scenarios, including levered cash-flow paths, debt amortization, MOIC, and IRR by scenario. The Returns tab now calculates levered Bear/Base/Bull MOIC, IRR, exit proceeds, and DSCR from saved financing terms. FinancedScenarioComparisonCard now also renders a three-line (Bear/Base/Bull) levered cash-flow path chart using the GrowthLineChart pattern. Evidence links for individual scenario line items remain future refinement.
- [-] Build a quantified valuation bridge: evidence-linked adjustments for unsupported add-backs, customer concentration, working-capital gaps, debt, and asset quality, with a negotiation translation for each adjustment. The Valuation tab now provides an evidence-linked, analyst-entered price/terms bridge saved in the browser; shared persistence and source-specific quantitative defaults remain missing.
- [-] Add ROI timeline and revenue/EBITDA projection charts from the deterministic model; never show a chart when required inputs are missing. The Returns tab now shows annual cash flow, a cumulative payback timeline, and a bear/base/bull levered cash-flow path chart when exit inputs are available. Growth shows bear/base/bull revenue paths plus EBITDA projections (EbitdaProjectionCard). Live-model validation remains.
- [-] Add sources-and-uses / deal-stack visualization with leverage and downside-resilience indicators. Deal Structure now separates Uses from Sources and shows debt funding, Debt/EBITDA, DSCR, and practical downside warnings; validate against saved live financing inputs.
- [ ] Add industry benchmarks only with a source, as-of date, comparability notes, and analyst review.
- [ ] Add an optional buyer profile and explainable acquisition-fit reasons; do not create opaque scores.

## Data quality and model assurance

- [-] Add extraction checks for swapped fields, wrong units, powers-of-ten errors, and implausible metric relationships. The Overview flags implausible margins, entry multiples, leverage, and rate-decimal errors. The per-document n8n reconciliation now also flags raw-to-normalized scale errors, materially conflicting duplicate facts, and implausible EBITDA margins; validate this on a live document before closing the item.
- [-] Add the remaining structured outputs where supported: reconstructed EBITDA, margin compression, customer concentration, add-back quality, and financial-data completeness. EBITDA reconstruction card is now built (shows revenue → opex → EBITDA breakdown with source badges and margin warnings). Remaining: customer concentration view, add-back quality scoring, and financial-data completeness indicator.
- [ ] Add a second independent quality-of-earnings check for recurring versus one-time findings, plus a project-level reconciliation review.
- [ ] Consider independent second-pass LLM review only after deterministic checks, with explicit comparison and review flags rather than silent overwrites.
- [ ] Obtain external test sets and create additional realistic mock diligence packages.

## UI polish and usability

- [x] Add a "no findings match" empty state when synthesis filters hide all groups, so users know their filter is active (not that data is missing).
- [x] Add keyboard shortcut (Escape) to close Evidence Drawer.
- [ ] Add a quick-filter chip bar on the Overview/Deal page for jumping to red-flag findings, open questions, or missing materials.
- [x] Code-split the dashboard page. React.lazy() now defers all non-overview tabs (16 components). Initial bundle dropped from 1,315KB to 555KB (58% reduction). Recharts is isolated in its own 394KB async chunk loaded only on chart tabs. Each card component is a separate chunk.

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
