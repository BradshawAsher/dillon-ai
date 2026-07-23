
This is a major part of your Week 6 grade. Since your agent is already using a deterministic "Source of Truth" architecture (n8n tables + validator nodes), you are in a great position to document these edge cases.
For each category, I have suggested a specific, testable "Financial Due Diligence" scenario that your agent should be handling.
🛡 The 5 Edge Cases for Your Agent


Category
Edge Case Scenario
Test Trigger
Guardrail (What it SHOULD do)
1. Missing Data

Example: 
Balance Sheet missing from deal packet.
Upload a packet containing P&L and Tax Returns, but no Balance Sheet.
Validator node checks for required_docs list; triggers MISSING_DATA escalation; marks project as needs_review.
2. Malformed Data

Example: 
Excel file has broken formulas (strings instead of numbers) in the P&L rows.
Upload an Excel file where "Revenue" cells contain text like "TBD" instead of numbers.
The code/validator node detects non-numeric types; stops extraction; flags ARITHMETIC_MISMATCH; alerts human.


3. Duplicate Triggers

Example: 
User double-clicks "Submit" in Retool.
Send the exact same requestID to your webhook twice in < 1 second.
Use the Upsert logic; n8n should recognize the existing requestID, update the timestamp, and not spawn a second duplicate processing loop.

4. Third-Party API Failure

Example: 
LlamaParse times out on a massive PDF.
Send a 200+ page scan of a tax return that is too large for the current timeout.
LlamaParse node throws an error; your "Retry Once" logic runs; if it fails again, trigger the FAILURE_FALLBACK route to notify human review.

5. LLM Hallucination

Example:
LLM tries to guess a revenue number that isn't in the provided text.
Send a document that contains no financial numbers at all.
System Prompt instructions ("Never guess or invent figures") + JSON schema validation; if fields return empty/null, the validator triggers CONFIDENCE_DROP (< 0.75).


