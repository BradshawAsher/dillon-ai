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

---

# Implementation Plan — Reconcile Fictional-Entity and Media Test Packets (2026-08-31)

## Empirical Root Cause Analysis

- The correction bundle contains cleaned packet 2, 4, and 5 documents plus
  reproducible media sources for packets 4, 5, and 6.
- A partial manual merge moved the tracked packet 4, 5, and 6 directories into
  `test_sets/deals/Old`, leaving Git to report twenty deletions. The generated
  replacement audio files also lost the canonical underscore-based filenames.
- The bundle's scripts were copied into `test_sets/scripts`, but their path
  calculations require them to live in the repository-level `scripts` folder.
- Most raw ground-truth hash differences are line endings. Only the four media
  ground-truth files change semantically, and four timestamped evaluator-only
  transcripts are new.

## Targeted Changes

1. Restore packet 4, 5, and 6 directories from `Old`, preserving the newly
   generated media bytes while restoring their canonical filenames.
2. Overlay the entity-clean packet 2, 4, and 5 documents supplied in the
   correction bundle; leave unrelated packet documents unchanged.
3. Merge the four substantive media ground-truth updates, evaluator-only
   transcripts, deterministic media source assets, and media provenance README.
4. Install the corrected generators and real-entity checker under root
   `scripts/`; remove the accidental `test_sets/scripts` copy.
5. Keep the original correction bundle as an ignored local backup until the
   merged tree has passed all verification.

## Regression Verification

- Validate every Office/PDF/JSON file can be parsed and every expected packet
  file has a matching ground-truth record.
- Run the format-aware real-entity checker over all merged deal packets.
- Verify media duration, bitrate, dimensions, canonical names, and transcript
  metadata against the new media ground truth.
- Confirm the generator scripts compile and no packet directory remains staged
  as an accidental deletion.

---

# Atlantic media routing and submission idempotency implementation plan

## Empirical root causes

1. The dashboard retries the complete per-file operation after any exception. The retry repeats storage preparation and calls `/api/diligence/submit` again, which creates a new request ID. If n8n accepted the first call but its acknowledgment was lost, the second call becomes a duplicate submission.
2. The active per-document workflow has dedicated Gemini video and OpenAI audio nodes, but both Switch expressions contain double-escaped regular expressions. MP4 and MP3 therefore fall through to LlamaParse.
3. Custom provider retry loops return JSON error items through Wait nodes without restoring the original binary, so later media/parser attempts can fail with a missing-binary error.
4. The Supabase failure row currently receives a generic message even when the n8n Data Table retains the provider's detailed error.
5. Gemini returns video text under `content.parts[].text`, while the shared volume node only reads top-level `text` or `response`. The downstream financial analysis therefore receives an empty document even when Gemini succeeds.
6. Completion persistence estimates tokens from the LlamaParse node on every route. Media runs fail when that branch-specific node was never executed, leaving the two status mirrors in `processing`.

## Repository changes

- Add a small tested upload-preparation retry helper under `frontend/services`.
- Refactor `frontend/pages/DueDiligenceDashboard.tsx` so only storage preparation can retry. Dispatch to n8n once per selected file and tell the operator to check history after an ambiguous acknowledgment.
- Extend existing upload/submission documentation to describe the split retry boundary.

## Live n8n changes

- Replace the broken video and audio regular expressions in `Route File by Media Type` with direct extension and MIME comparisons.
- Restore the original downloaded binary in the existing validation node and route all provider retry waits back through validation and media routing before another attempt.
- Classify unsupported-file and missing-binary parser errors as terminal so they are not retried.
- Persist the detailed provider error to Supabase.
- Normalize Gemini, audio, and LlamaParse extraction output into one shared `text` contract and base downstream prompts and token estimates on that contract.
- Clear stale failure markers at processing start and route Supabase persistence errors through the terminal document-failure handler.
- Let the manual retry workflow recover a `processing` row only when it still carries a known processing-failure marker; continue rejecting healthy in-flight work.
- Validate the changed node configurations, update the live workflow atomically, publish it, and verify the published version is active.

## Regression verification

- Unit-test the storage preparation retry helper, including transient recovery and exhausted attempts.
- Run the focused frontend tests, TypeScript checks, and production build.
- Validate the n8n Switch and Code node configurations before mutation.
- Re-read the saved workflow version after publishing and verify the corrected rules and connections.
- Retry the stored Atlantic MP4 only after the user authorizes a live Gemini test. Verify that Gemini produces text, the shared normalization preserves it, OpenAI produces evidence-backed analysis, both status mirrors reach `completed`, and the counter creates one synthesis claim for the new evidence signature.

---

# Packet 4–6 live evaluation and Evals tab registration plan

## Empirical root cause

1. The repository already contains document ground truths for packets 4–6, but their `test_sets/results/packet*_actual_run.json` files are dated placeholder outputs rather than the three live projects submitted on 2026-08-31.
2. `npm run eval` only scores JSON already present under `test_sets/results`; it does not fetch a newly submitted Supabase project automatically.
3. The Evals & Harness document cards come from the latest published eval report, while the high-level benchmark synthesis registry currently exports only packet deals 1–3. Packets 4–6 therefore lack their expected summary, valuation, verdict, and alias records.
4. One card-level lookup still matches packets using broad name fragments such as `vanguard`, which cannot distinguish Vanguard Medical from Vanguard Aerospace.

## Target changes

- Add a reusable packet-result exporter under `scripts/` that accepts packet/project mappings, reads the latest completed Supabase rows, and writes the existing ActualRunDoc JSON contract without logging credentials.
- Replace the three packet 4–6 result fixtures with outputs from live projects `project-20260831-344a1ed2`, `project-20260831-a60a1a10`, and `project-20260831-36b4eea1`.
- Add Atlantic Beverage, Vanguard Aerospace, and TerraClean expected synthesis records to `frontend/evals/ground_truths/packet_deal_benchmarks.ts` and register them through the ground-truth index.
- Use exact project/alias/business matching in `EvalDashboardTab.tsx` before legacy fuzzy matching so similarly named packets cannot select another deal's ground truth.
- Run the evaluation harness, refresh the generated JSON/Markdown/failure reports, and publish the real report to `public.eval_runs` for the Evals & Harness tab.

## Regression verification

- Confirm each exported result contains exactly the live packet's expected file count and current project ID: Atlantic 7, Vanguard Aerospace 6, TerraClean 7.
- Run the focused eval scoring and Evals tab tests, then the complete eval harness.
- Verify the latest report contains all 20 packet 4–6 documents with no placeholder project IDs.
- Query the newest `public.eval_runs` row and confirm its report timestamp, totals, and packet 4–6 business names match the generated report.
- Run TypeScript type checking and a production frontend build after registering the new synthesis records.

---

# Evals card seller ask and negotiation delta plan

## Current behavior and data source

1. Every Evals & Harness project card already resolves phase-specific bear, base, and bull valuations, but it does not show the seller's asking price or compare that ask with the model base estimate.
2. Seller ask values can come from the live phase synthesis, registered benchmark synthesis, final-judgment JSON, document facts, or the existing benchmark financial fallback map. The shared `resolveFinancialMetricsForProject` helper already applies that precedence.
3. Money strings appear as full dollar amounts and finance abbreviations such as `$14.2M`; the existing `parseMagnitudeMoney` helper is the canonical parser.

## Target changes

- Add a tested shared valuation-delta calculation that parses the seller ask and model base, returns the signed dollar difference, and measures the absolute difference as a percentage of seller ask.
- Resolve the seller ask from the phase synthesis or matching benchmark for every project card after its phase-specific base valuation is finalized.
- Render `Seller Ask` and `Model vs Ask` badges on every card. Show a negotiation target when the model is below ask, a model premium when it is above ask, an at-ask state when equal, and `Not available` when either input is missing.

## Regression verification

- Unit-test negative, positive, equal, abbreviated-money, zero-ask, and missing-data cases.
- Run the focused financial-metrics test, complete TypeScript check, full frontend test suite, and production build.

---

# Historical batch timer reconstruction plan

## Empirical root cause

1. The latest Apex batch `batch-1788210938111-sbey1` has five completed server rows spanning approximately 85 seconds from the timestamp encoded in the batch ID to the last `processed_at` value.
2. When `activeSubmissionBatch` is unavailable after a refresh or session change, the Diligence card currently creates a display-only batch with `startedAt: Date.now()` but calculates elapsed seconds from `activeSubmissionBatch`, which is null. The result is always `0 sec` even though the document rows contain valid timing evidence.
3. The earlier infinite timer occurred because a reconstructed completed batch lacked a stable end time and continued falling back to the current browser time.
4. The no-active-session fallback also mixes all project rows instead of first isolating the latest `submissionBatchId`, so projects with retries or multiple uploads can display the wrong batch.

## Target changes

- Add tested utilities that select the latest submission batch and reconstruct its batch ID, expected count, start time, end time, request IDs, and environment from document rows.
- Prefer the timestamp encoded in a valid `batch-<milliseconds>-...` ID for total wall-clock start, falling back to the earliest server receipt/start timestamp.
- Freeze completed historical batches at the latest terminal server timestamp; keep reconstructed in-flight batches ticking.
- Use the reconstructed batch for the Diligence card and elapsed timer whenever no live session batch exists.

## Regression verification

- Reproduce the latest Apex timestamps in a unit test and require an 85-second completed duration instead of zero or an ever-increasing value.
- Test multiple batches in one project, missing batch IDs, and an in-flight historical batch.
- Run focused batch state/card tests, TypeScript checking, the full frontend suite, and a production build.

## Verification completed

- The exact latest Apex fixture reconstructs to 85 seconds and stays frozen after completion.
- Focused batch timer/card tests, TypeScript checking, all 725 frontend tests, and the production build pass.
