## Edge Case #3

Category: 3. Duplicate triggers or entries

Status: Partially implemented — dashboard/API guard complete; direct-webhook guard still required

### 1. What is the edge case (specific)?

- The system receives duplicate files or triggers for the same financial packet, which could lead to redundant LLM processing and inconsistent project states.

### 2. What input triggers it (test case)?

- Submit the same file twice for the same project, with the same project ID, normalized filename, and file size.
- A stronger future test is sending the same direct n8n webhook request twice with the same request ID or content hash.

### 3. What the agent SHOULD do (guardrail)?

- Before initiating the LLM extraction chain, check whether matching file metadata or, preferably, a content hash already exists for that project.
- If a match exists, skip heavy processing, preserve the existing audit row, and tell the user the document was already added.

### 4. What the agent DOES do (current implementation)?

- The dashboard refreshes project history immediately before submitting and compares project ID, normalized filename, and file size against existing rows and files selected in the same batch.
- A duplicate is not queued. The user sees a globally visible upload notice explaining that the document has already been added to the project.
- The server repeats the same metadata check before forwarding the dashboard request to n8n, protecting against stale browser state.
- The existing row is not deleted or overwritten; it remains the audit record.

### 5. Remaining gap before this is fully closed

- A request sent directly to the n8n intake webhook can still bypass the dashboard/API guard. The intake workflow should query Document Specific Fields using project ID plus normalized file metadata, or preferably a content hash, before creating a row or invoking the LLM chain.
- The n8n MCP can list the relevant Header Auth credential, but its workflow-detail endpoint currently fails when loading some Header-Auth workflows. This is an n8n/MCP credential-resolution limitation, not a reason to weaken the dashboard/API guard.
