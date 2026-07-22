# MergeWorks x Epic Deal Done - Product Direction

## Product position

MergeWorks should borrow Epic Deal Done's clarity and decision-oriented visual design, but not reproduce its product. Epic Deal Done is primarily a manual-input acquisition screen and return-modeling tool. MergeWorks should remain a document-first, post-LOI due-diligence workspace that turns uploaded evidence into a defensible negotiation position.

**Core promise:** upload the diligence package, understand what is true, what conflicts, what is missing, and how the evidence should change price or deal terms.

## Current implementation status

The detailed implementation tracker lives in [epicdealdone-todos.md](epicdealdone-todos.md). In short:

| Area | Status | Current reality |
| --- | --- | --- |
| Workspace navigation | Done | Separate Overview, Diligence, Valuation, Documents, Returns, Growth, and Deal Structure views with sticky navigation. |
| Overview | Mostly done | Recommendation, risk, synthesis summary, valuation range, asking-price comparison, risks, levers, and questions are visible. Asking price is browser-local only. |
| Diligence | Mostly done | Portfolio, document analysis, coverage, synthesis, conflicts, levers, and citations are present; project-level filtering and evidence drawer are still missing. |
| Valuation | Partial | Shows the returned range and price comparison. Methods, probabilities, quantified bridge, and sensitivity are missing. |
| Returns / Growth / Deal Structure | Partial | Dedicated views exist but intentionally wait for a persisted deal model before calculating. |
| Data model and workflow | Missing | A canonical persisted deal model and richer n8n synthesis contract are required for financial modeling. |

## What MergeWorks already does better

- Batch document upload instead of requiring users to manually enter every financial input.
- Project-level reconciliation across financial statements, bank statements, add-back schedules, customer data, and other diligence materials.
- Evidence-backed findings: source citations, conflicts, red/yellow/green flags, missing-document coverage, and management questions.
- Post-LOI workflow with negotiation levers and a final acquisition judgment rather than an initial-screening-only score.
- An auditable workflow: document processing status, review state, document exclusion, and downloadable synthesis reports.

## Design principles to adopt

1. **Lead with the decision.** Put the recommendation, price implication, and the top three reasons above detailed analysis.
2. **Progressive disclosure.** Start with a clean executive overview; let users open the evidence, calculations, and source documents when needed.
3. **Make each metric explainable.** Hover or click to show the formula, source documents, date period, and assumptions.
4. **Separate facts from assumptions.** Label extracted values, analyst-entered values, AI estimates, and scenario assumptions distinctly.
5. **Keep the product evidence-first.** A chart is useful only when it links back to the evidence and the recommended action.
6. **Avoid score theater.** Scores should always show their drivers, confidence, benchmark, and the evidence that changed them.

## Proposed deal workspace

After a project has enough processed documents, give it a deal-level navigation bar:

`Overview | Diligence | Valuation | Returns | Growth | Deal Structure | Documents`

### Overview - build first

This is the executive decision page. It should use existing synthesis data and require little new modeling.

- **Decision banner:** Proceed / Proceed with revised terms / Pause / Decline, risk level, confidence, and last updated time.
- **Executive assessment:** a short evidence-backed paragraph answering "Should we buy this business at this price?"
- **Price position:** asking price versus low/base/high supported valuation; show the implied premium or discount.
- **Top three decision drivers:** the most material risks, strengths, and unresolved questions.
- **Negotiation plan:** recommended price adjustment, escrow/holdback, diligence condition, or management follow-up.
- **Business snapshot:** company, industry, location, headcount, revenue, EBITDA/SDE, period covered, and document completeness.
- **Key metrics:** enterprise value, EBITDA margin, revenue per employee, debt-to-assets, working capital, customer concentration, and asset coverage - only when evidence supports them.
- **Good fit / caution reasons:** ordered by severity and explicitly tied to the buyer profile when one exists.

### Diligence - evolve the existing workspace

Keep the current Project Portfolio, document analysis, coverage checklist, conflicts, missing materials, citations, and management questions here.

Add:

- A severity-and-workstream filter for findings: financial quality, revenue quality, working capital, tax, legal, people, operations, and commercial.
- A "material impact" view that connects each finding to valuation, cash flow, risk, closing condition, or negotiation action.
- An evidence drawer: source file, page/cell, excerpt, extracted value, and analyst decision.
- A clear distinction between **confirmed**, **unconfirmed**, and **contradicted** facts.
- A management-question tracker with owner, priority, status, response, and resulting change to the deal thesis.

### Valuation - build second

Epic Deal Done's valuation visuals are useful, but MergeWorks should ground them in documented numbers and show the assumptions visibly.

- **Methods comparison:** asset-based value, revenue multiple, EBITDA/SDE multiple, and blended value.
- **Price gap:** asking price vs. supported valuation range, with a plain-English explanation of the gap.
- **Risk-adjusted cases:** bear / base / bull values, probabilities, assumptions, and confidence.
- **Valuation bridge:** show how unsupported revenue, add-backs, customer concentration, working-capital gaps, debt, or asset quality changes value.
- **Benchmarking:** industry multiple, percentile, source/date, and comparability notes. Never present an "industry average" without its data source and sample caveat.
- **Scenario sensitivity:** compact table or heatmap for revenue, margin, and multiple changes. Avoid long horizontal bar UIs.
- **Negotiation translation:** turn each valuation adjustment into a recommended price reduction, earn-out, seller note, escrow, or diligence condition.

### Returns - build after a deal-model input layer exists

Add the useful Epic Deal Done concepts, but make every user-entered assumption clear and editable.

- Financing scenarios: all cash, conventional debt, SBA where appropriate, seller financing, and custom structure.
- Inputs: purchase price, equity/down payment, interest rate, amortization, fees, working-capital needs, and taxes.
- Outputs: annual debt service, cash flow after debt, cash-on-cash return, payback period, IRR, MOIC/cash-flow multiple, and five-/ten-year cash flow.
- A return timeline with break-even point and a warning when returns remain negative or depend heavily on terminal value.
- A source/assumption badge on every result: **documented**, **user assumption**, or **scenario assumption**.

### Growth - build only when assumptions are credible

- Conservative / base / aggressive scenarios.
- Revenue growth and margin-improvement controls, with an explanation of what operational changes would be needed to achieve them.
- Revenue and EBITDA projections, business-value evolution, and a five-year revenue bridge.
- A "proof required" panel: which customer, capacity, pricing, or retention evidence must be verified before relying on the upside case.

### Deal Structure - adapt the Deal Stack Builder

Use a simple visual stack for purchase price sources and uses:

- Sources: buyer equity, senior debt, SBA debt, seller note, earn-out, rollover equity, and other capital.
- Uses: purchase price, fees, working capital, debt payoff, and closing reserves.
- Show the effects on leverage, annual debt service, covenants, cash-on-cash return, and downside resilience.
- Offer "Create a draft with AI," but always show the proposed assumptions and require the user to confirm them.

### Documents

Keep uploaded files accessible from the deal navigation and surface:

- Type, period, source, processing status, and included/excluded status.
- Coverage checklist and missing-document requests.
- Duplicate detection and version history.
- Links back from every chart, finding, and calculated metric to its supporting documents.

## Inputs and buyer profile

MergeWorks should minimize manual entry. The initial project setup should request only what cannot reasonably be extracted:

- Deal name, target/company context, asking price if known, and stage.
- Buyer profile (optional but needed for acquisition-fit analysis): target industries/geographies, check size, financing preferences, operating capacity, risk appetite, and strategic goals.
- Explicit confirmation of extracted financial figures before using them in returns or valuation calculations.

## Data and calculation requirements

Before building Returns, Growth, or Deal Structure, define one canonical deal model. It should retain each field's value, currency, period, source, confidence, and whether it is extracted or assumed.

Minimum objects:

- `deal`: company, industry, location, asking price, stage, buyer profile.
- `financials`: revenue, EBITDA/SDE, assets, liabilities, debt, working capital, historical period, source references.
- `valuation`: methods, multiples, assumptions, cases, range, and price-adjustment bridge.
- `financing`: sources/uses, rates, amortization, fees, and scenario assumptions.
- `findings`: severity, workstream, evidence, status, impact, and negotiation action.

Do not silently fill unknown values with industry benchmarks. Mark them as missing and request confirmation, or show a clearly labeled scenario.

## Prioritized roadmap

### Phase 1 - Decision-first overview

1. Add a deal header and tabs for a selected project.
2. Build the Overview page from existing synthesis output.
3. Add asking price, valuation gap, top drivers, and negotiation-plan cards.
4. Add evidence links/tooltips to all displayed metrics.

### Phase 2 - Evidence-backed valuation

1. Define the canonical deal-model schema and update the synthesis contract.
2. Add method comparison, bear/base/bull cases, valuation bridge, and compact sensitivity view.
3. Connect valuation deltas directly to negotiation levers and source documents.

### Phase 3 - Returns and deal structure

1. Add a transparent financing and sources/uses model.
2. Add cash flow, debt service, IRR, MOIC, and payback calculations.
3. Add scenario saving, comparison, and an assumption audit trail.

### Phase 4 - Growth and buyer fit

1. Add growth scenarios only after enough historical and commercial evidence exists.
2. Add an optional buyer-profile workflow and acquisition-fit reasons.
3. Add management-question tracking and outcome-driven thesis updates.

## Guardrails

- Do not copy Epic Deal Done's exact UI, wording, imagery, or proprietary calculations.
- Avoid presenting AI estimates as facts; cite source evidence and label uncertainty.
- Keep the top-level view sparse: decision, price, three drivers, next step. Put dense metrics behind tabs or expandable sections.
- Make calculations reproducible and downloadable, including the assumptions used.
- Preserve the current document workflow as the foundation; all deal analytics should enrich it rather than replace it.
