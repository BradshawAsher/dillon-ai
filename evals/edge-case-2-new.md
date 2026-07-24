# Edge Case #2

Category: 2. Malformed or Wrong-Shape Data

Status: Implemented as a **lax advisory**; controlled upload test still pending

### 1. What is the edge case (specific)?

- A seller-provided P&L CSV contains valid-looking financial text but has ambiguous table structure: title/note rows before the header, inconsistent column counts, and formula or placeholder values.
- A naive extractor could shift a value to the wrong year or metric and produce a plausible but incorrect conclusion.

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

- The unquoted comma-separated values deliberately create rows with more columns than the header, making the layout issue deterministic.

### 3. What the agent SHOULD do (guardrail)?

- Detect and record the ambiguous layout and invalid tokens (`#REF!`, `TBD`, `N/M`, etc.) before users rely on the result.
- Continue parsing and analysis whenever possible rather than blocking the document or project merely because the table is imperfect.
- Never label a questionable mapping as confirmed. Any facts derived from an ambiguous table must remain reviewable and be accompanied by a table-layout advisory.
- Preserve the source, avoid a stuck batch, and give the user a clear next action: review the source, retry after a cleaner export, or exclude the document from synthesis.

### 4. What the agent DOES do (current implementation)?

- The production per-document workflow performs a deterministic CSV/table-layout assessment before the main parse path. It identifies a likely header, checks non-empty row column counts, and notices invalid/placeholder tokens.
- When it finds an issue, it records a **table-layout advisory** (including the issue detail) and then proceeds to document parsing and LLM analysis. It no longer routes a merely malformed CSV to a hard `needs_review` stop before analysis.
- The completed document remains visible in the dashboard. The advisory is shown separately from a true processing failure, so the user can inspect/retry/exclude it without losing usable evidence.
- If parsing or structured extraction genuinely cannot recover after retries, the normal terminal failure/retry path applies. A separate failed document does not block synthesis when another considered document has usable analysis.

### 5. How detection is deterministic

- The preflight/advisory checks for:
  - a likely header after title/note rows;
  - inconsistent non-empty row column counts;
  - invalid tokens such as `#REF!`, `#DIV/0!`, `#VALUE!`, `#N/A`, `TBD`, and `N/M`.
- It records an advisory rather than treating the signal as proof that every value is unusable. This intentionally favors continuity and transparent uncertainty over strict blocking.
- It does not yet prove semantic period alignment when every row has the same number of columns but values are shifted. That remains a future data-quality enhancement.

### 6. Evidence and test plan

- Upload the CSV to a fresh project and follow Edge Case 2 in `evals/EDGE_CASE_TEST_PLAN.md`.
- Pass criteria: the document receives a visible table-layout advisory, does not hang, and does not present questionable values as confirmed evidence. It may still complete and contribute qualified evidence to synthesis.
- Capture the advisory, the final document status, and whether any extracted fact is marked reviewable rather than confirmed.
