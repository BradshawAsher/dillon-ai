## Edge Case #2

Category: 2. Malformed or Wrong-Shape Data

Status: Test case and expected guardrail drafted; deterministic structure validator not yet implemented

### 1. What is the edge case (specific)?

- A seller-provided P&L CSV contains valid-looking financial text but cannot be mapped reliably because its tabular structure is malformed.
- The file has a title block and notes before the actual header row, renamed financial headers, inconsistent period labels, a shifted value column, and invalid formula/placeholder values.
- This is dangerous because a naïve extractor could map a value to the wrong year or financial metric and produce a plausible but incorrect diligence conclusion.

### 2. What input triggers it (test case)?

- Upload a CSV called `MERGEWORKS TESTING - WRONG SHAPE P&L EDGE CASE #2.csv` with this structure:

```csv
Acme Widgets Inc. - Management P&L Export
Prepared for buyer review; unaudited
Amounts in USD unless otherwise noted

Metric,FY23A,FY24A,LTM Sep-25,Notes
Sales,8,500,000,9,200,000,10,100,000,Includes pass-through revenue
Cost of Sales,(4,100,000),(4,600,000),(5,300,000),
Gross Profit,4,400,000,4,600,000,4,800,000,
Operating Profit,1,200,000,#REF!,1,350,000,2024 formula broken
Adjusted EBITDA,1.4m,TBD,N/M,See add-back schedule
```

- The final test file should also deliberately shift one 2024 value under the wrong header or include a blank header cell, so the detector must recognize an unreliable column map rather than merely a missing value.

### 3. What the agent SHOULD do (guardrail)?

- Detect that the apparent header row is not a reliable canonical financial schema and that key values contain invalid formula/placeholder tokens such as `#REF!`, `TBD`, and `N/M`.
- Do not silently map `Sales` to `Revenue` or `Operating Profit` to `EBITDA` unless the mapping is explicitly supported and sufficiently confident.
- Mark uncertain extracted financial fields as unverified/null rather than inventing or shifting a number to another metric or period.
- Set `ai_is_escalated` to true with a reason such as `MALFORMED_OR_AMBIGUOUS_TABLE_STRUCTURE`.
- Add a red flag describing the structural issue and create an open question requesting a clean, machine-readable source export from the seller.
- Keep the document/project reviewable in the dashboard; do not crash the workflow or lose the uploaded file.

### 4. What the agent DOES do (current implementation)?

- The current structured extraction and robust document-processing workflow can flag invalid numeric placeholders and route an uncertain document to review rather than treating `TBD` as a valid financial figure.
- The dashboard can retain the document, show its failed/review state, and allow a metadata-based retry without requiring a re-upload.
- However, the workflow does not yet have a deterministic pre-extraction CSV schema validator that proves the header row, period alignment, and column mapping are structurally sound. Today, recognition of a shifted/renamed table depends partly on the document parser and LLM judgment.

### 5. How we will make detection deterministic

- Add a CSV/XLSX preflight step before the LLM extraction:
  - locate the likely header row after skipping title/notes rows;
  - normalize and compare headers against an approved financial-header dictionary;
  - verify that every data row has the same number of columns as the chosen header;
  - detect invalid tokens (`#REF!`, `#DIV/0!`, `TBD`, `N/M`) in required numeric fields;
  - emit `tableStructureStatus`, `tableStructureIssues`, and `columnMapConfidence` into the document record.
- If the preflight fails, write a recoverable review state and send the document to the existing review/error path instead of allowing the LLM to make an uncertain mapping.

### 6. Evidence and test plan

- This revised wrong-shape CSV test has not yet been run against a deterministic preflight validator because that validator is the remaining implementation task.
- Baseline success criteria: the agent must not report the shifted or malformed values as verified EBITDA/revenue; it must flag the source structure, preserve the record, and request a clean export.
