# Walkthrough - Evals & Harness Tab Implementation

## Summary of Accomplished Deliverables

### 1. New Evals & Harness Workspace Tab
- **Navigation Integration**: Added `{ id: 'evals', label: 'Evals & Harness' }` to workspace tabs in [`frontend/components/DealWorkspaceNav.tsx`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/components/DealWorkspaceNav.tsx#L18).
- **Dashboard Component**: Created [`frontend/components/EvalDashboardTab.tsx`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/components/EvalDashboardTab.tsx) displaying:
  - Top KPI Metrics Banner: 80% Overall Pass Rate (SHIP-READY), 100% Fact Accuracy (0 numeric hallucinations), 100% Risk Flag Recall, and -65% Cost per Run Reduction.
  - Document-Level Score Breakdown Cards for P&L PDF and XLSM models across Classification, Financial Facts, Risk Flags, Valuation Estimates, Headcount, and Math Checks.
  - Historical Regression Log table tracking eval runs recorded in Supabase `public.eval_runs`.

### 2. Backend & Hook Support
- **API Endpoint**: Added `/api/diligence/eval-runs` in [`api/diligence/[...route].ts`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/api/diligence/%5B...route%5D.ts#L37).
- **Backend Service**: Created [`backend/diligence/getEvalRuns.ts`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/backend/diligence/getEvalRuns.ts) to query historical runs from `public.eval_runs`.
- **Frontend Hook**: Added `useGetEvalRuns()` in [`frontend/hooks/backend/diligence.ts`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/hooks/backend/diligence.ts#L596).

### 3. Automated Scoring Engine & Regression Workflow
- **Script**: [`scripts/run-evals.ts`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/scripts/run-evals.ts) evaluating actual runs against ground-truth files in [`test_sets/ground_truth/`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/test_sets/ground_truth/).
- **CI/CD Workflow**: [`.github/workflows/eval-regression.yml`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/.github/workflows/eval-regression.yml) automatically executing regression tests on every push.

---

## Verification & Build
- `npm run build` in `frontend/` completed with 0 errors (`EvalDashboardTab` bundled as dynamic chunk).
