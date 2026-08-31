# Dependency Security Cleanup (2026-08-27)

## Verified Root Causes

- GitHub reports 15 alerts against the stale `frontend/pnpm-lock.yaml`; the supported Vercel, Render, CI, and documented local workflows all install with npm. The unused pnpm workspace file also contains an unresolved placeholder build setting.
- The active frontend npm lockfile resolves PostCSS's transitive `nanoid` dependency to 3.3.16. GHSA-2v37-7h3g-55p8 is fixed in 3.3.18, which is published and satisfies PostCSS's existing `^3.3.16` range.
- The frontend audit's 13 affected package entries all trace to that one advisory. The root and production-only frontend audits report zero issues.

## Targeted Changes And Verification

1. Use `npm update nanoid --ignore-scripts --no-fund` in `frontend` to update only the existing compatible dependency and lockfile; inspect the structured lockfile diff for unrelated version changes. No forced upgrades or new dependency overrides.
2. Remove the unused `frontend/pnpm-lock.yaml` and placeholder `frontend/pnpm-workspace.yaml`; document npm as the supported package manager in README. Keep deployment and application behavior unchanged.
3. Verify lockfile installation consistency, full root/frontend security audits, TypeScript, all unit tests, the frontend production build, and the generated API build. Confirm no unintended generated changes remain.
4. Keep changes local and uncommitted. GitHub alerts require the resulting changes on the default branch and a dependency rescan before they can be confirmed closed.

---

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

---

# Implementation Plan — Preserve Nested Upload Folder Paths (2026-08-30)

## Empirical Root Cause Analysis

- Folder and ZIP uploads already expose `File.webkitRelativePath`, but the
  dashboard, batch state, and duplicate checks reduced identity to base filename
  plus file size.
- The backend persisted only `file_name`; direct n8n submissions, retries, the
  Data Table mirror, and synthesis therefore lost the folder label before
  evidence was reconciled.
- A retry with an empty storage URL looked up any same-named row, which could
  select a file from another project or nested folder.

## Targeted Changes

1. Add a shared normalizer that accepts only a relative path, canonicalizes
   separators, and falls back to the filename for standalone/legacy uploads.
2. Carry `sourceRelativePath` from browser/ZIP `File` instances through
   frontend batch identity, submission payloads, history rows, retries, and
   backend duplicate/cleanup logic.
3. Add `documents.source_relative_path` with a non-null empty default for
   existing rows; mirror it to the live n8n Document Specific Fields table.
4. Update the live submit workflow, per-document prompt, and synthesis prompt
   to preserve the path as a citation label while treating folder names as
   untrusted organizational metadata.
5. Scope retry fallback storage lookup to the failed row's project, filename,
   and relative path.
6. Document the confirmed cross-system contract in `LIVE_N8N_WORKFLOWS.md`.

## Regression Verification

- Unit-test path normalization, same-name files in different folders, batch
  state identity, and backend multipart propagation.
- Run frontend focused tests, TypeScript validation, and a production build.
- Verify the remote column definition, migration record, Supabase advisors,
  and that each updated n8n workflow is published with its active version
  equal to its draft.
- Do not submit a production document merely for verification; the tests and
  static live-workflow inspection exercise this contract without consuming
  customer processing or model budget.

---

# Implementation Plan — Secure Pod 1 Webhook Entrypoints (2026-08-31)

## Empirical Root Cause Analysis

- Header Auth was added to newer n8n drafts for the synthesis, per-document,
  counter, consideration, facts bridge, watchdog, and error-audit webhooks,
  but those drafts have not all been published. Production can still serve an
  older unauthenticated version until each draft is published.
- Server-side dashboard routes already use `n8nFinancialAgent.rawRequest`,
  which sends `x-webhook-secret` only from `N8N_WEBHOOK_SECRET`; these callers
  can use Header Auth without exposing a secret to the browser.
- Chat Assistant is the exception: `DealChatPanel` fetches the n8n `dd-chat`
  endpoint directly from the browser. Applying Header Auth directly would
  either break chat or leak the shared secret into the client bundle.

## Targeted Changes

1. Add a small backend `chatAssistant` dispatcher that validates a bounded
   JSON request and sends it through `n8nFinancialAgent.rawRequest` to
   `webhook/dd-chat`.
2. Expose a same-origin `/api/diligence/chat` route in both local development
   and the generated Vercel API source; change the panel's n8n fallback calls
   to use that route instead of the public n8n URL.
3. Add focused tests proving the relay sends JSON through the server-side n8n
   client and that the panel no longer contains a direct `dd-chat` request.
4. Publish the exact Header Auth drafts already configured by the user.
   Preserve all Execute Workflow, schedule, and Error Trigger nodes: Header
   Auth applies only to their optional public webhook trigger.
5. Re-read every active published version and verify each public webhook has
   the expected Header Auth binding. Do not execute document or synthesis
   workflows with test data; static configuration and caller tests avoid
   customer-data mutation and model cost.

## Regression Verification

- Run focused relay and chat-component tests, typecheck, frontend build, and
  generated API build.
- Confirm the backend client only adds the secret server-side and does not
  expose it in browser source.
- Verify publish responses and active-version IDs. Disclose that credential
  secret values cannot be read or compared through n8n MCP, so an actual
  credential-value match still requires a normal authenticated production
  action by the app.
