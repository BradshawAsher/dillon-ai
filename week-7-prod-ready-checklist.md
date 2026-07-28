### 1. Production readiness — what's the status? What happens when input is missing?
- Missing required documents for final verdict : The system acts as an "Active Gatekeeper." It will refuse to provide a final verdict until the minimum required documents (P&L, Balance Sheet, Customer Concentration, Fixed Asset Register, AR/AP Aging) are provided.
- Missing data within a document : The agent is designed to be objectively factual. If data is missing after attempted reconciliation, it must set escalation to true and provide an error code rather than guessing numbers.
- Missing valuation data : The UI includes diagnostic messages in the Deal Valuation Card and Project Synthesis Card, explaining why a valuation might be missing (e.g., no synthesis, missing revenue/EBITDA figures, incomplete data, or operational documents). When an API is down?
- Frontend API server unavailability : If the local API server (backend) is unreachable, the frontend displays an error message guiding the user to start the server with npm start or npm run dev .
- Backend/n8n provider failures : The n8n workflows implement robust retry mechanisms for provider and structured-output failures. Invalid JSON/schema responses are retried with escalating waits (2s, 6s, 15s), and other transient provider failures use configured backoff strategies.
- Failed synthesis or documents : A failed synthesis refresh will preserve the last successful synthesis, displaying a clear "refresh-failed" state instead of erasing previous output. Failed documents remain visible in the submission history with an error status and can be manually retried through the dashboard, reusing stored request metadata and file references. How does the owner know it's working?
- Frontend UI Indicators :
  - Pipeline Status Indicator : The dashboard features a pipeline status indicator that shows if the system is actively polling and if there are any active submissions.
  - Live Progress : The "Latest submission panel" displays live progress updates for document processing.
  - Workflow Health : Internal monitoring indicates that the "Pod 1 per-document analysis" workflow (W5Jp7CJIQbNy0qlY) shows 100% success rates, confirming its health.
- Error Logging and Monitoring :
  - Workflow Error Log Card : The dashboard includes a WorkflowErrorLogCard displaying total uncaught errors, last 24-hour counts, and other key metrics, providing visibility into workflow issues.
  - Slack Alerts : A "Stuck Document Watchdog" monitors error logs and project processing. It sends Slack alerts to #pod-1-agent-alerts for repeated failures (e.g., three uncaught failures in 30 minutes for the same workflow) or documents stuck for more than 60 minutes. Alerts are deduplicated for one hour to prevent fatigue. How do they intervene?
- Retrying Documents : Users can retry failed documents directly from the dashboard, which re-runs the workflow using the original submission metadata.
- Automated Watchdog : The "Stuck Document Watchdog" automatically identifies and re-runs processing for Drive-backed documents that become stuck for over 30 minutes.
- Per-section Crash Isolation : New `SafeSuspense.tsx` pairs an ErrorBoundary with Suspense, applied to analysis snapshot and lazy card groups. One card failing now degrades to a local retry instead of blanking the app.
- Error Review : Uncaught production failures are recorded by the "Workflow Error Audit" and are accessible for safe internal review via the dashboard's "Errors" tab.
- n8n Debugging Guidance : Documentation provides guidance ( docs/HOW_TO_RUN.md ) on comparing active workflows against known-good version history for debugging failures in n8n. What does each run cost?
- CostPerRunCard : The CostPerRunCard on the dashboard's Overview section displays estimated costs:
  - $0.06 per document analysis.
  - $0.12 per synthesis run.
  - $0.02 per chat message (for Anthropic Claude pricing).
  - The card also shows estimated per-doc ( [ o bj ec tO bj ec t ] 0.08 ) an d p er − sy n t h es i s ( 0.15) costs for GPT-4o token-based estimates, with a note that these are pending real API key usage tracking.
- Impact Metrics : The system tracks agentMinutes , analystHours , timeSavedHours , and avgConfidence to provide insights into efficiency and cost savings.

### 2. Cost optimization — what did you do, and what was the $/run delta?
- Model Routing Change : The consolidator workflow was intentionally kept as an LLM Chain (not converted to an AI Agent) to avoid a 30-50% cost increase, as agents involve multiple LLM calls. The Chat Assistant, however, was converted to an agent.
- Prompt Caching : There is no explicit mention of prompt caching in the provided context.
- Batching : While batch document upload is supported for user input, there's no explicit information about LLM API call batching for cost optimization.
- $/run delta (Numbers: before vs after) :
  - Current estimated costs :
    - Document analysis: [ o bj ec tO bj ec t ] 0.06 ( A n t h ro p i c Cl a u d e ) or 0.08 (GPT-4o token-based estimate).
    - Project synthesis: [ o bj ec tO bj ec t ] 0.12 ( A n t h ro p i c Cl a u d e ) or 0.15 (GPT-4o token-based estimate).
    - Chat message: $0.02 (Anthropic Claude).
  - Implicit Cost Saving : By not converting the consolidator to an agent, a potential 30-50% cost increase for that specific workflow was avoided. "Before" numbers for current setup are not explicitly compared to a prior (more expensive) implementation, but rather to a more expensive alternative that was considered.

### 3. Business interest form — share your draft or link
- https://mergeworks-dashboard.onrender.com/feedback/beta-feedback-financial-dd.html

### 4. UX dashboard sketch — share the link or describe it
The Mergeworks Due Diligence Dashboard is designed as a diligence partner , moving beyond simple file parsing to provide actionable insights. The UX prioritizes a project-centric view, with a focus on progressive disclosure of information and evidence-backed findings.

Key UI Elements & What a Business Owner Sees:

- Project-based Intake Card : A form for uploading documents, capturing essential project metadata (deal name, company, project ID, stage, document type, notes). This shifts the focus from individual files to a cohesive project dossier.
- Latest Submission Panel : Displays real-time progress and AI-extracted data from the most recently submitted document, including live processing status, risk levels, and initial valuation bounds.
- Project Portfolio Card : Provides an overview of all documents within a project, their statuses, and allows for document management (e.g., excluding/including documents from synthesis). It also features a document coverage matrix to visualize completeness.
- Project Synthesis Card : The central hub for project-level insights, showing:
  - Key Takeaways : Concise, evidence-backed summaries.
  - Colored Badges : Prominent indicators for red, yellow, green flags, conflicts, open questions, and negotiation levers.
  - Final Judgment : A clear summary, risk level, traffic light, and acquisition recommendation.
  - Valuation Range : Lower, base, and upper bound estimates with confidence indicators.
  - Citations : Direct links to source documents for every finding.
  - Material Impact View : Classifies findings by their impact on valuation, cash flow, closing conditions, negotiation, or risk.
- Additional Cards/Features :
  - Deal Valuation Card : Offers method comparisons and diagnostics for missing valuations.
  - Cost Per Run Card : Transparently displays estimated operational costs.
  - Impact Metrics : KPIs showing analyst time saved and agent efficiency.
  - AI Chat Assistant : An interactive tool for querying deal data and gaining cross-project insights.
  - Workflow Error Log Card : Provides visibility into uncaught workflow errors.
  - Acquisition Timeline, Risk vs. Reward Scatter, Quick Wins, Downside Protection, Cash Reserve Analysis, Investor/Lender Readiness Cards : Offer specialized views and analytical tools for different aspects of due diligence.
The dashboard's design emphasizes leading with key decisions, progressively disclosing details, and ensuring every metric is explainable and linked to evidence, providing a comprehensive and auditable view for business owners.

### 5. What's BLOCKING you? Credential/API Limits
- n8n Shared Error Audit Workflow : Currently blocked due to an n8n server-side SQLite schema error, preventing the attachment of a centralized, robust error handling mechanism.
- Rate-limiting & Backoff Policy : While a 10-second cooldown on submits is implemented, a more comprehensive rate-limit/backoff policy is needed for 429/5xx provider failures to prevent hitting API limits under high load. Architecture Decisions/Technical Limitations
- Evidence Drawer Auto-highlighting : The Evidence Drawer cannot yet reliably auto-highlight exact page/cell locations across all file types, impacting precision.
- Project Portfolio Data Model : The project portfolio is currently inferred from document history, lacking a dedicated, more robust project table for advanced management.
- Frontend-only Project Synthesis Bridge : Current project synthesis relies on a "frontend-only bridge," indicating that a more robust, backend-driven architecture is a future step.
- Consolidator Workflow Design : Keeping the consolidator as an LLM Chain (rather than an AI Agent) was a cost-driven decision, potentially limiting future tool use or "agentic" architectural flexibility for this component.
- Backend Authentication : While local authentication is functional, integration with a production-grade backend authentication system is a future requirement.
- Polling for Progress Updates : The current polling mechanism for progress updates could become a UX or scaling problem, suggesting a future need for WebSocket or event-driven updates. Data Quality/Model Assurance (Known Follow-ups)
- Inconsistent Percentage Handling : Inconsistent handling of equityContributionPercent (whole percent vs. fraction) in DealStackCard.tsx and CashOnCashCalculatorCard.tsx needs reconciliation.
- Validation of Reconciliation : Live validation is pending for n8n reconciliation flags (e.g., scale errors, conflicting facts, implausible EBITDA margins).
- Project-level Reconciliation Review : This feature is implemented but requires live validation.
- Mixed/Multi-sheet Spreadsheet Uploads : Testing and validation are needed for complex spreadsheet uploads. Time/Resource Constraints
- Many features like "Public-web enrichment", "Email/Slack automation", "API gateway evaluation", and further "Visual polish" are implicitly blocked by time or prioritization, reserved for later stages. Other High-Priority TODOs
- Stuck-job Watchdog : A scheduled workflow to detect and retry documents/projects stuck in processing states is a high-priority, unimplemented item for robustness.
- Submission Compensation : A mechanism to ensure clear recoverable states if Drive upload succeeds but database write fails, or vice-versa, is critical for data integrity.

### 6. Any other notes for Trisha + Maple?
- Frontend Stability and Enhancements : The frontend has seen continued refinement, including fixed TypeScript regressions, per-section crash isolation (`SafeSuspense.tsx`), loading skeletons for lazy cards, new tests for `documentedFacts` and `projectWorkspace`, correctness/consistency fixes in scorecards, improved SEO/mobile metadata, and radar chart accessibility. UI improvements have also been implemented, including making the "Data Isolation" and "Sign In" buttons more prominent for better user experience.
- Production Readiness : A detailed assessment of production readiness has been completed, outlining the system's resilience to missing inputs and API downtime, monitoring mechanisms (including Slack alerts for critical issues), intervention strategies, and transparent cost tracking for AI operations.
- Cost Optimization : Strategic decisions have been made to optimize costs, such as retaining the consolidator workflow as an LLM Chain to avoid a 30-50% cost increase that would have resulted from converting it to a more agentic architecture. Per-run cost estimates for document analysis, synthesis, and chat messages are now available.
- Key Blocking Items : While significant progress has been made, several items are currently blocking or are high-priority for future development, as detailed in point 5. These include resolving the n8n Shared Error Audit blockage, implementing a more robust API rate-limiting strategy, and refining the project portfolio data model.
Overall, the project is demonstrating increasing maturity in its core functionality, with a clear understanding of its current capabilities, cost profile, and remaining challenges.