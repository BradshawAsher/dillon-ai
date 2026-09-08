# Test Case Plan — Sample Deal Evaluation

How to measure whether the AI DD pipeline produces correct, useful outputs against the 5 sample deals.

## Progress Summary

- [x] **Step 1: Build Ground Truth** — 17/17 Ground Truth JSON files created in `test_sets/ground_truth/` covering all 5 sample deals.
- [ ] **Step 2: Run Documents Through Pipeline** — Blocked pending Pod Anthropic API credit refill.
  - [x] Business 5 (Medical Spa) — 2/2 files executed & evaluated.
  - [ ] Business 4 (ConversionXL) — 0/4 files completed (stalled on API credit balance).
  - [ ] Business 1 (Roofing Co) — 2/5 files completed.
  - [ ] Business 3 (TurnKey) — 0/2 files completed.
  - [ ] Business 2 (Iron Tree) — 0/4 files completed.
- [x] **Step 3: Score Each Document** — Automated scoring harness implemented in `scripts/run-evals.ts` (`npm run eval`) and integrated into the **Evals & Harness** tab.
- [x] **Step 4: Record Results** — Auto-saves evaluation reports to `test_sets/eval_reports/latest_eval_report.json`.
- [ ] **Step 5: Aggregate and Decide** — Pending full execution run of all 17 documents.

---

## Step 1: Build Ground Truth — [COMPLETED]

- [x] Create Ground Truth JSONs in `test_sets/ground_truth/` for all 17 test documents across all 5 sample deals.
  - [x] `A. Document Classification` (P&L, Balance Sheet, CIM, LOI, etc.)
  - [x] `B. Financial Facts` (Revenue, EBITDA/SDE, Gross Profit, Net Income, Assets, Debt)
  - [x] `C. Risk Assessment` (Traffic light, Risk level, Red/Yellow flags)
  - [x] `D. Valuation` (Lower bound, Base estimate, Upper bound, Asking price)
  - [x] `E. Employee Evidence` (Headcount, Type, As-of date)
  - [x] `F. Math Check Expectations` (Passed, Warning, Reconciliations)

---

## Step 2: Run Documents Through Pipeline — [IN PROGRESS / BLOCKED ON API CREDITS]

Prerequisites:
- [ ] **Anthropic API credits refilled** (Currently exhausted: `"Your credit balance is too low"`)
- [x] n8n execution error handling & 20s stall detection implemented
- [x] File extension auto-correction (e.g. `MergeWorks_Financial_Due_Diligence_Model.xlsx`)

Execution Queue:
1. [x] **Business 5 (Medical Spa)** — 2 files executed & evaluated (`business5_medical-spa_actual_run.json`).
2. [ ] **Business 4 (ConversionXL)** — 4 files queued for execution upon credit top-up.
3. [ ] **Business 1 (Roofing Co)** — 5 files queued.
4. [ ] **Business 3 (TurnKey)** — 2 files queued.
5. [ ] **Business 2 (Iron Tree)** — 4 files queued.

---

## Step 3: Score Each Document — [COMPLETED]

- [x] Automated rubric in `scripts/run-evals.ts`:
  - [x] Document Classification (10 pts per document)
  - [x] Financial Facts Extraction (10 pts per metric)
  - [x] Risk Assessment & Flags (20 pts per document)
  - [x] Valuation Accuracy (15 pts per document)
  - [x] Employee Evidence (5 pts per document)
  - [x] Math Checks (10 pts per document)
- [x] Dashboard Integration: Viewable in **Evals & Harness** tab.

---

## Step 4: Record & Output Results — [COMPLETED]

- [x] Save JSON reports to `test_sets/eval_reports/latest_eval_report.json`.
- [x] Console summary table on `npm run eval`.

---

## Step 5: Aggregate and Decide — [PENDING PIPELINE RUNS]

- [ ] **Ship-ready Threshold Check**: Average score >= 80% across all 17 documents.
- [ ] **Needs tuning Check**: Average 60–79%.
- [ ] **Major rework Check**: Average < 60%.

---

## Test Matrix — All Documents (26 Total Specifications)

### A. Core Sample Deals (17 Documents)

| # | Business | File | Type | Status |
|---|---|---|---|---|
| 1 | Roofing Co | `Balance Sheet Jan 2023 to Dec 2024.pdf` | PDF | [x] Ground Truth Ready |
| 2 | Roofing Co | `Two years PL ended Dec 31 2024.pdf` | PDF | [x] Ground Truth Ready |
| 3 | Roofing Co | `Werkheiser P&L 2025.pdf` | PDF (OCR) | [x] Ground Truth Ready |
| 4 | Roofing Co | `Werkheiser_LOI_MergeWorks.docx` | DOCX | [x] Ground Truth Ready |
| 5 | Roofing Co | `MergeWorks_Financial_Due_Diligence_Model.xlsx` | XLSX | [x] Ground Truth Ready |
| 6 | Iron Tree | `Iron_Tree_Data_-_Teaser.pdf` | PDF | [x] Ground Truth Ready |
| 7 | Iron Tree | `Iron_Tree_Data_-_CIM.pdf` | PDF | [x] Ground Truth Ready |
| 8 | Iron Tree | `Adjusted_Financials_-_Iron-Tree_(2026.02)_final.xlsx` | XLSX | [x] Ground Truth Ready |
| 9 | Iron Tree | `Financial Modeling for Iron Tree.xltx` | XLTX | [x] Ground Truth Ready |
| 10 | TurnKey | `1) TurnKey Product Management Business Summary.pdf` | PDF | [x] Ground Truth Ready |
| 11 | TurnKey | `2) TurnKey Product Management P&L [Google Sheet].xlsx` | XLSX | [x] Ground Truth Ready |
| 12 | ConversionXL | `WC- Conversion XL OM.pdf` | PDF | [x] Ground Truth Ready |
| 13 | ConversionXL | `DD Memo.pdf` | PDF | [x] Ground Truth Ready |
| 14 | ConversionXL | `ConversionXL LLC_Profit and Loss by Month v2.xlsx` | XLSX | [x] Ground Truth Ready |
| 15 | ConversionXL | `CXL_Screen.xlsx` | XLSX | [x] Ground Truth Ready |
| 16 | Medical Spa | `_RENEW HEALTH CENTER - FULL YEAR COMPARATIVE P&L.pdf` | PDF | [x] Executed & Evaluated |
| 17 | Medical Spa | `Financial Modelling Renew Health.xlsm` | XLSM | [x] Executed & Evaluated |

Skipped (unsupported format): TurnKey `.numbers` file, ConversionXL `.numbers` file.

### B. "WidgetCo" Forensic Suite & Testing Suite (9 Documents)

| # | Business | File | Type | Focus Capability | Status |
|---|---|---|---|---|---|
| 18 | WidgetCo | `WidgetCo - 1_P&L_Statement.xlsx` | XLSX | Margin compression & arithmetic checks | [x] Ground Truth Ready |
| 19 | WidgetCo | `WidgetCo - 2_Balance_Sheet.xlsx` | XLSX | Cash drain & working capital trap | [x] Ground Truth Ready |
| 20 | WidgetCo | `WidgetCo - 3_Customer_Concentration.xlsx` | XLSX | >20% Customer concentration threshold | [x] Ground Truth Ready |
| 21 | WidgetCo | `WidgetCo - 4_Fixed_Asset_Register.xlsx` | XLSX | Hidden CapEx & asset obsolescence | [x] Ground Truth Ready |
| 22 | WidgetCo | `WidgetCo - 5_AR_Aging_Report.xlsx` | XLSX | Bad debt & >120 days overdue AR | [x] Ground Truth Ready |
| 23 | MergeWorks Testing | `MergeWorks Testing - 1 Combined Happy Path.docx` | DOCX | Combined P&L, concentration, & add-backs | [x] Ground Truth Ready |
| 24 | MergeWorks Testing | `MergeWorks Testing - 2 Customer Concentration Table.docx` | DOCX | Customer concentration risk classification | [x] Ground Truth Ready |
| 25 | MergeWorks Testing | `MergeWorks Testing - 3 Financial Performance CSV.docx` | DOCX | P&L math checks & margin trend analysis | [x] Ground Truth Ready |
| 26 | MergeWorks Testing | `MergeWorks Testing - 4 Seller Add-Back Notes.docx` | DOCX | Add-back intent & legitimacy classification | [x] Ground Truth Ready |

### C. Deep Multi-Modal Due Diligence Suites (20 Documents — Packets 4, 5, & 6)

| # | Business / Packet | File | Type | Focus Capability / Forensic Signal | Status |
|---|---|---|---|---|---|
| 27 | Atlantic Beverage (PROCEED) | `Atlantic_Beverage_3Yr_Audited_Financial_Model.xlsx` | XLSX | Multi-tab GAAP P&L, balance sheet, route economics | [x] Ground Truth & Run Ready |
| 28 | Atlantic Beverage (PROCEED) | `Atlantic_Beverage_Executive_CIM.pdf` | PDF | 10-page branded CIM & customer diversification (<12%) | [x] Ground Truth & Run Ready |
| 29 | Atlantic Beverage (PROCEED) | `Atlantic_Beverage_Executed_LOI_Agreement.docx` | DOCX | Binding LOI with $500k indemnity escrow terms | [x] Ground Truth & Run Ready |
| 30 | Atlantic Beverage (PROCEED) | `Atlantic_Beverage_Management_Presentation.pptx` | PPTX | 16:9 presentation slide deck on route density & growth | [x] Ground Truth & Run Ready |
| 31 | Atlantic Beverage (PROCEED) | `Atlantic_Beverage_Broker_Due_Diligence_Thread.eml` | EML | MIME deal correspondence email confirming CapEx & retention | [x] Ground Truth & Run Ready |
| 32 | Atlantic Beverage (PROCEED) | `Atlantic_Beverage_Founder_CFO_Interview.mp3` | MP3 | Founder/CFO Q&A audio call on pricing power | [x] Ground Truth & Run Ready |
| 33 | Atlantic Beverage (PROCEED) | `Atlantic_Beverage_Bottling_Plant_Tour.mp4` | MP4 | Video walkthrough of automated Krones bottling facility | [x] Ground Truth & Run Ready |
| 34 | Vanguard Aerospace (RENEGOTIATE) | `Vanguard_Aerospace_Monthly_PnL_AddBack_Ledger.xlsx` | XLSX | Disallowed $450k personal add-backs & $800k CapEx reserve | [x] Ground Truth & Run Ready |
| 35 | Vanguard Aerospace (RENEGOTIATE) | `Vanguard_Aerospace_Customer_Concentration_AR.xlsx` | XLSX | 38.5% customer concentration expiring in 4 months | [x] Ground Truth & Run Ready |
| 36 | Vanguard Aerospace (RENEGOTIATE) | `Vanguard_Aerospace_CIM_Executive_Overview.pdf` | PDF | Valuation re-pricing waterfall (-$4.4M price cut target) | [x] Ground Truth & Run Ready |
| 37 | Vanguard Aerospace (RENEGOTIATE) | `Vanguard_Aerospace_Machinery_Fleet_Inspection.docx` | DOCX | Independent engineering inspection of aging CNC spindles | [x] Ground Truth & Run Ready |
| 38 | Vanguard Aerospace (RENEGOTIATE) | `Vanguard_Aerospace_Top_Customer_Contract_Notice.eml` | EML | Customer notice demanding 15% rate cut on RFP re-compete | [x] Ground Truth & Run Ready |
| 39 | Vanguard Aerospace (RENEGOTIATE) | `Vanguard_Aerospace_CFO_Clarification_Call.mp3` | MP3 | CFO audio recording admitting personal vehicle lease add-backs | [x] Ground Truth & Run Ready |
| 40 | TerraClean Waste (WALK AWAY) | `TerraClean_Waste_Seller_CIM_Overview.pdf` | PDF | Fabricated $22M revenue claim vs $11.2M actual cash | [x] Ground Truth & Run Ready |
| 41 | TerraClean Waste (WALK AWAY) | `TerraClean_Waste_General_Ledger_Bank_Mismatch.xlsx` | XLSX | GL reconciliation proving $5.8M phantom round-trip deposits | [x] Ground Truth & Run Ready |
| 42 | TerraClean Waste (WALK AWAY) | `TerraClean_Waste_Form_1120_Federal_Tax_Audit.xlsx` | XLSX | IRS Form 1120 tax return proving -$350k operational loss | [x] Ground Truth & Run Ready |
| 43 | TerraClean Waste (WALK AWAY) | `TerraClean_Waste_AR_Aging_Bad_Debt_Ledger.xlsx` | XLSX | 74% delinquent AR (>180 days bad debt write-off) | [x] Ground Truth & Run Ready |
| 44 | TerraClean Waste (WALK AWAY) | `TerraClean_Waste_EPA_Superfund_Consent_Decree.docx` | DOCX | $4.2M federal CERCLA Superfund cleanup lien | [x] Ground Truth & Run Ready |
| 45 | TerraClean Waste (WALK AWAY) | `TerraClean_Waste_Whistleblower_Internal_Email.eml` | EML | Internal email chain warning of improper chemical discharge | [x] Ground Truth & Run Ready |
| 46 | TerraClean Waste (WALK AWAY) | `TerraClean_Waste_Facility_Inspection_Site.mp4` | MP4 | Video inspection showing compromised secondary containment | [x] Ground Truth & Run Ready |

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

Brad fills these out by reading each document manually before running the pipeline.


