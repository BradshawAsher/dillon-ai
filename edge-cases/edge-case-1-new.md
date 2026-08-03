# Edge Case #1

Category: 1. Missing or Incomplete Data

Status: Implemented; regression test should be re-run against the current lax pipeline

### 1. What is the edge case (specific)?

- A seller-provided financial document contains placeholders or non-numeric text (`TBD`, `N/A`, or `See Note`) in fields that would normally contain revenue, EBITDA, margins, or other numeric facts.
- The risk is not that a document is merely incomplete. The risk is that the agent treats a placeholder as a confirmed number or invents a replacement value.

### 2. What input triggers it (test case)?

- Upload `MERGEWORKS TESTING - SAMPLE MALFORMED DATA EDGE CASE #2.docx` to a fresh project. (The fixture name is historical; it is the official test file for Edge Case #1.)
- The test document includes `TBD`, `N/A`, and `See Note` where numeric financial values are expected.

### 3. What the agent SHOULD do (guardrail)?

- Never present a placeholder as a verified numeric fact and never silently replace it with an invented number.
- Preserve unavailable financial fields as `null` / unavailable, with a clear missing-data explanation and an evidence/status label such as Needs review or Contradicted where appropriate.
- Surface a red or yellow data-quality finding only when warranted by the missing fact's decision impact; incomplete data alone must not automatically turn every document or project RED.
- Continue the document workflow and preserve the uploaded source, so the project can synthesize any usable evidence and list a targeted follow-up question.

### 4. What the agent DOES do (current implementation)?

- The structured extraction prompt and output handling treat `TBD`, `N/A`, and similar placeholders as unavailable rather than confirmed numeric inputs.
- The document remains visible in Submission History and can produce a review/escalation finding instead of being silently discarded or causing the project to hang.
- Project synthesis can continue when there is usable completed evidence. Missing facts remain visibly unresolved rather than being backfilled by the quantitative model.
- Historical test evidence from 2026-07-15 showed the model returning `null` for revenue, setting an escalation/review signal, and adding a data-quality flag. Re-run the current test because later prompt/risk calibration intentionally made the product less strict.

### 5. How the guardrail is enforced

- The document schema distinguishes missing/unavailable values from confirmed values; the UI carries status vocabulary through to evidence and Deal Model displays.
- Deterministic and prompt-level checks reject unsupported numeric claims, while the project-level model keeps missing inputs as analyst-confirmation needs rather than silently supplying them.
- The batch counter treats terminal document outcomes as terminal, preventing an incomplete source from leaving the batch timer running indefinitely.

### 6. Evidence and test plan

- Run the Missing or Incomplete Data section in `evals/EDGE_CASE_TEST_PLAN.md`.
- Pass criteria: no `TBD`, `N/A`, or `See Note` is displayed as a verified number; the document remains reviewable; and the project does not get stuck.
- Capture the document row, data-quality finding, and resulting synthesis/open question if one is produced.
