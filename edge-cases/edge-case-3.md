## Edge Case #3

Category: 3. Duplicate triggers or entries

Status: Implemented — dashboard, API, and direct-webhook guards in place; controlled direct-webhook test pending

### 1. What is the edge case (specific)?

- The system receives duplicate files or triggers for the same project, which could otherwise create redundant Drive uploads, LLM processing, and inconsistent project states.

### 2. What input triggers it (test case)?

- Submit the same file twice to the same project, with the same project ID, normalized filename, and file size.
- Submit the same file metadata to a different project ID.
- Send the same authorized direct n8n intake request twice for one project.

### 3. What the agent SHOULD do (guardrail)?

- Before initiating durable-row creation, Drive upload, or LLM extraction, check whether matching file metadata already exists for the same project.
- If a match exists, skip heavy processing, preserve the existing audit row, and return a clear duplicate response.
- Allow the same file when its project ID differs.

### 4. What the agent DOES do (current implementation)?

- The dashboard refreshes project history immediately before submitting and compares project ID, normalized filename, and file size against existing rows and files selected in the same batch.
- The server repeats the metadata check before forwarding the dashboard request to n8n, protecting against stale browser state.
- The direct n8n intake webhook now queries existing document rows for the incoming project and compares normalized filename plus file size before it creates a durable row, uploads to Drive, or invokes the LLM.
- A same-project duplicate receives HTTP `409 Conflict` with `duplicate: true`, the project ID, and the existing request ID. No additional Drive file, document row, or LLM run is created.
- The same file remains allowed when the project ID differs. Existing audit records are never deleted or overwritten.

### 5. Remaining validation and future hardening

- Run the controlled direct-webhook test: submit the same project ID, filename, and size twice, then confirm one document/Drive upload/LLM execution and a `409` on the second request. Submit the same metadata to a second project ID and confirm it is accepted.
- Filename plus size is an MVP duplicate key. Add a file-content hash later to distinguish different files that happen to share both values and to strengthen concurrent-submission idempotency.
