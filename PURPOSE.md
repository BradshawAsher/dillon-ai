# Purpose and Capabilities: Financial Due Diligence Agent

The **MergeWorks Financial Due Diligence Agent** is an AI-powered M&A intelligence workspace designed for private equity sponsors, search funds, corporate development teams, and M&A advisors.

The agent automates financial due diligence across **two distinct phases** of the acquisition lifecycle:

1. **Phase 1: Pre-LOI Valuation Discovery & Normalized EBITDA Extraction**
2. **Phase 2: Post-LOI Deal Negotiation, Cross-Document Reconciliation & Purchase Price Adjustment**

---

## 1. Phase 1: Pre-LOI Valuation Discovery

Before issuing a Letter of Intent (LOI) or during early-stage deal screening, buyers must verify target company earnings and determine fair enterprise valuation based solely on raw accounting materials.

### Objectives
- Establish true **Normalized EBITDA / Seller's Discretionary Earnings (SDE)**.
- Uncover unsupported add-backs, aggressive accounting, and hidden liabilities.
- Compute a mathematically defensible valuation range (**Base, Downside, Upside**).

### Primary Input Documents
- Monthly & Annual Profit & Loss (P&L) Statements
- Balance Sheets & Trial Balances
- Form 1120 / Form 1065 Tax Return Simulations
- Confidential Information Memorandums (CIM) & Teasers
- General Ledger & Chart of Accounts CSVs

### Core Agent Capabilities
- **Automated Document Classification**: Identifies document types, periods, and reporting basis across multi-file uploads.
- **Deterministic Financial Extraction**: Extracts revenue, COGS, gross profit, operating expenses, reported EBITDA, and balance sheet line items.
- **Add-Back Verification & Audit**: Audits seller EBITDA bridges to distinguish verified non-recurring expenses from forward-looking, unaudited assertions (e.g., unverified headcount savings).
- **Valuation Modeling**: Calculates fair value bounds based on normalized earnings multiples and asset-backed net worth.
- **Deal Grading & Risk Scoring**: Assigns an overall Deal Grade (A–F) and 2×2 Risk Matrix across pricing, data quality, and financial durability.

---

## 2. Phase 2: Post-LOI Deal Negotiation & Cross-Document Reconciliation

Once an LOI is drafted or signed, the deal moves into confirmatory due diligence. In this phase, the agent reconciles proposed LOI terms against audited accounting records to protect the buyer from overpayment and balance sheet misstatements.

### Objectives
- Reconcile proposed LOI purchase prices against audited valuation bounds.
- Detect cross-document conflicts between operating financials, bank records, and tax filings.
- Formulate specific dollar-for-dollar **Purchase Price Adjustments, Earn-Outs, and Escrow Clauses**.

### Primary Input Documents
- All Phase 1 Accounting Files
- **Proposed / Executed Letter of Intent (LOI), Term Sheet, or Purchase Agreement**
- Bank Statements & Bank Reconciliation Files
- Accounts Receivable (AR) Aging & Customer Concentration Reports
- Management Q&A Transcripts

### Core Agent Capabilities
- **Price vs. Value Delta Analysis**: Quantifies exact overpayment exposure by comparing proposed LOI purchase prices against supported valuation estimates:
  $$\text{Overpayment Exposure} = \text{LOI Purchase Price} - \text{Supported Base Valuation}$$
- **Cross-Document Discrepancy Reconciliation**: Cross-checks bank statement cash against balance sheet cash, inventory subledgers against trial balances, and P&L gross profit against tax returns.
- **Negotiation Lever Generation**: Auto-generates actionable negotiation points tied directly to audited evidence (e.g., *"Require a $285,000 price reduction due to forward-looking payroll savings"*).
- **Closing Protection & Escrow Recommendations**: Identifies required closing escrows, working capital pegs, and customer concentration earn-outs.
- **Automated Buyer Deliverables**: Generates formal Deal Memos, Management Q&A Lists, Seller Email Drafts, and DD Request Lists.

---

## Summary Matrix

| Feature / Dimension | Phase 1: Pre-LOI Discovery | Phase 2: Post-LOI Negotiation |
| :--- | :--- | :--- |
| **Primary Goal** | Determine if the deal is worth pursuing and establish fair price bounds. | Reconcile LOI terms, verify balance sheet integrity, and adjust price/terms. |
| **Key Input** | P&L, Balance Sheet, Tax Returns, CIM | P&L, Balance Sheet, Tax Returns, **LOI / Term Sheet**, Bank Recs, AR Aging |
| **Primary Output** | Normalized EBITDA, Fair Valuation Range, Deal Grade (A–F) | Price Reduction Levers, Working Capital Peg, Escrow Terms, Deal Memo |
| **Focus Area** | Earnings Quality & Growth Durability | Overpayment Risk, Working Capital Deficits, Cross-Document Integrity |

---

## Evaluation Benchmark Integration

The dashboard's automated evaluation harness (`npm run eval` via `scripts/run-evals.ts` and `scripts/evalScoring.ts`) benchmarks the agent against both phases:

- **Pre-LOI Metrics**: Evaluates extraction accuracy across classification, facts, risk, valuation, employee evidence, and arithmetic consistency (currently **97% overall accuracy** across 43 benchmark documents).
- **Post-LOI Metrics**: Benchmarks cross-document conflict detection, negotiation lever dollar accuracy, and final recommendation alignment (`PASS` / `ESCALATE` / `ABANDON`).
