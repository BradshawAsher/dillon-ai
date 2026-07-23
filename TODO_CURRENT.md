# MergeWorks Active TODO

`TODO.md` is preserved as the original brainstorming list. This is the clean, active version; completed work from the current build session is intentionally omitted.

# Brad's Bad Grammar TODOLIST

FOR BRAD - Continue looking through the current website and play around with it and what else needs to be added

URGENT THE CSV EDGE CASE IS WAY TOO STRICT AND DOESNT LET DOCS GO THROUGH FIX n8n and UI

Look through the live n8n page and test what happens when you put docs through

can we also have a button for the live n8n page to see example 

can we make citations clickable and open up interactive viewer

Also for the returns section can we make up some model assumptions (somewhat industry accepted) if that will allow the user to get a first glance of ressults, as well as growth, deal structure, (lmk if you need anything else from me for this)

## Now — validate what is already built

- [ ] Run the six quantitative-model test cases on a real processed project: documented facts, math checks, saved Deal Model inputs, all-cash returns, financed returns, and bear/base/bull scenarios.
- [ ] Add repeatable regression fixtures/mock projects for the quantitative cases, including missing inputs, mismatched periods, and negative/downside outcomes.
- [ ] Verify saved Deal Model values persist correctly after refresh, project switching, and another user/session.
- [ ] Check completion notifications end-to-end in a browser: first production queue should request permission; batch and synthesis completion should show a desktop notification when permission is granted.

## Highest product priority — finish the evidence workflow

- [ ] Extend the new evidence drawer to Valuation, Returns, Growth, and Deal Structure metrics.
- [ ] Build an interactive document viewer: open the cited uploaded file and highlight the cited page, cell, row, or excerpt when available.
- [ ] Normalize source-file names and citations so a synthesis citation reliably matches one uploaded document and its stored URL.
- [ ] Return/store granular citation metadata for every document and project-level fact: source file, page/cell, excerpt, period, currency, confidence, and status.
- [ ] Add explicit `confirmed`, `estimated`, and `contradicted` labels consistently across facts, findings, and calculations.
- [ ] Add project-level finding filters for workstream, severity, and status, plus a material-impact view linking each finding to valuation, cash flow, closing conditions, or negotiation actions.

## Project and document experience

- [ ] Finish document deletion/exclusion: allow an accidental or duplicate upload to be marked not considered (or removed safely) and ensure synthesis respects it.
- [ ] Make each project document selectable from a project list and show its analysis, status, detected type(s), and citations.
- [ ] Support multiple detected document types per file and update the coverage checklist from detected types rather than only the intake selection.
- [ ] Test mixed/multi-sheet spreadsheet uploads and documents that represent more than one financial statement type.
- [ ] Improve synthesis formatting: four key acquisition takeaways, four document-level investment-thesis takeaways, digestible negotiation levers, and readable open questions.
- [ ] Make long text fields consistently expandable/scrollable.
- [ ] Add a management-question tracker with owner, priority, status, response, and resulting thesis impact.

## Quantitative modeling — next enhancements

- [ ] Add financed bear/base/bull scenarios, including levered cash-flow paths, debt amortization, MOIC, and IRR by scenario.
- [ ] Build a quantified valuation bridge: evidence-linked adjustments for unsupported add-backs, customer concentration, working-capital gaps, debt, and asset quality, with a negotiation translation for each adjustment.
- [ ] Add ROI timeline and revenue/EBITDA projection charts from the deterministic model; never show a chart when required inputs are missing.
- [ ] Add sources-and-uses / deal-stack visualization with leverage and downside-resilience indicators.
- [ ] Add industry benchmarks only with a source, as-of date, comparability notes, and analyst review.
- [ ] Add an optional buyer profile and explainable acquisition-fit reasons; do not create opaque scores.

## Data quality and model assurance

- [ ] Add extraction checks for swapped fields, wrong units, powers-of-ten errors, and implausible metric relationships.
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


