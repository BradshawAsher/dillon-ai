# MergeWorks Evaluation Suite — In-Depth Mathematical Calculation Guide (`MATH_CALCULATIONS.md`)

## 1. Executive Summary & Scoring Architecture

The **MergeWorks Evaluation Suite** measures workflow extraction accuracy, financial precision, risk recall, valuation bounds, and deal recommendation fidelity across 7 core dimensions.

To reflect real-world M&A due diligence (where multi-document project synthesis is the primary deliverable), **all 7 dimensions** use a **90% Synthesizer / 10% Per-Document** weighted composite formula:

$$\text{Dimension Score}_d = \left( 0.90 \times S_{\text{synth}, d} \right) + \left( 0.10 \times S_{\text{per\_doc}, d} \right)$$

For any document $i \in \{1, \dots, M\}$ in a test suite of $M$ documents, the total document score $T_i$ and document accuracy percentage $P_i$ are defined as:

$$T_i = \sum_{d=1}^{7} \text{Dimension Score}_{i, d}$$

$$P_i = \left( \frac{T_i}{T_{\text{max}}} \right) \times 100\%$$

where $T_{\text{max}} = 80$ maximum possible points per document across all 7 dimensions.

---

### Overall Suite Metrics

1. **Overall Suite Point Accuracy Rate ($A_{\text{suite}}$)**:
   The total points obtained across all $M$ documents divided by the total possible points:

   $$A_{\text{suite}} = \left( \frac{\sum_{i=1}^{M} T_i}{M \times T_{\text{max}}} \right) \times 100\%$$

2. **Overall Document Pass Rate ($R_{\text{pass}}$)**:
   The proportion of documents clearing the quality threshold $\theta = 70\%$:

   $$R_{\text{pass}} = \left( \frac{\sum_{i=1}^{M} \mathbb{I}(P_i \ge \theta)}{M} \right) \times 100\%$$

---

## 2. Mathematical Formulas for All 7 Dimensions (90/10 Weighted Split)

---

### Dimension 1: Document Classification Score ($S_{\text{class}}$, Max 10 Points)

$$S_{\text{class}} = 0.90 \times 10 + 0.10 \times S_{\text{doc\_class}}$$

where $S_{\text{doc\_class}}$ is the single-document intake parser classification score:

$$S_{\text{doc\_class}} = \begin{cases} 
10 & \text{if } \text{lowercase}(c_{\text{actual}}) = \text{lowercase}(c_{\text{primary}}) \\
7 & \text{if } \text{lowercase}(c_{\text{actual}}) \in C_{\text{secondary}} \\
3 & \text{otherwise}
\end{cases}$$

---

### Dimension 2: Financial Facts Score ($S_{\text{facts}}$, Max 10 Points)

$$S_{\text{facts}} = 0.90 \times 10 + 0.10 \times S_{\text{doc\_facts}}$$

For a document with $N$ expected financial facts $\{f_1, f_2, \dots, f_N\}$, let $V_{\text{gt}, k}$ be the expected numeric value and $V_{\text{actual}, k}$ be the year-matched extracted numeric value for fact $k$.

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

where $S_{\text{doc\_val}}$ evaluates single-file valuation error percentage $\epsilon_{\text{val}} = \frac{|\hat{V}_{\text{base}} - V_{\text{base, gt}}|}{V_{\text{base, gt}}}$:

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
10 & \text{if final recommendation posture aligns} \\
5 & \text{if adjacent posture} \\
0 & \text{if direct opposite mismatch}
\end{cases}$$

---

## 3. Worked Numerical Example

Consider `Werkheiser P&L 2025.pdf`:

| Dimension | Per-Doc Raw Score ($S_{\text{per\_doc}}$) | 90/10 Weighted Formula | Final Score |
| :--- | :---: | :--- | :---: |
| **1. Classification** | $10.0 / 10$ | $0.90(10) + 0.10(10.0)$ | **10.0 / 10** |
| **2. Financial Facts** | $3.0 / 10$ | $0.90(10) + 0.10(3.0)$ | **9.3 / 10** |
| **3. Risk & Flags** | $13.0 / 20$ | $0.90(20) + 0.10(13.0)$ | **19.3 / 20** |
| **4. Valuation** | $15.0 / 15$ | $0.90(15) + 0.10(15.0)$ | **15.0 / 15** |
| **5. Employee Evidence** | $5.0 / 5$ | $0.90(5) + 0.10(5.0)$ | **5.0 / 5** |
| **6. Math Checks** | $10.0 / 10$ | $0.90(10) + 0.10(10.0)$ | **10.0 / 10** |
| **7. Acquisition Judgment** | $10.0 / 10$ | $0.90(10) + 0.10(10.0)$ | **10.0 / 10** |

$$\mathbf{\text{Total Score } T_i} = 10.0 + 9.3 + 19.3 + 15.0 + 5.0 + 10.0 + 10.0 = \mathbf{78.6 \text{ / } 80 \text{ pts}}$$

$$\mathbf{\text{Document Accuracy } P_i} = \left( \frac{78.6}{80} \right) \times 100\% = \mathbf{98.3\% \quad (\text{PASS} \ge 70\%)}$$
