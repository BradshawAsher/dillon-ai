🛡 Edge Case #3

Category: 3. Duplicate triggers or entries   

Status: Documented (spec written)

1. What is the edge case (specific): 
- The system receives duplicate files or triggers for the same financial packet, which could lead to redundant LLM processing and inconsistent project states.

2. What input triggers it (test case): 
- Sending multiple webhook requests with the same projectID + fileName + fileSize (or a hash of the file).

3. What the agent SHOULD do (guardrail): 
- The system must treat the database as a Metadata Cache:
- Before initiating the LLM extraction chain, the workflow must query the documents table to check if a hash of the current file metadata (e.g., fileName + fileSize) already exists for that projectID.
- If a match exists, the system logs the event as a DUPLICATE_TRIGGER and skips the heavy LLM extraction, instead pointing to the existing cached data row.
- This ensures the system is efficient, cost-effective, and prevents "double-processing" identical data.


4. What the agent DOES do (actual result when tested): 
- Ran test on 2026-07-15. Result: Confirmed that the system currently processes duplicate triggers, which is our intended behavior for dev-environment stress testing. Currently, we create another row even for duplicate files for testing purposes, but we identify that we will eventually have to prevent duplicates by using the n8n table as a metadata cache to prevent processing duplicates.
