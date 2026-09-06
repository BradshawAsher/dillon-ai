# Deterministic Math Checks

## Where to find the ledger

In the application workspace, open:

**Diligence → Financial data quality & Math Reconciliation → Master Deterministic Math & Reconciliation Ledger**

The direct UI anchor is `#diligence-master-math-checks`. The ledger has filters for P&L Integrity, Balance Sheet, Cross-Doc Ties, and Underwriting Math.

## What “deterministic” means

The formulas and comparisons run in ordinary code and consume no LLM tokens. The source values are still extracted from documents by an LLM or parser, so deterministic arithmetic does not make an extracted value automatically correct. Open the evidence drawer and review the source citation before relying on a result.

The UI uses three result classes:

- **Verified tie:** An arithmetic identity has a separately stated comparator, or the same metric and period appears in two independent uploaded documents, and the values agree within tolerance.
- **Mismatch:** One of those comparable values exceeds tolerance.
- **Calculated only:** The formula produced a useful ratio or underwriting output but had no independent value to verify against. Market ranges never turn a calculation into a verified tie.

The ledger does not report “100% concordance” merely because it found no conflicts. When no comparable facts exist, the Cross-Doc Ties filter is empty.

## Per-document workflow

The live n8n workflow is **[Pod 1] - Financial DD Agent - Robust Per Document AI Analysis** (`W5Jp7CJIQbNy0qlY`). Its output parser and BYOK routes share this fact contract:

```json
{
  "metric": "revenue",
  "raw_value": "$1,250,000",
  "normalized_value": 1250000,
  "period": "FY2025",
  "currency": "USD",
  "confidence": 0.96,
  "status": "confirmed",
  "citation": {
    "source_file": "2025 P&L.xlsx",
    "row_or_cell": "B12",
    "excerpt": "Total revenue $1,250,000"
  }
}
```

Only confirmed facts with finite normalized values enter reconciliation. Identity comparisons also require matching, non-empty periods and currencies.

## Supported checks and calculations

### Identities that can pass or fail

| Stored key | Identity | Requirements |
|---|---|---|
| `gross_profit_check` | Revenue − COGS = stated Gross Profit | Revenue, COGS, and stated Gross Profit for the same period/currency |
| `operating_income_check` | Gross Profit − Operating Expenses = stated Operating Income | All three facts for the same period/currency |
| `balance_sheet_check` | Total Assets = Total Liabilities + stated Equity | All three facts for the same period/currency |
| `working_capital_check` | Current Assets − Current Liabilities = stated Working Capital | All three facts for the same period/currency |

These checks use a tolerance of `max($1, 2% × absolute computed value)`.

### Deterministic calculations

These are useful outputs but do not receive a pass/fail status without an independent comparator:

- Gross margin = Gross Profit ÷ Revenue
- EBITDA/SDE margin = EBITDA/SDE ÷ Revenue
- Net assets = Total Assets − Total Liabilities
- Revenue per employee = Revenue ÷ confirmed employee count for the same year
- Debt to assets = Debt ÷ Total Assets
- Debt to EBITDA = Debt ÷ EBITDA/SDE
- DSCR = explicit Free Cash Flow ÷ explicit Annual Debt Service
- Entry multiple = Purchase or Asking Price ÷ EBITDA/SDE
- Unlevered payback = (Price + Fees + Working Capital) ÷ (EBITDA × (1 − Tax Rate) − Maintenance Capex)
- Illustrative senior DSCR = unlevered annual cash flow ÷ amortizing senior debt service, using the saved rate and term
- Working-capital funding gap = deal-model requirement − documented working capital

The last four use saved deal-model inputs in the browser. Any fallback assumptions are disclosed in the check notes.

## Cross-document ties

The browser canonicalizes metric and period labels, then compares facts only across different documents. Examples include revenue in a tax return versus revenue in a P&L, provided both extractions use the same period. The comparison uses a 2% relative tolerance and shows both filenames and values.

It does not treat an AI-written synthesis conflict as a deterministic mismatch, and it does not infer tax-line or depreciation ties unless those numeric facts were actually extracted.

## Scale and quality warnings

The workflow also records warnings for:

- A raw value and normalized value differing by 100× or more.
- Same-metric facts within one document differing by 100× or more for the same period/currency.
- Missing period or currency alignment between facts needed by a formula.
- EBITDA margin above 100% or below −50%. This is a sanity warning, not an identity check.

## Code locations

- Live workflow updater and contract: `scripts/update-n8n-math-contract.cjs`
- Unified ledger builder: `frontend/utils/unifiedMathChecks.ts`
- Numeric cross-document comparison: `frontend/utils/crossDocumentConflicts.ts`
- Ledger UI: `frontend/components/UnifiedMathChecksCard.tsx`
- Workspace placement: `frontend/components/views/DiligenceWorkspaceView.tsx`

Existing document rows are not retroactively re-extracted by this change. New or deliberately reprocessed documents receive the repaired fact contract and reconciliation v3 output.
