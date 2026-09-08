# Letter of Intent (LOI) Feature & Metric Dependency Guide

This document defines which agent capabilities, UI cards, and financial metrics **depend on an Executed/Proposed Letter of Intent (LOI)** versus those that operate solely on **standalone financial statements** (P&Ls, Balance Sheets, Tax Returns, CIMs).

---

## Executive Overview

The MergeWorks Financial Due Diligence Agent supports two distinct operational modes:

1. **Phase 1: Pre-LOI Valuation Discovery Mode** (Operates without an LOI)
   - Evaluates target earnings quality, uncovers hidden risks, computes math integrity, and calculates standalone valuation bounds ($4.4\text{M} - 6.9\text{M}$).
2. **Phase 2: Post-LOI Deal Negotiation Mode** (Requires an LOI)
   - Reconciles LOI purchase multiples, working capital pegs, and escrow holdbacks to compute exact **Post-LOI Purchase Price Adjustments** ($\Delta\text{Enterprise Value}$) and detect aggressive contract traps.

---

## Complete Dependency Matrix

| Feature / UI Card / Metric | Requires LOI? | Primary Source Documents | Description & Formula |
| :--- | :---: | :--- | :--- |
| **Post-LOI Purchase Price Adjustment ($\Delta\text{EV}$)** | **YES** | LOI + QoE Bridge Exhibit | $\Delta\text{EV} = (\text{Supported EBITDA} - \text{Seller EBITDA}) \times \text{LOI Multiple}$ |
| **Stated Purchase Multiple ($5.0\times - 9.0\times$)** | **YES** | LOI Section 1 (Purchase Terms) | Stated multiple applied to TTM/FY Adjusted EBITDA |
| **Working Capital Peg Compliance** | **YES** | LOI Section 2 + Balance Sheet | Compares Net Working Capital against agreed peg ($\text{NWC} - \text{Peg}$) |
| **Indemnity Escrow Holdback ($10\%$)** | **YES** | LOI Escrow Clause | Calculates required closing escrow ($10\% \times \text{Headline EV}$) |
| **Contract Trap Warnings** | **YES** | LOI Defined Terms & Clauses | Detects aggressive clauses (e.g. deferred revenue peg exclusions, EBITDA caps) |
| **Post-LOI Price Reduction Levers** | **YES** | LOI + Audited Financials | Compares LOI Headline EV against Supported Base Valuation |
| **Raw & Adjusted EBITDA Extraction** | **NO** | P&L, Trial Balance, General Ledger | Extracts revenue, COGS, operating expenses, and normalized EBITDA |
| **Unstated Seller Risk & Red Flags** | **NO** | Tax Returns, Q&A, GL Schedules | Uncovers unsupported add-backs, personal fleet costs, and consulting fees |
| **Standalone Valuation Bounds ($4.4\text{M} - 6.9\text{M}$)** | **NO** | Audited P&L + Market Multiples | Industry multiple range ($4.0\times - 6.5\times$) $\times$ Supported EBITDA |
| **Customer Concentration Risk** | **NO** | Revenue Schedules, AR Aging | Calculates Top 1 and Top 5 customer revenue percentages |
| **Math Integrity & Trial Balance Checks** | **NO** | Financial Statement Spreadsheets | Verifies line item totals, net income bridges, and balance sheet balance |
| **Document Classification & Parsing** | **NO** | Raw PDF / CSV / XLSX Files | Automatically classifies file types, reporting periods, and accounting basis |

---

## Detailed Behavioral Breakdown

### 1. Functionalities That DEPEND on an LOI (Post-LOI Mode)

* **Post-LOI Purchase Price Repricing**:
  Without an LOI, the agent cannot calculate exact dollar price revisions because the purchase multiple and headline purchase price have not been agreed upon. Once an LOI is uploaded, the agent extracts the purchase multiple (e.g. $5.5\times$) and computes the exact repricing delta:
  $$\text{Price Adjustment} = (1,260,400 \text{ Supported} - 1,590,000 \text{ Claimed}) \times 5.0\times = -\$1,648,000$$

* **Working Capital Peg Compliance**:
  LOIs define whether the Net Working Capital (NWC) peg is set on a 12-month trailing average, 3-month average, or month-end snapshot. The agent reconciles balance sheet NWC against the LOI-agreed peg to identify deficit adjustments at closing.

* **Indemnity Escrow Holdback ($10\%$)**:
  The LOI specifies indemnity escrow percentages (typically 10% for 18 months). The agent calculates the exact escrow dollar holdback ($10\% \times \text{Headline EV}$).

* **Contract Trap Alerts**:
  Catches 7 specific negotiation traps in LOI definitions:
  1. *Owner-comp add-back lacking market replacement test*
  2. *Working capital peg excluding deferred revenue*
  3. *Workers' comp accrual carve-out in working capital*
  4. *Restrictive EBITDA definitions blocking upward price adjustments*
  5. *Gross AR included in working capital peg*
  6. *Month-end trough working capital peg selection*
  7. *Permitted pro-forma cost savings in EBITDA definitions*

---

### 2. Functionalities That DO NOT Require an LOI (Pre-LOI Mode)

* **Normalized EBITDA & Earnings Quality**:
  Extracted directly from P&Ls, trial balances, and Form 1120 tax returns.
* **Unstated Risks & Red Flags**:
  Identified by comparing general ledger line items against owner add-back assertions.
* **Standalone Valuation Bounds**:
  Calculated using industry market multiples ($4.0\times - 6.5\times$) applied to supported EBITDA, establishing a fair valuation range ($4.4\text{M} - 6.9\text{M}$) *before* an LOI is issued.
* **Document Request Checklist**:
  Identifies missing financial statements (P&L, Balance Sheet, Tax Returns, AR Aging) and highlights **Letter of Intent (LOI)** as the key document needed to unlock Phase 2 deal negotiation features.

---

## UI Indicators & Helpful Disclaimers

When an LOI document is missing in a deal workspace, the dashboard displays helpful callout badges:

> 💡 **Phase 1 Pre-LOI Valuation Discovery Active**:
> *"Upload an Executed Letter of Intent (LOI) to unlock exact Post-LOI Purchase Price Adjustments, Working Capital Peg Variances, and Escrow Holdbacks."*
