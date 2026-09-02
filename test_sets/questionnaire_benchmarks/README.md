# Quick Deal Questionnaire Benchmark Evaluation Files

This directory contains real Word (`.docx`) and Excel (`.xlsx`) test files designed for evaluating the **Quick Deal Questionnaire** intake engine, local parsing, and the 3-model triad AI Draft assistant (`gpt-5.6-terra` / `gpt-5.6-sol`).

---

## 📁 Benchmark Files Directory
**Local Path**: `c:\Users\s-bas\MERGEWORKS REAL WEBSITE\Due-Diligence-Dashboard\test_sets\questionnaire_benchmarks\`

| File Name | Format | Industry / Deal Type | Key Ground-Truth Metrics |
| :--- | :--- | :--- | :--- |
| **`01_Precision_HVAC_Services_Teaser.docx`** | Microsoft Word (`.docx`) | Commercial & Industrial HVAC Services | Asking: `$4,250,000`<br>Revenue: `$5,800,000`<br>EBITDA: `$1,150,000`<br>Add-backs: `$85,000`<br>Seller Note: `$425,000` (`7.5%`)<br>Fleet: `$650,000`<br>Headcount: `28` |
| **`02_CloudFlow_SaaS_Executive_Summary.docx`** | Microsoft Word (`.docx`) | B2B Workflow Automation SaaS | Asking: `$8,500,000`<br>ARR / Revenue: `$3,200,000`<br>Gross Margin: `82%`<br>EBITDA: `$640,000`<br>Concentration: `8.5%`<br>Headcount: `14` |
| **`03_Apex_CNC_Machining_Financial_Summary.xlsx`** | Microsoft Excel (`.xlsx`) | Aerospace CNC Precision Machining | Asking: `$3,100,000`<br>Revenue: `$4,400,000`<br>SDE: `$780,000`<br>Inventory: `$420,000`<br>A/R: `$360,000`<br>Equipment: `$1,200,000`<br>A/P: `$190,000`<br>Headcount: `19` |
| **`04_Messy_Retail_Opportunity_Teaser.docx`** | Microsoft Word (`.docx`) | Specialty Retail & Home Goods (Edge Case) | Asking: `$1,500,000`<br>Revenue: `$2,100,000`<br>EBITDA: *Undisclosed (Missing)*<br>*Expected: Triggers missing required field warning for EBITDA while capturing Asking & Revenue.* |

---

## 🚀 How to Test in the Dashboard UI

1. Open the cockpit at `http://localhost:5173/` (or your production deployment).
2. On the **Overview** tab, select **`✍️ Quick Deal Questionnaire (No files needed)`**.
3. Click the **`Prefill from Word or pasted stats`** button.
4. Click **`Upload small file`** and drag & drop (or browse for) any of the 4 benchmark files from:
   ```
   test_sets/questionnaire_benchmarks/
   ```
5. Choose either:
   - **Local Instant Parse** (Zero token / regex parse)
   - **AI Assist Draft** (Full 42-field AI extraction via live n8n 3-model triad)
6. Review the recognized fields and confidence badges, then click **`Apply recognized fields`**.
