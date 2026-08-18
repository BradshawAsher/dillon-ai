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

## Universal Card Info Popovers & Tab Information System

### 1. **Universal `(i)` Info Button on Every Single Card**
- **100% Application Coverage**: Every card across all workspace tabs (Overview, Diligence, Synthesis, Valuation, Returns, Growth, Evals, Spending, Shortcuts, FAQs) is equipped with a `CardInfoPopover` button.
- **Institutional Metadata Dictionary** ([`cardDescriptions.ts`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/components/common/cardDescriptions.ts)):
  - 100+ meticulously defined card entries covering M&A underwriting definitions, mathematical formulas, diligence impacts, and industry benchmarks.
  - Institutional fallback dynamic generator for any newly created or ad-hoc card IDs.
- **Interactive Tabbed Popover Modal** ([`CardInfoPopover.tsx`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/components/common/CardInfoPopover.tsx)):
  - Tab 1: **What It Is** & **Calculation Formula / Data Inputs**
  - Tab 2: **Diligence Impact** & **Investment Committee Benchmark / Target Standards**

### 2. **Tab-Level Information & Interactive Tutorials**
- Each primary workspace tab features a dedicated `(i)` info button in its header explaining the purpose and workflow of that tab.
- Integrated quick-launch trigger for the **Interactive 10-Step Guided Tour** from any tab and drawer.

### 3. **Keyboard Shortcuts Hub & Quick Launch**
- Added **Shortcuts** workspace tab and header top-bar modal button next to profile/sign-in.
- Interactive live key tester and hotkey cheatsheet (`?`, `Ctrl+K`, tab switching `1`-`6`, `D`, `N`, `P`, `E`).

---

## Verification Results
- **Automated Popover Audit**: Verified 0 remaining files rendering cards without `CardInfoPopover` (`node find-missing-popovers.mjs` -> `[]`).
- **Production Build**: Verified with `npm run build` in `frontend` -> **0 errors, built successfully in 3.04s**.
