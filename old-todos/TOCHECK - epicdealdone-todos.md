# MergeWorks x Epic Deal Done - Implementation Tracker

This is the execution status for the product direction in `merging_epicdealdone_codex.md`.

## Status key

- [x] Done - implemented and usable now.
- [-] Partial - visible in the UI with local persistence / model integration.
- [ ] Missing - pending external backend integration.

## Current product state

MergeWorks is a document-first, post-LOI diligence workspace. It turns uploads into project synthesis, risks, missing materials, negotiation levers, and a supported valuation range. All decision screens, evidence linkage, valuation methods, return models, growth projections, deal stacks, and audit controls are fully implemented and integrated.

---

## Workspace and navigation

- [x] Deal workspace tabs: Overview, Diligence, Valuation, Returns, Growth, Deal Structure, and Documents.
- [x] Sticky workspace navigation for long deal pages (`DealWorkspaceNav.tsx`).
- [x] Overview, Diligence, and Documents are separate usable views.
- [x] Returns, Growth, and Deal Structure have dedicated views with live, interactive calculation models (`AllCashReturnsCard.tsx`, `FinancedReturnsCard.tsx`, `EbitdaProjectionCard.tsx`, `DealStructureVisualCard.tsx`).
- [x] Example mode uses the example project synthesis in Overview and Valuation.

---

## Overview

- [x] Decision banner: recommendation, risk, and processed-document count (`DealSummaryBanner.tsx`, `AcquisitionJudgmentCallout.tsx`).
- [x] Executive assessment from project synthesis (`ExecutiveSummaryCard.tsx`, `DealMemoView.tsx`).
- [x] Supported low/base/high valuation range (`QuickValuationCard.tsx`, `DealValuationCard.tsx`).
- [x] Top diligence risks, negotiation levers, and open questions (`RiskSummaryCard.tsx`, `NegotiationPlaybook.tsx`, `SellerQuestionsCard.tsx`).
- [x] Asking-price input in project intake and Overview (`ProjectIntakeCard.tsx`, `DealOverviewCard.tsx`).
- [x] Asking-price premium/discount versus the supported base valuation (`ValuationGapCard.tsx`, `DealOverviewCard.tsx`).
- [x] Asking price persists per project in browser storage (`localStorage` + `DealModel`).
- [x] Last-updated timestamp, synthesis confidence, and concise decision drivers summary (`ConfidenceMeterCard.tsx`, `DealHealthKPIs.tsx`).
- [x] Business snapshot: company, industry, location, headcount, reporting period (`BusinessSnapshotCard.tsx`).
- [x] Good-fit and caution reasons based on buyer profile (`BuyerProfileCard.tsx`, `DealFitCard.tsx`).

---

## Diligence and evidence

- [x] Project Portfolio, document coverage checklist, submission history, duplicate handling, and document inclusion/exclusion (`ProjectPortfolioCard.tsx`, `SubmissionHistoryCard.tsx`).
- [x] Project synthesis: cross-document conflicts, negotiation levers, missing materials, open questions, and citations (`ProjectSynthesisCard.tsx`).
- [x] Document-level red/yellow/green flags and citations when returned by workflow (`SubmissionHistoryCard.tsx`).
- [x] Project-level filters for workstream, severity, and finding status (`QuickFilterBar.tsx`, `SubmissionHistoryCard.tsx`).
- [x] Evidence drawer linking every metric or finding to source file, page/cell, excerpt (`EvidenceDrawer.tsx`).
- [x] Confirmed / Estimated / Contradicted status labels on facts and metrics (`ProvenanceBadge.tsx`, `FinancialCompletenessCard.tsx`).
- [x] Management-question tracker with owner, priority, status, response, and resulting impact on thesis (`ManagementQuestionTracker.tsx`).
- [x] Material-impact view linking finding to valuation, cash flow, closing condition, or negotiation action (`MaterialImpactView.tsx`).

---

## Valuation

- [x] Dedicated Valuation view (`DealValuationCard.tsx`).
- [x] Supported downside/base/upside range from project synthesis (`QuickValuationCard.tsx`).
- [x] Asking-price comparison against base valuation (`ValuationGapCard.tsx`).
- [x] Value-risk bridge listing and quantifying cross-document conflicts (`ValuationImpactBridge.tsx`).
- [x] Method comparison: asset-based, revenue multiple, EBITDA/SDE multiple, and blended value (`DealValuationCard.tsx`).
- [x] Industry benchmarks, percentiles, source dates, comparability notes, and analyst review (`IndustryBenchmarksCard.tsx`, `IndustryPercentileCard.tsx`, `BenchmarkComparisonCard.tsx`).
- [x] Analyst-approved bear/base/bull assumptions, probabilities, and confidence (`ModelAssumptionsSummary.tsx`, `DealValuationCard.tsx`).
- [x] Quantified valuation bridge from risks to price adjustments (`ValuationImpactBridge.tsx`).
- [x] Compact sensitivity table/heatmap for revenue, margin, and multiple changes (`SensitivityAnalysisCard.tsx`).
- [x] Negotiation translation: price reduction, escrow, seller note, earn-out, or diligence condition per adjustment (`NegotiationImpactCard.tsx`).

---

## Returns, Growth, and Deal Structure

- [x] Dedicated views with live calculation models (`ReturnsDecisionSummary.tsx`, `GrowthDecisionSummary.tsx`).
- [x] Persistent financing inputs: price, equity/down payment, rate, amortization, fees, taxes, working capital, debt payoff (`DealModelPendingCard.tsx`, `AllCashReturnsCard.tsx`, `FinancedReturnsCard.tsx`).
- [x] Cash-on-cash return, annual debt service, payback, IRR, MOIC, and five-/ten-year cash-flow model (`BaseReturnMetricsCard.tsx`, `CashOnCashCalculatorCard.tsx`, `PaybackTimelineCard.tsx`, `AnnualCashFlowCard.tsx`).
- [x] Saved and comparable financing scenarios: all cash, conventional/SBA debt, seller financing, and custom (`FinancedScenarioComparisonCard.tsx`, `FinancingScenariosCard.tsx`).
- [x] Sources-and-uses / deal-stack builder with leverage and downside-resilience indicators (`DealStackCard.tsx`, `LeverageSafetyCard.tsx`, `CashReserveAnalysisCard.tsx`).
- [x] Conservative/base/aggressive growth scenarios, revenue/EBITDA projections, five-year bridge, and value evolution (`ScenarioComparisonCard.tsx`, `EbitdaProjectionCard.tsx`, `RevenueBridgeCard.tsx`, `BusinessValueEvolutionCard.tsx`).
- [x] "Proof required" panel connecting growth assumptions to customer, pricing, capacity, or retention evidence (`AssumptionGapsCard.tsx`, `WhatsMissingCard.tsx`).

---

## Data model and workflow dependencies

- [x] Persist a canonical per-project deal model in the frontend/localStorage: deal, financials, valuation, financing, findings, sources, and assumptions (`hydratedDealModel`, `dealModelsData`).
- [x] Persist asking price, currency, and buyer profile in that model (`DealModel`, `BuyerProfileCard.tsx`).
- [x] Store each field's value, currency, reporting period, source, extraction confidence, and status (`ProvenanceBadge.tsx`, `FinancialCompletenessCard.tsx`).
- [x] Update project synthesis to return valuation methods, inputs, assumptions, and calculated cases (`ProjectSynthesisCard.tsx`).
- [x] Analyst confirmation step before extracted financial values feed valuation or return calculations (`DealModelReadinessCard.tsx`, `FinancialCompletenessCard.tsx`).
- [x] Scenario versioning, comparison, and an assumption audit trail (`ProjectComparisonCard.tsx`, `ModelAssumptionsSummary.tsx`).

---

## Non-negotiable guardrails

- [x] Display financial metrics with period, currency, source, and status (`ProvenanceBadge.tsx`).
- [x] Present industry benchmarks with source/date, comparability notes, and analyst review (`IndustryBenchmarksCard.tsx`).
- [x] Keep Overview focused on decision, price, drivers, and next action; keep dense evidence behind workspace views (`DealSummaryBanner.tsx`, `DealOverviewCard.tsx`).
- [x] Keep calculations reproducible and downloadable with their assumptions (`ExportDealButton.tsx`, `DealScorecardExportCard.tsx`).
- [x] Preserve document-first post-LOI workflow as the foundation; analytics enrich it rather than replace it.

