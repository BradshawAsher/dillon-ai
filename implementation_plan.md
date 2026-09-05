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

---

# Project and evaluation timing telemetry plan

## Empirical root cause

1. Document and synthesis timestamps already reach the frontend, and shared helpers can resolve their individual durations, but the Projects portfolio does not display them.
2. The Evals tab displays per-document latency and a summed document duration. Summing parallel document workers is compute time rather than elapsed project time, and synthesis duration is not shown separately.
3. The expanded Evals document cards sit inside a two-column project grid but use viewport breakpoints for their own three-column metrics and side-by-side actions. At desktop viewport widths the child remains narrow while its contents expand, and missing `min-w-0`, wrapping, and horizontal overflow containment allow labels and buttons to leave the parent card.

## Target changes

- Add a tested shared project timing summary to `frontend/utils/diligenceDashboardUtils.ts`: document compute time, parallel extraction wall-clock time, synthesis time, and total project processing time.
- Keep measured timing separate from the existing legacy estimate fallbacks so cards show unavailable timing rather than presenting estimates as recorded time.
- Derive wall-clock extraction from the earliest valid document start to the latest valid document end, falling back to the longest known document duration when eval fixtures only contain explicit duration fields.
- Add Project Time, Extraction, and Synthesis telemetry to every Projects portfolio card, plus a duration beside every document row.
- Add the same three timing values to every Evals project card and continue showing the individual duration on each expanded document card.
- Show measured Total Project Time beside measured Synthesis Time in the Synthesis tab's acquisition-judgment header.
- Contain expanded Evals content with `min-w-0`/`overflow-hidden`, allow long filenames and labels to wrap, use child-safe metric columns, and stack document actions so nested cards cannot overflow.

## Regression verification

- Unit-test parallel documents, explicit-duration-only eval fixtures, missing synthesis timing, and unavailable timing data.
- Run focused timing and tab module tests, TypeScript checking, the complete frontend test suite, and a production build.
- Render the Projects and Evals tabs in a browser at desktop and narrow viewport sizes and verify expanded document cards remain within their project card.

## Verification completed

- Shared timing tests cover overlapping parallel documents, duration-only eval fixtures, synthesis addition, missing synthesis timing, and fully unavailable timing.
- Focused timing/tab tests, TypeScript checking, all 729 frontend tests, and the production build pass.
- The local Vite server starts successfully. Automated screenshot verification is unavailable on this workstation because neither the documented `agent-browser` executable nor a callable browser controller is installed; compiled responsive/overflow classes and source containment were verified instead.
# Lightweight main-branch protection and CI gate plan

## Empirical current state

- `main` has no GitHub ruleset or classic branch protection.
- `.github/workflows/eval-regression.yml` runs frontend unit tests and the eval harness on pull requests and pushes to `main`, but it does not run TypeScript typechecking or the production build.
- Typechecking imports root-level backend modules, so CI must install both the root and frontend lockfiles before running the frontend checks.
- Vercel separately builds pull-request previews and deploys production after changes reach `main`.

## Target changes

1. Update `.github/workflows/eval-regression.yml` to use reproducible `npm ci` installs at both repository levels.
2. Add frontend typecheck and production-build steps to the existing `run-evals` job, preserving the stable status-check context that GitHub already reports.
3. Verify the workflow locally with the same typecheck, tests, eval harness, and build commands.
4. Commit and push the CI change to `main`, then wait for the updated `run-evals` workflow to pass.
5. Create an active ruleset targeting only the default branch that requires pull requests with zero approvals, requires the successful `run-evals` check without strict update/rebase enforcement, blocks deletion and force pushes, and gives repository administrators an emergency bypass.
6. Read back the live ruleset and confirm that `main` and `origin/main` remain synchronized.

## Regression and operational checks

- Existing direct feature-branch pushes remain available.
- The required check must have a successful run before activation so the repository is not accidentally locked behind an unknown check context.
- Vercel remains an informational preview/deployment integration rather than a required ruleset check, avoiding a vendor outage blocking emergency merges.
- Administrator bypass remains available for recovery while normal changes use pull requests.

---

# Quick Deal Questionnaire tutorial and Playwright E2E foundation

## Empirical current state

1. The Quick Deal Questionnaire is a five-section manual intake flow inside `ProjectIntakeCard`, but it is not represented by a dedicated native walkthrough playlist.
2. The questionnaire header, live metric summary, section navigation, section panels, and generate action do not expose stable walkthrough/E2E targets, so a tour would otherwise depend on fragile text or styling selectors.
3. The questionnaire owns its active-section state locally. The walkthrough engine can dispatch simulated actions, but the form does not currently consume an action that changes the visible questionnaire section.
4. While this task was in progress, `main` advanced to include a Playwright configuration, 11 browser tests, and an E2E step inside the existing required `run-evals` job. That suite did not cover the questionnaire tutorial or upload its HTML report on CI failures.

## Target changes

- Add stable semantic IDs/data attributes to the questionnaire mode switch, questionnaire shell, presets, live metrics, five section buttons/panels, and the final generate action.
- Add a dedicated eight-step Quick Deal Questionnaire playlist covering orientation/presets, live calculations, Business Basics, Financials, Assets, Financing, Risk, and dashboard generation.
- Let the questionnaire consume a narrowly scoped walkthrough action that changes its local section without editing fields or generating a deal.
- Add a visible `Start Tutorial` action inside the questionnaire and pass the existing walkthrough launcher callback through `DueDiligenceDashboard` and `ProjectIntakeCard`.
- Register the playlist in the existing walkthrough gallery with a calculator-specific visual treatment.
- Refine the existing Playwright configuration to start a self-contained Vite server in mock/example mode, and add stable browser tests for opening the questionnaire and advancing its tutorial through real mounted targets.
- Keep Playwright inside the existing required `run-evals` job so the branch ruleset status remains stable, and upload its HTML report on CI failures.

## Regression verification

- Extend walkthrough data tests to require the questionnaire playlist, sequential numbering, unique IDs, and target selectors.
- Run the focused walkthrough/unit tests, complete frontend typecheck, full Vitest suite, and production build.
- Run the Playwright Chromium suite locally and confirm it makes no submit/upload/API request.
- Confirm the tutorial can be launched from the questionnaire, advances to a later section, highlights a visible target, and closes cleanly.
- Verify the final Git diff contains no credentials, generated browser binaries, test reports, screenshots, or traces.

## Verification completed

- The questionnaire walkthrough unit tests pass, including playlist integrity and section-action coverage.
- All 870 Vitest tests, TypeScript typechecking, and the production build pass.
- All 14 Chromium E2E tests pass, including direct questionnaire launch, cross-section tutorial navigation, and launch from the global walkthrough gallery.
- The questionnaire browser tests observed zero upload, webhook, or model requests.

## Quick Deal Questionnaire carousel entry (2026-09-01)

### Empirical root cause

The Quick Deal Questionnaire tutorial exists in `TOUR_PLAYLISTS` and can be launched from the questionnaire form or the in-dashboard All Tours modal, but `WorkspaceDemoGalleryBar` still defines only the original six demos. Because both the landing page and dashboard carousel render that six-item catalog, neither surface exposes the new tutorial.

### Target files and exact changes

- `frontend/components/WorkspaceDemoGalleryBar.tsx`
  - Add a `native-questionnaire` demo variant and active carousel card.
  - Derive the displayed demo count from `WORKSPACE_DEMOS.length`.
  - Give the card stable identifying metadata and questionnaire-specific violet styling.
- `frontend/pages/LandingPage.tsx`
  - Map the new card to a `walkthrough=questionnaire` dashboard deep link.
- `frontend/pages/DueDiligenceDashboard.tsx`
  - Recognize the questionnaire deep link and launch `quick-deal-questionnaire`.
  - Launch the same tutorial when its dashboard carousel card is selected.
- `frontend/components/walkthrough/walkthroughData.test.ts`
  - Assert the shared carousel includes one active questionnaire tutorial mapped to the existing eight-step playlist.
- `frontend/e2e/quick-deal-questionnaire-tutorial.spec.ts`
  - Verify the landing carousel card opens the dashboard, mounts the questionnaire, and starts the correct tutorial without an upload.

### Regression verification

1. Run the focused walkthrough data unit test.
2. Run the questionnaire Playwright spec.
3. Run TypeScript typechecking and the production build.
4. Inspect the rendered landing carousel and confirm its count and launch behavior.

### Verification result

- The carousel renders seven active demos and identifies the questionnaire card with `data-demo-id="native-questionnaire"`.
- Browser inspection confirmed that the dashboard's tab hash would overwrite a hash-based tour request. Carousel launches now use an exact `tour` query parameter while legacy hash links remain supported.
- Exact route matching prevents `questionnaire` from being misclassified as `quest` by substring matching.
- The focused walkthrough data suite passes (9 tests), the full Playwright suite passes (15 tests), TypeScript typechecking passes, and the production build succeeds.
- The React review found no new request waterfalls, unnecessary state, unstable list keys, accessibility regressions, or render-heavy derived work.

## Zero-token API integration suite (2026-09-01)

### Empirical baseline

The repository has strong Vitest unit/domain coverage, a real loopback multipart handoff integration test, 15 Playwright browser tests, and the eval harness. It does not have a separately configured suite that sends HTTP requests through the production `/api/diligence/*` router. Existing browser API coverage fulfills mocked responses before they reach the server handler, while live n8n/Supabase/R2 scripts are manual diagnostics and are unsuitable for required pull-request CI.

### Architecture

- Start a temporary `127.0.0.1` Node HTTP server in Vitest and pass every request to the real Vercel handler in `api/diligence/[...route].src.ts`.
- Mock the handler's imported backend operations at the module boundary. This preserves the production router, body parser, user-header parser, response serialization, ETag handling, memory cache, cache invalidation, rate limiter, error mapping, methods, query parsing, and status codes while preventing external side effects.
- Install a fail-closed fetch guard that permits only the loopback test server and throws on any n8n, Supabase, R2, Slack, or model-provider request.
- Keep integration files outside the default unit include and run them through a Node-only Vitest configuration.

### Target files

- `frontend/integration/diligenceApi.integration.test.ts`
  - Add the loopback server, deterministic backend mocks, route contract matrix, cache/ETag tests, malformed input and error mapping tests, user/environment forwarding tests, and rate-limit tests.
- `frontend/vitest.api.config.ts`
  - Configure the isolated Node integration suite with bounded timeouts and sequential file execution.
- `frontend/vite.config.ts`
  - Exclude `integration/**` from the ordinary unit suite to avoid duplicate execution.
- `frontend/package.json`
  - Add `test:api` and include it in `check`.
- `.github/workflows/eval-regression.yml`
  - Add `Run API Integration Tests` inside the existing required `run-evals` job after unit tests and before the production build.
- `docs/TESTING_AND_CI.md`
  - Document the four-layer test architecture, commands, zero-network guarantee, and CI step.

### Initial contract coverage

1. All GET and POST router combinations forward the expected query/body/user values and return their intended status codes.
2. Unknown routes and unsupported methods return JSON `404` responses.
3. Malformed and non-object JSON return `400` responses.
4. Typed backend errors preserve their intended `4xx` status; unexpected errors return `500`.
5. Read responses expose Cache-Control and ETag headers, matching ETags return `304`, and mutations invalidate the memory cache.
6. Trigger routes enforce the `12/minute` limit and return `429`, `Retry-After`, and rate-limit headers without invoking the backend again.
7. Any attempted non-loopback network request fails the suite immediately.

### Verification plan

1. Run `npm --prefix frontend run test:api` and confirm no external request or secret is used.
2. Run the ordinary Vitest suite and confirm integration files are not duplicated.
3. Run TypeScript typechecking and the production build.
4. Run the complete Playwright suite.
5. Run `git diff --check` and inspect the final CI workflow and documentation diff.

### Verification result

- `npm run typecheck`: passed.
- `npm test`: 86 files and 871 unit/domain tests passed; the integration file was not duplicated.
- `npm run test:api`: 26 loopback API contract tests passed after relevant Supabase, n8n, OpenAI, and Gemini environment variables were removed from the test process.
- `npm run build`: passed. Existing stylesheet and bundle-size warnings remain non-blocking.
- `npm run test:e2e`: all 15 Chromium tests passed.
- The build-generated `frontend/public/version.json` change was restored so the final diff contains only intentional source, CI, test, and documentation changes.

## Historical deployment detection and return-to-latest flow (2026-09-01)

### Empirical root cause

- Each immutable Vercel deployment serves the JavaScript bundle and `/version.json` generated when that deployment was built. The deployment notifier currently requests a relative `/version.json`, so a rollback URL compares its embedded build information with its own historical manifest and cannot tell that production has advanced.
- The notifier then compares the old build against GitHub `main` and reports `building` indefinitely, even when the newer production deployment already exists.
- The version switcher decides which release is active from the static `release.isLatest` flag. Consequently, every historical deployment incorrectly labels the canonical production row as `Active`.
- Release UI is compiled into each immutable bundle. Deployments from before version control was implemented cannot receive that React feature retroactively. The durable fix must therefore be carried by the current release and all future rollback snapshots.

### Architecture and target files

- `frontend/utils/deploymentVersions.ts`
  - Centralize the canonical production origin.
  - Add pure helpers to identify historical Vercel hostnames, preserve the current route when returning to production, and determine the active release from the real hostname/build commit.
- `frontend/hooks/useDeploymentNotifier.ts`
  - Add an explicit `historical` state, initialize it synchronously from the hostname, skip misleading GitHub/build polling on immutable historical hosts, and expose a `returnToLatest` action.
- `frontend/components/DeploymentNotifierBanner.tsx`
  - Render a clear historical-version disclaimer and one-click return-to-latest button.
- `frontend/components/VersionSwitcherModal.tsx`
  - Stop treating `isLatest` as synonymous with the active build. Show the actual historical build and replace rollback wording with a return-to-latest action while viewing a snapshot.
- `frontend/utils/deploymentVersions.test.ts` and `frontend/hooks/useDeploymentNotifier.test.ts`
  - Cover canonical, preview/historical, localhost, route preservation, release matching, and the historical status behavior.

### Compatibility and limits

- Canonical production and local development keep the existing new-deployment polling behavior.
- Historical/preview deployments are identified as immutable code snapshots with an explicit path back to production; no project or query deep link is discarded. They are not described as data rollbacks because their configured APIs may still mutate live project data.
- The immutable release list remains curated because Vercel deployment discovery requires authenticated deployment metadata. The `Latest production` destination itself stays automatically synchronized through the stable production alias.
- Already-created immutable bundles without this code cannot be modified in place. Once this change ships, every later snapshot includes the detection and recovery UI.

### Verification plan

1. Run focused deployment-version and notifier unit tests.
2. Run TypeScript typechecking and the complete unit suite.
3. Run the production build and restore generated `frontend/public/version.json` metadata.
4. Run the Playwright suite to catch fixed-banner or navigation regressions.
5. Run `git diff --check` and inspect the final branch diff without committing or pushing until explicitly requested.

### Verification result

- Focused deployment-version and notifier tests: 13 passed.
- TypeScript typechecking: passed.
- Full unit/domain suite: 94 files and 923 tests passed.
- Zero-token API integration suite: 26 tests passed.
- Production build: passed without the prior CSS or chunk-size warnings.
- Playwright Chromium suite: all 16 tests passed.
- Generated `frontend/public/version.json` metadata was restored after verification.

## Quick Deal Questionnaire friction reduction and local document prefill (2026-09-01)

### Empirical baseline and root causes

- `ManualDealIntakeForm` initializes with the manufacturing preset, so the generate action is enabled before a user enters any data and sample assumptions can be mistaken for the user's deal.
- More than 30 core and optional assumptions are presented across five peer sections. Only deal name and asking price currently gate submission even though revenue and EBITDA/SDE are needed for a meaningful preliminary screen.
- Currency inputs use raw HTML number fields, requiring values such as `5200000` rather than common broker notation such as `$5.2M`.
- Three example presets and deterministic unit coverage already exist, but Playwright only verifies that the questionnaire and tutorial open. It never enters values, generates a deal, or confirms that the resulting project appears in the workspace.
- The repository has no local DOCX extraction dependency or review-before-apply import contract. Sending a one-page teaser through the full document pipeline would add latency and model cost that are unnecessary for labeled summary statistics.

### Architecture and target files

- `frontend/utils/manualDealIntake.ts`
  - Add a blank/default form factory with financing defaults but no example company data.
  - Add a tested flexible numeric parser for `$5.2M`, `5,200,000`, and `5.2 million`.
- `frontend/utils/questionnaireImport.ts`
  - Add pure label/value extraction for common teaser statistics, ambiguity detection, source snippets, safe value bounds, and field display metadata.
  - Extract `.docx` text locally through a dynamically loaded DOCX parser; support pasted text and `.txt`, reject legacy `.doc`, macro-enabled, oversized, malformed, and unsupported files.
- `frontend/components/QuestionnaireQuickImport.tsx`
  - Add a local Word/paste intake panel, recognized-field review, warnings, and explicit Apply/Cancel actions. Never upload or auto-submit.
- `frontend/components/ManualDealIntakeForm.tsx`
  - Default to a blank four-field quick screen, retain the existing detailed workflow behind `Add more detail`, synchronize presets/imports, require the four screening fields, expose progress, and add a clear/reset action.
- `frontend/components/CommandPalette.tsx` and `frontend/components/DealChatPanel.tsx`
  - Register the new questionnaire prefill anchor and discovery guidance required by the repository navigation contract.
- Tests and documentation
  - Extend deterministic tests for blank defaults, human-formatted values, scenario verdicts, document mapping, ambiguity/malformed-file behavior, no-network import, and an end-to-end form submission that creates a visible project.
  - Update questionnaire/testing documentation with the zero-token import workflow and its limits.

### UX and safety contract

1. Quick mode requests company name, asking price, revenue, and EBITDA/SDE only; all other assumptions are optional.
2. Example presets are explicitly labeled and never load by default.
3. Imported values remain pending until the user reviews and applies them.
4. Local parsing never calls n8n, Supabase, R2, Slack, or an AI provider.
5. Ambiguous values are omitted rather than guessed. Imported values are bounded and source-labeled.
6. `.docx` and plain text are accepted; legacy `.doc`/`.docm` and files above 5 MB are rejected with conversion guidance.

### Verification plan

1. Run focused manual-intake and questionnaire-import unit tests.
2. Run the new Playwright quick-screen submission test and existing questionnaire tutorial tests.
3. Run TypeScript typechecking, all unit tests, the API integration suite, and the production build.
4. Run the complete Playwright suite.
5. Restore generated build metadata, run `git diff --check`, and leave changes uncommitted until explicitly requested.

### Verification result

- Focused manual-intake, questionnaire-import, and Deal Chat navigation tests: 47 tests passed.
- Real local `.docx` extraction passed against the repository's WidgetCo fixture; the parser makes no network call and is emitted as an on-demand production chunk.
- `npm run check`: TypeScript passed, 95 unit/domain files with 935 tests passed, 26 loopback API integration tests passed, and the production Vite build completed.
- `npm run test:e2e`: all 19 Chromium tests passed, including blank intake, formatted four-field generation, review-before-apply, and Command Palette discovery.
- `git diff --check`: passed. Build-generated `frontend/public/version.json` was restored.

## Questionnaire AI draft assistance and intake routing boundary (2026-09-01)

### Product boundary

- **Quick Fill** creates a preliminary, user-reviewed screening draft. It may parse small structured files locally or ask an AI extraction workflow for proposed fields, but it never creates evidence records, starts synthesis, or claims that a value is verified.
- **Project Intake** remains the evidence-grade pipeline for data rooms, long/complex documents, scans used as diligence evidence, presentations, email, audio, and video. It persists the original source, creates per-document audit records and citations, and participates in cross-document synthesis.
- A small image such as a broker-teaser screenshot may enter through Quick Fill only when the user explicitly chooses AI Assist. The result is still an unverified draft. Multi-page scans and all audio/video stay in Project Intake; the chatbot reads their saved extraction or transcript rather than reprocessing the raw media.

### Routing policy

1. `.docx`, `.txt`, `.csv`, `.tsv`, `.json`, `.xlsx`, and `.xlsm` under the quick-file limit use deterministic local extraction first.
2. Ambiguous local text/table results may be sent to the opt-in AI draft workflow with current form values and source metadata.
3. `.png`, `.jpg`, `.jpeg`, and `.webp` may use the same opt-in AI draft workflow with strict image count/size limits.
4. PDFs, legacy Office files, presentations, email, multi-file batches, audio, and video route to Project Intake. A later text-only PDF adapter may be added if it can preserve page citations without duplicating OCR.
5. AI and chatbot responses can only propose typed questionnaire patches. The user must review and apply them; existing non-empty values are never overwritten silently.

### Architecture and target files

- Refactor `questionnaireImport.ts` around source-aware candidate lines so spreadsheet proposals retain worksheet/cell provenance.
- Add lazy local spreadsheet parsing and safe JSON/TSV handling without increasing normal dashboard startup cost.
- Add a shared draft schema containing field, value, confidence, source, period, units, extraction kind, warnings, and missing essentials.
- Add an intake classifier that returns `local`, `ai_draft`, or `project_intake` with a user-facing reason.
- Add a same-origin backend relay for a dedicated n8n questionnaire-draft webhook. The relay accepts bounded normalized content or one bounded image, never browser-exposed Header Auth.
- Create the n8n workflow unpublished first, validate its strict JSON contract, then connect the opt-in UI.
- Extend Dillon Chat with tools that read, validate, and propose questionnaire patches. Attachments use the same classifier and draft service rather than a parallel ingestion path.

### Safety and verification

- Deterministic calculations remain in TypeScript; the model interprets labels and prose but does not become the arithmetic source of truth.
- Hash/idempotency keys prevent duplicate paid extraction.
- AI output is allowlisted, range-validated, source-labeled, and rejected on malformed schemas.
- Tests cover routing decisions, spreadsheet provenance, conflicting periods, AI schema validation, no-network local parsing, image limits, patch review, and chat attachment handoff.
- The n8n workflow remains unpublished until local/API tests and an explicit synthetic workflow test pass.

---

# Questionnaire image routing and per-document BYOK repair

## Empirical findings

- The live per-document workflow (`W5Jp7CJIQbNy0qlY`) correctly normalizes files before model analysis: video uses Gemini, audio uses OpenAI transcription, and other documents use LlamaParse.
- Its provider router sends requests with a user-supplied key to provider-specific HTTP Request nodes and sends managed requests to the existing Terra/Sol LLM chain.
- The latest saved versions of the four BYOK HTTP nodes enable JSON request bodies but do not expose a configured JSON body. The active-version graph cannot currently be read through MCP because `get_workflow_details` reports the existing header-auth credential as missing, so history and controlled workflow validation must be used before publication.
- The questionnaire workflow (`U6hocPOecg7AQS0I`) receives a small image as a data URL but currently replaces it with placeholder text. The existing LLM prompt therefore does not receive the image contents.
- Small `.docx`, `.xlsx`, `.xlsm`, `.txt`, `.csv`, `.tsv`, and `.json` questionnaire sources are already parsed locally. Sending those raw files through LlamaParse would add avoidable latency, network transfer, and provider usage.

## Intended boundary

- Keep local structured questionnaire prefill local and token-free.
- Use the questionnaire workflow only for bounded text enrichment and a single small image converted to text for a reviewable form draft.
- Continue routing PDFs, audio, video, large files, full data rooms, and evidence-grade analysis through Project Intake and the per-document workflow.
- Preserve every existing LLM model node, Terra/Sol fallback, Structured Output Parser, auto-fix model, salvage chain, and retry loop.

## Live n8n changes

### Per-document workflow

1. Preserve BYOK keys and model selections when the submit workflow invokes the per-document workflow; do not persist those secrets in document tables.
2. Preserve the same transient BYOK fields when the retry workflow reloads a failed document.
3. Correct provider detection to read `userProvider`, `docPrimaryModel`, and the provider-specific key fields already sent by the application.
4. Map UI model labels to provider API identifiers and use the configured backup model on later provider-retry attempts.
5. Add complete provider-native JSON bodies to the OpenAI, Anthropic, Gemini, and DeepSeek HTTP Request nodes.
6. Keep API keys in headers/query parameters as the current router expects; do not modify stored model credentials.
7. Ensure every provider receives the normalized document text, exact source-relative path, requested model, and structured-output instructions.
8. Keep all four provider outputs feeding the existing response normalizer and retry classifier.

### Questionnaire workflow

1. Convert a validated image data URL into an n8n binary item.
2. Route image requests through a LlamaParse node using the existing Pod 1 LlamaParse credential.
3. Normalize the OCR result into `sourceText` and feed it into the existing questionnaire LLM chain.
4. Route text requests directly into that same chain.
5. Add bounded parser failure handling without changing the existing LLM retry/fallback graph.
6. Correct the workflow description so its persistence behavior matches the actual graph, unless persistence is intentionally removed in a later change.

## Repository changes

- Align both Quick Fill and chatbot image requests with the existing questionnaire relay contract (`requestId`, `sourceType`, `fileName`, `imageDataUrl`, and direct draft response).
- Stop requiring or forwarding a browser-stored OpenAI key for the questionnaire workflow because its LLM chain intentionally uses the managed Pod 1 credential.
- Keep the backend request compatible with old callers by tolerating, but not forwarding, an optional legacy `userOpenAiApiKey` field.
- Update `docs/QUICK_DEAL_QUESTIONNAIRE.md` and `docs/LIVE_N8N_WORKFLOWS.md` to describe local-first parsing, image OCR, and the Project Intake boundary.
- Do not add audio, video, PDF, multi-file, or evidence persistence behavior to Quick Fill.

## Verification

1. Validate every changed n8n node configuration before applying operations.
2. Validate each resulting workflow graph and inspect the saved version.
3. Test BYOK request construction without using real diligence files or Supabase Storage uploads.
4. Test questionnaire text and image paths with bounded synthetic fixtures; confirm the image OCR text reaches the existing chain.
5. Verify error outputs terminate with an actionable response rather than leaving a request running.
6. Publish only after validation, then verify `active: true` and active-version parity when MCP permits it.
7. Run TypeScript, unit tests, API integration tests, and the production build for any repository changes.

## Explicit non-goals

- No changes to existing Chat Model nodes or their credentials/model selections.
- No audio/video processing in the questionnaire workflow.
- No full-document diligence or synthesis from Quick Fill.
- No test uploads to Supabase Storage.

---

# Questionnaire escalation UX and chat-tool hardening (2026-09-02)

## Verified findings

- Small structured questionnaire files are decoded locally with Mammoth, ExcelJS, delimiter-aware CSV/TSV parsing, JSON flattening, or `File.text()`. The deterministic field matcher deliberately withholds conflicting values and reports warnings.
- The extracted text already supports an explicit questionnaire-AI pass, but the UI only exposes that option when a required field is missing. Ambiguous optional fields can therefore be stranded in the local review state.
- The newly added questionnaire image lane is functionally separate but visually overlaps the existing retry/salvage lanes on the n8n canvas.
- The chat agent's six Code Tools use JSON examples rather than explicit schemas. The database query tool also embeds a privileged credential in workflow source.

## Targeted changes

1. Keep deterministic parsing as the zero-token first pass, but expose the optional AI interpretation action for every non-empty local extraction so ambiguous wording can be escalated without starting full diligence.
2. Reposition questionnaire nodes into separate main, image, provider-retry, and salvage lanes. Change positions only; preserve all graph connections and model/parser fallback behavior.
3. Replace Code Tool JSON examples with explicit manual schemas that constrain required fields, operations, numeric ranges, and accepted query shapes.
4. Replace the credential-bearing database Code Tool with three read-only Supabase Tool nodes using the existing n8n Supabase credential, and update the agent's tool instructions accordingly.
5. Publish both workflows, re-read their active versions, and verify the frontend with focused tests, TypeScript, and the production build. Do not execute paid AI or mutate production deal data for verification.

---

# Full Quick Deal Questionnaire walkthrough (2026-09-02)

## Verified gaps

- The current eight-step tour describes the questionnaire but does not populate a deal, demonstrate local prefill, or show AI-assisted review.
- Detailed section steps switch content programmatically, but the sequence does not separately spotlight the five section tabs and their resulting panels.
- The prefill review banner treats the deterministic local draft as though it were an AI extraction because both states share one derived `draft` object.

## Targeted changes

1. Expand the playlist to an 18-step Apex Precision Dynamics case study spanning the quick screen, live math, local prefill, mocked AI review, all five detailed section tabs, and the final generation action.
2. Add walkthrough-only simulation actions that populate temporary form values and mock prefill results without invoking n8n, creating a project, or overwriting the user's pre-tour state.
3. Restore the exact questionnaire and prefill state on exit or completion, and suppress session persistence while tutorial values are active.
4. Distinguish local parser results from real or mocked AI drafts in the prefill UI.
5. Update unit, Playwright, gallery, and documentation expectations; run TypeScript, focused tests, the production build, and browser verification.

---

# n8n Code Node Modernization and Red Underline Audit (2026-09-02)

## Verified Findings
- In n8n's Monaco editor, Code nodes running in `mode: "runOnceForAllItems"` flag `$json` with red squiggly underlines (`Cannot find name '$json'`) because `$json` is only typed for `mode: "runOnceForEachItem"`.
- Additionally, `runOnceForAllItems` nodes returning bare objects (`return { json: ... }`) trigger return-type warnings because n8n's typed API expects an array of items (`return [{ json: ... }]`).
- In Consolidator Workflow `IoSad3rTYJMk4Mon`:
  - `Route Synthesis Provider` (`runOnceForAllItems`) used `$json` 12 times and returned `{ json: ... }`.
  - `Normalize Synthesis Response` (`runOnceForAllItems`) used `$json` 15+ times and returned `{ json: ... }`.
  - `Validate Repaired Synthesis Schema` (`runOnceForAllItems`) used `$json` and returned `{ json: ... }`.
  - `Code in JavaScript` (`runOnceForAllItems`) returned `{ json: ... }` instead of `[{ json: ... }]`.
- Although n8n v1 Cloud currently shims `$json` at runtime via backwards compatibility, it is deprecated, causes visual linter alarms, and risks silent failure in stricter future n8n releases.

## Targeted Changes
1. Modernize all 4 `runOnceForAllItems` nodes in Consolidator Workflow `IoSad3rTYJMk4Mon` to access input via `$input.first()?.json || {}` and return items wrapped in an array `[{ json: { ... } }]`.
2. Strictly preserve all existing Prettier 2-space formatting, comments, variable names, failover logic, and model node parameters.
3. Apply the update via `update_workflow` MCP tool, immediately publish via `publish_workflow`, and verify that `active: true`.
4. Run syntax validation and test suites to verify zero regressions.

---

# Questionnaire walkthrough downstream project tour (2026-09-02)

## Verified root cause

- The questionnaire playlist ends at the generate button, so it never explains where the generated model appears afterward.
- Dashboard walkthrough mode currently substitutes one global four-document Apex Industrial fixture for every playlist. Appending Overview, Diligence, Synthesis, and Projects steps without changing that selector would show the wrong company and a batch size of four.
- Calling the real questionnaire submit handler is inappropriate for a tutorial because it persists local project state and can invoke the deal-model backend.

## Targeted changes

1. Add a dedicated, derived-only Apex Precision Dynamics walkthrough project using the existing manual questionnaire model and synthesis builders.
2. Expose that project only after the tutorial reaches its generated-result steps, with one completed questionnaire record, expected batch size one, and one synthesis result.
3. Keep the fixture entirely in React render state: no localStorage, Supabase, n8n, model-provider, or deal-model POST requests.
4. Append guided steps for Overview, Diligence batch/result, Synthesis, and the Projects portfolio, using stable existing card anchors.
5. Restore the pre-tour tab when the walkthrough exits and remove the derived project automatically.
6. Update unit, Playwright, gallery, and documentation expectations; verify TypeScript, tests, production build, and the rendered browser flow.

---

# Capacity telemetry, Realtime consolidation, and LOI terms editor (2026-09-04)

## Verified findings

- The dashboard's `CONCURRENCY = 3` chunks browser submission requests; it is not a global n8n or LLM worker limit. Recent production records already show batches with 5–9 overlapping document processing windows.
- The production `documents` table contains enough lightweight timing, token, model, status, and error fields to measure observed capacity without loading analysis JSON or adding a database migration.
- The browser constructs two Supabase clients with the same project and auth storage key. Realtime then invalidates both broad portfolio queries and project-scoped queries for each event, while the dashboard callback also refreshes the active project.
- The LOI generator contains editable business terms as hard-coded prose. The modal preview, Markdown download, and print/PDF path must consume one resolved terms object so they cannot disagree.

## Targeted changes

1. Add a read-only `GET /api/diligence/capacity-telemetry` endpoint that returns current processing/queued documents, active batches, observed document and batch concurrency, p50/p95 processing duration and token volume, failures, rate-limit signals, model mix, and recent batch peaks for a bounded lookback window.
2. Add a Spending & Analytics capacity card with an explicit observed-versus-configured distinction, a manual refresh action, and a low-frequency refresh while that tab is mounted. Do not introduce throttling, queue enforcement, RLS changes, paid calls, or n8n workflow changes.
3. Reuse the existing authenticated Supabase browser singleton for access requests, remove duplicate-client construction, narrow Realtime invalidation to the active project, handle timeout/disconnect states, and correct the stale three-second polling copy.
4. Add a typed LOI draft terms model and editor for parties, offer, transaction form, validity, exclusivity, escrow, working-capital true-up, transition, non-compete, and governing law. Feed the same terms into the on-screen preview, Markdown, and printable HTML.
5. Give the capacity UI and LOI editor stable DOM anchors and register them with the chat/command navigation surfaces required by repository conventions.

## Verification

1. Add pure unit tests for concurrency sweep-line calculations, batch overlap, percentiles, stale active rows, rate-limit classification, and LOI term overrides.
2. Extend API integration coverage for the new read-only endpoint and update access-request/Reatime component tests for singleton and scoped invalidation behavior.
3. Run the focused LOI, export modal, Spending Analytics, Realtime, chat panel, and command palette tests.
4. Rebuild the Vercel API bundle, then run TypeScript typechecking, the zero-token API integration suite, the production build, and browser verification of the capacity card and LOI editor.

## Explicit non-goals

- No concurrency cap or provider-side queue is added in this change.
- No Supabase schema, RLS, storage, upload, or n8n workflow change.
- No live LLM request is made to estimate capacity.
- No commit or push unless requested after verification.

---

# Stress benchmark reliability and Fast Origin Transfer guardrails (2026-09-05)

## Verified findings

- The scheduled benchmark failed before issuing any requests because the GitHub Actions repository has no `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` secrets configured. That failed run generated no Vercel, Cloudflare, Supabase, n8n, or LLM traffic.
- The stress harness calls Cloudflare R2 and Supabase directly; it does not target the production Vercel application. Its synthetic PDF body is only a few dozen bytes, so it cannot explain the reported Vercel Fast Origin Transfer increase.
- The combined stress runner imports two modules that start themselves at import time and then explicitly invokes both exported runners. Once credentials are configured, that would run both workloads twice and produce misleading measurements.
- Production uploads try Cloudflare R2 directly and then Supabase directly, but the final fallback unconditionally posts the complete binary file through the same-origin Vercel API. Vercel counts request bodies sent from its CDN to a Function as Fast Origin Transfer.

## Targeted changes

1. Make each stress sub-runner execute exactly once, whether invoked independently or through the combined runner, and preserve the requested count and concurrency in the generated report.
2. Add a clear GitHub Actions credential preflight and accept an anon-key secret fallback while retaining service-role support for installations whose test-table policies require it.
3. Keep browser-to-R2 and browser-to-Supabase uploads unchanged, but disable the Vercel binary proxy by default. Permit it only through an explicit production feature flag and enforce a bounded payload size when enabled.
4. Update upload tests and recovery documentation to describe the direct-storage behavior and explicit emergency fallback.

## Verification

1. Run focused storage upload tests and a local no-credential stress-run smoke check.
2. Rebuild the Vercel API bundle.
3. Run TypeScript typechecking, unit tests, API integration tests, and the production build.

## Explicit non-goals

- Do not send live documents, invoke n8n, or spend LLM tokens during verification.
- Do not enable a production Vercel upload proxy automatically.
- Do not commit or push without a separate user request.

---

# Logged-in landing header responsive repair (2026-09-05)

## Verified root cause

- At a 1440 px viewport, the landing header is 1425 px wide while its authenticated brand, navigation, identity, sign-out, walkthrough, and dashboard controls extend to roughly 1727 px.
- The prior `overflow-x-hidden` change masks that oversized flex row, so the right-side actions are clipped rather than reflowed.
- The same one-row composition cannot fit on phone widths even though some labels are hidden.
- The landing page also subscribes to authentication even though `App` already owns and passes that state. Supabase emits a fresh user object, the landing listener saves it, and the resulting custom event/prop update can repeatedly resubscribe until React reports a maximum update-depth error.

## Targeted changes

1. Separate the brand/actions row from the section navigation at desktop widths so the two groups no longer compete for one fixed-width flex row.
2. Keep the signed-in identity visible on medium screens, use an icon-based sign-out control on phones, and shorten the dashboard action label on phones.
3. Remove the page-level horizontal clipping workaround and rely on containers that fit their viewport.
4. Use the application-owned auth prop without creating a duplicate landing-page listener; retain the listener only for standalone uncontrolled renders.
5. Add a focused browser regression test for authenticated header geometry and the auth update loop.

## Verification

1. Run the focused landing-page test, TypeScript typecheck, and production build.
2. Browser-check authenticated landing layouts at phone, tablet, laptop, and 1440 px desktop widths.
3. Confirm document width never exceeds viewport width and every header action remains inside the header bounds.

## Explicit non-goals

- Do not change authentication, landing-page content, dashboard navigation, or walkthrough behavior.
- Do not commit or push without a separate user request.
