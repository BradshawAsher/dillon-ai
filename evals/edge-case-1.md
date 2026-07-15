🛡 Edge Case #1

Category: 1. Missing or Imcomplete Data        

Status: Implemented (Guardrail in place)       

1. What is the edge case (specific): The financial deal packet is incomplete, specifically missing required financial statistics or containing null values for critical metrics (e.g., EBITDA).

2. What input triggers it (test case): Upload an empty doc

3. What the agent SHOULD do (guardrail): 
- The system must NOT attempt to hallucinate missing data. 
- Document Level: The extraction agent should detect nulls and set ai_is_escalated to true with the reason MISSING_REQUIRED_DATA.
- Project Level: The Consolidator/Synthesis agent must identify the missing file in the missing_materials field of the schema and include a specific open_question for the seller to provide the missing statement before proceeding.
- State: The project status must transition to needs_review and alert the deal team.


4. What the agent DOES do (actual result when tested): 
- Ran test on 2026-07-15. Result: The per-document LLM correctly set ebitda_extracted to 0 and flagged missing data. The Consolidator triggered, populated missing_materials, and generated an open question for the seller. Project status transitioned to needs_review as expected.
