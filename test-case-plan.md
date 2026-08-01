# Test Case Plan — Sample Deal Evaluation

How to measure whether the AI DD pipeline produces correct, useful outputs against the 5 sample deals.

## Overview

Each document gets run through the pipeline. Brad manually verifies what the correct answers should be (ground truth), then compares to what the AI returned. Every field gets a score.

## Step 1: Build Ground Truth

For each document, manually extract and record the correct values into a spreadsheet (or JSON file) keyed by `fileName`. Ground truth covers these categories:

### A. Document Classification (per document)
| Field | What to record |
|---|---|
| `document_type` | What type is this document? (P&L, Balance Sheet, CIM, LOI, Tax Return, etc.) |
| `document_types` | If the doc covers multiple types, list all of them |

### B. Financial Facts (per document)
For each financial metric that appears in the document, record:
| Field | Example |
|---|---|
| `metric` | revenue, ebitda_sde, gross_profit, net_income, debt, total_assets, etc. |
| `normalized_value` | The correct numeric value (e.g. 1510307) |
| `period` | TTM, FY2024, FY2023, etc. |
| `raw_value` | Exactly as written in the doc (e.g. "$1,510,307") |

Priority metrics to verify:
- Revenue (all periods present)
- EBITDA / SDE (all periods present)
- Gross profit
- Net income
- Total assets / liabilities (if balance sheet)
- Cash, debt

### C. Risk Assessment (per document)
| Field | What to record |
|---|---|
| `traffic_light` | What should it be? GREEN / YELLOW / RED |
| `risk_level` | NONE / LOW / MEDIUM / HIGH |
| `red_flags` | List specific red flags that SHOULD be flagged |
| `yellow_flags` | List specific yellow flags that SHOULD be flagged |
| `false_positive_flags` | Flags the AI raised that are NOT real issues |
| `missed_flags` | Real issues the AI failed to flag |

### D. Valuation (if document contains valuation data)
| Field | What to record |
|---|---|
| `valuation_lower_bound` | Correct lower bound (or "not present") |
| `valuation_base_estimate` | Correct base estimate |
| `valuation_upper_bound` | Correct upper bound |
| `asking_price` | If stated in document |

### E. Employee Evidence (if document mentions headcount)
| Field | What to record |
|---|---|
| `employee_count` | Correct number |
| `employee_type` | FTE, PTE, contractor, mixed |
| `employee_as_of_date` | As-of date if stated |

### F. Math Check Expectations (per document)
| Field | What to record |
|---|---|
| `gross_profit_check` | revenue - COGS = gross_profit? |
| `ebitda_margin_check` | EBITDA / revenue within expected range? |
| `equity_check` | total_assets - total_liabilities = equity? |
| `expected_math_check_status` | passed / warning / not_available |

## Step 2: Run Documents Through Pipeline

Prerequisites:
- Anthropic API credits must be active
- n8n execution limit must not be hit
- Rename `MergeWorks_Financial_Due_Diligence_Model` to add `.xlsx` extension

Run order (easiest to hardest):
1. **Business 5 (Medical Spa)** — 2 files, clean text PDF + .xlsm. Simplest test.
2. **Business 4 (ConversionXL)** — 5 files, clean PDFs + multi-sheet Excel. Good variety.
3. **Business 1 (Roofing Co)** — 5 files, includes scanned PDF (OCR test) and extensionless file.
4. **Business 3 (TurnKey)** — 3 files, includes 48-page PDF and 10-sheet Excel.
5. **Business 2 (Iron Tree)** — 4 files, includes 46-page CIM and massive Excel (19K rows, 16K columns).

For each document, save the full AI response JSON. You can pull this from:
- Supabase `documents` table → `extracted_json` column
- The document detail view in the dashboard (submission history card)

## Step 3: Score Each Document

### Scoring Rubric

#### Document Classification (10 pts per document)
- **10** — Correct primary type AND all secondary types detected
- **7** — Correct primary type, missed some secondary types
- **3** — Wrong primary type but reasonable guess (e.g. "Other" for a CIM)
- **0** — Completely wrong classification

#### Financial Facts Extraction (per metric, 10 pts each)
- **10** — Correct value, correct period, within 1% tolerance
- **8** — Correct value, wrong or missing period label
- **5** — Value within 5% but not exact (rounding, partial-year)
- **3** — Right metric identified but wrong value (>5% off)
- **0** — Metric present in doc but not extracted, OR hallucinated value

#### Risk Assessment (20 pts per document)
- **Red/yellow flags precision**: What % of AI-flagged items are real issues?
  - `precision = true_flags / (true_flags + false_positive_flags)`
- **Red/yellow flags recall**: What % of real issues did the AI catch?
  - `recall = true_flags / (true_flags + missed_flags)`
- **Traffic light accuracy**: Correct = 10 pts, one step off = 5 pts, two steps off = 0 pts
- **Risk level accuracy**: Same as traffic light

#### Valuation (15 pts per document, where applicable)
- **15** — All bounds within 15% of correct value
- **10** — Base estimate within 15%, bounds somewhat off
- **5** — Order of magnitude correct but bounds are wide or wrong
- **0** — Completely wrong or hallucinated when no valuation data exists

#### Employee Evidence (5 pts per document, where applicable)
- **5** — Correct count and type
- **3** — Correct count, wrong type or missing as-of date
- **0** — Missed or hallucinated

#### Math Checks (10 pts per document)
- **10** — All applicable reconciliations pass
- **5** — Some pass, some fail for legitimate reasons
- **0** — Math check returns wrong status

### Confidence Calibration (bonus scoring)
For every extracted value, check whether the AI's confidence score matches accuracy:
- High confidence (>85%) items should be correct >90% of the time
- Medium confidence (60-84%) items should be correct >70% of the time
- Low confidence (<60%) items: acceptable to be wrong, but the low score itself is the useful signal

Track: `calibration_error = |expected_accuracy - actual_accuracy|` per confidence bucket.

## Step 4: Record Results

Create a spreadsheet with one row per document:

| Column | Description |
|---|---|
| Business | Business 1-5 |
| File name | The uploaded file |
| File type | PDF, XLSX, XLSM, etc. |
| Doc classification score | /10 |
| Financial facts score | /10 per metric, averaged |
| Financial facts detail | Which metrics correct, which wrong |
| Risk assessment score | /20 |
| Flag precision | % |
| Flag recall | % |
| Valuation score | /15 or N/A |
| Employee score | /5 or N/A |
| Math check score | /10 |
| Total score | Sum |
| Max possible score | Sum of applicable categories |
| Percentage | Total / max |
| Confidence calibration error | Per bucket |
| Notes | Anything unexpected |

## Step 5: Aggregate and Decide

### Pass/Fail Thresholds
- **Ship-ready**: Average score >= 80% across all documents
- **Needs tuning**: Average 60-79% — workflow prompt adjustments needed
- **Major rework**: Average < 60% — structural pipeline changes needed

### Per-Category Analysis
If a specific category consistently scores low (e.g. financial facts extraction from Excel files), that pinpoints where to focus improvements — prompt engineering, parsing changes, or new validation nodes.

### What to Fix First
Priority order for improvements:
1. False positives in risk flags (erodes analyst trust fastest)
2. Missing financial facts (core value of the tool)
3. Wrong values (dangerous — analyst might use them)
4. Classification errors (low impact if everything else is right)
5. Confidence miscalibration (important but secondary)

## Test Matrix — All Documents

| # | Business | File | Type | Key Test |
|---|---|---|---|---|
| 1 | Roofing Co | Balance Sheet Jan 2023 to Dec 2024.pdf | PDF | 16-page multi-month QuickBooks BS |
| 2 | Roofing Co | Two years PL ended Dec 31 2024.pdf | PDF | 21-page monthly P&L, 50+ expense lines |
| 3 | Roofing Co | Werkheiser P&L 2025.pdf | PDF | Scanned/image PDF — OCR test |
| 4 | Roofing Co | Werkheiser_LOI_MergeWorks.docx | DOCX | LOI with 6 tables, $4.875M enterprise value |
| 5 | Roofing Co | MergeWorks_Financial_Due_Diligence_Model.xlsx | XLSX | 13-sheet DD model (needs rename to add extension) |
| 6 | Iron Tree | Iron_Tree_Data_-_Teaser.pdf | PDF | 1-page teaser, minimal financial data |
| 7 | Iron Tree | Iron_Tree_Data_-_CIM.pdf | PDF | 46-page CIM with image-only charts |
| 8 | Iron Tree | Adjusted_Financials_-_Iron-Tree_(2026.02)_final.xlsx | XLSX | 7 sheets, 19,920-row GL, 16,302-column P&L |
| 9 | Iron Tree | Financial Modeling for Iron Tree.xltx | XLTX | Template format, 7 sheets, #VALUE! errors |
| 10 | TurnKey | 1) TurnKey Product Management Business Summary.pdf | PDF | 48-page broker document |
| 11 | TurnKey | 2) TurnKey Product Management P&L [Google Sheet].xlsx | XLSX | 10 sheets, 49-column monthly P&L |
| 12 | ConversionXL | WC- Conversion XL OM.pdf | PDF | 24-page OM, spacing artifacts |
| 13 | ConversionXL | DD Memo.pdf | PDF | 3-page DD memo, Conditional Go |
| 14 | ConversionXL | ConversionXL LLC_Profit and Loss by Month v2.xlsx | XLSX | 7 sheets, 48-column TTM, #DIV/0! errors |
| 15 | ConversionXL | CXL_Screen.xlsx | XLSX | 1-sheet screening matrix |
| 16 | Medical Spa | _RENEW HEALTH CENTER - FULL YEAR COMPARATIVE P&L.pdf | PDF | 2-page QuickBooks P&L, $960K revenue |
| 17 | Medical Spa | Financial Modelling Renew Health.xlsm | XLSM | 13-sheet macro-enabled, balance sheet tab empty |

Skipped (unsupported format): TurnKey `.numbers` file, ConversionXL `.numbers` file.

## Ground Truth Template

For each document, create a JSON file like:

```json
{
  "fileName": "Two years PL ended Dec 31 2024.pdf",
  "business": "Business 1 - Roofing Co PA",
  "groundTruth": {
    "documentType": "Profit and Loss Statement",
    "documentTypes": ["Profit and Loss Statement"],
    "trafficLight": "YELLOW",
    "riskLevel": "MEDIUM",
    "financialFacts": [
      {
        "metric": "revenue",
        "normalizedValue": 2847563,
        "period": "FY2024",
        "rawValue": "$2,847,563"
      },
      {
        "metric": "revenue",
        "normalizedValue": 2650000,
        "period": "FY2023",
        "rawValue": "$2,650,000"
      },
      {
        "metric": "net_income",
        "normalizedValue": 185000,
        "period": "FY2024",
        "rawValue": "$185,000"
      }
    ],
    "expectedRedFlags": [
      "High owner dependency / key man risk"
    ],
    "expectedYellowFlags": [
      "Seasonal revenue pattern",
      "Limited margin detail"
    ],
    "falsePositiveFlags": [],
    "valuation": null,
    "employeeEvidence": null,
    "expectedMathCheckStatus": "passed"
  }
}
```

Brad fills these out by reading each document manually before running the pipeline. The values above are examples — replace with actual correct values from the documents.
