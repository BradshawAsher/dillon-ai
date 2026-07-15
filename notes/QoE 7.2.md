7.2 Core Financial & Quality of Earnings (QoE) Playbook

To ensure deterministic execution in our n8n code sandbox, the agent evaluates the transaction packet against these six specific risk vectors:

1. Customer Concentration Risk
Required Inputs: Customer Revenue Ledger, Sales-by-Customer CSV/Excel.
Deterministic Formula: {Individual Customer Revenue} / {Total Annual Revenue} >= 0.15
Agent Execution: The JavaScript node flags any single client accounting for >= 15% of top-line revenue. Claude Sonnet generates a follow-up prompt identifying the client industry and requesting the historical contract duration.

2. Gross Margin Compression
Required Inputs: 3-Year Historical Profit & Loss (P&L) Statements.
Deterministic Formula: {Gross Margin Year}_n - {Gross Margin Year}_{n-1} <= -0.05
Where n = current year, and n-1 = previous year
Agent Execution: Code tracks the trend line of Gross Profit %. If a drop greater than 5% is calculated year-over-year, the system triggers a `HIGH` risk flag to investigate pricing power vulnerabilities or inventory cost spikes.

3. Owner Add-Back Validation
Required Inputs: Seller Add-Back Schedules, General Ledger Details, Management Notes.
Deterministic Formula: String-matching cross-reference against approved category enums (e.g., Personal Auto Lease, One-time Legal Fees).
Agent Execution: Claude Haiku classifies seller-claimed adjustments. If an add-back seems unsupported or non-standard (e.g., normal operating software disguised as a personal expense), it is isolated as a "Valuation Adjustment Candidate" to lower the purchase price.

4. Working Capital Traps
Required Inputs: Balance Sheet historical intervals, Accounts Receivable (AR) & Accounts Payable (AP) Aging Reports.
Deterministic Formula: {Working Capital} = {Current Assets} - {Current Liabilities}; also track {Days Sales Outstanding (DSO)} trend.
Agent Execution: Code flags if cash is increasingly trapped in uncollected invoices (AR) or slowing inventory turns, signaling hidden capital requirements for the buyer post-close.

5. Debt-Like Items
Required Inputs: Balance Sheet Liabilities section, Tax Filing Status PDFs, Loan Agreements.
Deterministic Formula: Summation of all non-operational long-term liabilities, deferred tax balances, and accrued unpaid employee bonuses.
Agent Execution: Programmatically aggregates liabilities that must be cleared by the seller at close so they are subtracted dollar-for-dollar from the enterprise valuation.

6. Cross-Document Reconciliation Gaps
Required Inputs: QuickBooks Exports vs. Scanned PDF Tax Returns vs. Monthly Bank Statements.
Deterministic Formula: {Total Net Income (P&L)} - {Line 21 Ordinary Business Income (Form 1120S)} = 0
Agent Execution: Code cross-checks key totals across disparate file types. If tax return revenue does not match internal QuickBooks reporting, the system generates an immediate `DEAL_BREAKER` escalation alert.