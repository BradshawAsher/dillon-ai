# MergeWorks Evaluation Suite — In-Depth Mathematical Calculation Guide (`MATH_CALCULATIONS.md`)

## 1. Executive Summary & Scoring Architecture

The **MergeWorks Evaluation Suite** measures workflow extraction accuracy, financial precision, risk recall, valuation bounds, and deal recommendation fidelity across 7 core dimensions.

For any document $i \in \{1, \dots, M\}$ in a test suite of $M$ documents, the total document score $T_i$ and document accuracy percentage $P_i$ are defined as:

$$T_i = \sum_{d=1}^{7} S_{i, d}$$

$$P_i = \left( \frac{T_i}{T_{\text{max}}} \right) \times 100\%$$

where $T_{\text{max}} = 80$ maximum possible points per document across all 7 dimensions.

### Overall Suite Metrics

1. **Overall Suite Accuracy Rate ($A_{\text{suite}}$)**:
   The total points obtained across all $M$ documents divided by the total possible points:

   $$A_{\text{suite}} = \left( \frac{\sum_{i=1}^{M} T_i}{M \times T_{\text{max}}} \right) \times 100\%$$

2. **Overall Document Pass Rate ($R_{\text{pass}}$)**:
   The proportion of documents clearing the quality threshold $\theta = 70\%$:

   $$R_{\text{pass}} = \left( \frac{\sum_{i=1}^{M} \mathbb{I}(P_i \ge \theta)}{M} \right) \times 100\%$$

   where $\mathbb{I}(\cdot)$ is the indicator function returning $1$ if true and $0$ if false.

---

## 2. Mathematical Formulas for All 7 Dimensions

---

### Dimension 1: Document Classification Score ($S_{\text{class}}$, Max 10 Points)

Measures document type identification accuracy (e.g. P&L, Balance Sheet, CIM, Add-Back Notes, Customer Concentration Table).

Let $c_{\text{actual}}$ be the detected document type string, $c_{\text{primary}}$ be the primary ground-truth classification, and $C_{\text{secondary}}$ be the set of valid alternative classifications.

$$S_{\text{class}} = \begin{cases} 
10 & \text{if } \text{lowercase}(c_{\text{actual}}) = \text{lowercase}(c_{\text{primary}}) \\
7 & \text{if } \text{lowercase}(c_{\text{actual}}) \in C_{\text{secondary}} \\
3 & \text{otherwise}
\end{cases}$$

---

### Dimension 2: Financial Facts Score ($S_{\text{facts}}$, Max 10 Points)

Evaluates extracted numerical financial metrics (Revenue, EBITDA, COGS, Net Income) matched by reporting year.

For a ground-truth document with $N$ expected financial facts $\{f_1, f_2, \dots, f_N\}$, let $V_{\text{gt}, k}$ be the expected numeric value and $V_{\text{actual}, k}$ be the year-matched extracted numeric value for fact $k$.

1. **Absolute Relative Error ($\epsilon_k$)**:

   $$\epsilon_k = \frac{|V_{\text{actual}, k} - V_{\text{gt}, k}|}{\max(|V_{\text{gt}, k}|, 1.0)}$$

2. **Piecewise Fact Score ($p_k$)**:

   $$p_k = \begin{cases} 
   10 & \text{if } \epsilon_k \le 0.01 \quad (\le 1\% \text{ error}) \\
   5 & \text{if } 0.01 < \epsilon_k \le 0.05 \quad (\le 5\% \text{ error}) \\
   3 & \text{if } \epsilon_k > 0.05 \quad (> 5\% \text{ error}) \\
   0 & \text{if fact } k \text{ is missing/unmatched}
   \end{cases}$$

3. **Normalized Dimension Score ($S_{\text{facts}}$)**:

   $$S_{\text{facts}} = \begin{cases} 
   10 & \text{if } N = 0 \\
   \left( \frac{\sum_{k=1}^{N} p_k}{10 \cdot N} \right) \times 10 & \text{if } N > 0 
   \end{cases}$$

---

### Dimension 3: Risk & Flag Recall Score ($S_{\text{risk}}$, Max 20 Points)

Combines Risk Traffic Light Alignment ($S_{\text{light}}$, Max 10 pts) and Expected Risk Flag Recall Ratio ($R_{\text{flags}}$, Max 10 pts).

$$S_{\text{risk}} = S_{\text{light}} + \text{round}(10 \cdot R_{\text{flags}})$$

1. **Traffic Light Alignment ($S_{\text{light}}$)**:

   $$S_{\text{light}} = \begin{cases} 
   10 & \text{if } \text{uppercase}(L_{\text{actual}}) = \text{uppercase}(L_{\text{gt}}) \\
   5 & \text{otherwise (adjacent risk posture)}
   \end{cases}$$

   where $L \in \{\text{RED}, \text{YELLOW}, \text{GREEN}\}$.

2. **Flag Recall Ratio ($R_{\text{flags}}$)**:

   Let $F_{\text{gt}}$ be the set of expected risk flags and $W_{\text{actual}}$ be the concatenated text string of extracted red and yellow flags.

   $$R_{\text{flags}} = \frac{\sum_{f \in F_{\text{gt}}} \mathbb{I}(\text{keywords}(f) \cap W_{\text{actual}} \neq \emptyset)}{|F_{\text{gt}}|}$$

   If $|F_{\text{gt}}| = 0$, then $R_{\text{flags}} = 1.0$.

---

### Dimension 4: Valuation Accuracy Score ($S_{\text{val}}$, Max 15 Points)

Evaluates calculated valuation base estimates against ground-truth bounds.

Let $\hat{V}_{\text{base}}$ be the extracted/calculated valuation base estimate, and $V_{\text{base, gt}}$ be the expected ground-truth base estimate.

1. **Valuation Error Percentage ($\epsilon_{\text{val}}$)**:

   $$\epsilon_{\text{val}} = \frac{|\hat{V}_{\text{base}} - V_{\text{base, gt}}|}{V_{\text{base, gt}}}$$

2. **Valuation Score ($S_{\text{val}}$)**:

   $$S_{\text{val}} = \begin{cases} 
   15 & \text{if } V_{\text{base, gt}} \text{ exists and } \epsilon_{\text{val}} \le 0.15 \quad (\le 15\% \text{ error}) \\
   10 & \text{if } V_{\text{base, gt}} \text{ exists and } 0.15 < \epsilon_{\text{val}} \le 0.30 \quad (\le 30\% \text{ error}) \\
   5 & \text{if } V_{\text{base, gt}} \text{ exists and } \epsilon_{\text{val}} > 0.30 \text{ but } \hat{V}_{\text{base}} > 0 \\
   0 & \text{if } V_{\text{base, gt}} \text{ exists but } \hat{V}_{\text{base}} \text{ is null/missing} \\
   15 & \text{if } V_{\text{base, gt}} \text{ is not specified}
   \end{cases}$$

---

### Dimension 5: Employee Evidence Score ($S_{\text{emp}}$, Max 5 Points)

Verifies headcount and payroll evidence extraction.

Let $E_{\text{actual}}$ be the extracted employee headcount and $E_{\text{gt}}$ be the expected headcount.

$$S_{\text{emp}} = \begin{cases} 
5 & \text{if } E_{\text{gt}} \text{ exists and } E_{\text{actual}} = E_{\text{gt}} \\
0 & \text{if } E_{\text{gt}} \text{ exists and } E_{\text{actual}} \neq E_{\text{gt}} \\
5 & \text{if } E_{\text{gt}} \text{ is null/unspecified}
\end{cases}$$

---

### Dimension 6: Accounting Math Checks Score ($S_{\text{math}}$, Max 10 Points)

Validates row/column total consistency and accounting balance check status.

Let $M_{\text{actual}}$ be the extracted math check status string ("passed" or "failed") and $M_{\text{gt}}$ be the expected math check status.

$$S_{\text{math}} = \begin{cases} 
10 & \text{if } \text{lowercase}(M_{\text{actual}}) = \text{lowercase}(M_{\text{gt}}) \\
5 & \text{otherwise}
\end{cases}$$

---

### Dimension 7: Acquisition Judgment Score ($S_{\text{acq}}$, Max 10 Points)

Reflects bottom-line M&A deal recommendation fidelity (**PROCEED**, **RENEGOTIATE**, **ESCALATE**).

To reflect M&A due diligence realities, $S_{\text{acq}}$ uses a **composite 90/10 weighted formula**:
- **90% Weight** on the **Consolidator Synthesizer Workflow Verdict** ($S_{\text{synth}}$) across the multi-document deal packet.
- **10% Weight** on the **Per-Document Risk Posture Average** ($S_{\text{doc\_avg}}$).

$$S_{\text{acq}} = 0.90 \cdot S_{\text{synth}} + 0.10 \cdot S_{\text{doc\_avg}}$$

1. **Synthesizer Verdict Score ($S_{\text{synth}}$)**:

   $$S_{\text{synth}} = \begin{cases} 
   10 & \text{if } \text{uppercase}(R_{\text{synth}}) = \text{uppercase}(R_{\text{gt}}) \text{ or posture aligned} \\
   5 & \text{if adjacent risk posture} \\
   0 & \text{if direct opposite mismatch}
   \end{cases}$$

2. **Per-Document Average Score ($S_{\text{doc\_avg}}$)**:

   $$S_{\text{doc\_avg}} = \frac{1}{K} \sum_{j=1}^{K} S_{\text{doc}, j}$$

   where $K$ is the number of documents in the deal packet and $S_{\text{doc}, j} \in \{10, 5, 0\}$.

---

## 3. Worked Numerical Example

Consider a sample P&L document (`Werkheiser P&L 2025.pdf`):

| Dimension | Input Data | Formula Calculation | Score Awarded |
| :--- | :--- | :--- | :---: |
| **1. Classification** | `actual = "Profit and Loss Statement"` <br> `gt = "Profit and Loss Statement"` | Exact string match: $10 / 10$ | **10.0 / 10** |
| **2. Financial Facts** | $N=1$, Revenue GT $=\$3.5\text{M}$, Actual $=\$3.5\text{M}$ | $\epsilon_1 = \frac{|3.5\text{M} - 3.5\text{M}|}{3.5\text{M}} = 0.00 \le 0.01 \implies 10\text{ pts}$ | **10.0 / 10** |
| **3. Risk & Flags** | GT Light $=\text{RED}$, Actual Light $=\text{YELLOW}$ <br> Flag Recall $= 0.80$ | $S_{\text{light}} = 5$, $R_{\text{flags}} = 8 \implies 5 + 8 = 13$ | **13.0 / 20** |
| **4. Valuation** | Base GT $=\$2.73\text{M}$, Actual $=\$2.73\text{M}$ | $\epsilon_{\text{val}} = 0.00 \le 0.15 \implies 15\text{ pts}$ | **15.0 / 15** |
| **5. Employee Evidence** | Headcount GT $= 14$, Actual $= 14$ | $E_{\text{actual}} = E_{\text{gt}} \implies 5\text{ pts}$ | **5.0 / 5** |
| **6. Math Checks** | Status GT $=$ `"passed"`, Actual $=$ `"passed"` | $M_{\text{actual}} = M_{\text{gt}} \implies 10\text{ pts}$ | **10.0 / 10** |
| **7. Acquisition Judgment** | $S_{\text{synth}} = 10$, $S_{\text{doc\_avg}} = 8.75$ | $0.90(10) + 0.10(8.75) = 9.0 + 0.875 = 9.875$ | **9.9 / 10** |

$$\mathbf{\text{Total Score } T_i} = 10 + 10 + 13 + 15 + 5 + 10 + 9.9 = \mathbf{72.9 \text{ / } 80 \text{ pts}}$$

$$\mathbf{\text{Document Accuracy } P_i} = \left( \frac{72.9}{80} \right) \times 100\% = \mathbf{91.1\% \quad (\text{PASS} \ge 70\%)}$$
