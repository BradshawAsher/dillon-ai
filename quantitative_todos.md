# Quantitative Modeling Roadmap

## Product rule

The LLM may extract evidence and explain results. It must not be the calculator. Every displayed calculation must be reproducible from saved inputs, formulas, and citations.

Each input and output needs a provenance label:

- **Documented** — directly supported by a cited document.
- **User assumption** — entered or confirmed by the user.
- **Scenario assumption** — used only for bear/base/bull modeling.
- **Unverified** — extracted but not safe to use in a calculation yet.

## Current state

- Per-document analysis extracts EBITDA and a broad valuation range, but no independent calculation/reconciliation engine exists.
- Asking price is browser-local, not a persisted project input.
- Returns, Growth, and Deal Structure are placeholder views because no canonical persisted deal model exists.
- Employee/headcount extraction is implemented per document with source/date/status/confidence fields; only evidence-backed values display in the overview.

## Phase 1 — Verified financial facts and math checks

### 1.1 Extracted facts

Add structured fields with raw source value, normalized number, period, currency, confidence, and citation for:

- Revenue, COGS, gross profit, EBITDA/SDE, net income.
- Cash, debt, total assets, total liabilities, equity, working capital.
- Employee count, employee type (`headcount`, `FTE`, `contractors`, `unknown`), and as-of date.

### 1.2 Deterministic calculation/reconciliation workflow

Create a dedicated n8n subworkflow that receives verified facts and calculates:

- Gross profit check: `revenue - COGS`.
- EBITDA margin: `EBITDA / revenue`.
- Net assets: `assets - liabilities`.
- Debt-to-assets: `debt / assets`.
- Revenue per employee: `revenue / employee_count`.
- Balance-sheet check: `assets ≈ liabilities + equity`.

It must parse formats such as `$1.2m`, `1,200,000`, and `(400,000)`, use an explicit tolerance, and emit a reconciliation warning when source facts do not agree.

### 1.3 UI

- Business Snapshot: show confirmed employee count.
- Overview/Diligence: show verified metrics, formula tooltip, provenance badge, and source citation.
- Do not show a ratio when a denominator is missing, zero, unverified, or from a mismatched period.

## Phase 2 — Persisted Deal Model

Create a project-level Deal Model record containing:

### Documented / confirmed transaction inputs

- Asking price / purchase price, debt assumed, cash acquired, working-capital requirement, transaction fees.
- Revenue, EBITDA/SDE, assets, liabilities, debt, cash, and employee count.

### Editable assumptions

- Hold period, tax rate, closing costs, annual maintenance capex, working-capital funding.
- Exit multiple and exit-cost assumption.

## Phase 3 — Two parallel return models

### 3.1 All-cash baseline

Use purchase price plus closing/working-capital needs as initial investment. Calculate:

- Annual operating cash flow.
- Simple annual ROI.
- Cumulative five- and ten-year cash flow.
- Payback period: first year cumulative cash flow reaches initial investment.
- MOIC / cash-flow multiple.
- IRR when a hold period and exit value are provided.

### 3.2 Financed acquisition scenario

Use the same operating cash flow, with editable:

- Equity contribution / down-payment percentage.
- Debt amount.
- Interest rate.
- Amortization term.
- Seller note / other financing, if used later.

Calculate:

- Annual debt service.
- Cash flow after debt service.
- Cash-on-cash return.
- Levered payback period, MOIC, and IRR.
- Debt-service coverage / downside warning where data supports it.

**Initial UI defaults:** all-cash selected first; financed scenario available beside it with clearly labeled editable starting assumptions. Defaults are never presented as document facts.

## Phase 4 — Bear / Base / Bull scenarios

Apply transparent scenario assumptions to both all-cash and financed models:

| Scenario | Revenue growth | EBITDA margin | Exit multiple | Purpose |
| --- | --- | --- | --- | --- |
| Bear | Conservative | Compressed | Lower | Downside resilience |
| Base | Documented/confirmed plan | Current or modestly improved | Base | Underwriting case |
| Bull | Evidence-backed upside only | Improved | Higher | Upside case |

Show the exact inputs, five-year cash-flow path, payback, IRR, and MOIC for each case. Do not invent scenario probabilities; let the user set them if probability-weighted value is needed.

## Phase 5 — Evidence-backed valuation and sensitivity

- Asset-based, revenue-multiple, EBITDA/SDE-multiple, and blended valuation methods.
- Asking-price premium/discount against low/base/high supported value.
- Valuation bridge for unsupported add-backs, customer concentration, debt, working capital, and asset-quality findings.
- Compact sensitivity grid for revenue, EBITDA margin, and multiple assumptions.

## Build order

1. [Complete] Add employee/fact extraction fields and the financial-facts contract. The production workflow now requires cited, normalized financial facts and employee evidence.
2. [Complete] Add deterministic reconciliation and ratios workflow. It calculates only from confirmed, period/currency-matched facts and saves an auditable result per document.
3. [Complete] Persist asking price and Deal Model assumptions. Asking price, purchase price, debt/cash, working capital, fees, hold period, tax rate, capex, exit multiple, and exit costs now save per project. The project synthesis runs a deterministic Documented Facts Bridge that consolidates only confirmed, period/currency-consistent document facts with citations and flags conflicts; the Deal Model UI displays those facts separately from assumptions with provenance labels.
4. [Complete] Replace Returns placeholder with all-cash + financed calculator. All-cash and financed baseline calculations now use persisted Deal Model inputs; financing assumptions include equity contribution, interest rate, amortization, and seller note. IRR and exit-value modeling remain for the scenario phase.
5. [In progress] Add bear/base/bull returns and scenario comparison. Persisted scenario inputs for revenue growth, EBITDA margin, and exit multiple are now available; scenario projection and comparison UI remain.
6. Add valuation-method comparison and sensitivity.

## Acceptance criteria for every calculation

- Formula, inputs, period, currency, and provenance are visible.
- Missing inputs produce `Not available`, never a fabricated zero.
- The LLM result and deterministic result are compared when both exist.
- A material mismatch creates a review flag with citations.
