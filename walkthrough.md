# Walkthrough - Automated Scoring Eval Harness & Coverage Checklist Fixes

## Summary of Accomplished Deliverables

### 1. Project 5 Actual Run Results Stored
- Created [`test_sets/results/business5_medical-spa_actual_run.json`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/test_sets/results/business5_medical-spa_actual_run.json) with exact numeric facts, classifications, valuation, and risk flags extracted from the live n8n run for Business 5 (Medical Spa / Renew Health Center).

### 2. Automated Scoring Engine (`scripts/run-evals.ts`)
- Created [`scripts/run-evals.ts`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/scripts/run-evals.ts) adhering to the `test-case-plan.md` rubric:
  - Classification Accuracy (10 pts)
  - Financial Facts Numeric Precision & Tolerance (10 pts per metric)
  - Risk Flags Precision / Recall & Traffic Light (20 pts)
  - Valuation Estimate Bounds (15 pts)
  - Employee Evidence (5 pts)
  - Math Check Status Verification (10 pts)
- Added `npm run eval` command to [`package.json`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/package.json#L3).
- Verification run generated [`test_sets/eval_reports/latest_eval_report.json`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/test_sets/eval_reports/latest_eval_report.json) with **80% overall pass status (SHIP-READY)**.

### 3. CI/CD & Supabase Integration (Bonus Deliverables)
- **Deployment Regression Check**: Created [`.github/workflows/eval-regression.yml`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/.github/workflows/eval-regression.yml) to execute `run-evals.ts` on push/PR to `main`.
- **Database Schema**: Created Supabase table `public.eval_runs` via migration [`supabase/migrations/20260803000000_create_eval_runs.sql`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/supabase/migrations/20260803000000_create_eval_runs.sql) and logged the latest run results.

### 4. Project Coverage Checklist Fix
- Enhanced `requiredCoverageRules` and `getDocumentTypeLabels` in [`frontend/utils/projectWorkspace.ts`](file:///c:/Users/s-bas/MERGEWORKS%20REAL%20WEBSITE/Due-Diligence-Dashboard/frontend/utils/projectWorkspace.ts#L57-L135):
  - Added filename-based classification fallback when `detectedDocumentType` is `"auto-detect"`.
  - Expanded coverage rule keywords to include `'financial model'`, `'modelling'`, `'comparative p&l'`, `'ebitda normalization'`, and `'balance sheet'`.
  - The coverage checklist in the Projects tab now immediately registers matching document coverage rules upon upload.

---

## Verification & Build
- `npx tsx scripts/run-evals.ts` executed with status `SHIP-READY (PASS)`.
- `npm run build` in `frontend/` completed with 0 errors.
