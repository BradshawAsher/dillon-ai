## Edge Case #2

Category: 2. Malformed or Wrong-Shape Data

Status: Implemented in the production per-document workflow; controlled upload test still pending

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

- The production per-document workflow now performs a deterministic CSV preflight before LlamaParse and the LLM. It skips title/note rows, finds a likely header, checks every subsequent non-empty row against that column count, and detects `#REF!`, `#VALUE!`, `#N/A`, `TBD`, and `N/M`.
- When the check finds an issue, the document is saved as `needs_review`, marked for human review with `malformed_or_ambiguous_table_structure`, and retains the concrete issue list, detected header row, confidence, and candidate column map.
- The document does not enter the LLM extraction route, so it cannot invent a shifted Revenue or EBITDA value. It remains visible in the dashboard with a **Table structure review** badge and the issue explanation.
- The batch counter treats `needs_review` as terminal, so the project does not remain stuck. Normal non-CSV documents and structurally valid CSVs continue through the existing parse and analysis route.

### 5. How detection is deterministic

- The CSV preflight runs before the LLM extraction and:
  - locate the likely header row after skipping title/notes rows;
  - normalize and compare headers against an approved financial-header dictionary;
  - verify that every data row has the same number of columns as the chosen header;
  - detect invalid tokens (`#REF!`, `#DIV/0!`, `TBD`, `N/M`) in required numeric fields;
  - emit `tableStructureStatus`, `tableStructureIssues`, and `columnMapConfidence` into the document record.
- If the preflight fails, it writes a recoverable review state instead of allowing the LLM to make an uncertain mapping. This implementation is CSV-only; equivalent XLSX sheet-level validation remains a future improvement.

### 6. Evidence and test plan

- The deterministic preflight has been published to the production per-document workflow. A controlled upload of the revised test CSV is still needed to capture presentation evidence.
- Baseline success criteria: the agent must not report the shifted or malformed values as verified EBITDA/revenue; it must flag the source structure, preserve the record, and request a clean export.
