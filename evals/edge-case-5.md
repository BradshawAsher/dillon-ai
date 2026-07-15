🛡 Edge Case #5

Category: 5. Hallucination or wrong LLM output   

Status: Implemented (guardrail in place)

1. What is the edge case (specific): 
- The LLM provides an output that deviates from the required JSON structure (e.g., missing fields, incorrect data types, or conversational prose) or attempts to hallucinate data that does not exist in the source document.

2. What input triggers it (test case): 
- Upload a file that contains significantly ambiguous text or an unsupported document format (e.g., an image of a handwritten note) that makes structured extraction highly difficult.

3. What the agent SHOULD do (guardrail): 
- The system utilizes a Structured Output Parser to enforce the JSON schema as a hard constraint:
- Enforcement: If the initial LLM output fails validation (e.g., missing a required field or providing a string instead of a number), the parser triggers an automatic "Retry Once" instruction with the specific schema error details.
- Escalation: If the second attempt still fails validation, the system treats it as a PARSING_FAILURE and escalates the project to human review in the Retool dashboard with the raw output attached for debugging.


4. What the agent DOES do (actual result when tested): 
- Provided ambiguous handwritten text. The Structured Output Parser rejected the initial JSON due to missing numeric fields. The automatic 'Retry' triggered; the second output remained invalid. The workflow correctly caught the final failure, set ai_is_escalated to true, and flagged the project for human verification.
