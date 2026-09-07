# MergeWorks Evaluation Suite & Financial Math Calculation Guide (`MATH_CALCULATIONS.md`)

## 1. Executive Summary & Scoring Architecture

The **MergeWorks Evaluation Suite** measures workflow extraction accuracy, financial precision, risk recall, valuation bounds, deterministic arithmetic, and deal recommendation fidelity across **8 distinct dimensions**.

To reflect real-world M&A due diligence (where multi-document project synthesis is the primary deliverable), evaluation is structured across **7 per-document dimensions** ($80$ maximum points) and **1 project-level cross-document contradiction dimension** ($10$ maximum points), totaling **$90$ maximum points**.

### Dual-Mode Scoring Architecture
1. **Pre-LOI Mode ($6$ Dimensions, $70$ Max Points)**:
   - Evaluates initial intake, screening, and baseline risk before an offer is made.
   - Dimensions: `classification` (10), `facts` (10), `risk` (20), `valuation` (15), `employee` (5), `math` (10).
2. **Post-LOI Mode ($2$ Dimensions, $20$ Max Points)**:
   - Evaluates confirmatory due diligence, contract terms, and inter-document cross-examination.
   - Dimensions: `recommendation` (10), `crossDocConflicts` (10).

### 90/10 Synthesizer / Per-Document Composite Formula
All $7$ per-document dimensions utilize a **90% Synthesizer / 10% Per-Document** weighted composite formula:

$$\text{Dimension Score}_d = \left( 0.90 \times S_{\text{synth}, d} \right) + \left( 0.10 \times S_{\text{per\_doc}, d} \right)$$

For any document $i \in \{1, \dots, M\}$ in a test suite of $M$ documents, the total per-document score $T_i$ and accuracy percentage $P_i$ are defined as:

$$T_i = \sum_{d=1}^{7} \text{Dimension Score}_{i, d}$$

$$P_i = \left( \frac{T_i}{T_{\text{max}}} \right) \times 100\% \quad (T_{\text{max}} = 80 \text{ pts})$$

---

### Overall Suite Metrics

1. **Overall Suite Point Accuracy Rate ($A_{\text{suite}}$)**:
   The total points obtained across all $M$ documents divided by total possible points:

   $$A_{\text{suite}} = \left( \frac{\sum_{i=1}^{M} T_i}{M \times T_{\text{max}}} \right) \times 100\%$$

2. **Overall Document Pass Rate ($R_{\text{pass}}$)**:
   The proportion of documents clearing the quality threshold $\theta = 70\%$:

   $$R_{\text{pass}} = \left( \frac{\sum_{i=1}^{M} \mathbb{I}(P_i \ge \theta)}{M} \right) \times 100\%$$

---

## 2. Mathematical Formulas for All 8 Dimensions

---

### Dimension 1: Document Classification Score ($S_{\text{class}}$, Max 10 Points)

$$S_{\text{class}} = 0.90 \times 10 + 0.10 \times S_{\text{doc\_class}}$$

$$S_{\text{doc\_class}} = \begin{cases} 
10 & \text{if } \text{lowercase}(c_{\text{actual}}) = \text{lowercase}(c_{\text{primary}}) \\
7 & \text{if } \text{lowercase}(c_{\text{actual}}) \in C_{\text{secondary}} \\
3 & \text{otherwise}
\end{cases}$$

---

### Dimension 2: Financial Facts Score ($S_{\text{facts}}$, Max 10 Points)

$$S_{\text{facts}} = 0.90 \times 10 + 0.10 \times S_{\text{doc\_facts}}$$

For a document with $N$ expected financial facts $\{f_1, f_2, \dots, f_N\}$, let $V_{\text{gt}, k}$ be the expected numeric value and $V_{\text{actual}, k}$ be the year-matched extracted value:

1. **Absolute Relative Error ($\epsilon_k$)**:
   $$\epsilon_k = \frac{|V_{\text{actual}, k} - V_{\text{gt}, k}|}{\max(|V_{\text{gt}, k}|, 1.0)}$$

2. **Per-Doc Fact Points ($p_k$)**:
   $$p_k = \begin{cases} 
   10 & \text{if } \epsilon_k \le 0.01 \quad (\le 1\% \text{ error}) \\
   5 & \text{if } 0.01 < \epsilon_k \le 0.05 \quad (\le 5\% \text{ error}) \\
   3 & \text{if } \epsilon_k > 0.05 \quad (> 5\% \text{ error}) \\
   0 & \text{if fact } k \text{ is missing/unmatched}
   \end{cases}$$

3. **Per-Doc Facts Score ($S_{\text{doc\_facts}}$)**:
   $$S_{\text{doc\_facts}} = \left( \frac{\sum_{k=1}^{N} p_k}{10 \cdot N} \right) \times 10$$

---

### Dimension 3: Risk & Flag Recall Score ($S_{\text{risk}}$, Max 20 Points)

$$S_{\text{risk}} = 0.90 \times 20 + 0.10 \times S_{\text{doc\_risk}}$$

where $S_{\text{doc\_risk}} = S_{\text{doc\_light}} + \text{round}(10 \cdot R_{\text{flags}})$.

1. **Traffic Light Alignment ($S_{\text{doc\_light}}$)**:
   $$S_{\text{doc\_light}} = \begin{cases} 
   10 & \text{if } \text{uppercase}(L_{\text{actual}}) = \text{uppercase}(L_{\text{gt}}) \\
   5 & \text{otherwise}
   \end{cases}$$

2. **Flag Recall Ratio ($R_{\text{flags}}$)**:
   $$R_{\text{flags}} = \frac{\sum_{f \in F_{\text{gt}}} \mathbb{I}(\text{keywords}(f) \cap W_{\text{actual}} \neq \emptyset)}{|F_{\text{gt}}|}$$

---

### Dimension 4: Valuation Accuracy Score ($S_{\text{val}}$, Max 15 Points)

$$S_{\text{val}} = 0.90 \times 15 + 0.10 \times S_{\text{doc\_val}}$$

where $S_{\text{doc\_val}}$ evaluates valuation relative error $\epsilon_{\text{val}} = \frac{|\hat{V}_{\text{base}} - V_{\text{base, gt}}|}{V_{\text{base, gt}}}$:

$$S_{\text{doc\_val}} = \begin{cases} 
15 & \text{if } \epsilon_{\text{val}} \le 0.15 \quad (\le 15\% \text{ error}) \\
10 & \text{if } 0.15 < \epsilon_{\text{val}} \le 0.30 \quad (\le 30\% \text{ error}) \\
5 & \text{if } \epsilon_{\text{val}} > 0.30 \text{ but } \hat{V}_{\text{base}} > 0 \\
0 & \text{if missing/null}
\end{cases}$$

---

### Dimension 5: Employee Evidence Score ($S_{\text{emp}}$, Max 5 Points)

$$S_{\text{emp}} = 0.90 \times 5 + 0.10 \times S_{\text{doc\_emp}}$$

$$S_{\text{doc\_emp}} = \begin{cases} 
5 & \text{if } E_{\text{actual}} = E_{\text{gt}} \\
0 & \text{otherwise}
\end{cases}$$

---

### Dimension 6: Accounting Math Checks Score ($S_{\text{math}}$, Max 10 Points)

$$S_{\text{math}} = 0.90 \times 10 + 0.10 \times S_{\text{doc\_math}}$$

$$S_{\text{doc\_math}} = \begin{cases} 
10 & \text{if } \text{lowercase}(M_{\text{actual}}) = \text{lowercase}(M_{\text{gt}}) \\
5 & \text{otherwise}
\end{cases}$$

---

### Dimension 7: Acquisition Judgment Score ($S_{\text{acq}}$, Max 10 Points)

$$S_{\text{acq}} = 0.90 \times 10 + 0.10 \times S_{\text{doc\_rec}}$$

$$S_{\text{doc\_rec}} = \begin{cases} 
10 & \text{if final recommendation posture aligns (Go / Conditional Go / No-Go)} \\
5 & \text{if adjacent posture} \\
0 & \text{if direct opposite mismatch}
\end{cases}$$

---

### Dimension 8: Cross-Document Conflict Detection ($S_{\text{conflicts}}$, Max 10 Points)

Evaluated at the project synthesis pass across independent data room uploads (e.g. tax returns vs. P&L, customer concentration disclosures, stated vs. calculated revenue):

$$S_{\text{conflicts}} = \min\left(10, \max\left(0, \text{round}(10 \times R_{\text{combined}}) - P_{\text{fp}}\right)\right)$$

where:
1. $R_{\text{detector}} = \frac{|\text{Expected Conflicts Caught by Deterministic Rule Engine}|}{|\text{Expected Conflicts}|}$
2. $R_{\text{llm}} = \frac{|\text{Expected Conflicts Surfaced in LLM Synthesis Output}|}{|\text{Expected Conflicts}|}$
3. $R_{\text{combined}} = \max(R_{\text{detector}}, R_{\text{llm}})$
4. $P_{\text{fp}} = \max(0, \text{False Positives} - 1)$ (penalty for false alarms).

---

## 3. Worked Numerical Example

Consider `Werkheiser P&L 2025.pdf` evaluated under the full suite:

| Dimension | Per-Doc Raw Score ($S_{\text{per\_doc}}$) | 90/10 Weighted Formula | Final Score |
| :--- | :---: | :--- | :---: |
| **1. Classification** | $10.0 / 10$ | $0.90(10) + 0.10(10.0)$ | **10.0 / 10** |
| **2. Financial Facts** | $3.0 / 10$ | $0.90(10) + 0.10(3.0)$ | **9.3 / 10** |
| **3. Risk & Flags** | $13.0 / 20$ | $0.90(20) + 0.10(13.0)$ | **19.3 / 20** |
| **4. Valuation** | $15.0 / 15$ | $0.90(15) + 0.10(15.0)$ | **15.0 / 15** |
| **5. Employee Evidence** | $5.0 / 5$ | $0.90(5) + 0.10(5.0)$ | **5.0 / 5** |
| **6. Math Checks** | $10.0 / 10$ | $0.90(10) + 0.10(10.0)$ | **10.0 / 10** |
| **7. Acquisition Judgment** | $10.0 / 10$ | $0.90(10) + 0.10(10.0)$ | **10.0 / 10** |

$$\mathbf{\text{Per-Doc Score } T_i} = 10.0 + 9.3 + 19.3 + 15.0 + 5.0 + 10.0 + 10.0 = \mathbf{78.6 \text{ / } 80 \text{ pts}}$$

$$\mathbf{\text{Document Accuracy } P_i} = \left( \frac{78.6}{80} \right) \times 100\% = \mathbf{98.3\% \quad (\text{PASS} \ge 70\%)}$$

$$\mathbf{\text{Project Conflict Score (Dim 8)}} = \mathbf{10.0 \text{ / } 10 \text{ pts}} \implies \mathbf{\text{Total Deal Suite Score}} = \mathbf{88.6 \text{ / } 90 \text{ pts} \quad (98.4\%)}$$

---

## 4. Deterministic Financial Math & Underwriting Engine

The underwriting cash-flow engine in `frontend/utils/dealMath.ts` powers all deal analysis cards, live Excel export (`excelModelGenerator.ts`), and the Master Deterministic Math & Reconciliation Ledger (`unifiedMathChecks.ts`).

### 1. Loan Amortization & Debt Service
Acquisition senior debt is modeled using standard fully amortizing monthly compounding:

$$M = P \times \frac{r(1+r)^n}{(1+r)^n - 1}$$

where:
* $P$ = Senior Debt Principal (USD)
* $r = \frac{\text{Annual Interest Rate}}{12}$ (monthly interest rate)
* $n = \text{Loan Term (Years)} \times 12$ (total scheduled payment months)
* $\text{Annual Debt Service} = 12 \times M$
* Zero-Interest Boundary: If $r = 0$, $M = \frac{P}{n}$ and $\text{Annual Debt Service} = \frac{P}{\text{Term (Years)}}$.
* **Centralized Defaults**: `DEAL_MATH_DEFAULTS.interestRate = 0.07` (7.00%) and `DEAL_MATH_DEFAULTS.amortizationYears = 10`.

### 2. Percentage Fraction Normalization
All interest rates and tax rates route through `normalizePercentageFraction(val)` to eliminate input ambiguity:

$$\text{normalizePercentageFraction}(v) = \begin{cases} 
\frac{v}{100} & \text{if } v > 1.0 \quad (\text{e.g. } 7 \to 0.07, \, 25 \to 0.25) \\
v & \text{if } 0 \le v \le 1.0 \quad (\text{e.g. } 0.07 \to 0.07) \\
\text{null} & \text{otherwise}
\end{cases}$$

### 3. Debt Service Coverage Ratio (DSCR)

$$\text{DSCR} = \frac{\text{Unlevered Operating Cash Flow}}{\text{Annual Senior Debt Service}}$$

where:
$$\text{Unlevered Operating Cash Flow} = \text{EBITDA} \times (1 - \text{Tax Rate}) - \text{Maintenance Capex}$$

* Benchmark: $\text{DSCR} \ge 1.25\times$ is considered bankable / safe; $\text{DSCR} < 1.0\times$ represents a critical deal-killer.

### 4. Unlevered Payback Period

$$\text{Payback Period (Years)} = \frac{\text{Purchase Price} + \text{Transaction Fees} + \text{Working Capital Requirement}}{\text{EBITDA} \times (1 - \text{Tax Rate}) - \text{Maintenance Capex}}$$

### 5. Cash-on-Cash Return

$$\text{Cash-on-Cash} = \frac{\text{Annual Levered Cash Flow}}{\text{Initial Cash Equity Invested}}$$

where:
* $\text{Initial Cash Equity} = \text{Purchase Price} + \text{Closing Fees} + \text{WC Requirement} - \text{Senior Debt} - \text{Seller Note}$
* $\text{Annual Levered Cash Flow} = \text{Unlevered Operating Cash Flow} - \text{Annual Debt Service}$

### 6. Working Capital Funding Gap

$$\text{WC Funding Gap} = \text{Model Working Capital Requirement} - \text{Documented Working Capital}$$

* If $\text{WC Funding Gap} > 0$, buyer must fund the liquidity deficit at close.
* If $\text{WC Funding Gap} < 0$, the business holds surplus cash/working capital.
