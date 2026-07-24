# Edge Case #5

Category: 5. Hallucination or Wrong LLM Output

Status: Implemented; current recovery behavior needs a controlled re-test

### 1. What is the edge case (specific)?

- The document LLM returns output that cannot satisfy the required structured schema: invalid JSON, missing fields, wrong types, or prose outside the expected object.
- A related risk is an ambiguous source (such as a handwritten note) that encourages unsupported financial claims, citations, or conclusions.

### 2. What input triggers it (test case)?

- Upload `MERGEWORKS TESTING - AMBIGUOUS HANDWRITTEN EMAIL FOR HALLUCINATION EDGE CASE 5.docx` to a fresh project and queue it in production.
- A controlled malformed model response (when safely available in a non-critical environment) is also a valid trigger for the structured-output branch.

### 3. What the agent SHOULD do (guardrail)?

- Require structured output and reject invalid JSON/schema responses rather than treating them as completed diligence.
- Retry recoverable provider or output-format failures automatically before declaring the document failed.
- Never invent EBITDA, valuation, citations, or other facts absent from the source. Preserve uncertainty as an unresolved/reviewable finding.
- If recovery is exhausted, save a user-visible terminal failure with the source/request metadata intact, offer Retry/Exclude, and allow synthesis to continue from other usable documents.

### 4. What the agent DOES do (current implementation)?

- The Structured Output Parser and error classifier treat invalid JSON/schema-format failures as retryable. The robust per-document workflow performs up to three recovery attempts with increasing waits of approximately 2, 6, and 15 seconds.
- This replaced the former single “Retry Once” behavior. It was added after a real Customer Concentration test document returned malformed JSON with a missing closing brace.
- If valid structured output is eventually returned, analysis continues. If not, the document is recorded as a terminal, user-visible failed/reviewable item rather than silently completing or crashing the batch.
- Failed documents remain available for retry from stored metadata or exclusion from synthesis. A failed document does not inject `null` evidence into project synthesis and does not block a synthesis that has another considered completed document with usable analysis.

### 5. How the guardrail is enforced

- The parser validates the required output shape; the classifier distinguishes recoverable format/provider errors from terminal conditions.
- Retry waits increase to reduce repeat provider failures. Terminal outcomes are stored durably and surfaced in Submission History, Project Synthesis, and the Errors experience.
- The synthesis workflow filters to considered completed documents with non-empty extraction JSON, preventing malformed output from becoming evidence.

### 6. Evidence and test plan

- Run Edge Case 5 in `evals/EDGE_CASE_TEST_PLAN.md`.
- Pass criteria: the app does not show fabricated finance facts; invalid structured output retries; a final unrecoverable result is visible and actionable; and the project remains usable for any other successful documents.
- Capture the final document status, retry/error trail, source/request ID, and the absence of fabricated values.
