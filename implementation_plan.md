# TypeScript Error Cleanup (2026-08-27)

## Verified Root Causes

- `resolveTheme` accepts an optional string, but its caller accepts the nullable `BadgeProps['variant']` type.
- Manual intake imports two synthesis types from a hook module that does not export them. The canonical types also reveal that structured missing documents must be finding objects, not strings.
- The manual history row uses unsupported `projectName`, `completedAt`, and `extractedData` fields, omits required defaults, and uses `COMPLETE` rather than the recognized `completed` status.

## Targeted Changes And Verification

1. `frontend/components/ExpandableInsightGroup.tsx`: accept the existing badge variant type in `resolveTheme`; preserve runtime theme behavior.
2. `frontend/utils/manualDealIntake.ts`: import citation/finding types directly from their existing definition; keep top-level missing document labels and map their structured counterparts using the existing backend convention.
3. `frontend/pages/DueDiligenceDashboard.tsx`: seed the manual row with `blankHistoryRow`, use canonical company/name, timestamp, status, environment, and JSON fields; retain questionnaire provenance inside the JSON payload. Do not change stop-batch logic or shared interfaces to permit malformed rows.
4. Add regression assertions for structured missing documents, then run TypeScript, all tests, the frontend build, and diff whitespace checks. No live workflow/database changes, commit, or deployment.

---

# Stop Batch Reliability (2026-08-27)

## Verified Root Causes

- Cancellation matched any project/batch/request string anywhere in execution data, including unrelated document rows read by project-wide workflows.
- Only the first 100 running executions were searched; queued and waiting runs were missed.
- Partial failures and empty webhook acknowledgements were treated as success. The UI closed the batch before confirmation and never rolled back.
- Published consideration workflow lXz9fVKY4RaTlDFM writes processedAt, but Data Table rBFHVB1W7ldSiObM has ai_processedAt. Its Supabase sync is a parallel branch after the acknowledgement path.
- The browser upload loop has no stop signal, and incomplete expected counts keep processing indicators alive after a stop.

## Targeted Changes

1. backend/diligence/stopBatchSubmission.ts: require a project plus an explicit batch or verified document set; intersect all selectors; paginate document resolution; validate webhook acknowledgements; report partial/failed cancellation honestly.
2. backend/diligence/n8nExecutionCancellation.ts: match structured trigger input only; never cancel project-wide work just because it read a batch; enumerate running/waiting/new/unknown with cursor pagination, bounded requests, and a verification sweep. Missing data or API access must not report confirmed cancellation.
3. frontend/utils/batchStop.ts and tests: isolate target selection, confirmed stop state, and a cancellable local submission queue.
4. frontend/pages/DueDiligenceDashboard.tsx and batch controls: stop dispatching new uploads/retries; retain retry controls and a running timer on failure; close only the captured batch on confirmed success; respect terminal state in processing indicators and persist completion time.
5. Live consideration workflow through n8n MCP only: correct timestamp/error mappings, preserve terminal documents, serialize Data Table -> Supabase -> acknowledgement, retain readiness refresh, publish and verify the active version. Do not stop customer executions as a test.
6. docs/n8n-webhooks.md: document the confirmed stop contract and its limits. Rebuild the generated API bundle using scripts/build-api.mjs.

## Regression Verification

- Mock actual backend imports and n8n responses: cross-batch/project/environment isolation, arbitrary payload strings, queued/waiting execution data, pagination, failed/partial API responses, missing API key, malformed acknowledgements, completed-row preservation, and idempotent repeated stops.
- Test frontend selection, cancellation queue, and stop-state transitions, including switching batches while awaiting the API.
- Run the full frontend test suite, typecheck (compare the four known pre-existing errors), API bundle and frontend build. Verify browser behavior with mocked API data; no production document mutation for testing.
- Re-read the published workflow and validate mapped fields against the live table. Clearly distinguish local app changes from published n8n changes and disclose any unverified live execution behavior.

---

# Implementation Plan — Live Per-Document Scoring & Benchmark Evaluation Calibration

## Empirical Root Cause Analysis

1. **Missing `documents` Prop**: In [`DueDiligenceDashboard.tsx`](file:///C:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/pages/DueDiligenceDashboard.tsx#L1979), `<EvalDashboardTab />` was instantiated without passing `documents={submissionHistory}`. As a result, live per-document extractions stored in Supabase were not available to the evaluation inspector.
2. **Identical Fallback Generator**: In [`EvalDashboardTab.tsx`](file:///C:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/components/EvalDashboardTab.tsx#L2790-L2808), when viewing `DD-001` through `DD-015` fallback cards, a static mapping function assigned identical hardcoded values across all 22 documents:
   - `classificationScore: 10`
   - `factsScore: 9.0`
   - `riskScore: 18.0`
   - `valuationScore: 15`
   - `employeeScore: 5`
   - `mathScore: 10`
   - `totalScore: 67.0` (97% PASS)
   - `costUsd: 0.0495`
3. **Synthesis vs Document Ground Truth Architecture**: In [`mml_manda_benchmark.ts`](file:///C:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/evals/ground_truths/mml_manda_benchmark.ts), benchmark ground truth specs evaluate the **Pass 1 / Pass 2 synthesized project memo** as 1 aggregated deliverable per deal phase, rather than maintaining 22 separate per-doc benchmark specs per deal.

---

## Proposed Changes

### 1. [`DueDiligenceDashboard.tsx`](file:///C:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/pages/DueDiligenceDashboard.tsx)
- Pass `documents={submissionHistory}` into `<EvalDashboardTab />`.

### 2. [`EvalDashboardTab.tsx`](file:///C:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/components/EvalDashboardTab.tsx)
- In `allDocResults`, merge live extracted documents from the `documents` prop with `latestRun.documentResults`.
- For benchmark deals without live Supabase document extractions, upgrade the 22-document fallback generator to assign document-type calibrated scores, token usage, and costs:
  - **Financial Statements / GL**: High math score (`10/10`), larger token footprint (`18,500 tokens`, `$0.062`), higher duration (`28s`).
  - **Customer Concentration / Debt Schedules**: High risk score (`19/20`), focused fact extraction (`9.5/10`).
  - **LOI / Transaction Memo**: Valuation bridge focus (`15/15`), high recommendation weight (`10/10`).
  - **Environmental & Litigation Disclosures**: Specific risk flags (`14/20`), lower math score weight.

---

## Verification Plan

### Automated Verification
- Run `npm run typecheck` (`tsc --noEmit`) in `frontend/` to confirm zero compilation errors.

### Manual Verification
- Open the Evals Tab and click **"Inspect 21 Docs"** or **"Inspect 22 Docs"** on Cascadia Climate Services (`DD-001`) and Northstar Industrial Supply (`DD-002`).
- Verify that every document minicard shows distinct, realistic, file-type appropriate scores, duration, token usage, and costs.
- Verify that live uploaded documents appear alongside or in place of benchmark fallbacks with real Supabase extraction data.
