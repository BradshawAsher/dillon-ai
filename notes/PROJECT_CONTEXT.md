Project Context: Financial Due Diligence Agent (Post-LOI Forensic Auditor)
Core Purpose: I am building an agentic M&A platform that automates forensic financial due diligence. The goal is to move beyond simple document extraction to perform cross-document reconciliation and valuation synthesis, specifically designed to find "negotiation levers" (valuation gaps/risks) during the 30-day post-LOI window.
System Architecture:
Asynchronous "Factory" Backend: Built in n8n for AI orchestration, with Supabase/Postgres as the primary data store. n8n handles async document processing and AI workflows; Supabase stores all queryable app data (documents, syntheses, deal models, errors). The dashboard reads exclusively from Supabase via a backend API — polling no longer consumes n8n executions.
Document-Centric Projects: The system is project-based. Files are uploaded into a project context, requiring a "Diligence Manifest" (a set of required financial documents) to be satisfied before the agent will provide a final valuation judgment.
Agentic Loop:
Independent Extraction: The agent processes individual files to extract metrics (P&L, Balance Sheet, Fixed Asset Register, etc.).
Forensic Reconciliation: The agent cross-references data between files (e.g., matching Bank Statements against Income Statements) to identify discrepancies or inflated figures.
Synthesis & Judgment: The agent produces a final synthesis, including a 3-tier valuation range (Lower, Base, Upper bound) and a buy/no-buy indicator (is_favorable_indicator) with mandatory justification.
Forensic & Analytical Rigor:
Data Completeness Index: The agent acts as an "Active Gatekeeper." It will refuse to provide a final verdict until the minimum required documents (P&L, Balance Sheet, Customer Concentration, Fixed Asset Register, AR/AP Aging) are provided.
Negotiation Levers: The model is trained to surface specific risks such as margin compression, customer revenue concentration (>20%), and discrepancies between Capex spend and maintenance costs.
Error Resilience: The workflow utilizes automated error logging/triggers to handle edge cases (e.g., missing tables, arithmetic mismatches, or multi-page CSV errors), logging these as "actionable debug data" for the human analyst.
Current Operational Rules:
Constraint: The agent must be clinically objective. It cannot guess numbers. If data is missing after attempted reconciliation, it must set escalation to true and provide an error code.
Requirements: Any valuation estimation must be justified by specific methodology (e.g., Revenue multiples if EBITDA is missing) in the buy_reasoning field.
Safety: The agent is designed to support the M&A team, not replace legal/tax advice. It flags critical risks for "Human-in-the-Loop" (HITL) review.

Key Infrastructure:
- Supabase Project: `sihpsqrunkwkxhhnwoqe` (free tier)
- n8n Cloud: `merge-works.app.n8n.cloud` (Pod 1)
- n8n Supabase Credential ID: `2bjegcUtAn2gvy8A`
- Deployment: Vercel (frontend + serverless API) / Render (standalone Express backup)
- File Storage: Google Drive (MergeWorks '26 Deal Packets Upload folder)