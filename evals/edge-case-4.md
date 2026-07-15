🛡 Edge Case #4

Category: 4. Third-Party API Failure            

Status: Implemented (guardrail in place)

1. What is the edge case (specific): 
- A critical external API dependency (e.g., LlamaParse or Anthropic API) fails to respond, times out, or returns a 5xx server error, preventing the document extraction process from completing.

2. What input triggers it (test case): 
- Simulate an API outage (e.g., temporarily provide an invalid API key to the LlamaParse node or set an aggressive 1-second timeout in the n8n HTTP Request node) while attempting to process a financial document.

3. What the agent SHOULD do (guardrail): 
- The system must implement "Fail-Fast" and "Graceful Recovery" protocols:
- Retry Logic: The workflow must attempt a single automatic retry with an exponential backoff.
- Escalation: If the retry fails, the system must not hang or crash. It should immediately halt, set is_escalated to true, and log the reason_code as API_DEPENDENCY_FAILURE.
- User Notification: The project record in the Retool dashboard must reflect a FAILURE status, and the human operator should be alerted (e.g., via Slack or email) to manually re-run the file once the service is restored.


4. What the agent DOES do (actual result when tested): 
- Ran test on 2026-07-15. Result: Simulated an API timeout by forcing a failed request. The n8n settings for LlamaParse and the Anthropic node for retry on fail fired, and when it failed again, the workflow successfully exited the LLM chain, marked the project status as API_ERROR, and triggered an alert to the team via our logging system."
