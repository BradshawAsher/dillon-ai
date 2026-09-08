# MergeWorks Evaluation Suite — Edge Cases, Defense FAQ & User Guide (`EVAL_FAQ_AND_EDGE_CASES.md`)

## 1. Overview & Purpose

This document serves as the formal **Edge Case Handling Guide & Evaluation FAQ** for the **MergeWorks AI Due Diligence System**. It details how the evaluation harness processes edge cases (verbiage variations, missing flags, extra cautious flags, period alignment), answers anticipated questions from instructors and mentors, and explains system reliability for end-user M&A buyers.

---

## 2. Technical Edge Case Handling

---

### Edge Case 1: Risk Flag Verbiage & Wording Variations
* **Scenario**: The AI extracts a valid risk flag, but uses different phrasing than the ground-truth specification.
  * **Ground Truth**: `"Unexplained wage spike in Salaries & Wages"`
  * **AI Output**: `"Spike in wage costs for staff"`
* **How the Scorer Handles It**:
  1. The scoring engine tokenizes the expected ground-truth flag into significant keywords ($> 3$ characters): `["unexplained", "wage", "spike", "salaries", "wages"]`.
  2. It checks if **ANY** of these key tokens appear in the concatenated string of AI-extracted flags (`"spike"` and `"wage"` match!).
  3. **Result**: **100% Full Credit (Flag Caught)**.
* **Engineering Rationale**: The LLM does not need to guess exact verbatim wording. As long as it captures the core risk concept (`wage`, `spike`), it receives full recall credit.

---

### Edge Case 2: Missing Ground Truth Flags
* **Scenario**: Ground Truth expects 4 risk flags, but the AI only extracts 3 flags.
* **How the Scorer Handles It**:
  1. **Flag Recall Ratio**: $R_{\text{flags}} = \frac{3 \text{ caught}}{4 \text{ expected}} = 0.75 \text{ (75\% Recall)}$.
  2. **Per-Doc Score**: $10 \text{ (traffic light match)} + \text{round}(10 \times 0.75) = 18 / 20 \text{ pts (90\%)}$.
  3. **90/10 Weighted Score**:
     $$S_{\text{risk}} = (0.90 \times 20) + (0.10 \times 18) = 18.0 + 1.8 = \mathbf{19.8 / 20 \text{ pts (99\%)}}$$
* **Implementation note**: Single-file intake gaps deduct a minor fraction of the 10% per-document component. The current 90% term is a fixed dimension-max baseline retained for historical score compatibility; it is not a separately measured synthesizer result.

---

### Edge Case 3: Extra Extracted Flags (Not in Ground Truth)
* **Scenario**: Ground Truth expects 2 flags, but the AI extracts 3 flags (e.g. adding an extra flag like `"Minor Q3 seasonality"`).
* **How the Scorer Handles It**:
  * In M&A due diligence, **Recall** (catching every critical liability) is prioritized over strict precision penalties. Extra cautious flags concatenated into the AI output string do **not** deduct points.
* **Engineering Rationale**: In a $10M deal room, a **false negative** (missing a hidden $2M liability) is catastrophic, whereas an **extra cautious flag** (noting Q3 seasonality) is helpful context for deal attorneys.

---

### Edge Case 4: Period-Differentiated Financial Facts (24-Month Excel Columns)
* **Scenario**: Excel spreadsheets (e.g. `ConversionXL LLC_Profit and Loss by Month.xlsx`) contain 24 monthly columns (Jan 2023 ... Dec 2024). Single-file extraction parses monthly totals instead of full annual FY2024 totals.
* **How the Scorer Handles It**:
  1. Fact comparison matches metrics by both **Metric Name AND Reporting Year** (`extractYear(period)`).
  2. Single-file month/annual misalignment drops the 10% per-doc facts component to partial credit (3 pts); the current 90% fixed baseline remains at the dimension maximum.
  3. **Resulting Score**: $0.90(10) + 0.10(3) = \mathbf{9.3 / 10 \text{ pts (93\%)}}$.

---

## 3. Instructor & Mentor Defense FAQ

---

### Q1: "Why does the scorer use a 90% baseline / 10% per-document split across all 7 dimensions?"
> **Answer**:  
> This is a historical compatibility formula in the current implementation. The **90% term is the dimension maximum**, while the **10% term measures the per-document result**. It should not be presented as an independently measured synthesizer score. Cross-document conflict performance is the separate project-level dimension. A future scorer redesign could replace the fixed baseline with a real synthesis score, but that is not how today's numbers are computed.

---

### Q2: "How does numerical fact error tolerance work?"
> **Answer**:  
> Numerical facts use relative percentage error tiers:
> - $\le 1\%$ Error: **10 pts** (Exact match)
> - $\le 5\%$ Error: **5 pts** (Minor rounding/formatting)
> - $> 5\%$ Error: **3 pts** (Large discrepancy)
> 
> This provides rigorous mathematical precision while awarding partial credit for minor currency rounding.

---

### Q3: "Is the evaluation suite automated in CI/CD?"
> **Answer**:  
> Yes. `.github/workflows/eval-regression.yml` runs on pull requests and pushes to `main` or `master`, enforces the 80% regression gate, refreshes the generated failure/report files in the runner artifact, and attempts Supabase publishing only when the required Supabase environment is configured.

---

## 4. End-User & Buyer FAQ

---

### Q1: "Why should an M&A buyer trust MergeWorks over manual spreadsheet review?"
> **Answer**:  
> MergeWorks exposes its current benchmark results and per-dimension weaknesses in the Evals & Harness tab rather than relying on a fixed marketing percentage. The benchmark tests extraction, risk recall, valuation, returned math-check status, recommendations, and project conflict detection against versioned ground truth. It complements manual review; it does not prove that every unseen document or accounting judgment will be correct.

---

### Q2: "What happens if I upload an unformatted or messy Excel workbook?"
> **Answer**:  
> MergeWorks includes automated cell-header flattening and sheet pre-indexing. Even if an Excel file has merged cell headers or 24 monthly columns, the **Project Synthesizer** automatically reconciles monthly columns into annual financial totals and unified risk matrices.
