# Deterministic Math Checks — How They Work

## What are they?

Deterministic math checks are **pure arithmetic verifications** that run without any AI/LLM involvement. When the per-document analysis extracts financial numbers from an uploaded document, the system runs a set of arithmetic formulas to verify the numbers are internally consistent.

These are not AI opinions — they're facts. If Revenue minus COGS does not equal the stated Gross Profit, that's a verifiable error (or a sign something was misread).

## Where do they run?

In the n8n per-document analysis workflow (`[Pod 1] - Financial DD Agent - MCP Test - Robust Per Document AI Analysis`, ID: `W5Jp7CJIQbNy0qlY`):

1. The LLM extracts raw financial numbers from the document (revenue, COGS, gross profit, EBITDA, total assets, total liabilities, equity, etc.)
2. After extraction, a **deterministic reconciliation step** runs the formulas below
3. Results are stored in the document row's `reconciliationJson` field

## What formulas are checked?

| Check | Formula | What it catches |
|-------|---------|-----------------|
| Gross Profit | Revenue − COGS = Gross Profit | Misread revenue, missing COGS, or wrong GP figure |
| EBITDA | Revenue − Operating Expenses ≈ EBITDA | Significant unexplained gap between revenue and EBITDA |
| Equity | Total Assets − Total Liabilities = Equity | Balance sheet that doesn't balance |
| Margin consistency | EBITDA / Revenue = implied margin | Margin that's implausibly high (>80%) or negative |
| Scale sanity | Numbers in same power-of-ten | Catches $500K read as $500M or vice versa |

## Tolerance

Each check uses a **2% tolerance** by default. This accounts for:
- Rounding in source documents
- Minor items omitted from one line but included in another
- Period-boundary differences (e.g., accrual vs. cash)

## Data format (the `reconciliationJson` field)

Each completed document stores a JSON object like:

```json
{
  "status": "passed",       // "passed" | "warning" | "partial"
  "warnings": [],           // string[] of plain-English issues
  "metrics": {
    "gross_profit": {
      "value": 450000,       // Computed value from formula
      "actual": 448000,      // Value stated in the document
      "withinTolerance": true,
      "formula": "Revenue - COGS"
    },
    "ebitda_check": {
      "value": 180000,
      "actual": 162000,
      "withinTolerance": false,
      "formula": "Revenue - OpEx"
    }
  }
}
```

## How they show in the frontend

The `MathChecksSection` component (used on Overview, Synthesis, Valuation, Returns, Growth, and Latest Doc Submission) renders these checks in two modes:

### Compact mode (Overview, Valuation, Returns, Growth tabs)
- Grid of small cards showing each metric
- Green checkmark / red X / yellow triangle for status
- The **computed value** (from the formula)
- The **formula** text shown directly below the number
- If verification **failed**: shows the actual value from the document + percentage deviation
- Click any card → opens Evidence Drawer with full detail

### Full mode (Synthesis tab)
- Grouped by source document
- Larger cards with all the same detail
- Pass/warning badge per document
- Warnings listed below

## Why this matters for deal analysis

1. **Catches extraction errors**: If the AI misread "$1.2M" as "$12M", the cross-check will flag it
2. **Identifies document inconsistencies**: A P&L where Revenue − Expenses ≠ stated EBITDA may indicate undisclosed items
3. **Builds confidence**: When all checks pass, you know the numbers are internally consistent
4. **No AI hallucination risk**: These are pure math — Revenue minus COGS either equals GP or it doesn't

## What they DON'T do

- They don't verify numbers against external sources
- They don't assess whether the numbers are "reasonable" for the industry (that's what the AI synthesis does)
- They don't catch fraud where all numbers are internally consistent but fabricated
- They only run when 2+ related numbers are extracted from the same document
