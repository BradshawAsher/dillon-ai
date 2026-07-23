🛡 Edge Case #2

Category: 1. Missing or Imcomplete Data      

Status: Implemented (Guardrail in place)

1. What is the edge case (specific):

- The financial data contains non-numeric strings (e.g., "TBD", "N/A", "See Note") within cells that are expected to be numeric floats.

1. What input triggers it (test case):

- Upload MERGEWORKS TESTING - SAMPLE MALFORMED DATA EDGE CASE #2, which contains mostly TBD, N/A, and See Note within cells expected to have numbers

"Acme Widgets Inc." Diligence Packet

1. Financial Performance CSV (Test for: Arithmetic & Margin Compression)
Year Revenue COGS Gross Profit Gross Margin (%)
2023 TBD N/A 600,000 See Note
2024 See Note TBD N/A 55.0%
2025 TBD N/A 600,000 See Note

2. What the agent SHOULD do (guardrail):

- The agent's structured extraction chain must identify that it cannot extract a valid number. It should:
- Set ebitda_extracted (or relevant revenue fields) to null or 0.
- Set ai_is_escalated to true.
- Add a entry to red_flags describing the data quality issue: "Malformed data detected in = - Revenue field; expected numeric value but received 'TBD'."
Set the traffic_light to RED.

4. What the agent DOES do (actual result when tested): 
- Ran test on 2026-07-15. Result: The LLM recognized the 'TBD' string as invalid, returned null for revenue, set ai_is_escalated to true, and populated a 'Red Flag' in the synthesis object. Status in dashboard updated to needs_review.
