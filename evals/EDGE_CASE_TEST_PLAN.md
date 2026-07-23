# Edge-Case Test Plan

Run these against a disposable presentation project where possible. Record the project ID, request ID, timestamp, screenshot, and resulting document status for each run.

## Before Every Test

1. Refresh the app and open the correct project.
2. Record the project ID displayed in the Project Synthesis card.
3. In a separate browser tab, open the **Errors** workspace tab.
4. Capture the submission-history row before and after the test.
5. Do not reuse a project if an earlier test is still `queued`, `processing`, or `synthesizing`.

## 1. Missing or Incomplete Data

**File:** `MERGEWORKS TESTING - SAMPLE MALFORMED DATA EDGE CASE #2.docx`

**Steps**

1. Create or select a fresh project.
2. Upload the file and select **Queue in production**.
3. Wait for the document to reach a terminal status.
4. Open the document in Submission History.

**Pass criteria**

- The app does not silently present `TBD`, `N/A`, or `See Note` as verified financial values.
- The document is escalated or marked for human review, with a yellow/red assessment or a clear missing-data reason.
- The document remains visible and the project does not become stuck.

**Evidence to capture**

- Submission History details showing review/escalation state.
- The red/yellow flags or AI summary.
- Project synthesis status.

## 2. Malformed or Wrong-Shape CSV

**File to create:** `MERGEWORKS TESTING - WRONG SHAPE P&L EDGE CASE #2.csv`

Use this deliberately malformed CSV. The numeric commas are intentionally unquoted, so its data rows do not match the five-column header.

```csv
Acme Widgets Inc. - Management P&L Export
Prepared for buyer review; unaudited
Amounts in USD unless otherwise noted

Metric,FY23A,FY24A,LTM Sep-25,Notes
Sales,8,500,000,9,200,000,10,100,000,Includes pass-through revenue
Cost of Sales,(4,100,000),(4,600,000),(5,300,000),
Gross Profit,4,400,000,4,600,000,4,800,000,
Operating Profit,1,200,000,#REF!,1,350,000,2024 formula broken
Adjusted EBITDA,1.4m,TBD,N/M,See add-back schedule
```

**Steps**

1. Upload the CSV to a fresh project and queue it in production.
2. Refresh Submission History after it reaches a terminal state.
3. Select the document row.

**Pass criteria**

- Status is `needs_review`, not an endlessly active job.
- A **Table structure review** badge and an explanation such as `INCONSISTENT_COLUMN_COUNT` and/or `INVALID_OR_PLACEHOLDER_VALUES` appear.
- It does not receive normal LLM-derived EBITDA, valuation, or financial conclusions.
- The project batch reaches a terminal state rather than remaining stuck.

**Evidence to capture**

- The table-review badge and detail message.
- The document status and project status.
- The absence of a fabricated financial conclusion.

## 3. Duplicate Document

**File:** Any small valid document, for example a copy of a normal test packet.

**Steps**

1. In a fresh project, upload and process the file once.
2. Upload the exact same file to the same project again, with the same filename and size.
3. Select **Queue in production**.

**Pass criteria for the dashboard/API guard**

- The second upload is not queued.
- A global notice is visible above the workspace navigation, not only inside Diligence.
- The message identifies the duplicate document and project.
- Submission History still contains one document row for that file/project combination.

**Direct-webhook test**

1. Send the same authorized intake payload twice with the same project ID, filename, and file size.
2. The first request should be accepted; the second should return HTTP `409` with `duplicate: true` and an `existingRequestID`.
3. Send the same payload metadata with a different project ID. It should be accepted.
4. Confirm the original project has one new Drive file/document row/LLM run, while the second project has its own accepted row.

## 4. Provider Failure and Stuck-Job Recovery

**Safer primary test: stale-job recovery**

1. Use a disposable project with a Drive-backed document row that can safely be retried.
2. In the n8n document table, set its status to `processing` and `processingStartedAt` to more than 30 minutes ago. Do not alter a real active client document.
3. Wait for the watchdog's next 15-minute run.
4. Refresh Submission History and Errors.

**Pass criteria**

- The watchdog re-invokes the robust per-document workflow.
- The document leaves the stale state and ultimately reaches `completed`, `failed`, or `needs_review`.
- A recoverable error/retry trail is visible in Errors when a failure occurs.

**Optional alert-threshold test**

- Create three controlled uncaught production failures for the same workflow in 30 minutes.
- Confirm no Slack alert for attempts one and two, then one alert in `#pod-1-agent-alerts` for attempt three.
- Confirm no duplicate alert within the following hour.

**Do not use manual n8n executions** to prove the Error Trigger: n8n Error Trigger behavior differs from production executions.

## 5. Hallucination or Invalid LLM Output

**File:** `MERGEWORKS TESTING - AMBIGUOUS HANDWRITTEN EMAIL FOR HALLUCINATION EDGE CASE 5.docx`

**Steps**

1. Upload it to a fresh project and queue it in production.
2. Wait for a terminal document status.
3. Open the selected Submission History document and Errors, if applicable.

**Pass criteria**

- The app does not show invented EBITDA, valuation, citations, or confidently asserted financial facts that are absent from the source.
- Invalid structured output is retried by the output parser; an unrecoverable result becomes failed/escalated/reviewable rather than silently completing.
- The source document and its request ID remain available for human review.

**Evidence to capture**

- Final document status and human-review/escalation state.
- The lack of fabricated values in the document analysis.
- Any corresponding Errors entry.

## Direct n8n Webhook Duplicate Guard

Implemented immediately after request normalization and before durable-row creation, Drive upload, and the robust document processor:

1. Normalize the incoming `projectId`, filename (lowercase, trim spaces), and file size. Prefer a content hash when the intake provides file bytes or a Drive file ID.
2. Query **Document Specific Fields** for the same project and matching normalized filename + size (or matching content hash).
3. Branch:
   - **Duplicate:** respond `409 Conflict` with `{ duplicate: true, existingRequestID, message }`; do not upload, create a row, or invoke the LLM.
   - **New document:** continue the existing intake workflow exactly as today.
4. The active comparison normalizes the filename in the guard and compares it with file size. A future `contentHash` would make the key stronger.
5. A future concurrency-hardening pass can return an existing accepted row for an identical request ID instead of a conflict response.

**Direct-webhook test**

1. Send the same authorized webhook payload twice with the same project ID, filename, and size.
2. Expect the first response to be accepted and the second to be `409` / `duplicate: true`.
3. Send the same metadata to a second project ID and confirm it is accepted.
4. Confirm one Drive file/document-table row/LLM execution for each accepted project submission.
