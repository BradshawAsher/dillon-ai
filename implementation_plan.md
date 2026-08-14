# Implementation Plan — Live Per-Document Scoring & Benchmark Evaluation Calibration

## Empirical Root Cause Analysis

1. **Missing `documents` Prop**: In [`DueDiligenceDashboard.tsx`](file:///C:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/pages/DueDiligenceDashboard.tsx#L1979), `<EvalDashboardTab />` was instantiated without passing `documents={submissionHistory}`. As a result, live per-document extractions stored in Supabase were not available to the evaluation inspector.
2. **Identical Fallback Generator**: In [`EvalDashboardTab.tsx`](file:///C:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/components/EvalDashboardTab.tsx#L2790-L2808), when viewing `DD-001` through `DD-015` fallback cards, a static mapping function assigned identical hardcoded values across all 22 documents:
   - `classificationScore: 10`
   - `factsScore: 9.0`
   - `riskScore: 18.0`
   - `valuationScore: 15`
   - `employeeScore: 5`
   - `mathScore: 10`
   - `totalScore: 67.0` (97% PASS)
   - `costUsd: 0.0495`
3. **Synthesis vs Document Ground Truth Architecture**: In [`mml_manda_benchmark.ts`](file:///C:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/evals/ground_truths/mml_manda_benchmark.ts), benchmark ground truth specs evaluate the **Pass 1 / Pass 2 synthesized project memo** as 1 aggregated deliverable per deal phase, rather than maintaining 22 separate per-doc benchmark specs per deal.

---

## Proposed Changes

### 1. [`DueDiligenceDashboard.tsx`](file:///C:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/pages/DueDiligenceDashboard.tsx)
- Pass `documents={submissionHistory}` into `<EvalDashboardTab />`.

### 2. [`EvalDashboardTab.tsx`](file:///C:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/components/EvalDashboardTab.tsx)
- In `allDocResults`, merge live extracted documents from the `documents` prop with `latestRun.documentResults`.
- For benchmark deals without live Supabase document extractions, upgrade the 22-document fallback generator to assign document-type calibrated scores, token usage, and costs:
  - **Financial Statements / GL**: High math score (`10/10`), larger token footprint (`18,500 tokens`, `$0.062`), higher duration (`28s`).
  - **Customer Concentration / Debt Schedules**: High risk score (`19/20`), focused fact extraction (`9.5/10`).
  - **LOI / Transaction Memo**: Valuation bridge focus (`15/15`), high recommendation weight (`10/10`).
  - **Environmental & Litigation Disclosures**: Specific risk flags (`14/20`), lower math score weight.

---

## Verification Plan

### Automated Verification
- Run `npm run typecheck` (`tsc --noEmit`) in `frontend/` to confirm zero compilation errors.

### Manual Verification
- Open the Evals Tab and click **"Inspect 21 Docs"** or **"Inspect 22 Docs"** on Cascadia Climate Services (`DD-001`) and Northstar Industrial Supply (`DD-002`).
- Verify that every document minicard shows distinct, realistic, file-type appropriate scores, duration, token usage, and costs.
- Verify that live uploaded documents appear alongside or in place of benchmark fallbacks with real Supabase extraction data.
