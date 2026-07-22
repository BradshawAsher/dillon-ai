🛡 Edge Case #3

Category: 3. Duplicate triggers or entries   

Status: Partially implemented - dashboard/API guard complete; direct-webhook guard still required

1. What is the edge case (specific): 
- The system receives duplicate files or triggers for the same financial packet, which could lead to redundant LLM processing and inconsistent project states.

2. What input triggers it (test case): 
- Sending multiple webhook requests with the same projectID + fileName + fileSize (or a hash of the file).

3. What the agent SHOULD do (guardrail): 
- The system must treat the database as a Metadata Cache:
- Before initiating the LLM extraction chain, the workflow must query the documents table to check if a hash of the current file metadata (e.g., fileName + fileSize) already exists for that projectID.
- If a match exists, the system logs the event as a DUPLICATE_TRIGGER and skips the heavy LLM extraction, instead pointing to the existing cached data row.
- This ensures the system is efficient, cost-effective, and prevents "double-processing" identical data.


4. What the agent DOES do (current implementation):
- The dashboard refreshes project history immediately before submitting.
- It compares project ID + normalized file name + file size against existing rows and against the files selected in the same batch.
- A duplicate is not queued. The user sees an inline notification such as: "This document has already been added to this project."
- The server repeats the same metadata check before it forwards the dashboard request to n8n, protecting against stale browser state.
- The document is not deleted or overwritten; the existing row remains the audit record.

5. Remaining gap before this is fully closed:
- A request sent directly to the n8n intake webhook can still bypass the dashboard/API guard. The live intake workflow must query Document Specific Fields using project ID + normalized file metadata (or, preferably, a content hash) before creating a row or invoking the LLM chain.
- The live intake-workflow configuration is currently not readable through the n8n connection because its webhook credential is unavailable. Do not modify it until that access issue is resolved.
